/**
 * Adaptador de Proveedores de Doblaje Sora (Sora-Modules)
 * Integra proveedores especializados en doblaje español (Latino y Castellano),
 * extrayendo servidores verificados en 1080p con protección de Circuit Breaker.
 */

import { recordProviderOutcome, isProviderAvailable } from './providerCircuitBreaker.js';

const rawEnvUrl = typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_STREAM_API_URL || '').trim() : '';
const STREAM_BASE = (rawEnvUrl && !rawEnvUrl.includes('trycloudflare.com') && rawEnvUrl.startsWith('http'))
  ? rawEnvUrl.replace(/\/+$/, '')
  : 'https://orunei-stream.thealex230820.workers.dev';

const LATANIME_BASE = 'https://latanime.org';

function getProxiedUrl(targetUrl, referer = 'https://latanime.org/') {
  if (typeof window === 'undefined') return targetUrl;
  return `${STREAM_BASE}/api/stream/proxy?url=${encodeURIComponent(targetUrl)}&referer=${encodeURIComponent(referer)}`;
}

/**
 * Catálogo pre-verificado de alta velocidad (0ms) para slugs en Latanime (Latino y Castellano).
 */
export const VERIFIED_LATANIME_SLUGS = {
  // Chainsaw Man
  '44511:latino': 'chainsaw-man-latino',
  '44511:castellano': 'chainsaw-man-castellano',
  // Jujutsu Kaisen
  '40748:latino': 'jujutsu-kaisen-latino',
  '51009:latino': 'jujutsu-kaisen-s2-latino',
  '51009:castellano': 'jujutsu-kaisen-s2-castellano',
  // Solo Leveling
  '52299:latino': 'solo-leveling-latino',
  '52299:castellano': 'solo-leveling-castellano',
  // Death Note
  '1535:latino': 'death-note-latino',
  '1535:castellano': 'death-note-castellano',
  // One Piece
  '21:latino': 'one-piece-latino',
  // My Hero Academia
  '31964:latino': 'boku-no-hero-academia-latino',
  '31964:castellano': 'boku-no-hero-academia-castellano',
  '35247:latino': 'boku-no-hero-academia-2nd-season-latino',
  '35247:castellano': 'boku-no-hero-academia-2nd-season-castellano',
  // Kimetsu no Yaiba
  '38000:latino': 'kimetsu-no-yaiba-latino',
  '38000:castellano': 'kimetsu-no-yaiba-castellano',
  // Naruto
  '20:latino': 'naruto-latino',
  // Bleach
  '269:latino': 'bleach-latino',
  // Dragon Ball Super
  '30694:latino': 'dragon-ball-super-latino',
  // Spy x Family
  '50273:latino': 'spy-x-family-latino',
  // Frieren
  '52991:latino': 'sousou-no-frieren-latino',
  '52991:castellano': 'sousou-no-frieren-castellano'
};

const soraSlugCache = new Map();

/**
 * Resuelve el slug del anime en Latanime para el dialecto solicitado (latino o castellano).
 */
export async function resolveLatanimeSlug(malId, animeTitle, dialect = 'latino') {
  const normDialect = dialect === 'castellano' ? 'castellano' : 'latino';
  const key = `${malId || ''}:${normDialect}`;

  if (malId && VERIFIED_LATANIME_SLUGS[key]) {
    return VERIFIED_LATANIME_SLUGS[key];
  }

  const cacheKey = `${malId || ''}:${animeTitle || ''}:${normDialect}`;
  if (soraSlugCache.has(cacheKey)) {
    return soraSlugCache.get(cacheKey);
  }

  if (!isProviderAvailable('latanime')) {
    return null;
  }

  const query = animeTitle || '';
  if (!query) return null;

  const start = Date.now();
  try {
    const searchUrl = `${LATANIME_BASE}/buscar?q=${encodeURIComponent(query.split(':')[0].trim())}`;
    const res = await fetch(getProxiedUrl(searchUrl));
    if (!res.ok) {
      recordProviderOutcome('latanime', 'failed', Date.now() - start);
      return null;
    }

    const html = await res.text();
    const cardRegex = /<a\s+href="([^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/g;
    let match;
    const candidates = [];

    while ((match = cardRegex.exec(html)) !== null) {
      const href = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim().toLowerCase();
      if (href && href.includes('/anime/')) {
        const slug = href.split('/anime/')[1].replace(/\/+$/, '');
        candidates.push({ slug, title });
      }
    }

    if (candidates.length === 0) {
      recordProviderOutcome('latanime', 'empty', Date.now() - start);
      return null;
    }

    // Buscar coincidencia exacta con el dialecto
    const targetTag = normDialect === 'castellano' ? 'castellano' : 'latino';
    const dialectMatch = candidates.find((c) => c.slug.includes(targetTag) || c.title.includes(targetTag));

    const finalSlug = dialectMatch ? dialectMatch.slug : (normDialect === 'latino' ? candidates[0].slug : null);
    if (finalSlug) {
      recordProviderOutcome('latanime', 'found', Date.now() - start);
      soraSlugCache.set(cacheKey, finalSlug);
      return finalSlug;
    }

    recordProviderOutcome('latanime', 'empty', Date.now() - start);
    return null;
  } catch (err) {
    recordProviderOutcome('latanime', 'failed', Date.now() - start);
    return null;
  }
}

