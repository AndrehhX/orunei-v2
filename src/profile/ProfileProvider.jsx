import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_PROFILE, MAX_ACTIVITY, createProfile, makeActivity, normalizeAnimeList, normalizeProfile, readImageAsDataUrl } from './model.js'
import { readProfileStorage, writeProfileStorage } from './profileStorage.js'
import { clearProfileState, loadOrCreateRemoteProfile, persistRemoteProfile, resolveLoadedProfile } from './profileProviderModel.js'

const ProfileContext = createContext(null)
const browserStorage = () => {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

export function ProfileProvider({ children, user = {}, repository = null }) {
  const remote = Boolean(repository && user?.id)
  const [profile, setProfile] = useState(() => remote ? createProfile(user) : readProfileStorage(browserStorage(), user))
  const [profileStatus, setProfileStatus] = useState(() => remote ? 'loading' : 'ready')
  const [storageError, setStorageError] = useState('')
  const profileRef = useRef(profile)

  useEffect(() => {
    let active = true
    const local = readProfileStorage(browserStorage(), user)
    const initial = remote ? normalizeProfile({ ...createProfile(user), ...local }, user) : local
    profileRef.current = initial
    setProfile(initial)
    setStorageError('')
    setProfileStatus(remote ? 'loading' : 'ready')
    if (!remote) return () => { active = false }

    loadOrCreateRemoteProfile(repository, user).then((result) => {
      if (!active) return
      const loaded = resolveLoadedProfile(result?.data, result?.error, user)
      const merged = normalizeProfile({
        ...local,
        ...loaded.profile,
        avatarFrame: (loaded.profile.avatarFrame && loaded.profile.avatarFrame !== 'none') ? loaded.profile.avatarFrame : (local.avatarFrame || 'none'),
        profileTheme: (loaded.profile.profileTheme && loaded.profile.profileTheme !== 'default') ? loaded.profile.profileTheme : (local.profileTheme || 'default'),
        featuredQuote: loaded.profile.featuredQuote || local.featuredQuote || '',
        featuredReview: loaded.profile.featuredReview || local.featuredReview || '',
      }, user)
      profileRef.current = merged
      setProfile(merged)
      writeProfileStorage(browserStorage(), merged)
      setStorageError(loaded.error)
      setProfileStatus(loaded.status)
    }).catch((error) => {
      if (!active) return
      setStorageError(error instanceof Error ? error.message : 'No se pudo cargar el perfil.')
      setProfileStatus('ready')
    })
    return () => { active = false }
  }, [remote, repository, user?.id])

  const saveProfile = useCallback(async (nextOrUpdater) => {
    const source = typeof nextOrUpdater === 'function' ? nextOrUpdater(profileRef.current) : nextOrUpdater
    const next = normalizeProfile({ ...source, updatedAt: new Date().toISOString() }, user)
    // Guardar inmediatamente en almacenamiento local para reflejar y retener personalización
    writeProfileStorage(browserStorage(), next)
    if (remote) {
      const result = await persistRemoteProfile(repository, user.id, next)
      if (!result.ok) {
        setStorageError(result.error)
        return { ok: false, error: result.error }
      }
      const persisted = normalizeProfile({
        ...next,
        ...result.data,
        avatarFrame: next.avatarFrame,
        profileTheme: next.profileTheme,
        featuredQuote: next.featuredQuote,
        featuredReview: next.featuredReview,
        animeList: result.data?.animeList ?? profileRef.current.animeList,
        customLists: result.data?.customLists ?? profileRef.current.customLists,
        activity: result.data?.activity ?? profileRef.current.activity,
      }, user)
      profileRef.current = persisted
      setProfile(persisted)
      writeProfileStorage(browserStorage(), persisted)
      setStorageError('')
      return { ok: true, error: '' }
    }
    profileRef.current = next
    setProfile(next)
    const result = writeProfileStorage(browserStorage(), next)
    setStorageError(result.ok ? '' : result.error)
    return result
  }, [remote, repository, user])

  const uploadProfileImage = useCallback(async (kind, file) => {
    if (remote) {
      try {
        const result = await repository.uploadProfileImage(user.id, kind, file)
        return result?.error ? { ok: false, data: null, error: result.error } : { ok: true, data: result.data, error: '' }
      } catch (error) {
        return { ok: false, data: null, error: error instanceof Error ? error.message : 'No se pudo subir la imagen.' }
      }
    }
    try {
      return { ok: true, data: await readImageAsDataUrl(file, kind), error: '' }
    } catch (error) {
      return { ok: false, data: null, error: error instanceof Error ? error.message : 'No se pudo procesar la imagen.' }
    }
  }, [remote, repository, user?.id])

  const updateProfile = useCallback((patch) => saveProfile((current) => ({ ...current, ...(typeof patch === 'function' ? patch(current) : patch) })), [saveProfile])
  const resetVisuals = useCallback(() => saveProfile((current) => ({ ...current, avatar: '', banner: '', accent: DEFAULT_PROFILE.accent, featuredAnimeId: '' })), [saveProfile])
  const recordActivity = useCallback(async (type, label) => {
    if (remote) {
      const result = await repository.recordActivity(user.id, type, label)
      if (result.error) { setStorageError(result.error); return { ok: false, error: result.error } }
      const nextActivity = [...profileRef.current.activity, result.data].filter(Boolean).slice(-MAX_ACTIVITY)
      profileRef.current = { ...profileRef.current, activity: nextActivity }
      setProfile(profileRef.current)
      setStorageError('')
      return { ok: true, error: '' }
    }
    return saveProfile((current) => ({ ...current, activity: [...current.activity, makeActivity(type, label)].slice(-MAX_ACTIVITY) }))
  }, [remote, repository, saveProfile, user?.id])
  const updateCustomLists = useCallback(async (nextOrUpdater) => {
    const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(profileRef.current.customLists) : nextOrUpdater
    if (remote) {
      const result = await repository.saveCustomLists(user.id, next)
      if (result.error) { setStorageError(result.error); return { ok: false, error: result.error } }
      profileRef.current = { ...profileRef.current, customLists: result.data || next }
      setProfile(profileRef.current)
      setStorageError('')
      return { ok: true, error: '' }
    }
    return saveProfile((current) => ({ ...current, customLists: next }))
  }, [remote, repository, saveProfile, user?.id])
  const updateAnimeList = useCallback(async (nextOrUpdater) => {
    const next = normalizeAnimeList(typeof nextOrUpdater === 'function' ? nextOrUpdater(profileRef.current.animeList) : nextOrUpdater)
    if (remote) {
      const result = await repository.saveAnimeList(user.id, next)
      if (!result.ok && result.error) {
        setStorageError(result.error)
        return { ok: false, error: result.error }
      }
      const persisted = normalizeAnimeList(result.data || next)
      profileRef.current = { ...profileRef.current, animeList: persisted }
      setProfile(profileRef.current)
      setStorageError('')
      return { ok: true, error: '' }
    }
    return saveProfile((current) => ({ ...current, animeList: next }))
  }, [remote, repository, saveProfile, user?.id])

  const value = useMemo(() => ({ profile, profileStatus, saveProfile, updateProfile, resetVisuals, recordActivity, updateCustomLists, updateAnimeList, uploadProfileImage, storageError, clearProfileState }), [profile, profileStatus, saveProfile, updateProfile, resetVisuals, recordActivity, updateCustomLists, updateAnimeList, uploadProfileImage, storageError])
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const value = useContext(ProfileContext)
  if (!value) throw new Error('useProfile debe usarse dentro de ProfileProvider')
  return value
}

export { createProfile }
