export const PROFILE_KEY = 'orunei-profile-v1'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const MAX_ACTIVITY = 50
export const PROFILE_SECTIONS = ['overview', 'animelist', 'favorites', 'lists', 'activity']
export const PRIVACY_SECTIONS = ['animeList', 'favorites', 'activity', 'lists']
const IMAGE_CONSTRAINTS = {
  avatar: { maxWidth: 512, maxHeight: 512, crop: 'square' },
  banner: { maxWidth: 1600, maxHeight: 900, crop: 'cover' },
}
const ANIME_STATUSES = ['watching', 'planned', 'paused', 'completed']
const ANIME_STATUS_LABELS = { watching: 'Viendo', planned: 'Planeo ver', paused: 'En pausa', completed: 'Terminado' }
const ANIME_STATUS_DOTS = { watching: 'bg-green-400', planned: 'bg-blue-500', paused: 'bg-yellow-400', completed: 'bg-emerald-500' }
export const TASTE_STATUSES = ['watching', 'paused', 'completed']

export const AVATAR_FRAMES = [
  { id: 'none', label: 'Sin marco', desc: 'Borde limpio estándar', glow: 'transparent', previewGrad: 'from-slate-400 to-slate-600' },
  { id: 'sakura', label: 'Cerezo en Flor', desc: 'Pétalos flotantes y aura floral rosada', glow: 'rgba(244,114,182,0.7)', previewGrad: 'from-pink-400 via-rose-300 to-pink-500' },
  { id: 'cyber', label: 'Cyber Neon', desc: 'Circuitos HUD y pulso neón cian', glow: 'rgba(6,182,212,0.7)', previewGrad: 'from-cyan-400 via-sky-300 to-fuchsia-500' },
  { id: 'flame', label: 'Llama Carmesí', desc: 'Fuego ardiente y ascuas de batalla', glow: 'rgba(239,68,68,0.7)', previewGrad: 'from-red-500 via-orange-400 to-amber-500' },
  { id: 'cosmic', label: 'Nebulosa Cósmica', desc: 'Aura galáctica y polvo de estrellas', glow: 'rgba(139,92,246,0.7)', previewGrad: 'from-purple-500 via-indigo-400 to-cyan-400' },
  { id: 'gold', label: 'Leyenda Dorada', desc: 'Oro imperial con destellos radiantes', glow: 'rgba(245,158,11,0.7)', previewGrad: 'from-amber-400 via-yellow-200 to-amber-600' },
  { id: 'synthwave', label: 'Onda Retro', desc: 'Estética 80s con glitch y aberración', glow: 'rgba(217,70,239,0.7)', previewGrad: 'from-fuchsia-500 via-purple-600 to-pink-500' },
]

export const PROFILE_THEMES = [
  { id: 'default', label: 'Obsidiana Clásica', desc: 'Diseño limpio y minimalista', color: '#6d5cff' },
  { id: 'sakura-shrine', label: 'Santuario Sakura', desc: 'Pétalos cayendo con aura mística de atardecer', color: '#f472b6' },
  { id: 'cyber-rain', label: 'Tokyo Cyber Rain', desc: 'Lluvia de luces digitales de neón en la metrópolis', color: '#06b6d4' },
  { id: 'deep-cosmos', label: 'Cosmos Infinito', desc: 'Nebulosas en órbita y polvo de estrellas brillante', color: '#8b5cf6' },
  { id: 'dark-abyss', label: 'Abismo Carmesí', desc: 'Ascuas volcánicas y humo etéreo de las profundidades', color: '#ef4444' },
  { id: 'golden-dawn', label: 'Amanecer Dorado', desc: 'Rayos celestiales y destellos cálidos dorados', color: '#f59e0b' },
]

export const DEFAULT_PROFILE = {
  version: 1,
  displayName: 'Usuario de Orunei',
  username: 'orunei-user',
  visibility: 'public',
  bio: '',
  status: '',
  avatar: '',
  banner: '',
  accent: '#6d5cff',
  avatarFrame: 'none',
  profileTheme: 'default',
  featuredAnimeId: '',
  featuredQuote: '',
  featuredReview: '',
  pinnedSections: ['overview', 'animelist', 'favorites'],
  landingSection: 'overview',
  privacy: {
    animeList: 'private',
    favorites: 'private',
    activity: 'private',
    lists: 'private',
  },
  customLists: [],
  animeList: [],
  activity: [],
  updatedAt: '',
}

const clone = (value) => JSON.parse(JSON.stringify(value))
const text = (value, fallback = '') => typeof value === 'string' ? value.trim() : fallback

function genres(value) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? [value] : []
  return [...new Set(source.map((genre) => text(genre)).filter(Boolean))].slice(0, 12)
}

function slug(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
}

function identityFromUser(user = {}) {
  const name = text(user.name) || text(user.email).split('@')[0] || DEFAULT_PROFILE.displayName
  return {
    displayName: name.slice(0, 50),
    username: slug(name) || DEFAULT_PROFILE.username,
  }
}

