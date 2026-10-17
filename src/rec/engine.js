// Taste engine: content-based + implicit feedback + time decay + diversity + exploration.
const HALF = 45 * 864e5 // taste half-life: 45 days
export const STATUS_WEIGHTS = { completed: 1, watching: 0.7, favorite: 0.95, paused: 0.25, planned: 0.15 }
// Signal strengths (positive = pulls profile toward an item, negative = pushes away). "un*" reverses a signal.
export const AW = { like: 1, add: 1.6, click: 0.15, dismiss: -0.6, dislike: -1.2, news: 0.6, unlike: -1, unadd: -1.6, unnews: -0.6 }

export const librarySignal = (entry = {}) => entry.favorite ? 'like' : ['watching', 'completed'].includes(entry.status) ? 'add' : 'click'

export function selectLatest(pool = [], now = Date.now(), size = 4, windowMs = 10 * 6e4) {
  const sorted = [...pool].sort((a, b) => (b.year || 0) - (a.year || 0) || (b.trend || 0) - (a.trend || 0) || (b.pop || 0) - (a.pop || 0))
  if (!sorted.length || size <= 0) return []

  const offset = Math.floor(Math.max(0, now) / windowMs) % sorted.length
  const visible = Math.min(size, sorted.length)
  return Array.from({ length: visible }, (_, index) => sorted[(offset + index) % sorted.length])
}

export function selectTrending(pool = [], size = 5) {
  return [...pool]
    .filter((item) => Number(item.trend) > 0)
    .sort((a, b) => (b.trend || 0) - (a.trend || 0) || (b.pop || 0) - (a.pop || 0))
    .slice(0, size)
}

