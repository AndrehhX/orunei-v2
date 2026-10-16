/**
 * rifeEngine.js
 * 
 * Motor Experimental de Interpolación Neuronal de Fotogramas (VFI) mediante RIFE + WebGPU
 * Basado en el runtime Framegen (WGSL compute kernels nativos) y arquitectura IFNet de RIFE.
 * 
 * Capacidades e Instrumentación de Precisión:
 * - Detección nativa de WebGPU, extensión f16 (`shader-f16`) y `timestamp-query`.
 * - Extracción estricta de metadatos de la GPU real (vendor, architecture, device, driver).
 * - Sincronización estricta GPU mediante `await device.queue.onSubmittedWorkDone()`
 *   para medir latencia real de ejecución física de hardware (eliminando falsos reportes de CPU dispatch).
 * - Segmentación estricta de métricas: CPU Dispatch vs GPU Execution vs Percentiles P50, P95, P99.
 * - Clasificador temporal de transiciones (Scene Cut vs 1-Frame Lighting Flash vs Hold 2s/3s vs Movimiento continuo).
 * - Evaluación matemática contra Ground Truth (MAE y PSNR en dB contra cuadro real intermedio).
 * - Soporte de resoluciones cuantizadas: SD (640×368), HD (1280×720) y FHD (1920×1072).
 * - Estimación analítica de consumo VRAM por resolución.
 */

import { createRT } from 'framegen';

export const RIFE_SETTINGS = {
  SCENE_CUT_THRESHOLD: 0.28,      // Diferencia media absoluta para clasificar corte de plano (> 0.28)
  DUPLICATE_THRESHOLD: 0.015,     // Umbral de diferencia para detectar fotograma duplicado en anime
  MAX_GPU_BUDGET_RATIO: 0.85,     // 85% del intervalo de fotograma como presupuesto máximo
  OVERLOAD_PERSIST_MS: 3000,      // Tiempo de sobrecarga antes del auto-apagado
};

export const INTERPOLATION_TARGETS = {
  '48fps': {
    label: '24 → 48 FPS',
    baseFps: 24,
    targetFps: 48,
    frameIntervalMs: 1000 / 48, // 20.833 ms
  },
  '60fps': {
    label: '30 → 60 FPS',
    baseFps: 30,
    targetFps: 60,
    frameIntervalMs: 1000 / 60, // 16.666 ms
  },
};

export const SUPPORTED_RESOLUTIONS = {
  'sd': { label: '640 × 368 (SD)', width: 640, height: 368 },
  '720p': { label: '1280 × 720 (HD 720p)', width: 1280, height: 720 },
  '1080p': { label: '1920 × 1072 (FHD 1080p)', width: 1920, height: 1072 },
};

/**
 * Comprueba compatibilidad con WebGPU, shader-f16 y extrae metadatos exactos de la GPU
 */
