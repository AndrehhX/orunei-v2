/**
 * webgpuSuperResEngine.js
 * 
 * Motor de Superresolución Espacial Neuronal en Tiempo Real mediante WebGPU
 * Basado en WebSR (@websr/websr) y modelos convolucionales (CNN) de Anime4K (bloc97).
 * 
 * Características:
 * - Inferencia en GPU mediante compute shaders WGSL / WebGPU nativos.
 * - Modelos reales Anime4K CNN: Small (liviano) y Medium (profundo).
 * - Escalado espacial real 2× (720p -> 1440p, 1080p -> 4K/2160p).
 * - Sincronización temporal 1:1 con la cadencia de fotogramas del video (requestVideoFrameCallback).
 * - Cero frame generation: conserva audio, subtítulos y FPS originales.
 * - Modo de comparación interactivo A/B (Split-Screen / Bypass) con recorte CSS sin sobrecarga GPU.
 * - Manejo robusto de errores de origen/CORS y fallback automático al reproductor nativo.
 */

export const WEBGPU_SUPER_RES_SETTINGS = {
  MIN_ACCEPTABLE_FPS: 20,
  FPS_MONITOR_WINDOW_MS: 3000,
};

export const WEBGPU_SUPER_RES_MODES = [
  {
    id: 'off',
    label: 'Normal',
    networkName: null,
    scale: 1,
    description: 'Video original sin procesamiento neuronal',
  },
  {
    id: 'cnn-s',
    label: 'CNN Small 2×',
    networkName: 'anime4k/cnn-2x-s',
    weightsPath: '/weights/anime4k/cnn-2x-s.json',
    scale: 2,
    description: 'Red neuronal liviana 2× (menor consumo de GPU)',
  },
  {
    id: 'cnn-m',
    label: 'CNN Medium 2×',
    networkName: 'anime4k/cnn-2x-m',
    weightsPath: '/weights/anime4k/cnn-2x-m.json',
    scale: 2,
    description: 'Red neuronal profunda 2× (mayor detalle de reconstrucción)',
  },
];

/**
 * Comprueba de forma segura si el navegador y la GPU soportan WebGPU
 */
export async function isWebGPUSupported() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return Boolean(adapter);
  } catch {
    return false;
  }
}

/**
 * Carga los pesos del modelo neuronal seleccionado
 */
export async function loadModelWeights(modeId) {
  const mode = WEBGPU_SUPER_RES_MODES.find((m) => m.id === modeId);
  if (!mode || !mode.weightsPath) return null;

  // 1. En navegador: Fetch HTTP desde /weights/anime4k/
  if (typeof fetch === 'function') {
    try {
      const res = await fetch(mode.weightsPath);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Ignorar fallo de red y proceder al fallback
    }
  }

  // 2. En entorno Node.js o fallback local por sistema de archivos
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fsModuleName = 'node:fs/promises';
      const pathModuleName = 'node:path';
      const fs = await import(/* @vite-ignore */ fsModuleName);
      const path = await import(/* @vite-ignore */ pathModuleName);
      const fileName = modeId === 'cnn-m' ? 'cnn-2x-m.json' : 'cnn-2x-s.json';
      const filePath = path.resolve('public/weights/anime4k', fileName);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Continuar al siguiente fallback
    }
  }

  // 3. Fallback directo desde node_modules/@websr/websr/weights/anime4k
  try {
    const fileName = modeId === 'cnn-m' ? 'cnn-2x-m-an.json' : 'cnn-2x-s-an.json';
    const weightsModule = await import(`@websr/websr/weights/anime4k/${fileName}`, {
      assert: { type: 'json' },
    }).catch(() => null);
    if (weightsModule?.default) return weightsModule.default;
  } catch {
    // Si no se puede cargar, retorna null
  }

  return null;
}

/**
 * Calcula la resolución de salida esperada y factor de escala
 */
export function calculateUpscaledDimensions(inputWidth, inputHeight, scale = 2) {
  if (!inputWidth || !inputHeight || inputWidth <= 0 || inputHeight <= 0) {
    return { width: 0, height: 0, scale: 1, aspectRatio: 1 };
  }
  return {
    width: Math.round(inputWidth * scale),
    height: Math.round(inputHeight * scale),
    scale,
    aspectRatio: inputWidth / inputHeight,
  };
}

