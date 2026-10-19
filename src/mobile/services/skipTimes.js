/**
 * Módulo para detección de aperturas y cierres (Openings y Endings)
 * Consulta la API pública y abierta de AniSkip (https://aniskip.com)
 * e incorpora fallback inteligente de 85s cuando no hay marcas registradas,
 * además de soporte para "Saltar intro automáticamente" (Auto-Skip).
 */

const skipCache = new Map();
export const AUTO_SKIP_KEY = 'orunei_auto_skip_intro';
export const STANDARD_INTRO_DURATION = 85;

function getLocalStorage() {
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

/**
 * Consulta si el usuario tiene activado el salto automático de intros/endings.
 */
export function isAutoSkipEnabled() {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    return storage.getItem(AUTO_SKIP_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Guarda la preferencia de auto-skip.
 */
export function setAutoSkipEnabled(enabled) {
  const storage = getLocalStorage();
  if (!storage) return false;
  try {
    storage.setItem(AUTO_SKIP_KEY, enabled ? 'true' : 'false');
    return Boolean(enabled);
  } catch {
    return false;
  }
}

/**
 * Consulta intervalos de salto para un episodio dado.
 * @param {Object} params
 * @param {number|string} params.malId - ID de MyAnimeList
 * @param {number|string} params.episodeNumber - Número del episodio
 * @param {number} [params.episodeLength] - Duración en segundos del video
 * @returns {Promise<Array<{ type: string, startTime: number, endTime: number, targetTime: number, label: string }>>}
 */
export async function fetchSkipTimes({ malId, episodeNumber, episodeLength = 0 }) {
  if (!malId || !episodeNumber) return [];

  const cacheKey = `${malId}:${episodeNumber}`;
  if (skipCache.has(cacheKey)) {
    return skipCache.get(cacheKey);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const lengthVal = Math.round(Number(episodeLength) > 0 ? Number(episodeLength) : 1440);
    const url = `https://api.aniskip.com/v2/skip-times/${malId}/${episodeNumber}?types[]=op&types[]=ed&episodeLength=${lengthVal}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      skipCache.set(cacheKey, []);
      return [];
    }

    const data = await res.json();
    if (!data.found || !Array.isArray(data.results)) {
      skipCache.set(cacheKey, []);
      return [];
    }

    const intervals = data.results
      .filter((r) => r.interval && typeof r.interval.startTime === 'number' && typeof r.interval.endTime === 'number')
      .map((r) => {
        const isOp = r.skipType === 'op';
        return {
          type: r.skipType,
          startTime: r.interval.startTime,
          endTime: r.interval.endTime,
          targetTime: r.interval.endTime + 0.5,
          label: isOp ? 'Saltar Intro' : 'Saltar Ending',
        };
      });

    skipCache.set(cacheKey, intervals);
    return intervals;
  } catch (err) {
    return [];
  }
}

/**
 * Determina si el tiempo actual de reproducción se encuentra dentro de un intervalo registrado.
 */
export function getActiveSkipInterval(intervals, currentTime) {
  if (!Array.isArray(intervals) || intervals.length === 0 || typeof currentTime !== 'number') {
    return null;
  }

  for (const interval of intervals) {
    if (currentTime >= interval.startTime - 0.5 && currentTime < interval.endTime) {
      return {
        ...interval,
        targetTime: interval.targetTime || (interval.endTime + 0.5),
      };
    }
  }

  return null;
}

/**
 * Resuelve la acción de skip disponible:
 * 1. Si AniSkip tiene un intervalo activo para este momento, lo retorna.
 * 2. Si no hay intervalos registrados, ofrece botones inteligentes de fallback
 *    en los primeros minutos (+85s de intro) y en los créditos finales (ending).
 */
export function resolveActiveSkip({ intervals = [], currentTime, duration = 0 }) {
  if (typeof currentTime !== 'number' || isNaN(currentTime)) return null;

  // 1. Prioridad: intervalo oficial de AniSkip
  if (Array.isArray(intervals) && intervals.length > 0) {
    const matched = getActiveSkipInterval(intervals, currentTime);
    if (matched) return { ...matched, isFallback: false };
  }

  // 2. Fallback inteligente si AniSkip no tiene datos
  // Intro estándar: entre los segundos 10 y 180 (los primeros 3 minutos)
  if ((!intervals || intervals.length === 0) && currentTime >= 10 && currentTime <= 180) {
    const target = duration > 0 ? Math.min(currentTime + STANDARD_INTRO_DURATION, duration - 10) : currentTime + STANDARD_INTRO_DURATION;
    return {
      type: 'fallback_op',
      startTime: currentTime,
      endTime: target,
      targetTime: target,
      label: 'Saltar Intro (+85s)',
      isFallback: true,
    };
  }

  // Ending estándar: en los últimos 2 minutos de videos de más de 60 segundos
  if ((!intervals || intervals.length === 0) && duration > 60 && currentTime >= duration - 120 && currentTime <= duration - 10) {
    return {
      type: 'fallback_ed',
      startTime: currentTime,
      endTime: duration - 2,
      targetTime: duration - 2,
      label: 'Saltar Ending',
      isFallback: true,
    };
  }

  return null;
}