export async function checkWebGPUSupport() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return {
      supported: false,
      reason: 'El navegador no tiene soporte para WebGPU (navigator.gpu ausente).',
      hasF16: false,
      hasTimestampQuery: false,
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
        hasTimestampQuery: false,
        gpuInfo: null,
      };
    }

    const hasF16 = adapter.features.has('shader-f16');
    const hasTimestampQuery = adapter.features.has('timestamp-query');

    let gpuInfo = {
      vendor: 'Desconocido',
      architecture: 'Desconocida',
      device: 'Desconocido',
      description: 'Desconocida',
      driver: 'Desconocido',
    };

    if (adapter.info) {
      gpuInfo = {
        vendor: adapter.info.vendor || 'Desconocido',
        architecture: adapter.info.architecture || 'Desconocida',
        device: adapter.info.device || 'Desconocido',
        description: adapter.info.description || 'Desconocida',
        driver: adapter.info.driver || 'Desconocido',
      };
    } else if (typeof adapter.requestAdapterInfo === 'function') {
      try {
        const req = await adapter.requestAdapterInfo();
        gpuInfo = {
          vendor: req.vendor || 'Desconocido',
          architecture: req.architecture || 'Desconocida',
          device: req.device || 'Desconocido',
          description: req.description || 'Desconocida',
          driver: req.driver || 'Desconocido',
        };
      } catch {}
    }

    return {
      supported: true,
      hasF16,
      hasTimestampQuery,
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
      hasTimestampQuery: false,
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
  } catch {
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
 * Calcula el error absoluto medio (MAE) entre dos buffers RGBA en rango [0, 255]
 */
export function calculateMAE(rgbaA, rgbaB, sampleStep = 4) {
  if (!rgbaA || !rgbaB || rgbaA.length !== rgbaB.length) return 255;
  let sum = 0;
  let count = 0;
  const len = rgbaA.length;
  for (let i = 0; i < len; i += 4 * sampleStep) {
    sum += Math.abs(rgbaA[i] - rgbaB[i]) +
           Math.abs(rgbaA[i + 1] - rgbaB[i + 1]) +
           Math.abs(rgbaA[i + 2] - rgbaB[i + 2]);
    count += 3;
  }
  return count > 0 ? parseFloat((sum / count).toFixed(2)) : 255;
}

/**
 * Calcula el PSNR (Peak Signal-to-Noise Ratio en dB) entre dos buffers RGBA
 */
export function calculatePSNR(rgbaA, rgbaB, sampleStep = 4) {
  if (!rgbaA || !rgbaB || rgbaA.length !== rgbaB.length) return 0;
  let sumSq = 0;
  let count = 0;
  const len = rgbaA.length;
  for (let i = 0; i < len; i += 4 * sampleStep) {
    const dR = rgbaA[i] - rgbaB[i];
    const dG = rgbaA[i + 1] - rgbaB[i + 1];
    const dB = rgbaA[i + 2] - rgbaB[i + 2];
    sumSq += dR * dR + dG * dG + dB * dB;
    count += 3;
  }
  const mse = count > 0 ? sumSq / count : 0;
  if (mse === 0) return 99.0;
  return parseFloat((10 * Math.log10((255 * 255) / mse)).toFixed(2));
}

/**
 * Clasificador temporal de transiciones:
 * Distingue entre:
 * - 'flash': Destello de 1 fotograma (F_{t-1} vs F_t alto, pero F_{t-1} vs F_{t+1} bajo).
 * - 'cut': Corte de plano real (F_{t-1} vs F_t alto, y F_{t-1} vs F_{t+1} alto).
 * - 'hold': Cuadro duplicado o estático de anime (diferencia < DUPLICATE_THRESHOLD).
 * - 'motion': Movimiento normal continuo.
 */
export function classifyTransition(rgbaPrev, rgbaCurr, rgbaNext = null, options = {}) {
  const cutThreshold = options.cutThreshold ?? RIFE_SETTINGS.SCENE_CUT_THRESHOLD;
  const duplicateThreshold = options.duplicateThreshold ?? RIFE_SETTINGS.DUPLICATE_THRESHOLD;

  const diffPrevCurr = calculateFrameDifference(rgbaPrev, rgbaCurr);
  if (diffPrevCurr < duplicateThreshold) {
    return { type: 'hold', diff: diffPrevCurr };
  }

  if (diffPrevCurr > cutThreshold) {
    if (rgbaNext) {
      const diffPrevNext = calculateFrameDifference(rgbaPrev, rgbaNext);
      // Si la escena regresa inmediatamente al fondo anterior, fue un flash de 1 cuadro
      if (diffPrevNext < cutThreshold * 0.75) {
        return { type: 'flash', diff: diffPrevCurr, diffRecovery: diffPrevNext };
      }
    }
    return { type: 'cut', diff: diffPrevCurr };
  }

  return { type: 'motion', diff: diffPrevCurr };
}

/**
 * Calcula percentiles (P50, P95, P99, min, max, avg) de una muestra de latencias
 */
export function computePercentiles(samples) {
  if (!samples || samples.length === 0) {
    return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0, count: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const count = sorted.length;
  const p50 = sorted[Math.floor(count * 0.50)];
  const p95 = sorted[Math.floor(count * 0.95)];
  const p99 = sorted[Math.floor(count * 0.99)];
  const min = sorted[0];
  const max = sorted[count - 1];
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = parseFloat((sum / count).toFixed(2));
  return { p50, p95, p99, min, max, avg, count };
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
 * Instancia y orquesta el pipeline de interpolación RIFE WebGPU con telemetría de hardware
 */
export async function createRifeEngine({
  width = 640,
  height = 368,
  targetMode = '48fps',
  onTelemetry,
  onSceneCut,
  onDuplicateBypass,
  onFlashDetected,
  onError,
}) {
  const gpuCheck = await checkWebGPUSupport();
  if (!gpuCheck.supported || !gpuCheck.hasF16) {
    const err = new Error(gpuCheck.reason);
    onError?.(err);
    throw err;
  }

  const { w, h } = quantizeToMultipleOf16(width, height);
  const requiredFeatures = ['shader-f16'];
  if (gpuCheck.hasTimestampQuery) {
    requiredFeatures.push('timestamp-query');
  }

  const device = await gpuCheck.adapter.requestDevice({
    requiredFeatures,
  });

  const { weightsBin, weightsManifest } = await loadRifeWeights();

  // Framegen tfact (v7s) exige textureInput: true y textureOutput: true
  const rt = await createRT(device, {
    w,
    h,
    weightsBin,
    weightsManifest,
    textureInput: true,
    textureOutput: true,
  });

  // Texturas de entrada y salida residentes en GPU (Zero-Copy)
  const texA = device.createTexture({
    size: [w, h],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const texB = device.createTexture({
    size: [w, h],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
  });

  const outTex = device.createTexture({
    size: [w, h],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC,
  });

  const blendTex = device.createTexture({
    size: [w, h],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  });

  // Estimación de memoria VRAM asignada
  const vramTexturesBytes = (w * h * 4) * 4;
  const vramFeaturesBytes = (w * h * 2) * 20; // Aproximación piramidal f16 IFNet
  const estimatedVramMb = parseFloat(((vramTexturesBytes + vramFeaturesBytes) / (1024 * 1024)).toFixed(2));

  // Shader para presentar texturas directamente en el canvas WebGPU sin costo de CPU
  const canvasFormat = navigator.gpu?.getPreferredCanvasFormat?.() || 'bgra8unorm';
  const blitModule = device.createShaderModule({
    label: 'blit-to-canvas-shader',
    code: `
      @vertex fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
        var pos = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
        return vec4f(pos[vi], 0.0, 1.0);
      }
      @group(0) @binding(0) var t: texture_2d<f32>;
      @fragment fn fs(@builtin(position) p: vec4f) -> @location(0) vec4f {
        return textureLoad(t, vec2i(p.xy), 0);
      }
    `,
  });

  const blitPipeline = device.createRenderPipeline({
    label: 'blit-pipeline',
    layout: 'auto',
    vertex: { module: blitModule, entryPoint: 'vs' },
    fragment: {
      module: blitModule,
      entryPoint: 'fs',
      targets: [{ format: canvasFormat }],
    },
  });

  function presentToCanvas(srcTexture, webgpuContext) {
    if (!webgpuContext || isDestroyed) return;
    const encoder = device.createCommandEncoder({ label: 'present-blit-encoder' });
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: webgpuContext.getCurrentTexture().createView(),
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    pass.setPipeline(blitPipeline);
    const bindGroup = device.createBindGroup({
      layout: blitPipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: srcTexture.createView() }],
    });
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  let isDestroyed = false;
  let activeTarget = INTERPOLATION_TARGETS[targetMode] || INTERPOLATION_TARGETS['48fps'];

  // Telemetría con registro de percentiles (ventana deslizante de 100 muestras)
  const latencyHistory = [];
  let droppedFrames = 0;
  let lastCpuDispatchMs = 0;
  let lastGpuExecutionMs = 0;

  /**
   * Extrae los píxeles de salida de la GPU a un buffer Uint8Array en CPU
   * Utilizado para validación matemática contra Ground Truth
   */
  async function readbackOutputFrame() {
    const bytesPerRow = Math.ceil((w * 4) / 256) * 256;
    const bufferSize = bytesPerRow * h;
    const readbackBuffer = device.createBuffer({
      size: bufferSize,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture: outTex },
      { buffer: readbackBuffer, bytesPerRow, rowsPerImage: h },
      [w, h]
    );
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    await readbackBuffer.mapAsync(GPUMapMode.READ);
    const mapped = new Uint8Array(readbackBuffer.getMappedRange());
    const result = new Uint8Array(w * h * 4);
    for (let row = 0; row < h; row++) {
      const srcOffset = row * bytesPerRow;
      const dstOffset = row * w * 4;
      result.set(mapped.subarray(srcOffset, srcOffset + w * 4), dstOffset);
    }
    readbackBuffer.unmap();
    readbackBuffer.destroy();
    return result;
  }

  /**
   * Procesa un par de fotogramas secuenciales (Frame A y Frame B)
   * Devuelve el fotograma intermedio interpolado en t = 0.5 con sincronización real GPU
   */
  async function interpolatePair(rgbaA, rgbaB, options = {}) {
    if (isDestroyed) return null;

    const { forceMode = 'rife', rgbaNext = null } = options;
    const t0 = performance.now();

    // 1. Clasificación temporal avanzada de la transición
    const classification = classifyTransition(rgbaA, rgbaB, rgbaNext);

    if (classification.type === 'hold') {
      onDuplicateBypass?.({ diff: classification.diff });
      return {
        frame: rgbaA,
        mode: 'duplicate-hold',
        diff: classification.diff,
        cpuDispatchMs: 0.05,
        gpuExecutionMs: 0.0,
        totalGpuMs: 0.05,
        motionDetected: false,
      };
    }

    if (classification.type === 'flash') {
      onFlashDetected?.({ diff: classification.diff, recovery: classification.diffRecovery });
      // En un flash de 1 cuadro se presenta Frame A sin distorsionar el flujo óptico
      return {
        frame: rgbaA,
        mode: 'flash-bypass',
        diff: classification.diff,
        cpuDispatchMs: 0.05,
        gpuExecutionMs: 0.0,
        totalGpuMs: 0.05,
        motionDetected: true,
      };
    }

    if (classification.type === 'cut') {
      onSceneCut?.({ diff: classification.diff });
      return {
        frame: rgbaA, // En un corte se mantiene Frame A para evitar morphing irreal
        mode: 'scene-cut-bypass',
        diff: classification.diff,
        cpuDispatchMs: 0.05,
        gpuExecutionMs: 0.0,
        totalGpuMs: 0.05,
        motionDetected: true,
      };
    }

    // 2. Modo Alpha Blending ingenuo
    if (forceMode === 'blend') {
      const blended = generateAlphaBlendFrame(rgbaA, rgbaB, 0.5);
      const tSubmit = performance.now();
      if (options.targetWebgpuContext) {
        device.queue.writeTexture({ texture: blendTex }, blended, { bytesPerRow: w * 4 }, [w, h]);
        presentToCanvas(blendTex, options.targetWebgpuContext);
      }
      await device.queue.onSubmittedWorkDone();
      const tDone = performance.now();
      return {
        frame: blended,
        mode: 'alpha-blend',
        diff: classification.diff,
        cpuDispatchMs: parseFloat((tSubmit - t0).toFixed(2)),
        gpuExecutionMs: parseFloat((tDone - tSubmit).toFixed(2)),
        totalGpuMs: parseFloat((tDone - t0).toFixed(2)),
        motionDetected: true,
      };
    }

    // 3. Modo Nativo directo
    if (forceMode === 'native') {
      const tSubmit = performance.now();
      if (options.targetWebgpuContext) {
        if (options.sourceCanvasA) {
          device.queue.copyExternalImageToTexture({ source: options.sourceCanvasA }, { texture: texA }, [w, h]);
        } else if (rgbaA instanceof Uint8Array) {
          device.queue.writeTexture({ texture: texA }, rgbaA, { bytesPerRow: w * 4 }, [w, h]);
        }
        presentToCanvas(texA, options.targetWebgpuContext);
      }
      await device.queue.onSubmittedWorkDone();
      const tDone = performance.now();
      return {
        frame: rgbaA,
        mode: 'native',
        diff: classification.diff,
        cpuDispatchMs: parseFloat((tSubmit - t0).toFixed(2)),
        gpuExecutionMs: parseFloat((tDone - tSubmit).toFixed(2)),
        totalGpuMs: parseFloat((tDone - t0).toFixed(2)),
        motionDetected: true,
      };
    }

    // 4. Inferencia Neuronal Real RIFE con sincronización obligatoria de hardware
    try {
      if (options.sourceCanvasA && options.sourceCanvasB) {
        device.queue.copyExternalImageToTexture({ source: options.sourceCanvasA }, { texture: texA }, [w, h]);
        device.queue.copyExternalImageToTexture({ source: options.sourceCanvasB }, { texture: texB }, [w, h]);
      } else {
        device.queue.writeTexture({ texture: texA }, rgbaA, { bytesPerRow: w * 4 }, [w, h]);
        device.queue.writeTexture({ texture: texB }, rgbaB, { bytesPerRow: w * 4 }, [w, h]);
      }

      // Registro de comandos en CPU
      rt.prepPair(texA, texB);
      rt.runT(0.5, outTex);

      if (options.targetWebgpuContext) {
        presentToCanvas(outTex, options.targetWebgpuContext);
      }

      const tSubmit = performance.now();
      lastCpuDispatchMs = parseFloat((tSubmit - t0).toFixed(2));

      // Sincronización real de hardware: esperar a que la GPU ejecute todos los shaders de convolución y warping
      await device.queue.onSubmittedWorkDone();
      const tDone = performance.now();

      const totalGpuMs = parseFloat((tDone - t0).toFixed(2));
      lastGpuExecutionMs = parseFloat((tDone - tSubmit).toFixed(2));

      // Registro en el buffer de percentiles
      latencyHistory.push(totalGpuMs);
      if (latencyHistory.length > 100) latencyHistory.shift();

      const percentiles = computePercentiles(latencyHistory);

      // Verificación de presupuesto de tiempo (Deadline)
      const budgetMs = activeTarget.frameIntervalMs * RIFE_SETTINGS.MAX_GPU_BUDGET_RATIO;
      if (totalGpuMs > budgetMs) {
        droppedFrames++;
      }

      onTelemetry?.({
        cpuDispatchMs: lastCpuDispatchMs,
        gpuExecutionMs: lastGpuExecutionMs,
        totalGpuMs,
        p50: percentiles.p50,
        p95: percentiles.p95,
        p99: percentiles.p99,
        diff: parseFloat(classification.diff.toFixed(4)),
        droppedFrames,
        estimatedVramMb,
        gpuVendor: gpuCheck.gpuInfo.vendor,
        gpuArchitecture: gpuCheck.gpuInfo.architecture,
        gpuDevice: gpuCheck.gpuInfo.device,
        gpuDescription: gpuCheck.gpuInfo.description,
        gpuDriver: gpuCheck.gpuInfo.driver,
        hasTimestampQuery: gpuCheck.hasTimestampQuery,
      });

      return {
        outTexture: outTex,
        mode: 'rife-neural',
        diff: classification.diff,
        cpuDispatchMs: lastCpuDispatchMs,
        gpuExecutionMs: lastGpuExecutionMs,
        totalGpuMs,
        motionDetected: true,
      };
    } catch (err) {
      onError?.(err);
      return {
        frame: rgbaA,
        mode: 'error-fallback',
        diff: classification.diff,
        cpuDispatchMs: 0,
        gpuExecutionMs: 0,
        totalGpuMs: performance.now() - t0,
        error: err.message,
      };
    }
  }

  /**
   * Ejecuta una evaluación comparativa matemática contra Ground Truth
   */
  async function evaluateAgainstGroundTruth(rgba0, rgba1_gt, rgba2) {
    // 1. Inferencia RIFE
    device.queue.writeTexture({ texture: texA }, rgba0, { bytesPerRow: w * 4 }, [w, h]);
    device.queue.writeTexture({ texture: texB }, rgba2, { bytesPerRow: w * 4 }, [w, h]);
    rt.prepPair(texA, texB);
    rt.runT(0.5, outTex);
    await device.queue.onSubmittedWorkDone();
    const rifePred = await readbackOutputFrame();

    // 2. Alpha Blend
    const blendPred = generateAlphaBlendFrame(rgba0, rgba2, 0.5);

    // 3. Hold Frame 0
    const holdPred = rgba0;

    // Métricas
    const rifeMae = calculateMAE(rifePred, rgba1_gt);
    const rifePsnr = calculatePSNR(rifePred, rgba1_gt);

    const blendMae = calculateMAE(blendPred, rgba1_gt);
    const blendPsnr = calculatePSNR(blendPred, rgba1_gt);

    const holdMae = calculateMAE(holdPred, rgba1_gt);
    const holdPsnr = calculatePSNR(holdPred, rgba1_gt);

    return {
      rife: { mae: rifeMae, psnr: rifePsnr },
      blend: { mae: blendMae, psnr: blendPsnr },
      hold: { mae: holdMae, psnr: holdPsnr },
    };
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
      texA.destroy();
      texB.destroy();
      outTex.destroy();
      blendTex.destroy();
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
    estimatedVramMb,
    interpolatePair,
    evaluateAgainstGroundTruth,
    readbackOutputFrame,
    setTargetMode,
    destroy,
  };
}
