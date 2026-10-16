/**
 * gpuBoostEngine.js (Capa de compatibilidad para código y tests heredados)
 * Reenvía al motor definitivo Anime Enhance (animeEnhanceEngine.js).
 */
import {
  ANIME_ENHANCE_SETTINGS,
  createAnimeEnhanceEngine,
  isWebGL2Supported,
  getLuma,
  computeAnimeEnhanceSample,
} from './animeEnhanceEngine.js';

export {
  isWebGL2Supported,
  getLuma,
  computeAnimeEnhanceSample as computeAnime4KSample,
};

export const GPU_BOOST_SETTINGS = {
  ...ANIME_ENHANCE_SETTINGS,
  DEFAULT_SHARPNESS: 0.65,
};

export const GPU_BOOST_MODES = [
  { id: 'balanced', label: 'Equilibrado', description: 'Mejora de nitidez moderada (GPU eficiente)', sharpness: 0.65 },
  { id: 'ultra', label: 'Ultra Blu-ray', description: 'Calidad cristalina estilo masterización Blu-ray', sharpness: 1.0 },
  { id: 'extreme', label: 'Extremo 4K', description: 'Máxima definición para pantallas 2K/4K de alta gama', sharpness: 1.35 },
];

export function computeCASSample(c, n, s, w, e, sharpness = 0.40) {
  if (Array.isArray(c)) {
    return [0, 1, 2].map((i) => computeCASSample(c[i], n[i], s[i], w[i], e[i], sharpness));
  }
  const minVal = Math.min(c, n, s, w, e);
  const maxVal = Math.max(c, n, s, w, e);
  const amp = Math.max(0, Math.min(1.0, Math.min(minVal, 2.0 - maxVal) / Math.max(maxVal, 1e-4)));
  const peak = -0.125 + (-0.22 - -0.125) * Math.max(0, Math.min(1.0, sharpness));
  const weight = Math.sqrt(amp) * peak;
  const unconstrained = (weight * (n + s + w + e) + c) / (1.0 + 4.0 * weight);
  return Math.max(minVal, Math.min(maxVal, unconstrained));
}

export function createGpuBoostEngine(opts) {
  return createAnimeEnhanceEngine({
    canvasId: 'gpu-upscaler-layer',
    ...opts,
  });
}
