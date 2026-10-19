const idCache = new Map();
const rawEnvUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_STREAM_API_URL || '').trim() : '';
const STREAM_BASE = (rawEnvUrl && !rawEnvUrl.includes('trycloudflare.com') && rawEnvUrl.startsWith('http'))
  ? rawEnvUrl.replace(/\/+$/, '')
  : 'https://orunei-stream.thealex230820.workers.dev';

/**
 * Resuelve el Miruro ID para un anime a partir de su ID de AniList y título.
 */
export async function getMiruroId(anilistId, animeTitle) {
  const cacheKey = `${anilistId}:${animeTitle}`;
  if (idCache.has(cacheKey)) {
    return idCache.get(cacheKey);
  }

  try {
    const url = `${STREAM_BASE}/api/stream/search?id=${encodeURIComponent(anilistId)}&title=${encodeURIComponent(animeTitle || '')}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const data = await resp.json();
    if (data.miruroId) {
      idCache.set(cacheKey, data.miruroId);
      return data.miruroId;
    }
  } catch (err) {
    console.warn('[streamAdapter] No se pudo resolver Miruro ID:', err.message);
  }

  return null;
}

/**
 * Obtiene la fuente de video HLS y las pistas de subtítulos en español e inglés
 * para un episodio específico.
 */
export async function getEpisodePlayback(miruroId, episodeNum = 1) {
  if (!miruroId) {
    throw new Error('Miruro ID no disponible');
  }

  const maxAttempts = 2;
  let lastData = null;
  let lastStatus = 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cacheBuster = attempt > 0 ? `&_t=${Date.now()}` : '';
    const url = `${STREAM_BASE}/api/stream/resolve?id=${encodeURIComponent(miruroId)}&ep=${encodeURIComponent(episodeNum)}${cacheBuster}`;
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (resp.ok) {
        lastData = data;
        break;
      }
      lastData = data;
      lastStatus = resp.status;
      if (attempt < maxAttempts - 1 && (resp.status === 502 || resp.status === 504 || data.error?.includes('502'))) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      break;
    } catch (err) {
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      throw err;
    }
  }

  if (!lastData || !lastData.url) {
    throw new Error(lastData?.error || `Error del servidor de streaming (${lastStatus})`);
  }

  return {
    url: lastData.url,
    subtitles: lastData.subtitles || [],
    title: lastData.title || `Episodio ${episodeNum}`,
    headers: lastData.headers || {},
  };
}
