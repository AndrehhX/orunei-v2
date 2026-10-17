import { resolveAnimeAV1Slug } from './dubSeasonManager.js';
import { selectAndPrioritizeServers } from './sourceSelector.js';
import { resolveLatanimeSlug, getLatanimeEpisodeServers } from './soraDubProvider.js';

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
 * Detecta si el dispositivo es un iPad, iPhone, tablet o navegador móvil
 * para priorizar perfiles H.264 de 8 bits universales y reproductores incrustados,
 * evitando la pantalla negra por incompatibilidad de hardware con AV1 de 10 bits.
 */
export function isMobileOrTabletDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isTouchMac = (navigator.platform === 'MacIntel' || ua.includes('Macintosh')) && (navigator.maxTouchPoints > 1);
  const isMobileUa = /iPad|iPhone|iPod|Android|Mobile|Tablet|CriOS|FxiOS|EdgiOS/i.test(ua);
  const isTouchScreen = ('ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0));
  const isSmallScreen = typeof window.innerWidth === 'number' && window.innerWidth <= 1024;
  return Boolean(isMobileUa || isTouchMac || (isTouchScreen && isSmallScreen));
}

/**
 * Extrae la URL directa de video desde StreamTape.
 * Retorna video MP4 Full HD 1080p codificado en H.264 estándar de 8 bits (yuv420p),
 * compatible de forma nativa con el 100% de iPads, iPhones y tablets sin pantalla negra.
 */
async function extractStreamTapeStream(embedUrl) {
  try {
    const fetchUrl = getProxiedUrl(embedUrl, `${ANIMEAV1_BASE}/`);
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/document\.getElementById\('robotlink'\)\.innerHTML\s*=\s*'([^']+)'\s*\+\s*\(?'([^']+)'\)?\.substring\((\d+)\)\.substring\((\d+)\)/)
      || html.match(/document\.getElementById\('robotlink'\)\.innerHTML\s*=\s*'([^']+)'\s*\+\s*\(?'([^']+)'\)?\.substring\((\d+)\)/);

    if (match) {
      const part1 = match[1];
      let part2 = match[2];
      const sub1 = parseInt(match[3], 10);
      const sub2 = match[4] ? parseInt(match[4], 10) : 0;
      part2 = part2.substring(sub1);
      if (sub2) part2 = part2.substring(sub2);
      let full = part1 + part2;
      if (full.startsWith('//')) full = 'https:' + full;
      return full;
    }
  } catch (err) {
    console.warn('[dubStreamAdapter] Error en extractor StreamTape:', err.message);
  }
  return null;
}

function extractDataNode(json) {
  if (!json) return null;
  if (Array.isArray(json.nodes)) {
    for (const node of json.nodes) {
      if (node && Array.isArray(node.data)) {
        const hasEmbeds = node.data.some(
          (it) => it && typeof it === 'object' && (it.embeds !== undefined || it.DUB !== undefined)
        );
        if (hasEmbeds) return node.data;
      }
    }
    for (let i = json.nodes.length - 1; i >= 0; i--) {
      const node = json.nodes[i];
      if (node && Array.isArray(node.data)) return node.data;
    }
  }
  if (Array.isArray(json.data)) return json.data;
  return null;
}

/**
 * Obtiene la reproducción de un episodio doblado en audio español (Latino o Castellano).
 * Integra selección inteligente de fuentes (StreamPlay) y proveedor Sora (Latanime).
 */
