/**
 * Conector de Monoschinos (Storm Extensions / CloudStream)
 *
 * Implementa la extracción de servidores multimedia desde el proveedor regional
 * Monoschinos (https://monoschinos2.com y https://monoschinos.st).
 * Protegido con disyuntor de resiliencia (Circuit Breaker) para evitar latencias en la interfaz.
 */

import { recordProviderOutcome, isProviderAvailable } from './providerCircuitBreaker.js';

const rawEnvUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_STREAM_API_URL || '').trim() : '';
const STREAM_BASE = (rawEnvUrl && !rawEnvUrl.includes('trycloudflare.com') && rawEnvUrl.startsWith('http'))
  ? rawEnvUrl.replace(/\/+$/, '')
  : 'https://orunei-stream.thealex230820.workers.dev';

const MONOSCHINOS_BASE = 'https://monoschinos2.com';

function getProxiedUrl(targetUrl, referer = 'https://monoschinos2.com/') {
  if (typeof window === 'undefined') return targetUrl;
  return `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(targetUrl)}&referer=${encodeURIComponent(referer)}`;
}

const monoschinosCache = new Map();

/**
 * Resuelve el slug de un anime en Monoschinos para el dialecto solicitado (latino o castellano).
 */
export async function resolveMonoschinosSlug(malId, animeTitle, dialect = 'latino') {
  if (!animeTitle && !malId) return null;
  const cacheKey = `${malId || ''}:${animeTitle || ''}:${dialect}`;
  if (monoschinosCache.has(cacheKey)) {
    return monoschinosCache.get(cacheKey);
  }

  if (!isProviderAvailable('monoschinos')) {
    return null;
  }

  const start = Date.now();
  try {
    const cleanQuery = (animeTitle || '').split(':')[0].trim();
    if (!cleanQuery) return null;

    const searchUrl = `${MONOSCHINOS_BASE}/buscar?q=${encodeURIComponent(cleanQuery)}`;
    const res = await fetch(getProxiedUrl(searchUrl));
    if (!res.ok) {
      recordProviderOutcome('monoschinos', 'failed', Date.now() - start);
      return null;
    }

    const html = await res.text();
    const regex = /<article[^>]*>[\s\S]*?<a\s+href="([^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi;
    let m;
    const candidates = [];

    while ((m = regex.exec(html)) !== null) {
      const link = m[1];
      const title = m[2].trim().toLowerCase();
      if (link.includes('/anime/')) {
        const slug = link.split('/anime/')[1].replace(/\/+$/, '').replace(/-sub-espanol$/, '');
        candidates.push({ slug, title });
      }
    }

    if (candidates.length === 0) {
      recordProviderOutcome('monoschinos', 'empty', Date.now() - start);
      return null;
    }

    // Filtrar candidatos según dialecto (latino o castellano)
    const dialectWord = dialect === 'castellano' ? 'castellano' : 'latino';
    const match = candidates.find((c) => c.slug.includes(dialectWord) || c.title.includes(dialectWord));

    if (match) {
      recordProviderOutcome('monoschinos', 'found', Date.now() - start);
      monoschinosCache.set(cacheKey, match.slug);
      return match.slug;
    }

    recordProviderOutcome('monoschinos', 'empty', Date.now() - start);
    return null;
  } catch (err) {
    recordProviderOutcome('monoschinos', 'failed', Date.now() - start);
    return null;
  }
}

/**
 * Extrae los servidores de un episodio desde Monoschinos.
 */
export async function getMonoschinosEpisodeServers(slug, episode = 1, dialect = 'latino') {
  if (!slug || !isProviderAvailable('monoschinos')) {
    return [];
  }

  const start = Date.now();
  try {
    const epUrl = `${MONOSCHINOS_BASE}/ver/${slug}-episodio-${episode}`;
    const res = await fetch(getProxiedUrl(epUrl));
    if (!res.ok) {
      recordProviderOutcome('monoschinos', 'failed', Date.now() - start);
      return [];
    }

    const html = await res.text();
    const playerRegex = /data-player="([^"]+)"/g;
    let match;
    const rawUrls = [];

    while ((match = playerRegex.exec(html)) !== null) {
      try {
        const b64 = match[1];
        let decoded = '';
        if (typeof atob === 'function') {
          decoded = atob(b64);
        } else if (typeof Buffer !== 'undefined') {
          decoded = Buffer.from(b64, 'base64').toString('utf8');
        }

        // Limpieza de wrappers de reproductor
        decoded = decoded.replace('https://monoschinos2.com/reproductor?url=', '')
          .replace('https://monoschinos.st/reproductor?url=', '');

        if (decoded && decoded.startsWith('http')) {
          rawUrls.push(decoded);
        }
      } catch (_) {}
    }

    if (rawUrls.length === 0) {
      recordProviderOutcome('monoschinos', 'empty', Date.now() - start);
      return [];
    }

    recordProviderOutcome('monoschinos', 'found', Date.now() - start);

    const servers = [];
    for (const url of rawUrls) {
      const lower = url.toLowerCase();
      if (lower.includes('streamtape')) {
        servers.push({
          id: `storm-mono-streamtape-${dialect}`,
          name: 'StreamTape',
          proxiedStreamUrl: url,
          embedUrl: url,
          quality: '1080p',
          sourceName: 'StreamTape (H.264 Universal)',
          isEmbed: true,
          isUniversalH264: true
        });
      } else if (lower.includes('mp4upload') && !lower.includes('undef')) {
        servers.push({
          id: `storm-mono-mp4upload-${dialect}`,
          name: 'MP4Upload',
          proxiedStreamUrl: url,
          embedUrl: url,
          quality: '1080p',
          sourceName: 'MP4Upload HD',
          isEmbed: true
        });
      } else if (lower.includes('filemoon')) {
        servers.push({
          id: `storm-mono-filemoon-${dialect}`,
          name: 'FileMoon',
          proxiedStreamUrl: url,
          embedUrl: url,
          quality: '1080p',
          sourceName: 'FileMoon HD',
          isEmbed: true
        });
      } else if (lower.includes('streamwish') || lower.includes('swdyu')) {
        servers.push({
          id: `storm-mono-streamwish-${dialect}`,
          name: 'Streamwish',
          proxiedStreamUrl: url,
          embedUrl: url,
          quality: '1080p',
          sourceName: 'Streamwish HD',
          isEmbed: true
        });
      } else if (lower.includes('ok.ru') || lower.includes('okru')) {
        servers.push({
          id: `storm-mono-okru-${dialect}`,
          name: 'Okru',
          proxiedStreamUrl: url,
          embedUrl: url,
          quality: '1080p',
          sourceName: 'Okru Player',
          isEmbed: true
        });
      } else if (lower.includes('mega.nz') || lower.includes('mega')) {
        servers.push({
          id: `storm-mono-mega-${dialect}`,
          name: 'Mega',
          proxiedStreamUrl: url,
          embedUrl: url,
          quality: '1080p',
          sourceName: 'Mega Cloud',
          isEmbed: true
        });
      }
    }

    return servers;
  } catch (err) {
    recordProviderOutcome('monoschinos', 'failed', Date.now() - start);
    return [];
  }
}
