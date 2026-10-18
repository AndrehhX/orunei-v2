import { normalizeAnimeList, normalizeProfile, toRemoteAnimeEntry, validateImageFile } from './model.js'
import { supabase } from '../auth/supabaseClient.js'

const PROFILE_FIELDS = ['username', 'displayName', 'bio', 'status', 'visibility', 'accent', 'featuredAnimeId', 'pinnedSections', 'landingSection']

const text = (value) => typeof value === 'string' ? value.trim() : ''

export function buildProfileImagePath(userId, kind, fileName = '') {
  const rawExtension = text(fileName).split('.').pop()?.toLowerCase() || 'jpg'
  const extension = rawExtension === 'jpeg' ? 'jpg' : ['jpg', 'png', 'webp', 'gif'].includes(rawExtension) ? rawExtension : 'jpg'
  return `${userId}/${kind}.${extension}`
}

function privacyObject(rows) {
  if (!Array.isArray(rows)) return rows || undefined
  return Object.fromEntries(rows.map((row) => [row.section, row.visibility]))
}

export function normalizeRemoteProfile(row, user = {}) {
  if (!row) return null
  const pinnedRaw = row.pinnedSections ?? row.pinned_sections
  const isObject = pinnedRaw && typeof pinnedRaw === 'object' && !Array.isArray(pinnedRaw)
  const pinnedList = isObject && Array.isArray(pinnedRaw.sections)
    ? pinnedRaw.sections
    : (Array.isArray(pinnedRaw) ? pinnedRaw : ['overview', 'animelist', 'favorites'])
  const meta = isObject ? pinnedRaw : {}

  return normalizeProfile({
    ...row,
    visibility: row.visibility ?? row.profile_visibility,
    displayName: row.displayName ?? row.display_name,
    avatar: row.avatar ?? row.avatar_url,
    banner: row.banner ?? row.banner_url,
    accent: row.accent,
    avatarFrame: row.avatar_frame ?? row.avatarFrame ?? meta.avatarFrame,
    profileTheme: row.profile_theme ?? row.profileTheme ?? meta.profileTheme,
    glassOpacity: row.glass_opacity ?? row.glassOpacity ?? meta.glassOpacity,
    overviewOrder: row.overview_order ?? row.overviewOrder ?? meta.overviewOrder,
    featuredQuote: row.featured_quote ?? row.featuredQuote ?? meta.featuredQuote,
    featuredReview: row.featured_review ?? row.featuredReview ?? meta.featuredReview,
    featuredAnimeId: row.featuredAnimeId ?? row.featured_anime_id,
    pinnedSections: pinnedList,
    landingSection: row.landingSection ?? row.landing_section,
    updatedAt: row.updatedAt ?? row.updated_at,
    privacy: privacyObject(row.privacy),
  }, user)
}

function profilePayload(userId, patch) {
  const sections = Array.isArray(patch.pinnedSections) ? patch.pinnedSections : ['overview', 'animelist', 'favorites']
  const customMeta = {
    avatarFrame: patch.avatarFrame || 'none',
    profileTheme: patch.profileTheme || 'default',
    glassOpacity: typeof patch.glassOpacity === 'number' ? patch.glassOpacity : 75,
    overviewOrder: Array.isArray(patch.overviewOrder) ? patch.overviewOrder : ['showcase', 'comments', 'animeList', 'activity'],
    featuredQuote: text(patch.featuredQuote),
    featuredReview: text(patch.featuredReview),
  }

  return {
    id: userId,
    username: text(patch.username),
    profile_visibility: ['private', 'public'].includes(patch.visibility) ? patch.visibility : 'public',
    display_name: text(patch.displayName),
    bio: text(patch.bio),
    status: text(patch.status),
    avatar_url: text(patch.avatar),
    banner_url: text(patch.banner),
    accent: text(patch.accent),
    featured_anime_id: text(patch.featuredAnimeId),
    pinned_sections: {
      sections,
      ...customMeta,
    },
    landing_section: text(patch.landingSection),
    updated_at: new Date().toISOString(),
  }
}

function privacyPayload(profileId, privacy = {}) {
  return Object.entries(privacy).map(([section, visibility]) => ({ profile_id: profileId, section, visibility }))
}

function resultError(error) {
  return error?.message || ''
}

