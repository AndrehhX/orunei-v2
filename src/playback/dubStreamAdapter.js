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
 * Obtiene la reproducción de un episodio doblado en audio español.
 * Cumple con la selección inteligente del mejor servidor 1080p
 * y conserva la compatibilidad exacta con la interfaz de AnimePlayer.
 */
export async function getDubEpisodePlayback({ animeId, malId, animeTitle, slug = null, episode = 1, episodeNumber = 1, language = 'latino' }) {
  const targetEpisode = episode || episodeNumber || 1;
  let resolvedSlug = slug;
  if (!resolvedSlug) {
    const slugInfo = await resolveAnimeAV1Slug(malId || animeId, animeTitle);
    if (!slugInfo?.slug) {
      throw new Error('No se encontró fuente de doblaje para este anime.');
    }
    resolvedSlug = slugInfo.slug;
  }

  const epUrl = `${ANIMEAV1_BASE}/media/${resolvedSlug}/${targetEpisode}/__data.json`;
  const res = await fetch(getProxiedUrl(epUrl));
  if (!res.ok) {
    throw new Error(`No se pudo obtener información del episodio ${episode} (HTTP ${res.status}).`);
  }

  const json = await res.json();
  const d = extractDataNode(json);
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
      if (!srv) continue;
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

  const isMobile = isMobileOrTabletDevice();
  const directServers = [];
  const embedServers = [];

  // 1. StreamTape: 1080p H.264 de 8 bits (yuv420p) - Compatibilidad universal absoluta (iPad, iPhone, tablets y PC)
  const stServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('streamtape'));
  if (stServer) {
    const directSt = await extractStreamTapeStream(stServer.url);
    if (directSt) {
      directServers.push({
        id: 'dub-streamtape-h264',
        name: isMobile ? '🇲🇽 Servidor (Latino 1080p Universal iPad/Móvil)' : '🇲🇽 Servidor (Latino 1080p Universal H.264)',
        proxiedStreamUrl: directSt,
        quality: '1080p',
        sourceName: 'StreamTape (H.264 8-bit)',
        isEmbed: false,
        isUniversalH264: true
      });
    }
  }

  // 2. MP4Upload: 10-bit AV1 (av01, yuv420p10le) - Bluray Ultra HD para PC y decodificadores AV1
  const mp4Server = rawServers.find((s) => s.server && s.server.toLowerCase().includes('mp4upload') && !s.url.includes('undef'));
  if (mp4Server) {
    const directMp4 = await extractMP4UploadStream(mp4Server.url);
    if (directMp4) {
      const proxiedMp4 = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(directMp4)}&referer=${encodeURIComponent('https://www.mp4upload.com/')}`;
      directServers.push({
        id: 'dub-mp4upload',
        name: isMobile ? '🇲🇽 Servidor (Latino 1080p AV1 - PC/M4)' : '🇲🇽 Servidor (Latino 1080p Bluray)',
        proxiedStreamUrl: proxiedMp4,
        quality: '1080p',
        sourceName: 'MP4Upload',
        isEmbed: false,
        isAv1: true
      });
    }
  }

  // 3. YourUpload: 10-bit H.264 (High 10, yuv420p10le)
  const yuServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('yourupload'));
  if (yuServer) {
    const directYu = await extractYourUploadStream(yuServer.url);
    if (directYu) {
      const proxiedYu = `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(directYu)}&referer=${encodeURIComponent('https://www.yourupload.com/')}`;
      directServers.push({
        id: 'dub-yourupload',
        name: '🇲🇽 Servidor (Latino 1080p Direct Hi10P)',
        proxiedStreamUrl: proxiedYu,
        quality: '1080p',
        sourceName: 'YourUpload',
        isEmbed: false
      });
    }
  }

  // 4. Servidor Zilla / HLS Player (Incrustado oficial sin bloqueo WAF 403)
  const hlsServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('hls'));
  if (hlsServer && hlsServer.url) {
    const playUrl = hlsServer.url.includes('/m3u8/')
      ? hlsServer.url.replace('/m3u8/', '/play/')
      : hlsServer.url;
    embedServers.push({
      id: 'dub-zilla-embed',
      name: '🇲🇽 Servidor (Latino Player HD)',
      proxiedStreamUrl: playUrl,
      embedUrl: playUrl,
      quality: '1080p',
      sourceName: 'ZillaPlayer',
      isEmbed: true
    });
  }

  // 5. Servidor VOE
  const voeServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('voe'));
  if (voeServer && voeServer.url) {
    embedServers.push({
      id: 'dub-voe-embed',
      name: '🇲🇽 Servidor (Latino VOE)',
      proxiedStreamUrl: voeServer.url,
      embedUrl: voeServer.url,
      quality: '1080p',
      sourceName: 'VOE',
      isEmbed: true
    });
  }

  // 6. Servidor StreamTape Embed
  if (stServer && stServer.url) {
    embedServers.push({
      id: 'dub-streamtape-embed',
      name: '🇲🇽 Servidor (Latino StreamTape Player)',
      proxiedStreamUrl: stServer.url,
      embedUrl: stServer.url,
      quality: '1080p',
      sourceName: 'StreamTape',
      isEmbed: true
    });
  }

  // 7. Servidor Byse
  const byseServer = rawServers.find((s) => s.server && s.server.toLowerCase().includes('byse'));
  if (byseServer && byseServer.url) {
    embedServers.push({
      id: 'dub-byse-embed',
      name: '🇲🇽 Servidor (Latino Byse)',
      proxiedStreamUrl: byseServer.url,
      embedUrl: byseServer.url,
      quality: '1080p',
      sourceName: 'Byse',
      isEmbed: true
    });
  }

  // Fallback si no hubo ningún extractor exitoso
  if (directServers.length === 0 && embedServers.length === 0) {
    for (const s of rawServers) {
      if (s.url && !s.url.includes('undef')) {
        embedServers.push({
          id: `dub-${(s.server || 'alt').toLowerCase().replace(/[^a-z0-9]/g, '')}`,
          name: `🇲🇽 Servidor (${s.server || 'Latino'})`,
          proxiedStreamUrl: s.url,
          embedUrl: s.url,
          quality: '1080p',
          sourceName: s.server || 'Embed',
          isEmbed: true
        });
        break;
      }
    }
  }

  if (directServers.length === 0 && embedServers.length === 0) {
    throw new Error('No se pudo extraer una fuente reproducible en 1080p para este episodio doblado.');
  }

  // Ordenamiento inteligente según dispositivo:
  // En iPad / tablets / móviles:
  // 1) Si hay StreamTape 8-bit, va de primero (se reproduce nativo con video y audio sin pantalla negra).
  // 2) Si solo hay 10-bit AV1/Hi10P (que provocan pantalla negra en iPad), los reproductores embed (Zilla/VOE) van de primero para garantizar video funcional.
  // En PC: los streams directos 1080p Bluray van primero.
  let verifiedServers = [];
  if (isMobile) {
    const universalH264 = directServers.filter((s) => s.isUniversalH264);
    const nonUniversal = directServers.filter((s) => !s.isUniversalH264);
    if (universalH264.length > 0) {
      verifiedServers = [...universalH264, ...embedServers, ...nonUniversal];
    } else {
      verifiedServers = [...embedServers, ...nonUniversal];
    }
  } else {
    verifiedServers = [...directServers, ...embedServers];
  }

  // Renumerar servidores de manera intuitiva: Servidor 1, Servidor 2, etc.
  verifiedServers.forEach((srv, idx) => {
    const cleanLabel = srv.name.replace(/^🇲🇽 Servidor( Alternativo)? \(Latino /, '').replace(/\)$/, '');
    srv.name = `🇲🇽 Servidor ${idx + 1} (${cleanLabel})`;
  });

  const bestServer = verifiedServers[0];

  return {
    proxiedStreamUrl: bestServer.proxiedStreamUrl,
    embedUrl: bestServer.embedUrl || null,
    servers: verifiedServers,
    subtitles: { tracks: [] }, // En DUB el audio ya es español
    audioLanguage: language,
    isDub: true,
    isEmbed: !!bestServer.isEmbed,
    resolution: '1080p'
  };
}