export async function getDubEpisodePlayback({
  animeId,
  malId,
  animeTitle,
  slug = null,
  episode = 1,
  episodeNumber = 1,
  language = 'latino'
}) {
  const targetEpisode = episode || episodeNumber || 1;
  const targetMalId = malId || animeId;
  const isMobile = isMobileOrTabletDevice();
  const rawCandidates = [];

  // ==========================================
  // CASO 1: ESPAÑOL CASTELLANO (ESPAÑA)
  // ==========================================
  if (language === 'castellano') {
    const castellanoSlug = await resolveLatanimeSlug(targetMalId, animeTitle, 'castellano');
    if (!castellanoSlug) {
      throw new Error('No se encontró fuente de doblaje en castellano para este anime.');
    }

    const soraServers = await getLatanimeEpisodeServers(castellanoSlug, targetEpisode, 'castellano');
    if (!soraServers || soraServers.length === 0) {
      throw new Error(`El episodio ${targetEpisode} no tiene servidores disponibles en castellano.`);
    }

    const prioritized = selectAndPrioritizeServers(soraServers, { isMobile, language: 'castellano' });
    if (prioritized.length === 0) {
      throw new Error('No se pudo inicializar un servidor en castellano para este episodio.');
    }

    const bestServer = prioritized[0];
    return {
      proxiedStreamUrl: bestServer.proxiedStreamUrl,
      embedUrl: bestServer.embedUrl || null,
      servers: prioritized,
      subtitles: { tracks: [] },
      audioLanguage: 'castellano',
      isDub: true,
      isEmbed: !!bestServer.isEmbed,
      resolution: '1080p'
    };
  }

  // ==========================================
  // CASO 2: ESPAÑOL LATINO
  // ==========================================
  let animeAv1Error = null;
  try {
    let resolvedSlug = slug;
    if (!resolvedSlug) {
      const slugInfo = await resolveAnimeAV1Slug(targetMalId, animeTitle);
      resolvedSlug = slugInfo?.slug || null;
    }

    if (resolvedSlug) {
      const epUrl = `${ANIMEAV1_BASE}/media/${resolvedSlug}/${targetEpisode}/__data.json`;
      const res = await fetch(getProxiedUrl(epUrl));
      if (res.ok) {
        const json = await res.json();
        const d = extractDataNode(json);
        if (d) {
          let embedsObj = null;
          for (const item of d) {
            if (item && typeof item === 'object' && item.embeds !== undefined) {
              embedsObj = item.embeds;
              break;
            }
          }
          const embedsD = typeof embedsObj === 'number' ? d[embedsObj] : embedsObj;
          const dubArrayIdx = embedsD?.DUB;
          if (dubArrayIdx !== undefined) {
            const dubIndices = typeof dubArrayIdx === 'number' ? d[dubArrayIdx] : dubArrayIdx;
            const rawServers = [];
            if (Array.isArray(dubIndices)) {
              for (const idx of dubIndices) {
                const srv = typeof idx === 'number' ? d[idx] : idx;
                if (!srv) continue;
                const srvName = typeof srv.server === 'number' ? d[srv.server] : srv.server;
                const srvUrl = typeof srv.url === 'number' ? d[srv.url] : srv.url;
                if (srvName && srvUrl) {
                  rawServers.push({ server: srvName, url: srvUrl });
                }
              }
            }

            // Extractores AnimeAV1
            const stServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('streamtape'));
            if (stServer) {
              const directSt = await extractStreamTapeStream(stServer.url);
              if (directSt) {
                rawCandidates.push({
                  id: 'dub-streamtape-h264',
                  name: 'StreamTape (H.264 Universal)',
                  proxiedStreamUrl: directSt,
                  quality: '1080p',
                  sourceName: 'StreamTape (H.264 8-bit)',
                  isEmbed: false,
                  isUniversalH264: true
                });
              }
            }

            const mp4Server = rawServers.find((s) => s.server && s.server.toLowerCase().includes('mp4upload') && !s.url.includes('undef'));
            if (mp4Server) {
              const directMp4 = await extractMP4UploadStream(mp4Server.url);
              if (directMp4) {
                const proxiedMp4 = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(directMp4)}&referer=${encodeURIComponent('https://www.mp4upload.com/')}`;
                rawCandidates.push({
                  id: 'dub-mp4upload',
                  name: 'MP4Upload Bluray',
                  proxiedStreamUrl: proxiedMp4,
                  quality: '1080p',
                  sourceName: 'MP4Upload',
                  isEmbed: false,
                  isAv1: true
                });
              }
            }

            const yuServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('yourupload'));
            if (yuServer) {
              const directYu = await extractYourUploadStream(yuServer.url);
              if (directYu) {
                const proxiedYu = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(directYu)}&referer=${encodeURIComponent('https://www.yourupload.com/')}`;
                rawCandidates.push({
                  id: 'dub-yourupload',
                  name: 'YourUpload Direct',
                  proxiedStreamUrl: proxiedYu,
                  quality: '1080p',
                  sourceName: 'YourUpload',
                  isEmbed: false
                });
              }
            }

            const hlsServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('hls'));
            if (hlsServer && hlsServer.url) {
              const playUrl = hlsServer.url.includes('/m3u8/')
                ? hlsServer.url.replace('/m3u8/', '/play/')
                : hlsServer.url;
              rawCandidates.push({
                id: 'dub-zilla-embed',
                name: 'ZillaPlayer HD',
                proxiedStreamUrl: playUrl,
                embedUrl: playUrl,
                quality: '1080p',
                sourceName: 'ZillaPlayer',
                isEmbed: true
              });
            }

            const voeServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('voe'));
            if (voeServer && voeServer.url) {
              rawCandidates.push({
                id: 'dub-voe-embed',
                name: 'VOE Player',
                proxiedStreamUrl: voeServer.url,
                embedUrl: voeServer.url,
                quality: '1080p',
                sourceName: 'VOE',
                isEmbed: true
              });
            }

            if (stServer && stServer.url) {
              rawCandidates.push({
                id: 'dub-streamtape-embed',
                name: 'StreamTape Player',
                proxiedStreamUrl: stServer.url,
                embedUrl: stServer.url,
                quality: '1080p',
                sourceName: 'StreamTape',
                isEmbed: true
              });
            }
          }
        }
      }
    }
  } catch (err) {
    animeAv1Error = err;
    console.warn('[dubStreamAdapter] Aviso en AnimeAV1:', err.message);
  }

  // 2. Si faltan fuentes (< 3 servidores) o falló AnimeAV1, consultar proveedor Sora (Latanime)
  if (rawCandidates.length < 3) {
    try {
      const latinoSlug = await resolveLatanimeSlug(targetMalId, animeTitle, 'latino');
      if (latinoSlug) {
        const soraServers = await getLatanimeEpisodeServers(latinoSlug, targetEpisode, 'latino');
        if (Array.isArray(soraServers) && soraServers.length > 0) {
          rawCandidates.push(...soraServers);
        }
      }
    } catch (err) {
      console.warn('[dubStreamAdapter] Aviso en proveedor Sora:', err.message);
    }
  }

  if (rawCandidates.length === 0) {
    throw animeAv1Error || new Error(`No se encontraron servidores de audio latino disponibles para el episodio ${targetEpisode}.`);
  }

  const prioritized = selectAndPrioritizeServers(rawCandidates, { isMobile, language: 'latino' });
  if (prioritized.length === 0) {
    throw new Error('No se pudo inicializar un servidor de audio latino para este episodio.');
  }

  const bestServer = prioritized[0];
  return {
    proxiedStreamUrl: bestServer.proxiedStreamUrl,
    embedUrl: bestServer.embedUrl || null,
    servers: prioritized,
    subtitles: { tracks: [] },
    audioLanguage: 'latino',
    isDub: true,
    isEmbed: !!bestServer.isEmbed,
    resolution: '1080p'
  };
}