/**
 * Administrador del ciclo de vida del motor de superresolución WebGPU
 */
export async function createWebGPUSuperResEngine({
  video,
  container,
  mode = 'cnn-s',
  splitMode = 0, // 0 = Full screen, 1 = Split A/B, 2 = Bypass
  splitPos = 0.5,
  onFpsUpdate,
  onPerformanceDrop,
  onError,
}) {
  if (!video || !container) {
    throw new Error('video and container are required to initialize WebGPU Super Resolution');
  }

  // 1. Verificación preliminar de soporte WebGPU
  const supported = await isWebGPUSupported();
  if (!supported) {
    const err = new Error('WebGPU no está soportado en este dispositivo o navegador');
    onError?.(err);
    return null;
  }

  const activeModeConfig = WEBGPU_SUPER_RES_MODES.find((m) => m.id === mode);
  if (!activeModeConfig || activeModeConfig.id === 'off') {
    return null;
  }

  // Asegurar contexto global para empaquetado WebSR
  if (typeof globalThis.self === 'undefined') {
    globalThis.self = globalThis;
  }

  // 2. Preparar el canvas superpuesto con escalado proporcional garantizado
  let canvas = container.querySelector('#webgpu-super-res-layer');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'webgpu-super-res-layer';
    // object-contain garantiza paridad de encuadre y letterboxing con el video HTML5
    canvas.className = 'absolute inset-0 w-full h-full object-contain pointer-events-none z-10 transition-opacity duration-150';
    canvas.style.display = 'block';
    if (video.nextSibling) {
      container.insertBefore(canvas, video.nextSibling);
    } else {
      container.appendChild(canvas);
    }
  }

  let websrInstance = null;
  let isDestroyed = false;
  let vfcId = null;
  let rafId = null;
  let currentSplitMode = splitMode || 0;
  let currentSplitPos = splitPos != null ? splitPos : 0.5;

  let frameCount = 0;
  let lastFpsCheckTime = performance.now();
  let lowFpsDuration = 0;
  let totalInferenceMs = 0;
  let inferenceCount = 0;
  let lastMeasuredInferenceMs = 0;

  // Aplicar modo de comparación visual A/B mediante CSS clip-path
  function updateSplitView() {
    if (!canvas || isDestroyed) return;
    if (currentSplitMode === 2) {
      // Bypass total (video original directo)
      canvas.style.opacity = '0';
      canvas.style.clipPath = 'none';
    } else if (currentSplitMode === 1) {
      // Split A/B: Izquierda = Video original | Derecha = WebGPU CNN
      canvas.style.opacity = '1';
      const pct = Math.max(0, Math.min(100, Math.round(currentSplitPos * 100)));
      canvas.style.clipPath = `polygon(${pct}% 0, 100% 0, 100% 100%, ${pct}% 100%)`;
    } else {
      // Full screen superresolución
      canvas.style.opacity = '1';
      canvas.style.clipPath = 'none';
    }
  }

  updateSplitView();

  try {
    // 3. Importación dinámica de WebSR
    const { default: WebSR } = await import('@websr/websr');

    // 4. Inicialización del dispositivo WebGPU
    const gpu = await WebSR.initWebGPU();
    if (!gpu) {
      throw new Error('No se pudo inicializar el adaptador/dispositivo WebGPU');
    }

    // 5. Carga de pesos oficiales de la red Anime4K CNN
    const weights = await loadModelWeights(activeModeConfig.id);
    if (!weights) {
      throw new Error(`No se pudieron cargar los pesos neuronales para el modelo ${activeModeConfig.networkName}`);
    }

    if (isDestroyed) {
      return null;
    }

    // 6. Instanciación de WebSR
    websrInstance = new WebSR({
      network_name: activeModeConfig.networkName,
      weights,
      gpu,
      canvas,
    });
  } catch (err) {
    if (canvas && canvas.parentNode) {
      canvas.style.display = 'none';
    }
    onError?.(err);
    return null;
  }

  // 7. Loop de procesamiento ligado a fotogramas reales del video (requestVideoFrameCallback)
  async function renderFrame() {
    if (isDestroyed || !websrInstance) return;

    if (document.hidden || video.paused || video.ended) {
      scheduleNext();
      return;
    }

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      try {
        // Medición real de tiempo de inferencia GPU por fotograma
        const tStart = performance.now();
        await websrInstance.render(video);
        const tDuration = performance.now() - tStart;
        lastMeasuredInferenceMs = tDuration;
        totalInferenceMs += tDuration;
        inferenceCount++;
      } catch (err) {
        // En caso de error de seguridad (CORS en la fuente) o fallo WebGPU, salir limpiamente
        onError?.(err);
        destroy();
        return;
      }
    }

    // Medición de rendimiento y detección de sobrecarga
    frameCount++;
    const now = performance.now();
    const elapsed = now - lastFpsCheckTime;
    if (elapsed >= 1000) {
      const currentFps = Math.round((frameCount * 1000) / elapsed);
      const avgInferenceMs = inferenceCount > 0
        ? parseFloat((totalInferenceMs / inferenceCount).toFixed(1))
        : parseFloat(lastMeasuredInferenceMs.toFixed(1));

      // Notificar FPS y tiempo de inferencia GPU medido empíricamente
      onFpsUpdate?.({
        fps: currentFps,
        inferenceMs: avgInferenceMs,
        samples: inferenceCount,
      });

      if (currentFps < WEBGPU_SUPER_RES_SETTINGS.MIN_ACCEPTABLE_FPS && !video.paused) {
        lowFpsDuration += elapsed;
        if (lowFpsDuration >= WEBGPU_SUPER_RES_SETTINGS.FPS_MONITOR_WINDOW_MS) {
          onPerformanceDrop?.({ fps: currentFps, inferenceMs: avgInferenceMs });
          destroy();
          return;
        }
      } else {
        lowFpsDuration = 0;
      }

      frameCount = 0;
      totalInferenceMs = 0;
      inferenceCount = 0;
      lastFpsCheckTime = now;
    }

    scheduleNext();
  }

  function scheduleNext() {
    if (isDestroyed) return;
    if (typeof video.requestVideoFrameCallback === 'function') {
      vfcId = video.requestVideoFrameCallback(() => {
        renderFrame();
      });
    } else {
      rafId = requestAnimationFrame(() => {
        renderFrame();
      });
    }
  }

  // Eventos para actualizar fotograma al buscar o reanudar
  const handleSeekedOrPlay = () => {
    if (!isDestroyed) {
      renderFrame();
    }
  };

  video.addEventListener('seeked', handleSeekedOrPlay);
  video.addEventListener('play', handleSeekedOrPlay);

  scheduleNext();

  function destroy() {
    if (isDestroyed) return;
    isDestroyed = true;

    video.removeEventListener('seeked', handleSeekedOrPlay);
    video.removeEventListener('play', handleSeekedOrPlay);

    if (vfcId != null && typeof video.cancelVideoFrameCallback === 'function') {
      video.cancelVideoFrameCallback(vfcId);
      vfcId = null;
    }
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (websrInstance) {
      try {
        websrInstance.destroy?.();
      } catch {}
      websrInstance = null;
    }

    if (canvas) {
      canvas.style.display = 'none';
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvas = null;
    }
  }

  return {
    destroy,
    getCanvas: () => canvas,
    setMode: async (newModeId) => {
      const cfg = WEBGPU_SUPER_RES_MODES.find((m) => m.id === newModeId);
      if (!cfg || cfg.id === 'off' || !websrInstance) return;
      try {
        const w = await loadModelWeights(newModeId);
        if (w) {
          websrInstance.switchNetwork(cfg.networkName, w);
        }
      } catch (err) {
        onError?.(err);
      }
    },
    setSplitComparison: ({ enabled = false, position = 0.5, bypass = false } = {}) => {
      currentSplitMode = bypass ? 2 : (enabled ? 1 : 0);
      currentSplitPos = position;
      updateSplitView();
    },
    getCurrentConfig: () => ({
      mode,
      splitMode: currentSplitMode,
      splitPos: currentSplitPos,
      scale: activeModeConfig.scale,
    }),
  };
}
