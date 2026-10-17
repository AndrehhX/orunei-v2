import { timeAgo } from '../news.jsx'
import { FORMATS, STATUS, SORTS, buildCatalogRequest } from './catalogQuery.js'

export { FORMATS, STATUS, SORTS } from './catalogQuery.js'
// All sources are public + CORS-friendly: AniList (GraphQL), Jikan (MyAnimeList), Kitsu, Reddit, and OMDb (IMDb, optional key).
const gql = async (query, variables, signal) => {
  const r = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }), signal })
  const j = await r.json()
  if (!j.data) throw new Error(j.errors?.[0]?.message || 'AniList error')
  return j.data
}
const json = async (u, timeoutMs = 5000) => {
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined
  const r = await fetch(u, { signal })
  if (!r.ok) throw new Error(r.status)
  return r.json()
}

export const GENRES = [['Acción', 'Action'], ['Aventura', 'Adventure'], ['Comedia', 'Comedy'], ['Drama', 'Drama'], ['Fantasía', 'Fantasy'], ['Romance', 'Romance'],
  ['Sci-Fi', 'Sci-Fi'], ['Slice of Life', 'Slice of Life'], ['Sobrenatural', 'Supernatural'], ['Misterio', 'Mystery'], ['Terror', 'Horror'], ['Deportes', 'Sports']]
export const EXTRA_CATEGORIES = [
  ['Isekai', 'Isekai'], ['Reencarnación', 'Reincarnation'], ['Seinen', 'Seinen'], ['Shounen', 'Shounen'], ['Shoujo', 'Shoujo'], ['Josei', 'Josei'],
  ['Mecha', 'Mecha'], ['Harem', 'Harem'], ['Ecchi', 'Ecchi'], ['Psicológico', 'Psychological'], ['Escuela', 'School'], ['Histórico', 'Historical'],
  ['Militar', 'Military'], ['Artes marciales', 'Martial Arts'], ['Magia', 'Magic'], ['Superpoderes', 'Super Power'], ['Samurái', 'Samurai'], ['Viajes en el tiempo', 'Time Travel']
]
export const T = { TV: 'Serie', TV_SHORT: 'Corto', MOVIE: 'Película', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Especial', MUSIC: 'Música', RELEASING: 'En emisión', FINISHED: 'Finalizado', NOT_YET_RELEASED: 'Próximamente', CANCELLED: 'Cancelado', HIATUS: 'En pausa', WINTER: 'Invierno', SPRING: 'Primavera', SUMMER: 'Verano', FALL: 'Otoño' }
export const title = (m) => m?.title?.english || m?.title?.romaji || m?.title?.native || m?.title?.userPreferred || ''
export const crunchy = (m) => m?.externalLinks?.find((l) => l.site === 'Crunchyroll')?.url || `https://www.crunchyroll.com/search?q=${encodeURIComponent(title(m))}`

export const clean = (t = '') => (t || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/~!|!~/g, '').replace(/img\d*\([^)]*\)/gi, '').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`#>]+/g, '').replace(/\n{3,}/g, '\n\n').trim()

const translationChunks = (text, size = 450) => {
  const chunks = []
  let current = ''
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (current && `${current} ${sentence}`.length > size) {
      chunks.push(current)
      current = sentence
    } else current = current ? `${current} ${sentence}` : sentence
  }
  if (current) chunks.push(current)
  return chunks
}

export async function translateDescription(text, target = 'es', signal) {
  const source = clean(text)
  if (!source || target === 'en') return source
  const chunks = translationChunks(source)
  const translated = await Promise.all(chunks.map(async (chunk) => {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|${target}`
    const r = await fetch(url, { signal })
    if (!r.ok) throw new Error(`Translation error: ${r.status}`)
    const data = await r.json()
    const value = data.responseData?.translatedText
    if (!value) throw new Error('Translation unavailable')
    return clean(value)
  }))
  return translated.join(' ')
}

export async function searchAnime(f, page = 1, signal) {
  const request = buildCatalogRequest(f, page)
  const d = await gql(request.query, request.variables, signal)
  return { items: d.Page.media, more: d.Page.pageInfo.hasNextPage }
}

const DETAIL = `query($id:Int){ Media(id:$id,type:ANIME){ id idMal title{romaji english native} description(asHtml:false) bannerImage coverImage{extraLarge color}
  genres tags{name rank isGeneralSpoiler isMediaSpoiler} averageScore popularity favourites episodes duration status season seasonYear format source
  studios(isMain:true){nodes{name}} trailer{id site} streamingEpisodes{title thumbnail url site} externalLinks{site url} nextAiringEpisode{episode airingAt}
  recommendations(sort:RATING_DESC,perPage:6){nodes{mediaRecommendation{id idMal title{romaji english} coverImage{extraLarge color} averageScore genres seasonYear format status episodes bannerImage}}}
  reviews(limit:5,sort:RATING_DESC){nodes{id summary score rating ratingAmount createdAt user{name avatar{medium}}}} } }`
