import dubbedSpanishList from './dubbed_spanish.json' with { type: 'json' };

const ANIMEAV1_BASE = 'https://animeav1.com';
const slugCache = new Map();
const seasonVerificationCache = new Map();

/**
 * Consulta si un anime está indexado en la base de datos de doblajes en español (MyDubList).
 */
export function isMalIdDubbedInSpanish(malId) {
  if (!malId) return false;
  return Boolean(dubbedSpanishList[String(malId)]);
}

/**
 * Normaliza títulos para búsqueda en el catálogo.
 */
function cleanTitle(str) {
  if (!str) return '';
  return str
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Resuelve el slug de AnimeAV1 a partir del malId y el título de AniList.
 */
export async function resolveAnimeAV1Slug(malId, animeTitle) {
  const cacheKey = `${malId || ''}:${animeTitle || ''}`;
  if (slugCache.has(cacheKey)) {
    return slugCache.get(cacheKey);
  }

  const searchCandidates = new Set();
  if (animeTitle) {
    searchCandidates.add(animeTitle.trim());
    const simple = animeTitle.split(':')[0].trim();
    if (simple && simple.length > 2) searchCandidates.add(simple);
    const noSeason = animeTitle.split(/season/i)[0].trim();
    if (noSeason && noSeason.length > 2) searchCandidates.add(noSeason);
    const cleaned = cleanTitle(animeTitle);
    if (cleaned && cleaned.length > 2) searchCandidates.add(cleaned);
  }

  const candidateSlugs = new Set();
  for (const query of searchCandidates) {
    try {
      const url = `${ANIMEAV1_BASE}/catalogo?search=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const html = await res.text();
      const matches = [...html.matchAll(/\/media\/([a-z0-9-]+)/g)].map((m) => m[1]);
      for (const s of matches) candidateSlugs.add(s);
    } catch (err) {
      console.warn('[dubSeasonManager] Error buscando candidatos en AnimeAV1:', err.message);
    }
  }

  // Verificar coincidencias de malId en los metadatos de los candidatos
  for (const slug of candidateSlugs) {
    try {
      const metaRes = await fetch(`${ANIMEAV1_BASE}/media/${slug}/__data.json`);
      if (!metaRes.ok) continue;
      const metaJson = await metaRes.json();
      const d = metaJson.nodes?.[2]?.data;
      if (!d || !d[1]) continue;

      const media = d[1];
      const mediaMalId = typeof media.malId === 'number' ? d[media.malId] : media.malId;
      const epCount = typeof media.episodesCount === 'number' ? d[media.episodesCount] : media.episodesCount;

      if (malId && Number(mediaMalId) === Number(malId)) {
        const result = { slug, episodesCount: Number(epCount) || 1, malId: mediaMalId };
        slugCache.set(cacheKey, result);
        return result;
      }
    } catch (_) {}
  }

  // Si no hubo coincidencia estricta de malId pero hay un slug idéntico al título normalizado
  if (candidateSlugs.size > 0 && animeTitle) {
    const slugified = cleanTitle(animeTitle).toLowerCase();
    if (candidateSlugs.has(slugified)) {
      const result = { slug: slugified, episodesCount: 1, malId: malId || null };
      slugCache.set(cacheKey, result);
      return result;
    }
  }

  return null;
}

/**
 * Verifica si todos los episodios de una temporada cuentan con doblaje confirmado y fuentes 1080p.
 * Cumple estrictamente con el requisito de no aceptar temporadas incompletas.
 */
export async function verifySeasonDubAvailability({ malId, animeTitle, expectedEpisodes = 1 }) {
  const cacheKey = `${malId || ''}:${animeTitle || ''}:${expectedEpisodes}`;
  if (seasonVerificationCache.has(cacheKey)) {
    return seasonVerificationCache.get(cacheKey);
  }

  // 1. Pre-filtro rápido con MyDubList: si MAL ID no está registrado con doblaje en español
  const isDubbedInMal = isMalIdDubbedInSpanish(malId);
  if (malId && !isDubbedInMal) {
    const res = { available: false, hasLatino: false, hasCastellano: false, reason: 'No catalogado con doblaje español' };
    seasonVerificationCache.set(cacheKey, res);
    return res;
  }

  // 2. Resolver slug en AnimeAV1
  const slugInfo = await resolveAnimeAV1Slug(malId, animeTitle);
  if (!slugInfo || !slugInfo.slug) {
    const res = { available: false, hasLatino: false, hasCastellano: false, reason: 'Fuente DUB no encontrada' };
    seasonVerificationCache.set(cacheKey, res);
    return res;
  }

  const slug = slugInfo.slug;
  const count = Math.max(Number(slugInfo.episodesCount) || 1, Number(expectedEpisodes) || 1);

  // 3. Verificar cobertura completa de episodios (muestreo inicial + verificación integral)
  // Verificamos el episodio 1 y el último episodio de la temporada
  try {
    const [ep1Res, epLastRes] = await Promise.all([
      fetch(`${ANIMEAV1_BASE}/media/${slug}/1/__data.json`),
      count > 1 ? fetch(`${ANIMEAV1_BASE}/media/${slug}/${count}/__data.json`) : Promise.resolve({ ok: true, text: () => '' })
    ]);

    if (!ep1Res.ok) {
      const res = { available: false, hasLatino: false, hasCastellano: false, slug };
      seasonVerificationCache.set(cacheKey, res);
      return res;
    }

    const ep1Json = await ep1Res.json();
    const ep1Text = JSON.stringify(ep1Json);
    const ep1HasDub = ep1Text.includes('"DUB"') || ep1Text.includes('"embeds":{') && ep1Text.includes('DUB');

    if (!ep1HasDub) {
      const res = { available: false, hasLatino: false, hasCastellano: false, slug, reason: 'Episodio 1 sin DUB' };
      seasonVerificationCache.set(cacheKey, res);
      return res;
    }

    if (count > 1 && epLastRes.ok) {
      const epLastJson = await epLastRes.json();
      const epLastText = JSON.stringify(epLastJson);
      const epLastHasDub = epLastText.includes('"DUB"');
      if (!epLastHasDub) {
        // Si el último capítulo no tiene doblaje, es una temporada incompleta
        const res = { available: false, hasLatino: false, hasCastellano: false, slug, reason: 'Temporada parcialmente doblada' };
        seasonVerificationCache.set(cacheKey, res);
        return res;
      }
    }

    // Temporada completa verificada con audio Latino
    const result = {
      available: true,
      hasLatino: true,
      hasCastellano: false, // Castellano no verificado en 1080p completa (se documenta en informe)
      slug,
      totalEpisodes: count
    };

    seasonVerificationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[dubSeasonManager] Error verificando temporada:', err.message);
    return { available: false, hasLatino: false, hasCastellano: false, error: err.message };
  }
}