export function createProfile(user = {}) {
  const identity = identityFromUser(user)
  return {
    ...clone(DEFAULT_PROFILE),
    ...identity,
    privacy: { ...DEFAULT_PROFILE.privacy },
    pinnedSections: [...DEFAULT_PROFILE.pinnedSections],
    updatedAt: new Date().toISOString(),
  }
}

function normalizePrivacy(raw) {
  return Object.fromEntries(PRIVACY_SECTIONS.map((section) => {
    const legacyKey = section === 'animeList' ? 'animelist' : null
    const value = raw?.[section] ?? (legacyKey ? raw?.[legacyKey] : undefined)
    return [section, ['private', 'public', 'friends'].includes(value) ? value : DEFAULT_PROFILE.privacy[section]]
  }))
}

function normalizeLists(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((list, index) => {
    if (!list || typeof list !== 'object') return null
    const title = text(list.title).slice(0, 60)
    if (!title) return null
    const now = text(list.updatedAt) || new Date().toISOString()
    return {
      id: text(list.id) || `list-${index + 1}`,
      title,
      description: text(list.description).slice(0, 160),
      accent: /^#[0-9a-f]{6}$/i.test(text(list.accent)) ? list.accent : DEFAULT_PROFILE.accent,
      animeIds: [...new Set((Array.isArray(list.animeIds) ? list.animeIds : []).map(String))],
      createdAt: text(list.createdAt) || now,
      updatedAt: now,
    }
  }).filter(Boolean)
}

function normalizeActivity(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') return null
    const label = text(item.label).slice(0, 180)
    const at = text(item.at)
    if (!label || !at) return null
    return { id: text(item.id) || `activity-${index + 1}-${at}`, type: text(item.type) || 'profile', label, at }
  }).filter(Boolean).slice(-MAX_ACTIVITY)
}

export function normalizeAnimeEntry(raw = {}, index = 0) {
  const identity = raw.id ?? raw.animeId ?? raw.anime_id ?? raw.q ?? raw.title
  const id = text(identity) || (Number.isFinite(identity) ? String(identity) : '') || `anime-${index + 1}`
  const title = text(raw.t ?? raw.title ?? raw.name) || 'Anime sin título'
  const rawStatus = text(raw.status).toLowerCase() || (text(raw.s).startsWith('Viendo') ? 'watching' : text(raw.s).startsWith('En pausa') ? 'paused' : text(raw.s).startsWith('Terminado') ? 'completed' : 'planned')
  const status = ANIME_STATUSES.includes(rawStatus) ? rawStatus : 'planned'
  return {
    id,
    animeId: id,
    q: text(raw.q) || title,
    t: title,
    s: ANIME_STATUS_LABELS[status],
    status,
    favorite: Boolean(raw.favorite) || text(raw.s).startsWith('Favorito'),
    dot: ANIME_STATUS_DOTS[status],
    img: text(raw.img ?? raw.posterUrl ?? raw.poster_url),
    banner: text(raw.banner ?? raw.bannerUrl ?? raw.banner_url),
    grad: text(raw.grad) || 'linear-gradient(135deg,#c9b7e6,#6f8a6b)',
    year: Number.isFinite(raw.year) ? raw.year : null,
    genres: genres(raw.genres ?? raw.genre),
  }
}

export function createLibraryEntry(media = {}) {
  const mediaTitle = typeof media.title === 'object'
    ? media.title?.english || media.title?.romaji || media.title?.native
    : media.title
  const title = text(mediaTitle ?? media.t ?? media.name ?? media.q) || 'Anime sin título'
  const id = media.id ?? media.animeId ?? media.q ?? title
  return normalizeAnimeEntry({
    id,
    q: media.q || title,
    t: title,
    img: media.img || media.coverImage?.extraLarge,
    banner: media.banner || media.bannerImage,
    year: media.year ?? media.seasonYear,
    genres: media.genres,
    grad: media.grad,
    status: 'planned',
  })
}

export function markAnimeWatched(entry = {}, media = {}) {
  const genresFromEntry = genres(entry.genres)
  return normalizeAnimeEntry({
    ...entry,
    status: 'completed',
    genres: genresFromEntry.length ? genresFromEntry : media.genres,
    img: entry.img || media.coverImage?.extraLarge,
    banner: entry.banner || media.bannerImage,
    year: entry.year || media.seasonYear,
  })
}

export function normalizeAnimeList(raw) {
  if (!Array.isArray(raw)) return []
  const unique = new Map()
  raw.forEach((entry, index) => { const normalized = normalizeAnimeEntry(entry, index); unique.set(normalized.id, normalized) })
  return [...unique.values()]
}

export function toRemoteAnimeEntry(profileId, entry) {
  const normalized = normalizeAnimeEntry(entry)
  return {
    profile_id: profileId,
    anime_id: normalized.id,
    title: normalized.t,
    search_title: normalized.q,
    status: normalized.status,
    favorite: normalized.favorite,
    poster_url: normalized.img,
    banner_url: normalized.banner,
    year: normalized.year,
    genres: normalized.genres,
    updated_at: new Date().toISOString(),
  }
}

