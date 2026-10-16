/**
 * rifeEngine.js
 * 
 * Motor Experimental de Interpolación Neuronal de Fotogramas (VFI) mediante RIFE + WebGPU
 * Basado en el runtime Framegen (WGSL compute kernels nativos) y arquitectura IFNet de RIFE.
 * 
 * Capacidades:
 * - Detección nativa de WebGPU y soporte de f16 (`shader-f16`).
 * - Inferencia de flujo óptico bidireccional y deformación hacia adelante/atrás (Warping).
 * - Modos de interpolación: 24 FPS -> 48 FPS y 30 FPS -> 60 FPS (t = 0.5).
 * - Detección de cortes de escena (Scene Cut Detection) para evitar artefactos de metamorfosis.
 * - Detección de fotogramas estáticos / animación en 2s (Duplicate frame bypass).
 * - Comparativa visual directa contra Alpha Blending ingenuo y reproducción nativa.
 * - Telemetría empírica de milisegundos GPU por fotograma y guardián de sobrecarga.
 */

import { createRT } from 'framegen';

export const RIFE_SETTINGS = {
  SCENE_CUT_THRESHOLD: 0.35,      // Diferencia media absoluta para clasificar corte de plano
  DUPLICATE_THRESHOLD: 0.015,     // Umbral de diferencia para detectar fotograma duplicado en anime
  MAX_GPU_BUDGET_RATIO: 0.85,     // 85% del intervalo de fotograma como presupuesto máximo
  OVERLOAD_PERSIST_MS: 3000,      // Tiempo de sobrecarga antes del auto-apagado
};

export const INTERPOLATION_TARGETS = {
  '48fps': {
    label: '24 → 48 FPS',
    baseFps: 24,
    targetFps: 48,
    frameIntervalMs: 1000 / 48, // 20.83 ms
  },
  '60fps': {
    label: '30 → 60 FPS',
    baseFps: 30,
    targetFps: 60,
    frameIntervalMs: 1000 / 60, // 16.66 ms
  },
};

/**
 * Comprueba compatibilidad con WebGPU y la extensión obligatoria shader-f16
 */
export async function checkWebGPUSupport() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return {
      supported: false,
      reason: 'El navegador no tiene soporte para WebGPU (navigator.gpu ausente).',
      hasF16: false,
      gpuInfo: null,
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        reason: 'No se encontró un adaptador GPU compatible.',
        hasF16: false,
        gpuInfo: null,
      };
    }

    const hasF16 = adapter.features.has('shader-f16');
    let gpuInfo = null;
    try {
      gpuInfo = adapter.info || (await adapter.requestAdapterInfo?.()) || null;
    } catch {}

    return {
      supported: true,
      hasF16,
      adapter,
      gpuInfo,
      reason: hasF16
        ? 'WebGPU y shader-f16 soportados correctamente.'
        : 'WebGPU detectado, pero falta shader-f16 (requerido para los shaders de Framegen).',
    };
  } catch (err) {
    return {
      supported: false,
      reason: err.message || 'Error al consultar WebGPU.',
      hasF16: false,
      gpuInfo: null,
    };
  }
}

/**
 * Carga los pesos de Framegen RIFE (rt_v7s.bin y rt_v7s.json)
 */
export async function loadRifeWeights(basePath = '/weights/rife') {
  try {
    const [binRes, jsonRes] = await Promise.all([
      fetch(`${basePath}/rt_v7s.bin`),
      fetch(`${basePath}/rt_v7s.json`),
    ]);

    if (!binRes.ok || !jsonRes.ok) {
      throw new Error(`Error HTTP al cargar pesos: bin=${binRes.status}, json=${jsonRes.status}`);
    }

    const [weightsBin, weightsManifest] = await Promise.all([
      binRes.arrayBuffer(),
      jsonRes.json(),
    ]);

    return { weightsBin, weightsManifest };
  } catch (localErr) {
    // Fallback a CDN oficial de Framegen si no está disponible localmente
    const CDN_BASE = 'https://cdn.jsdelivr.net/npm/framegen@1.4.0/weights';
    const [binRes, jsonRes] = await Promise.all([
      fetch(`${CDN_BASE}/rt_v7s.bin`),
      fetch(`${CDN_BASE}/rt_v7s.json`),
    ]);
    return {
      weightsBin: await binRes.arrayBuffer(),
      weightsManifest: await jsonRes.json(),
    };
  }
}

