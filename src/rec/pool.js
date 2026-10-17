import { toItem, vectorize } from './engine.js'

export const CANDIDATE_CACHE_KEY = 'orunei-recommendation-pool-v4'
const CACHE_TTL = 10 * 60e3
const ENDPOINT = 'https://graphql.anilist.co'
const FIELDS = 'id idMal title{romaji english} coverImage{extraLarge} bannerImage description(asHtml:false) genres tags{name rank isGeneralSpoiler} studios(isMain:true){nodes{name}} averageScore popularity trending seasonYear format'

const page = (name, sort, perPage = 50) => `${name}: Page(page:1, perPage:${perPage}){ media(type:ANIME, sort:${sort}, isAdult:false){ ${FIELDS} } }`
const queryFor = (genres) => {
  const relatedFilter = genres.length ? `genre_in:${JSON.stringify(genres)}, ` : ''
  return `query { ${page('popular', 'POPULARITY_DESC', 50)} ${page('trending', 'TRENDING_DESC', 50)} ${page('score', 'SCORE_DESC', 50)} ${page('recent', 'START_DATE_DESC', 50)} related: Page(page:1, perPage:50){ media(type:ANIME, ${relatedFilter}sort:POPULARITY_DESC, isAdult:false){ ${FIELDS} } } }`
}

const readCache = (storage) => {
  try {
    const value = JSON.parse(storage?.getItem?.(CANDIDATE_CACHE_KEY) || 'null')
    return Array.isArray(value?.items) ? value : null
  } catch { return null }
}

const validMedia = (media) => Boolean(
  media && Number.isFinite(Number(media.id)) && (media.title?.english || media.title?.romaji) &&
  Array.isArray(media.genres) && media.genres.length && (media.coverImage?.extraLarge || media.bannerImage),
)

export async function loadRecommendationPool({ force = false, library = [], fetchImpl = globalThis.fetch, storage = globalThis.sessionStorage } = {}) {
  const cached = readCache(storage)
  if (!force && cached && Date.now() - cached.at < CACHE_TTL) return cached.items
  if (typeof fetchImpl !== 'function') return cached?.items || []

  const genres = [...new Set((Array.isArray(library) ? library : []).flatMap((entry) => Array.isArray(entry?.genres) ? entry.genres : []).filter(Boolean))].slice(0, 8)
  try {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: queryFor(genres) }),
    })
    if (!response.ok) throw new Error(`AniList ${response.status}`)
    const payload = await response.json()
    if (!payload?.data) throw new Error('AniList returned no data')
    const merged = new Map()
    for (const [source, bucket] of Object.entries(payload.data)) {
      for (const media of bucket?.media || []) {
        if (!validMedia(media)) continue
        const id = Number(media.id)
        const current = merged.get(id)
        if (current) {
          if (!current.source.split('+').includes(source)) current.source += `+${source}`
          continue
        }
        const normalized = { ...media, coverImage: { ...media.coverImage, extraLarge: media.coverImage?.extraLarge || media.bannerImage } }
        merged.set(id, { ...toItem(normalized), source })
      }
    }
    const items = vectorize([...merged.values()])
    if (!items.length && cached?.items?.length) return cached.items
    try { storage?.setItem?.(CANDIDATE_CACHE_KEY, JSON.stringify({ at: Date.now(), items })) } catch {}
    return items
  } catch (error) {
    if (cached?.items?.length) return cached.items
    throw error
  }
}