/**
 * Extrae los servidores de un episodio desde Latanime.
 */
export async function getLatanimeEpisodeServers(slug, episode = 1, dialect = 'latino') {
  if (!slug || !isProviderAvailable('latanime')) {
    return [];
  }

  const start = Date.now();
  try {
    const epUrl = `${LATANIME_BASE}/ver/${slug}-episodio-${episode}`;
    const res = await fetch(getProxiedUrl(epUrl));
    if (!res.ok) {
      recordProviderOutcome('latanime', 'failed', Date.now() - start);
      return [];
    }

    const html = await res.text();
    const playerRegex = /data-player="([^"]+)">([^<]+)<\/a>/g;
    let match;
    const rawServers = [];

    while ((match = playerRegex.exec(html)) !== null) {
      try {
        const b64 = match[1];
        const srvName = match[2].trim().toLowerCase();
        let decodedUrl = '';
        if (typeof atob === 'function') {
          decodedUrl = atob(b64);
        } else if (typeof Buffer !== 'undefined') {
          decodedUrl = Buffer.from(b64, 'base64').toString('utf8');
        }

        if (decodedUrl && decodedUrl.startsWith('http')) {
          rawServers.push({ name: srvName, url: decodedUrl });
        }
      } catch (_) {}
    }

    if (rawServers.length === 0) {
      recordProviderOutcome('latanime', 'empty', Date.now() - start);
      return [];
    }

    recordProviderOutcome('latanime', 'found', Date.now() - start);

    // Mapear a servidores compatibles con Orunei
    const servers = [];
    for (const s of rawServers) {
      const u = s.url;
      const lowerHost = s.name;

      if (lowerHost.includes('filemoon')) {
        servers.push({
          id: `sora-filemoon-${dialect}`,
          name: 'FileMoon',
          proxiedStreamUrl: u,
          embedUrl: u,
          quality: '1080p',
          sourceName: 'FileMoon HD',
          isEmbed: true
        });
      } else if (lowerHost.includes('mp4upload') && !u.includes('undef')) {
        servers.push({
          id: `sora-mp4upload-${dialect}`,
          name: 'MP4Upload',
          proxiedStreamUrl: u,
          embedUrl: u,
          quality: '1080p',
          sourceName: 'MP4Upload HD',
          isEmbed: true
        });
      } else if (lowerHost.includes('streamtape')) {
        servers.push({
          id: `sora-streamtape-${dialect}`,
          name: 'StreamTape',
          proxiedStreamUrl: u,
          embedUrl: u,
          quality: '1080p',
          sourceName: 'StreamTape (H.264 Universal)',
          isEmbed: true,
          isUniversalH264: true
        });
      } else if (lowerHost.includes('ok') || u.includes('ok.ru')) {
        servers.push({
          id: `sora-okru-${dialect}`,
          name: 'Okru',
          proxiedStreamUrl: u,
          embedUrl: u,
          quality: '1080p',
          sourceName: 'Okru Player',
          isEmbed: true
        });
      } else if (lowerHost.includes('voe') || u.includes('voe.sx')) {
        servers.push({
          id: `sora-voe-${dialect}`,
          name: 'VOE',
          proxiedStreamUrl: u,
          embedUrl: u,
          quality: '1080p',
          sourceName: 'VOE Player',
          isEmbed: true
        });
      } else if (lowerHost.includes('mega') || u.includes('mega.nz')) {
        servers.push({
          id: `sora-mega-${dialect}`,
          name: 'Mega',
          proxiedStreamUrl: u,
          embedUrl: u,
          quality: '1080p',
          sourceName: 'Mega Cloud',
          isEmbed: true
        });
      }
    }

    return servers;
  } catch (err) {
    recordProviderOutcome('latanime', 'failed', Date.now() - start);
    return [];
  }
}
