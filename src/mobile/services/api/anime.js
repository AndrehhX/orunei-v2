import { FORMATS, STATUS, SORTS, buildCatalogRequest } from './catalogQuery.js';

export { FORMATS, STATUS, SORTS } from './catalogQuery.js';

export function timeAgo(ts) {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `hace ${m} min`;
  if (m < 1440) return `hace ${Math.round(m / 60)} h`;
  return `hace ${Math.round(m / 1440)} d`;
}

// AniList GraphQL público
const gql = async (query, variables, signal) => {
  const r = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  const j = await r.json();
  if (!j.data) throw new Error(j.errors?.[0]?.message || 'AniList error');
  return j.data;
};

const json = async (u, timeoutMs = 5000) => {
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
  const r = await fetch(u, { signal });
  if (!r.ok) throw new Error(r.status);
  return r.json();
};

export const GENRES = [
  ['Acción', 'Action'], ['Aventura', 'Adventure'], ['Comedia', 'Comedy'], ['Drama', 'Drama'],
  ['Fantasía', 'Fantasy'], ['Romance', 'Romance'], ['Sci-Fi', 'Sci-Fi'], ['Slice of Life', 'Slice of Life'],
  ['Sobrenatural', 'Supernatural'], ['Misterio', 'Mystery'], ['Terror', 'Horror'], ['Deportes', 'Sports']
];

export const T = {
  TV: 'Serie', TV_SHORT: 'Corto', MOVIE: 'Película', OVA: 'OVA', ONA: 'ONA', SPECIAL: 'Especial',
  MUSIC: 'Música', RELEASING: 'En emisión', FINISHED: 'Finalizado', NOT_YET_RELEASED: 'Próximamente',
  CANCELLED: 'Cancelado', HIATUS: 'En pausa', WINTER: 'Invierno', SPRING: 'Primavera', SUMMER: 'Verano', FALL: 'Otoño'
};

export const title = (m) => m?.title?.english || m?.title?.romaji || m?.title?.native || m?.title?.userPreferred || '';

export const clean = (t = '') =>
  (t || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/~!|!~/g, '')
    .replace(/img\d*\([^)]*\)/gi, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export async function searchAnime(f, page = 1, signal) {
  const request = buildCatalogRequest(f, page);
  const d = await gql(request.query, request.variables, signal);
  return { items: d.Page.media, more: d.Page.pageInfo.hasNextPage };
}

const DETAIL = `query($id:Int){ Media(id:$id,type:ANIME){ id idMal title{romaji english native} description(asHtml:false) bannerImage coverImage{extraLarge color}
  genres tags{name rank isGeneralSpoiler isMediaSpoiler} averageScore popularity favourites episodes duration status season seasonYear format source
  studios(isMain:true){nodes{name}} trailer{id site} streamingEpisodes{title thumbnail url site} externalLinks{site url} nextAiringEpisode{episode airingAt}
  recommendations(sort:RATING_DESC,perPage:6){nodes{mediaRecommendation{id idMal title{romaji english} coverImage{extraLarge color} averageScore genres seasonYear format status episodes bannerImage}}}
  reviews(limit:5,sort:RATING_DESC){nodes{id summary score rating ratingAmount createdAt user{name avatar{medium}}}} } }`;

export const getAnime = async (id) => (await gql(DETAIL, { id })).Media;

export const ratingJobs = (m) => ({
  anilist: async () => (m?.averageScore ? { v: m.averageScore / 10, n: m.popularity, label: 'usuarios' } : null),
  mal: async () => {
    if (!m?.idMal) return null;
    try {
      const { data } = await json(`https://api.jikan.moe/v4/anime/${m.idMal}`);
      return data?.score ? { v: data.score, n: data.scored_by, label: 'votos', extra: data.rank && `#${data.rank}` } : null;
    } catch { return null; }
  },
});
