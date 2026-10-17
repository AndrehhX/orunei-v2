import { resolveAnimeAV1Slug } from './dubSeasonManager.js';

const rawEnvUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_STREAM_API_URL || '').trim() : '';
const STREAM_BASE = (rawEnvUrl && !rawEnvUrl.includes('trycloudflare.com') && rawEnvUrl.startsWith('http'))
  ? rawEnvUrl.replace(/\/+$/, '')
  : 'https://orunei-stream.thealex230820.workers.dev';

const ANIMEAV1_BASE = 'https://animeav1.com';

function getProxiedUrl(targetUrl, referer = 'https://animeav1.com/') {
  if (typeof window === 'undefined') return targetUrl;
  return `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(targetUrl)}&referer=${encodeURIComponent(referer)}`;
}

/**
 * Extrae la URL directa de video desde un embed de YourUpload.
 * Retorna video MP4 Full HD (1080p) con cabeceras CORS permisivas.
 */
async function extractYourUploadStream(embedUrl) {
  try {
    const fetchUrl = getProxiedUrl(embedUrl, `${ANIMEAV1_BASE}/`);
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/content="([^"]+)"\s*property="og:video"/i) || html.match(/property="og:video"\s*content="([^"]+)"/i);
    const videoUrl = match?.[1];
    if (videoUrl && !videoUrl.includes('novideo.mp4')) {
      return videoUrl;
    }
  } catch (err) {
    console.warn('[dubStreamAdapter] Error en extractor YourUpload:', err.message);
  }
  return null;
}

/**
 * Extrae la URL directa de video desde un embed de MP4Upload.
 * Retorna video MP4 Bluray 1080p que se sirve a través del proxy de streaming.
 */
async function extractMP4UploadStream(embedUrl) {
  try {
    const fetchUrl = getProxiedUrl(embedUrl, `${ANIMEAV1_BASE}/`);
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/src:\s*"([^"]+\.mp4)"/);
    if (match?.[1]) {
      return match[1];
    }
  } catch (err) {
    console.warn('[dubStreamAdapter] Error en extractor MP4Upload:', err.message);
  }
  return null;
}

/**
 * Obtiene la reproducción de un episodio doblado en audio español.
 * Cumple con la selección inteligente del mejor servidor 1080p
 * y conserva la compatibilidad exacta con la interfaz de AnimePlayer.
 */
export async function getDubEpisodePlayback({ animeId, malId, animeTitle, slug = null, episode = 1, language = 'latino' }) {
  let resolvedSlug = slug;
  if (!resolvedSlug) {
    const slugInfo = await resolveAnimeAV1Slug(malId || animeId, animeTitle);
    if (!slugInfo?.slug) {
      throw new Error('No se encontró fuente de doblaje para este anime.');
    }
    resolvedSlug = slugInfo.slug;
  }

  const epUrl = `${ANIMEAV1_BASE}/media/${resolvedSlug}/${episode}/__data.json`;
  const res = await fetch(getProxiedUrl(epUrl));
  if (!res.ok) {
    throw new Error(`No se pudo obtener información del episodio ${episode} (HTTP ${res.status}).`);
  }

  const json = await res.json();
  const d = json.nodes?.[2]?.data;
  if (!d) {
    throw new Error('Estructura de datos de episodio no válida.');
  }

  // Localizar objeto embeds
  let embedsObj = null;
  for (const item of d) {
    if (item && typeof item === 'object' && item.embeds !== undefined) {
      embedsObj = item.embeds;
      break;
    }
  }

  const embedsD = typeof embedsObj === 'number' ? d[embedsObj] : embedsObj;
  const dubArrayIdx = embedsD?.DUB;
  if (dubArrayIdx === undefined) {
    throw new Error(`El episodio ${episode} no tiene pista de audio doblado disponible.`);
  }

  const dubIndices = typeof dubArrayIdx === 'number' ? d[dubArrayIdx] : dubArrayIdx;
  const rawServers = [];
  if (Array.isArray(dubIndices)) {
    for (const idx of dubIndices) {
      const srv = typeof idx === 'number' ? d[idx] : idx;
      const srvName = typeof srv.server === 'number' ? d[srv.server] : srv.server;
      const srvUrl = typeof srv.url === 'number' ? d[srv.url] : srv.url;
      if (srvName && srvUrl) {
        rawServers.push({ server: srvName, url: srvUrl });
      }
    }
  }

  if (rawServers.length === 0) {
    throw new Error('No se encontraron servidores de audio doblado para este episodio.');
  }

  // Extracción inteligente en paralelo con priorización de calidad Full HD 1080p
  const verifiedServers = [];

  // 1. Prioridad: MP4Upload (Direct 1080p MP4 Bluray AV1/NVENC, servido vía proxy con referer oficial)
  const mp4Server = rawServers.find((s) => s.server.toLowerCase().includes('mp4upload'));
  if (mp4Server) {
    const directMp4 = await extractMP4UploadStream(mp4Server.url);
    if (directMp4) {
      const proxiedMp4 = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(directMp4)}&referer=${encodeURIComponent('https://www.mp4upload.com/')}`;
      verifiedServers.push({
        id: 'dub-mp4upload',
        name: '🇲🇽 Servidor 1 (Latino 1080p Bluray)',
        proxiedStreamUrl: proxiedMp4,
        quality: '1080p',
        sourceName: 'MP4Upload'
      });
    }
  }

  // 2. Prioridad: YourUpload (Direct 1080p MP4, servido vía proxy con referer oficial para evitar 500)
  const yuServer = rawServers.find((s) => s.server.toLowerCase().includes('yourupload'));
  if (yuServer) {
    const directYu = await extractYourUploadStream(yuServer.url);
    if (directYu) {
      const proxiedYu = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(directYu)}&referer=${encodeURIComponent('https://www.yourupload.com/')}`;
      verifiedServers.push({
        id: 'dub-yourupload',
        name: '🇲🇽 Servidor 2 (Latino 1080p Direct)',
        proxiedStreamUrl: proxiedYu,
        quality: '1080p',
        sourceName: 'YourUpload'
      });
    }
  }

  // 3. Fallback HLS
  const hlsServer = rawServers.find((s) => s.server.toLowerCase().includes('hls'));
  if (hlsServer) {
    const m3u8Url = hlsServer.url.replace('/play/', '/m3u8/');
    verifiedServers.push({
      id: 'dub-hls',
      name: '🇲🇽 Servidor 3 (Latino HLS Alternativo)',
      proxiedStreamUrl: m3u8Url,
      quality: '1080p',
      sourceName: 'HLS'
    });
  }

  if (verifiedServers.length === 0) {
    throw new Error('No se pudo extraer una fuente reproducible en 1080p para este episodio doblado.');
  }

  // El mejor servidor se coloca en primer lugar
  const bestServer = verifiedServers[0];

  return {
    proxiedStreamUrl: bestServer.proxiedStreamUrl,
    servers: verifiedServers,
    subtitles: { tracks: [] }, // En DUB el audio ya es español
    audioLanguage: language,
    isDub: true,
    resolution: '1080p'
  };
}