export const getAnime = async (id) => (await gql(DETAIL, { id })).Media

// ---- Ratings: each source resolves on its own so the UI fills progressively ----
export const ratingJobs = (m) => ({
  anilist: async () => (m?.averageScore ? { v: m.averageScore / 10, n: m.popularity, label: 'usuarios' } : null),
  mal: async () => {
    if (!m?.idMal) return null
    try {
      const { data } = await json(`https://api.jikan.moe/v4/anime/${m.idMal}`)
      return data?.score ? { v: data.score, n: data.scored_by, label: 'votos', extra: data.rank && `#${data.rank}` } : null
    } catch { return null }
  },
  kitsu: async () => {
    try {
      const animeName = title(m)
      if (!animeName) return null
      const { data } = await json(`https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(animeName)}&page[limit]=1`)
      const a = data?.[0]?.attributes
      return a?.averageRating ? { v: +a.averageRating / 10, n: a.userCount, label: 'usuarios' } : null
    } catch { return null }
  },
  imdb: async () => {
    const k = import.meta.env?.VITE_OMDB_KEY
    const animeName = title(m)
    if (!k || !animeName) return { unavailable: true }
    try {
      const d = await json(`https://www.omdbapi.com/?apikey=${k}&t=${encodeURIComponent(animeName)}`)
      return d?.imdbRating && d.imdbRating !== 'N/A' ? { v: +d.imdbRating, n: +(d.imdbVotes || '').replace(/,/g, ''), label: 'votos' } : { unavailable: true }
    } catch { return { unavailable: true } }
  },
})

// ---- Community: reviews + forum + discussions from several sites, normalised to one shape ----
const THREADS = `query($id:Int){ Page(perPage:6){ threads(mediaCategoryId:$id,sort:REPLY_COUNT_DESC){ id title body replyCount likeCount createdAt user{name avatar{medium}} } } }`
export const commentJobs = (m) => ({
  'AniList': async () => (m?.reviews?.nodes || []).map((r) => ({ id: 'ar' + r.id, src: 'AniList', user: r.user?.name || 'Usuario', avatar: r.user?.avatar?.medium, text: clean(r.summary), score: (r.score || 0) / 10, likes: r.rating, ts: (r.createdAt || 0) * 1000, link: `https://anilist.co/review/${r.id}` })),
  'Foro AniList': async () => {
    if (!m?.id) return []
    try {
      const res = await gql(THREADS, { id: m.id })
      return (res?.Page?.threads || []).map((t) => ({ id: 'at' + t.id, src: 'Foro AniList', user: t.user?.name || 'Usuario', avatar: t.user?.avatar?.medium, text: `${t.title || ''}\n${clean(t.body || '').slice(0, 260)}`, replies: t.replyCount, likes: t.likeCount, ts: (t.createdAt || 0) * 1000, link: `https://anilist.co/forum/thread/${t.id}` }))
    } catch { return [] }
  },
  'MyAnimeList': async () => {
    if (!m?.idMal) return []
    try {
      const { data } = await json(`https://api.jikan.moe/v4/anime/${m.idMal}/reviews?spoilers=true`)
      return (Array.isArray(data) ? data : []).slice(0, 6).map((r) => ({ id: 'ml' + r.mal_id, src: 'MyAnimeList', user: r.user?.username || 'Usuario', avatar: r.user?.images?.jpg?.image_url, text: clean(r.review).slice(0, 420), score: r.score, likes: r.reactions?.overall, ts: new Date(r.date).getTime(), link: r.url, spoiler: r.is_spoiler }))
    } catch { return [] }
  },
  'Reddit': async () => {
    const animeName = title(m)
    if (!animeName) return []
    try {
      const d = await json(`https://www.reddit.com/r/anime/search.json?q=${encodeURIComponent(animeName)}&restrict_sr=1&sort=top&limit=6`)
      return (d?.data?.children || []).map(({ data: p }) => ({ id: 'rd' + p.id, src: 'Reddit', user: 'u/' + (p.author || 'reddit'), text: `${p.title || ''}\n${clean(p.selftext || '').slice(0, 240)}`, replies: p.num_comments, likes: p.score, ts: (p.created_utc || 0) * 1000, link: 'https://reddit.com' + (p.permalink || '') }))
    } catch { return [] }
  },
})
export const ago = (ts) => (ts ? timeAgo(ts) : '')