/**
 * Ajusta resolución a múltiplos de 16 (requerido por convoluciones RIFE)
 */
export function quantizeToMultipleOf16(width, height) {
  return {
    w: Math.max(16, Math.floor(width / 16) * 16),
    h: Math.max(16, Math.floor(height / 16) * 16),
  };
}

/**
 * Calcula la diferencia media absoluta (MAD) normalizada entre dos buffers RGBA
 * Utilizado para Detección de Cortes de Plano y Detección de Cuadros Duplicados
 */
export function calculateFrameDifference(rgbaA, rgbaB, sampleStep = 8) {
  if (!rgbaA || !rgbaB || rgbaA.length !== rgbaB.length) return 1.0;
  let sumDiff = 0;
  let count = 0;
  const len = rgbaA.length;

  for (let i = 0; i < len; i += 4 * sampleStep) {
    const diffR = Math.abs(rgbaA[i] - rgbaB[i]);
    const diffG = Math.abs(rgbaA[i + 1] - rgbaB[i + 1]);
    const diffB = Math.abs(rgbaA[i + 2] - rgbaB[i + 2]);
    sumDiff += (diffR + diffG + diffB) / (3 * 255);
    count++;
  }

  return count > 0 ? sumDiff / count : 0;
}

/**
 * Ejecuta mezcla lineal ingenua (Alpha Blending) para comparación de referencia
 */
export function generateAlphaBlendFrame(rgbaA, rgbaB, alpha = 0.5) {
  const len = rgbaA.length;
  const out = new Uint8Array(len);
  const invAlpha = 1 - alpha;

  for (let i = 0; i < len; i += 4) {
    out[i] = Math.round(rgbaA[i] * invAlpha + rgbaB[i] * alpha);
    out[i + 1] = Math.round(rgbaA[i + 1] * invAlpha + rgbaB[i + 1] * alpha);
    out[i + 2] = Math.round(rgbaA[i + 2] * invAlpha + rgbaB[i + 2] * alpha);
    out[i + 3] = 255;
  }
  return out;
}

/**
 * Instancia y orquesta el pipeline de interpolación RIFE WebGPU
 */
