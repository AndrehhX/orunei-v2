export const FORMATS = { '': null, Serie: ['TV', 'TV_SHORT'], Película: ['MOVIE'], 'OVA / ONA': ['OVA', 'ONA', 'SPECIAL'] };
export const STATUS = { '': null, 'En emisión': 'RELEASING', Finalizado: 'FINISHED', Próximamente: 'NOT_YET_RELEASED' };
export const SORTS = { Popular: 'POPULARITY_DESC', Tendencia: 'TRENDING_DESC', 'Mejor valorado': 'SCORE_DESC', Recientes: 'START_DATE_DESC' };

const MEDIA_FIELDS = 'id idMal title{romaji english} coverImage{extraLarge color} bannerImage genres averageScore seasonYear format status episodes';

export function buildCatalogRequest(f, page = 1) {
  const definitions = ['$page:Int', '$sort:[MediaSort]'];
  const filters = ['type:ANIME', 'isAdult:false'];
  const variables = {
    page,
    sort: f.search && f.sort === 'Popular' ? ['SEARCH_MATCH'] : [SORTS[f.sort] || 'POPULARITY_DESC'],
  };

  if (f.search) { definitions.push('$search:String'); variables.search = f.search; filters.push('search:$search'); }
  if (f.genres?.length) { definitions.push('$genres:[String]'); variables.genres = f.genres; filters.push('genre_in:$genres'); }
  if (f.tags?.length) { definitions.push('$tags:[String]'); variables.tags = f.tags; filters.push('tag_in:$tags'); }
  if (f.format) { definitions.push('$format:[MediaFormat]'); variables.format = FORMATS[f.format]; filters.push('format_in:$format'); }
  if (f.status) { definitions.push('$status:MediaStatus'); variables.status = STATUS[f.status]; filters.push('status:$status'); }
  if (f.year) { definitions.push('$year:Int'); variables.year = +f.year; filters.push('seasonYear:$year'); }

  const query = `query(${definitions.join(',')}){ Page(page:$page,perPage:24){ pageInfo{hasNextPage} media(${filters.join(',')},sort:$sort){ ${MEDIA_FIELDS} } } }`;
  return { query, variables };
}