function normalizeRemoteLists(rows) {
  const raw = (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.list_id ?? row.id,
    title: row.title,
    description: row.description,
    accent: row.accent,
    animeIds: row.anime_ids,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  return normalizeProfile({ customLists: raw }).customLists
}

function normalizeRemoteActivity(rows) {
  const raw = (Array.isArray(rows) ? rows : []).map((row) => ({ id: row.id, type: row.type, label: row.label, at: row.created_at }))
  return normalizeProfile({ activity: raw }).activity
}

async function readCollections(client, profileId) {
  const [animeResult, listsResult, activityResult] = await Promise.all([
    client.from('profile_anime').select('*').eq('profile_id', profileId),
    client.from('profile_lists').select('*').eq('profile_id', profileId),
    client.from('profile_activity').select('*').eq('profile_id', profileId).order('created_at', { ascending: false }),
  ])
  return {
    animeList: animeResult.error ? [] : normalizeAnimeList(animeResult.data),
    customLists: listsResult.error ? [] : normalizeRemoteLists(listsResult.data),
    activity: activityResult.error ? [] : normalizeRemoteActivity(activityResult.data),
    error: resultError(animeResult.error) || resultError(listsResult.error) || resultError(activityResult.error),
  }
}

export function createProfileRepository(client = supabase) {
  const unavailable = () => ({ data: null, error: 'Las cuentas remotas no están configuradas.' })
  return {
    async getOwnProfile(userId) {
      if (!client || !userId) return unavailable()
      const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (error) return { data: null, error: resultError(error) }
      if (!data) return { data: null, error: '' }
      const collections = await readCollections(client, userId)
      return { data: normalizeRemoteProfile({ ...data, ...collections }, { id: userId }), error: collections.error }
    },

    async getPublicProfile(username, viewerId = null) {
      if (!client || !username) return unavailable()
      const profileResult = await client.from('profiles').select('*').eq('username', username).maybeSingle()
      if (profileResult.error || !profileResult.data) return { data: null, error: resultError(profileResult.error) }
      if (profileResult.data.id !== viewerId && profileResult.data.profile_visibility === 'private') return { data: null, error: '' }
      const privacyResult = await client.from('profile_privacy').select('section, visibility').eq('profile_id', profileResult.data.id)
      const collections = await readCollections(client, profileResult.data.id)
      const row = { ...profileResult.data, privacy: privacyResult.data || [], ...collections }
      return { data: normalizeRemoteProfile(row, { id: viewerId || '' }), error: resultError(privacyResult.error) || collections.error }
    },

    async saveProfile(userId, patch) {
      if (!client || !userId) return unavailable()
      const payload = profilePayload(userId, patch)
      const { data, error } = await client.from('profiles').upsert(payload).select('*').single()
      if (error) return { data: null, error: resultError(error) }

      try {
        if (client?.auth?.updateUser && typeof client.auth.updateUser === 'function') {
          client.auth.updateUser({
            data: {
              avatarFrame: patch.avatarFrame,
              profileTheme: patch.profileTheme,
              glassOpacity: patch.glassOpacity,
              overviewOrder: patch.overviewOrder,
            }
          }).catch(() => {})
        }
      } catch {}

      const rows = privacyPayload(userId, patch.privacy)
      if (rows.length) {
        const privacyResult = await client.from('profile_privacy').upsert(rows, { onConflict: 'profile_id,section' })
        if (privacyResult.error) return { data: null, error: resultError(privacyResult.error) }
      }
      return { data: normalizeRemoteProfile({ ...data, pinned_sections: payload.pinned_sections, privacy: rows }, { id: userId }), error: '' }
    },

    async saveAnimeList(userId, entries) {
      if (!client || !userId) return unavailable()
      const rows = normalizeAnimeList(entries).map((entry) => toRemoteAnimeEntry(userId, entry))
      const { error: deleteError } = await client.from('profile_anime').delete().eq('profile_id', userId)
      if (deleteError) return { data: null, error: resultError(deleteError) }
      if (rows.length) {
        const { error } = await client.from('profile_anime').upsert(rows, { onConflict: 'profile_id,anime_id' })
        if (error) return { data: null, error: resultError(error) }
      }
      return { data: normalizeAnimeList(entries), error: '' }
    },

    async saveCustomLists(userId, lists) {
      if (!client || !userId) return unavailable()
      const normalized = normalizeRemoteLists(lists)
      const { error: deleteError } = await client.from('profile_lists').delete().eq('profile_id', userId)
      if (deleteError) return { data: null, error: resultError(deleteError) }
      if (normalized.length) {
        const rows = normalized.map((list) => ({ profile_id: userId, list_id: list.id, title: list.title, description: list.description, accent: list.accent, anime_ids: list.animeIds, created_at: list.createdAt, updated_at: list.updatedAt }))
        const { error } = await client.from('profile_lists').upsert(rows, { onConflict: 'profile_id,list_id' })
        if (error) return { data: null, error: resultError(error) }
      }
      return { data: normalized, error: '' }
    },

    async recordActivity(userId, type, label) {
      if (!client || !userId) return unavailable()
      const { data, error } = await client.from('profile_activity').insert({ profile_id: userId, type: text(type) || 'profile', label: text(label) }).select('*').single()
      return { data: error ? null : normalizeRemoteActivity([data])[0] || null, error: resultError(error) }
    },

    async uploadProfileImage(userId, kind, file) {
      if (!client || !userId || !file || !['avatar', 'banner'].includes(kind)) return unavailable()
      const validation = validateImageFile(file, kind)
      if (!validation.ok) return { data: null, error: validation.error }
      const path = buildProfileImagePath(userId, kind, file.name)
      const bucket = client.storage.from('profile-media')
      const uploadResult = await bucket.upload(path, file, { upsert: true, cacheControl: '3600', contentType: file.type || undefined })
      if (uploadResult.error) return { data: null, error: resultError(uploadResult.error) }
      const publicResult = bucket.getPublicUrl(path)
      const publicUrl = publicResult.data?.publicUrl || ''
      return publicUrl ? { data: publicUrl, error: '' } : { data: null, error: 'Supabase no devolviÃ³ la URL de la imagen.' }
    },
  }
}

export { PROFILE_FIELDS }