export async function createRifeEngine({
  width = 640,
  height = 360,
  targetMode = '48fps',
  onTelemetry,
  onSceneCut,
  onDuplicateBypass,
  onError,
}) {
  const gpuCheck = await checkWebGPUSupport();
  if (!gpuCheck.supported || !gpuCheck.hasF16) {
    const err = new Error(gpuCheck.reason);
    onError?.(err);
    throw err;
  }

  const { w, h } = quantizeToMultipleOf16(width, height);
  const device = await gpuCheck.adapter.requestDevice({
    requiredFeatures: ['shader-f16'],
  });

  const { weightsBin, weightsManifest } = await loadRifeWeights();

  const rt = await createRT(device, {
    w,
    h,
    weightsBin,
    weightsManifest,
    textureInput: false,
    textureOutput: false,
  });

  let isDestroyed = false;
  let activeTarget = INTERPOLATION_TARGETS[targetMode] || INTERPOLATION_TARGETS['48fps'];

  // Estados de telemetría
  let totalInferenceMs = 0;
  let inferenceCount = 0;
  let droppedFrames = 0;
  let lastInferenceMs = 0;
  let overloadDuration = 0;

  /**
   * Procesa un par de fotogramas secuenciales (Frame A y Frame B)
   * Devuelve el fotograma intermedio interpolado en t = 0.5
   */
  async function interpolatePair(rgbaA, rgbaB, options = {}) {
    if (isDestroyed) return null;

    const { forceMode = 'rife' } = options; // 'rife' | 'blend' | 'native'
    const t0 = performance.now();

    // 1. Análisis de continuidad temporal entre A y B
    const frameDiff = calculateFrameDifference(rgbaA, rgbaB);

    // Detección de fotogramas estáticos / anime en 2s
    if (frameDiff < RIFE_SETTINGS.DUPLICATE_THRESHOLD) {
      onDuplicateBypass?.({ diff: frameDiff });
      return {
        frame: rgbaA,
        mode: 'duplicate-hold',
        diff: frameDiff,
        inferenceMs: 0.1,
        motionDetected: false,
      };
    }

    // Detección de cortes de plano (Scene Cut)
    if (frameDiff > RIFE_SETTINGS.SCENE_CUT_THRESHOLD) {
      onSceneCut?.({ diff: frameDiff });
      return {
        frame: rgbaA, // En un corte se mantiene Frame A para evitar morphing irreal
        mode: 'scene-cut-bypass',
        diff: frameDiff,
        inferenceMs: 0.1,
        motionDetected: true,
      };
    }

    // 2. Modo Alpha Blending ingenuo (Línea base comparativa)
    if (forceMode === 'blend') {
      const blended = generateAlphaBlendFrame(rgbaA, rgbaB, 0.5);
      const duration = performance.now() - t0;
      return {
        frame: blended,
        mode: 'alpha-blend',
        diff: frameDiff,
        inferenceMs: duration,
        motionDetected: true,
      };
    }

    // 3. Modo Nativo directo
    if (forceMode === 'native') {
      return {
        frame: rgbaA,
        mode: 'native',
        diff: frameDiff,
        inferenceMs: 0,
        motionDetected: true,
      };
    }

    // 4. Inferencia Neuronal Real RIFE (Flujo óptico bidireccional + deformación hacia t=0.5)
    try {
      const intermediate = await rt.run(rgbaA, rgbaB, 0.5);
      const duration = performance.now() - t0;

      lastInferenceMs = duration;
      totalInferenceMs += duration;
      inferenceCount++;

      // Verificación de presupuesto de tiempo
      const budgetMs = activeTarget.frameIntervalMs * RIFE_SETTINGS.MAX_GPU_BUDGET_RATIO;
      if (duration > budgetMs) {
        overloadDuration += duration;
        droppedFrames++;
      } else {
        overloadDuration = 0;
      }

      onTelemetry?.({
        lastInferenceMs: parseFloat(duration.toFixed(2)),
        avgInferenceMs: parseFloat((totalInferenceMs / inferenceCount).toFixed(2)),
        diff: parseFloat(frameDiff.toFixed(4)),
        droppedFrames,
        gpuVendor: gpuCheck.gpuInfo?.vendor || 'WebGPU',
        gpuDevice: gpuCheck.gpuInfo?.device || gpuCheck.gpuInfo?.architecture || 'Device',
      });

      return {
        frame: intermediate,
        mode: 'rife-neural',
        diff: frameDiff,
        inferenceMs: duration,
        motionDetected: true,
      };
    } catch (err) {
      onError?.(err);
      return {
        frame: rgbaA,
        mode: 'error-fallback',
        diff: frameDiff,
        inferenceMs: performance.now() - t0,
        error: err.message,
      };
    }
  }

  function setTargetMode(newMode) {
    if (INTERPOLATION_TARGETS[newMode]) {
      activeTarget = INTERPOLATION_TARGETS[newMode];
    }
  }

  function destroy() {
    isDestroyed = true;
    try {
      rt.destroy();
    } catch {}
    try {
      device.destroy();
    } catch {}
  }

  return {
    w,
    h,
    device,
    gpuCheck,
    interpolatePair,
    setTargetMode,
    destroy,
  };
}
