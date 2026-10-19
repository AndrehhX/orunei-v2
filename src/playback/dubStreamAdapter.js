import { resolveAnimeAV1Slug, isEpisodeInDubRange, getDubBatchInfo } from './dubSeasonManager.js';
import { selectAndPrioritizeServers } from './sourceSelector.js';
import { resolveLatanimeSlug, getLatanimeEpisodeServers } from './soraDubProvider.js';
import { resolveMonoschinosSlug, getMonoschinosEpisodeServers } from './stormMonoschinosProvider.js';

const rawEnvUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_STREAM_API_URL || '').trim() : '';
const STREAM_BASE = (rawEnvUrl && !rawEnvUrl.includes('trycloudflare.com') && rawEnvUrl.startsWith('http'))
  ? rawEnvUrl.replace(/\/+$/, '')
  : 'https://orunei-stream.thealex230820.workers.dev';

const ANIMEAV1_BASE = 'https://animeav1.com';

function getProxiedUrl(targetUrl, referer = 'https://animeav1.com/') {
  if (typeof window === 'undefined') return targetUrl;
  return `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(targetUrl)}&referer=${encodeURIComponent(referer)}`;
}

async function fetchWithProxyFallback(targetUrl, referer = 'https://animeav1.com/') {
  const directUrl = targetUrl;
  const proxyUrl = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(targetUrl)}&referer=${encodeURIComponent(referer)}`;

  if (typeof window !== 'undefined') {
    return fetch(proxyUrl);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(directUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) return res;
  } catch (_) {}

  return fetch(proxyUrl);
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
    const match = html.match(/content="([^"]+)"\s*property="og:video"/i)
      || html.match(/property="og:video(?::secure_url)?"\s*content="([^"]+)"/i)
      || html.match(/content="([^"]+)"\s*property="og:video:secure_url"/i)
      || html.match(/(?:file|source\s+src):\s*["'](https?:\/\/[^"']+(?:yourupload\.com|\.mp4)[^"']*)["']/i);
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

/**
 * Extrae la URL directa del stream master HLS (.m3u8) desde un embed de VOE.
 * Descifra el payload cifrado de VOE (ROT13 + stripping LUTs + Base64 + shift ASCII -3 + reverse + Base64),
 * eludiendo completamente la ejecución de scripts invasivos, ventanas emergentes (popunders)
 * y pantallas de advertencia de anti-adblock ("Adblock detected").
 */
async function extractVoeStream(embedUrl) {
  try {
    let currentUrl = embedUrl;
    const res = await fetchWithProxyFallback(currentUrl, `${ANIMEAV1_BASE}/`);
    if (!res.ok) return null;
    let text = await res.text();

    // Seguir redirección JavaScript si existe (e.g. voe.sx -> derricknationtop.com)
    const jsRedirectMatch = text.match(/window\.location\.href\s*=\s*['"](https?:\/\/[^'"]+)['"]/);
    if (jsRedirectMatch) {
      currentUrl = jsRedirectMatch[1];
      const redirectRes = await fetchWithProxyFallback(currentUrl, `${ANIMEAV1_BASE}/`);
      if (!redirectRes.ok) return null;
      text = await redirectRes.text();
    }

    // 1. Buscar payload cifrado en <script type="application/json">["..."]</script>
    const jsonMatch = text.match(/<script type="application\/json">(\[".*?"\])<\/script>/);
    if (!jsonMatch) {
      const directMatch = text.match(/'hls':\s*'([^']+)'/) || text.match(/"hls":\s*"([^"]+)"/);
      if (directMatch?.[1]) return directMatch[1];
      return null;
    }

    const payload = JSON.parse(jsonMatch[1])[0];
    if (!payload || typeof payload !== 'string') return null;

    // 2. Extraer LUTs del script loader companion
    const scriptMatch = text.match(/<script src="(\/js\/loader[^"]*)"/);
    let luts = [];
    if (scriptMatch) {
      const scriptUrl = new URL(scriptMatch[1], currentUrl).href;
      const sRes = await fetchWithProxyFallback(scriptUrl, currentUrl);
      if (sRes.ok) {
        const sText = await sRes.text();
        const lutsMatches = [...sText.matchAll(/(\[(?:'\W{2}'[,\]]){1,9})/g)];
        luts = lutsMatches.map((m) => {
          try {
            return JSON.parse(m[0].replace(/'/g, '"'));
          } catch {
            return [];
          }
        });
      }
    }

    // 3. Shift alfabético ROT13
    let shifted = '';
    for (let i = 0; i < payload.length; i++) {
      let c = payload.charCodeAt(i);
      if (c > 64 && c < 91) c = ((c - 52) % 26) + 65;
      else if (c > 96 && c < 123) c = ((c - 84) % 26) + 97;
      shifted += String.fromCharCode(c);
    }

    // 4. Eliminar patrones LUT
    for (const lut of luts) {
      for (const item of lut) {
        if (item) {
          shifted = shifted.split(item).join('');
        }
      }
    }

    // 5. Decodificación Base64 -> Shift ASCII -3 -> Reversa -> Base64 -> JSON
    const b64_1 = typeof atob === 'function' ? atob(shifted) : Buffer.from(shifted, 'base64').toString('latin1');
    let shifted3 = '';
    for (let i = 0; i < b64_1.length; i++) {
      shifted3 += String.fromCharCode(b64_1.charCodeAt(i) - 3);
    }
    const reversed = shifted3.split('').reverse().join('');
    const finalStr = typeof atob === 'function'
      ? new TextDecoder().decode(Uint8Array.from(atob(reversed), (c) => c.charCodeAt(0)))
      : Buffer.from(reversed, 'base64').toString('utf-8');
    const finalJson = JSON.parse(finalStr);

    const streamUrl = finalJson?.source || finalJson?.direct_access_url;
    if (streamUrl) {
      const currentOrigin = new URL(currentUrl).origin;
      return `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent(currentOrigin + '/')}`;
    }
  } catch (err) {
    console.warn('[dubStreamAdapter] Error en extractor VOE:', err.message);
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
 * Convierte servidores incrustados (embeds con anuncios) en streams directos limpios (sin anuncios)
 * para MP4Upload, YourUpload y StreamTape cuando sea técnicamente posible.
 */
async function enhanceServerCandidates(servers = []) {
  if (!Array.isArray(servers) || servers.length === 0) return [];
  const enhanced = [];
  for (const s of servers) {
    if (!s) continue;
    const url = s.embedUrl || s.proxiedStreamUrl || '';
    const lowerUrl = url.toLowerCase();
    const lowerName = (s.sourceName || s.name || '').toLowerCase();

    // 1. Extraer MP4Upload directo si viene como embed
    if (s.isEmbed && (lowerUrl.includes('mp4upload') || lowerName.includes('mp4upload')) && !lowerUrl.includes('undef')) {
      const direct = await extractMP4UploadStream(url);
      if (direct) {
        const proxied = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(direct)}&referer=${encodeURIComponent('https://www.mp4upload.com/')}`;
        enhanced.push({
          ...s,
          proxiedStreamUrl: proxied,
          quality: '1080p',
          sourceName: 'MP4Upload Bluray',
          isEmbed: false,
          isAv1: true
        });
        continue;
      }
    }

    // 2. Extraer YourUpload directo si viene como embed
    if (s.isEmbed && (lowerUrl.includes('yourupload') || lowerName.includes('yourupload'))) {
      const direct = await extractYourUploadStream(url);
      if (direct) {
        const proxied = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(direct)}&referer=${encodeURIComponent('https://www.yourupload.com/')}`;
        enhanced.push({
          ...s,
          proxiedStreamUrl: proxied,
          quality: '1080p',
          sourceName: 'YourUpload Direct',
          isEmbed: false
        });
        continue;
      }
    }

    // 3. Extraer StreamTape directo si viene como embed
    if (s.isEmbed && (lowerUrl.includes('streamtape') || lowerName.includes('streamtape'))) {
      const direct = await extractStreamTapeStream(url);
      if (direct) {
        enhanced.push({
          ...s,
          proxiedStreamUrl: direct,
          quality: '1080p',
          sourceName: 'StreamTape (H.264 Universal)',
          isEmbed: false,
          isUniversalH264: true
        });
        continue;
      }
    }

    // 4. Extraer VOE directo si viene como embed
    if (s.isEmbed && (lowerUrl.includes('voe') || lowerName.includes('voe'))) {
      const direct = await extractVoeStream(url);
      if (direct) {
        enhanced.push({
          ...s,
          proxiedStreamUrl: direct,
          quality: '1080p',
          sourceName: 'VOE Direct HD',
          isEmbed: false
        });
        continue;
      }
    }

    enhanced.push(s);
  }
  return enhanced;
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

  // Verificación estricta de lote de doblaje (evita falsos positivos en episodios no doblados)
  if (!isEpisodeInDubRange(targetMalId, targetEpisode)) {
    const batch = getDubBatchInfo(targetMalId);
    throw new Error(`El episodio ${targetEpisode} no cuenta con doblaje oficial al español (disponible hasta ${batch?.label || 'episodios anteriores'}). Conmutando a versión original subtitulada.`);
  }

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

    const enhancedCastellano = await enhanceServerCandidates(soraServers);
    const prioritized = selectAndPrioritizeServers(enhancedCastellano, { isMobile, language: 'castellano' });
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
  // El proveedor mx/LatAnime es la fuente principal para doblaje latino.
  // AnimeAV1 solo se consulta cuando mx no entrega ningún servidor.
  try {
    const latinoSlug = await resolveLatanimeSlug(targetMalId, animeTitle, 'latino');
    if (latinoSlug) {
      const soraServers = await getLatanimeEpisodeServers(latinoSlug, targetEpisode, 'latino');
      if (Array.isArray(soraServers) && soraServers.length > 0) {
        const enhanced = await enhanceServerCandidates(soraServers);
        rawCandidates.push(...enhanced);
      }
    }
  } catch (err) {
    console.warn('[dubStreamAdapter] Aviso en proveedor mx/LatAnime:', err.message);
  }

  let animeAv1Error = null;
  if (rawCandidates.length === 0) {
    try {
    let resolvedSlug = slug;
    if (!resolvedSlug) {
      const slugInfo = await resolveAnimeAV1Slug(targetMalId, animeTitle);
      resolvedSlug = slugInfo?.slug || null;
    }

    if (resolvedSlug) {
      const epUrl = `${ANIMEAV1_BASE}/media/${resolvedSlug}/${targetEpisode}/__data.json`;
      const res = await fetchWithProxyFallback(epUrl);
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

            const megaServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('mega') && !s.url.includes('undef'));
            if (megaServer && megaServer.url) {
              const embedUrl = megaServer.url.includes('/file/') ? megaServer.url.replace('/file/', '/embed/') : megaServer.url;
              rawCandidates.push({
                id: 'dub-mega-embed',
                name: 'Mega Cloud',
                proxiedStreamUrl: embedUrl,
                embedUrl: embedUrl,
                quality: '1080p',
                sourceName: 'Mega',
                isEmbed: true
              });
            }

            const voeServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('voe'));
            if (voeServer && voeServer.url) {
              const directVoe = await extractVoeStream(voeServer.url);
              if (directVoe) {
                rawCandidates.push({
                  id: 'dub-voe-direct',
                  name: 'VOE Direct HD',
                  proxiedStreamUrl: directVoe,
                  quality: '1080p',
                  sourceName: 'VOE Direct',
                  isEmbed: false
                });
              } else {
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
  }

  // Si aún faltan fuentes, consultar conector Monoschinos como respaldo adicional.
  if (rawCandidates.length < 3) {
    try {
      const monoSlug = await resolveMonoschinosSlug(targetMalId, animeTitle, 'latino');
      if (monoSlug) {
        const monoServers = await getMonoschinosEpisodeServers(monoSlug, targetEpisode, 'latino');
        if (Array.isArray(monoServers) && monoServers.length > 0) {
          const enhanced = await enhanceServerCandidates(monoServers);
          rawCandidates.push(...enhanced);
        }
      }
    } catch (err) {
      console.warn('[dubStreamAdapter] Aviso en proveedor Monoschinos:', err.message);
    }
  }

  // Filtrar estrictamente cualquier servidor hostil que rechace conexión como zilla-networks
  const cleanCandidates = rawCandidates.filter((s) => {
    if (!s) return false;
    const url = (s.proxiedStreamUrl || s.embedUrl || '').toLowerCase();
    const name = (s.sourceName || s.name || s.id || '').toLowerCase();
    return !url.includes('zilla-networks') && !name.includes('zilla');
  });

  if (cleanCandidates.length === 0) {
    throw animeAv1Error || new Error(`No se encontraron servidores de audio latino disponibles para el episodio ${targetEpisode}.`);
  }

  const prioritized = selectAndPrioritizeServers(cleanCandidates, { isMobile, language: 'latino' });
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