export function formatCount(value) {
  const count = Number(value)
  if (!Number.isFinite(count) || count <= 0) return '—'
  if (count >= 1e6) return `${(count / 1e6).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1e3) return `${(count / 1e3).toFixed(1).replace(/\.0$/, '')}K`
  return String(Math.round(count))
}

export const dot = (a, b) => { let s = 0; for (const k in a) if (b[k]) s += a[k] * b[k]; return s }
export const norm = (a) => Math.sqrt(dot(a, a))

export const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
const timestamp = (value, fallback) => {
  const parsed = typeof value === 'number' ? value : Date.parse(value || '')
  return Number.isFinite(parsed) ? parsed : fallback
}
const entryFeatures = (entry = {}) => {
  if (entry.f && Object.keys(entry.f).length) return entry.f
  const f = {}
  ;(entry.genres || []).filter(Boolean).forEach((genre) => { f[`g:${genre}`] = 1 })
  ;(entry.tags || []).filter((tag) => tag && !tag.isGeneralSpoiler && (tag.rank || 0) >= 45).slice(0, 8).forEach((tag) => { f[`t:${tag.name}`] = (0.8 * tag.rank) / 100 })
  const studio = entry.studio || entry.studios?.nodes?.[0]?.name
  if (studio) f[`s:${studio}`] = 0.5
  if (entry.format) f[`f:${entry.format}`] = 0.3
  if (entry.year || entry.seasonYear) f[`d:${Math.floor((entry.year || entry.seasonYear) / 10) * 10}`] = 0.25
  return f
}

export function profileSignature(entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => ({
      id: String(entry?.id ?? entry?.q ?? entry?.t ?? ''),
      status: String(entry?.status || entry?.s || '').toLowerCase(),
      favorite: Boolean(entry?.favorite),
      genres: [...(entry?.genres || [])].map(String).sort(),
      updatedAt: entry?.updatedAt || entry?.updated_at || '',
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((entry) => JSON.stringify(entry))
    .join('|')
}

function addFeatures(target, features, weight) {
  Object.entries(features || {}).forEach(([key, value]) => {
    const next = (target[key] || 0) + Number(value || 0) * weight
    if (Math.abs(next) > 0.001) target[key] = Math.max(-6, Math.min(6, next))
    else delete target[key]
  })
}

export function buildTasteProfile(entries = [], explicitState = {}, now = Date.now()) {
  const w = {}
  let confidence = 0
  for (const entry of [...(Array.isArray(entries) ? entries : [])].sort((a, b) => String(a?.id ?? a?.q ?? '').localeCompare(String(b?.id ?? b?.q ?? '')))) {
    const status = String(entry?.status || entry?.s || '').toLowerCase()
    const age = Math.max(0, now - timestamp(entry?.updatedAt || entry?.updated_at, now))
    const decay = 0.5 ** (age / HALF)
    const base = STATUS_WEIGHTS[status] || 0
    const features = entryFeatures(entry)
    if (base) {
      addFeatures(w, features, base * decay)
      confidence += base * decay
    }
    if (entry?.favorite) {
      addFeatures(w, features, STATUS_WEIGHTS.favorite * decay)
      confidence += STATUS_WEIGHTS.favorite * decay
    }
  }
  for (const item of explicitState?.likedItems || explicitState?.positive || []) {
    addFeatures(w, item.v || item.f || entryFeatures(item), AW.like)
    confidence += AW.like
  }
  for (const item of explicitState?.hiddenItems || explicitState?.negative || []) {
    addFeatures(w, item.v || item.f || entryFeatures(item), AW.dismiss)
    confidence += Math.abs(AW.dismiss)
  }
  return { w, t: now, n: confidence, signature: profileSignature(entries) }
}

// AniList media -> item with sparse feature map: genres, weighted tags, studio, format, decade.
export function toItem(m) {
  const f = {}
  ;(m.genres || []).forEach((g) => (f['g:' + g] = 1))
  ;(m.tags || []).filter((t) => !t.isGeneralSpoiler && t.rank >= 45).slice(0, 8).forEach((t) => (f['t:' + t.name] = (0.8 * t.rank) / 100))
  const st = m.studios?.nodes?.[0]?.name
  if (st) f['s:' + st] = 0.5
  if (m.format) f['f:' + m.format] = 0.3
  if (m.seasonYear) f['d:' + Math.floor(m.seasonYear / 10) * 10] = 0.25
  const title = m.title.english || m.title.romaji
  return { id: m.id, idMal: m.idMal || null, title, alts: [m.title.romaji, m.title.english].filter(Boolean).map((x) => x.toLowerCase()), description: m.description || '', genres: m.genres || [],
    img: m.coverImage?.extraLarge, banner: m.bannerImage, year: m.seasonYear, score: m.averageScore || 0,
    pop: m.popularity || 0, trend: m.trending || 0, f }
}

// TF-IDF weighting (rare features say more about taste), then L2-normalise every item vector.
export function vectorize(items) {
  const df = {}
  items.forEach((i) => Object.keys(i.f).forEach((k) => (df[k] = (df[k] || 0) + 1)))
  const N = items.length
  return items.map((i) => {
    const v = {}
    for (const k in i.f) v[k] = i.f[k] * (Math.log((N + 1) / (df[k] + 1)) + 1)
    const n = norm(v) || 1
    for (const k in v) v[k] /= n
    return { ...i, v }
  })
}

// Online update: decay old taste, then move the profile along the item's vector. Returns the new profile + per-feature delta.
export function update(p, item, action, now = Date.now()) {
  const decay = 0.5 ** ((now - (p.t || now)) / HALF)
  const w = {}
  for (const k in p.w) { const v = p.w[k] * decay; if (Math.abs(v) > 0.01) w[k] = v }
  const a = AW[action], d = {}
  for (const k in item.v) {
    const old = w[k] || 0, nv = Math.max(-3, Math.min(6, old + a * item.v[k] * 3))
    d[k] = nv - old; w[k] = nv
  }
  return { p: { ...p, w, t: now, n: Math.max(0, (p.n || 0) + a) }, d }
}

export function scoreCandidate(item, p, context = {}) {
  const profileNorm = norm(p?.w || {}) || 1
  const itemNorm = norm(item?.v || {}) || 1
  const rawAffinity = dot(p?.w || {}, item?.v || {}) / (profileNorm * itemNorm)
  const affinity = clamp(rawAffinity)
  const quality = clamp(((item?.score || 0) - 60) / 35)
  const trend = clamp(Math.log10(1 + Math.max(0, item?.trend || 0)) / 2.2)
  const popularity = clamp(Math.log10(1 + Math.max(0, item?.pop || 0)) / 5.5)
  const currentYear = context.year || new Date().getFullYear()
  const freshness = Math.exp(-Math.max(0, currentYear - (item?.year || currentYear)) / 8)
  const exploration = context.exploration ?? (affinity < 0.25 ? 1 : 0)
  const penalty = rawAffinity < 0 ? rawAffinity * 0.35 : 0
  const score = Math.max(0, 0.45 * affinity + 0.18 * quality + 0.12 * trend + 0.1 * popularity + 0.1 * freshness + 0.05 * clamp(exploration) + penalty)
  return { score, components: { affinity, quality, trend, popularity, freshness } }
}

// Rank candidates: cosine(profile, item) blended with quality/trend/popularity/freshness (profile weight grows with confidence),
// then MMR re-ranking for diversity and one "explore" slot for things outside the known taste.
export function recommend(pool, p, { exclude, liked = [], n = 8, year = new Date().getFullYear() }) {
  const wn = norm(p.w) || 1
  const conf = 1 - Math.exp(-Math.max(0, p.n || 0) / 4)
  const cand = pool.filter((i) => !exclude.has(i.id)).map((i) => {
    const sim = wn > 1e-6 ? dot(p.w, i.v) / (wn * (norm(i.v) || 1)) : 0
    let cov = 0
    for (const k in i.v) if (Math.abs(p.w[k] || 0) > 0.25) cov += i.v[k] ** 2
    const scored = scoreCandidate(i, p, { year, exploration: conf > 0.3 && cov < 0.35 ? 1 : 0 })
    const q = scored.components.quality
    return { ...i, s: conf * scored.score + (1 - conf) * (0.18 * q + 0.12 * scored.components.trend + 0.1 * scored.components.popularity + 0.1 * scored.components.freshness), cov, q, components: scored.components }
  })
  const explore = conf > 0.3 ? cand.filter((i) => i.cov < 0.35 && i.q > 0.55).sort((a, b) => b.s - a.s)[0] : null
  const out = []
  const left = cand.filter((i) => i !== explore)
  while (out.length < n - (explore ? 1 : 0) && left.length) {
    let best = 0, bs = -9
    left.forEach((i, x) => {
      const red = out.reduce((m, o) => Math.max(m, dot(i.v, o.v)), 0)
      const mmr = 0.75 * i.s - 0.25 * red
      if (mmr > bs) { bs = mmr; best = x }
    })
    out.push(left.splice(best, 1)[0])
  }
  if (explore) out.splice(Math.min(3, out.length), 0, { ...explore, explore: true })
  return out.map((i) => {
    let near = null, ns = 0.15
    liked.forEach((l) => { const c = dot(i.v, l.v); if (c > ns) { ns = c; near = l } })
    const matchedGenres = Object.keys(i.v || {}).filter((key) => key.startsWith('g:') && (p.w[key] || 0) > 0.25).map(label)
    const reasonKey = i.explore ? 'explore' : near ? 'similar_to' : matchedGenres.length ? 'matches_taste' : i.trend > 0 ? 'trending' : 'popular'
    const reasonData = i.explore ? {} : near ? { title: near.title } : matchedGenres.length ? { genres: matchedGenres.slice(0, 2) } : {}
    const reason = i.explore ? 'Algo nuevo que podría gustarte' : near ? `Porque te gusta ${near.title}` : matchedGenres.length ? `Coincide con tus gustos de ${matchedGenres.slice(0, 2).join(' y ')}` : i.trend > 0 ? 'Está en tendencia ahora' : 'Popular y muy bien valorado'
    return { ...i, reasonKey, reasonData, reason }
  })
}

export const label = (k) => k.slice(2)
export const topGenres = (p, n = 5) => {
  const e = Object.entries(p.w).filter(([k, v]) => k.startsWith('g:') && v > 0.05).sort((a, b) => b[1] - a[1]).slice(0, n)
  const max = e[0]?.[1] || 1
  return e.map(([k, v]) => ({ name: label(k), pct: Math.round((v / max) * 100) }))
}