export function normalizeProfile(raw, user = {}) {
  const base = createProfile(user)
  const source = raw && typeof raw === 'object' ? raw : {}
  const fallbackIdentity = identityFromUser(user)
  const rawUsername = slug(source.username)
  const username = /^[a-z0-9][a-z0-9_.-]{2,23}$/.test(rawUsername) && rawUsername === text(source.username).toLowerCase()
    ? rawUsername
    : fallbackIdentity.username
  const pinned = [...new Set((Array.isArray(source.pinnedSections) ? source.pinnedSections : base.pinnedSections).filter((section) => PROFILE_SECTIONS.includes(section)))]
  return {
    ...base,
    id: text(source.id) || text(user.id),
    displayName: text(source.displayName, fallbackIdentity.displayName).slice(0, 50) || fallbackIdentity.displayName,
    username,
    visibility: ['private', 'public'].includes(source.visibility) ? source.visibility : base.visibility,
    bio: text(source.bio).slice(0, 280),
    status: text(source.status).slice(0, 100),
    avatar: text(source.avatar),
    banner: text(source.banner),
    accent: /^#[0-9a-f]{6}$/i.test(text(source.accent)) ? source.accent : base.accent,
    avatarFrame: AVATAR_FRAMES.some((f) => f.id === source.avatarFrame) ? source.avatarFrame : base.avatarFrame,
    profileTheme: PROFILE_THEMES.some((t) => t.id === source.profileTheme) ? source.profileTheme : base.profileTheme,
    featuredAnimeId: text(source.featuredAnimeId),
    featuredQuote: text(source.featuredQuote).slice(0, 140),
    featuredReview: text(source.featuredReview).slice(0, 400),
    pinnedSections: pinned.length ? pinned : [...base.pinnedSections],
    landingSection: PROFILE_SECTIONS.includes(source.landingSection) ? source.landingSection : base.landingSection,
    privacy: normalizePrivacy(source.privacy),
    customLists: normalizeLists(source.customLists),
    animeList: normalizeAnimeList(source.animeList),
    activity: normalizeActivity(source.activity),
    updatedAt: text(source.updatedAt) || base.updatedAt,
  }
}

export function validateImageFile(file, kind) {
  if (!['avatar', 'banner'].includes(kind)) return { ok: false, error: 'Tipo de imagen no válido.' }
  if (!file || typeof file.type !== 'string' || !file.type.startsWith('image/') || file.type === 'image/svg+xml') return { ok: false, error: 'Selecciona una imagen válida.' }
  if (!Number.isFinite(file.size) || file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'La imagen debe pesar menos de 5 MB.' }
  return { ok: true }
}

export function getImageConstraints(kind) {
  return IMAGE_CONSTRAINTS[kind] ? { ...IMAGE_CONSTRAINTS[kind] } : null
}

export function readImageAsDataUrl(file, kind) {
  const result = validateImageFile(file, kind)
  if (!result.ok) return Promise.reject(new Error(result.error))
  if (typeof FileReader === 'undefined' || typeof Image === 'undefined' || typeof document === 'undefined') return Promise.reject(new Error('La carga de imágenes solo está disponible en el navegador.'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
    reader.onload = () => {
      // Preservar GIFs animados completos sin aplanar a JPEG estático
      if (file.type === 'image/gif') {
        return resolve(reader.result)
      }
      const image = new Image()
      image.onerror = () => reject(new Error('La imagen no se pudo procesar.'))
      image.onload = () => {
        const constraints = IMAGE_CONSTRAINTS[kind]
        const sourceSide = kind === 'avatar' ? Math.min(image.width, image.height) : null
        const scale = kind === 'avatar'
          ? Math.min(1, constraints.maxWidth / sourceSide)
          : Math.min(1, constraints.maxWidth / image.width, constraints.maxHeight / image.height)
        const width = kind === 'avatar' ? Math.max(1, Math.round(sourceSide * scale)) : Math.max(1, Math.round(image.width * scale))
        const height = kind === 'avatar' ? width : Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No se pudo preparar la imagen.'))
        if (kind === 'avatar') {
          const sx = (image.width - sourceSide) / 2
          const sy = (image.height - sourceSide) / 2
          ctx.drawImage(image, sx, sy, sourceSide, sourceSide, 0, 0, width, height)
        } else ctx.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.86))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export function makeActivity(type, label, at = new Date().toISOString()) {
  const safeType = text(type) || 'profile'
  const safeLabel = text(label).slice(0, 180)
  return { id: `${safeType}-${at}`, type: safeType, label: safeLabel, at }
}

export function getProfileStats(library = [], tasteCount = 0, profile = DEFAULT_PROFILE) {
  const rows = Array.isArray(library) ? library : []
  return {
    works: rows.length,
    favorites: rows.filter((item) => item?.favorite || text(item?.s).startsWith('Favorito')).length,
    lists: Array.isArray(profile?.customLists) ? profile.customLists.length : 0,
    tastes: Number.isFinite(tasteCount) ? tasteCount : 0,
  }
}
