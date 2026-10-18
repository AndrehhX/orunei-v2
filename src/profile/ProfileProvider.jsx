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
      const mergedAnimeList = (Array.isArray(loaded.profile.animeList) && loaded.profile.animeList.length > 0)
        ? (Array.isArray(local.animeList) && local.animeList.length > 0
            ? normalizeAnimeList([...loaded.profile.animeList, ...local.animeList])
            : loaded.profile.animeList)
        : (Array.isArray(local.animeList) ? local.animeList : [])
      const mergedCustomLists = (Array.isArray(loaded.profile.customLists) && loaded.profile.customLists.length > 0)
        ? loaded.profile.customLists
        : (Array.isArray(local.customLists) ? local.customLists : [])
      const mergedActivity = (Array.isArray(loaded.profile.activity) && loaded.profile.activity.length > 0)
        ? loaded.profile.activity
        : (Array.isArray(local.activity) ? local.activity : [])

      const merged = normalizeProfile({
        ...local,
        ...loaded.profile,
        avatarFrame: (loaded.profile.avatarFrame && loaded.profile.avatarFrame !== 'none') ? loaded.profile.avatarFrame : (local.avatarFrame || 'none'),
        profileTheme: (loaded.profile.profileTheme && loaded.profile.profileTheme !== 'default') ? loaded.profile.profileTheme : (local.profileTheme || 'default'),
        featuredQuote: loaded.profile.featuredQuote || local.featuredQuote || '',
        featuredReview: loaded.profile.featuredReview || local.featuredReview || '',
        animeList: mergedAnimeList,
        customLists: mergedCustomLists,
        activity: mergedActivity,
      }, user)
      profileRef.current = merged
      setProfile(merged)
      writeProfileStorage(browserStorage(), merged)
      setStorageError(loaded.error)
      setProfileStatus(loaded.status)
      if (remote && mergedAnimeList.length > (loaded.profile.animeList?.length || 0)) {
        repository.saveAnimeList(user.id, mergedAnimeList).catch(() => {})
      }
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

    // Protección estricta: nunca permitir que saveProfile vacíe animeList, customLists ni activity
    const effectiveAnimeList = (Array.isArray(next.animeList) && next.animeList.length > 0)
      ? next.animeList
      : (Array.isArray(profileRef.current.animeList) && profileRef.current.animeList.length > 0 ? profileRef.current.animeList : [])
    const effectiveCustomLists = (Array.isArray(next.customLists) && next.customLists.length > 0)
      ? next.customLists
      : (Array.isArray(profileRef.current.customLists) && profileRef.current.customLists.length > 0 ? profileRef.current.customLists : [])
    const effectiveActivity = (Array.isArray(next.activity) && next.activity.length > 0)
      ? next.activity
      : (Array.isArray(profileRef.current.activity) && profileRef.current.activity.length > 0 ? profileRef.current.activity : [])

    const safeNext = {
      ...next,
      animeList: effectiveAnimeList,
      customLists: effectiveCustomLists,
      activity: effectiveActivity,
    }

    // Guardar inmediatamente en almacenamiento local para retener personalización y biblioteca sin latencia
    writeProfileStorage(browserStorage(), safeNext)
    profileRef.current = safeNext
    setProfile(safeNext)

    if (remote) {
      const result = await persistRemoteProfile(repository, user.id, safeNext)
      if (!result.ok) {
        setStorageError(result.error)
        return { ok: false, error: result.error }
      }
      const remoteAnimeList = (Array.isArray(result.data?.animeList) && result.data.animeList.length > 0) ? result.data.animeList : effectiveAnimeList
      const remoteCustomLists = (Array.isArray(result.data?.customLists) && result.data.customLists.length > 0) ? result.data.customLists : effectiveCustomLists
      const remoteActivity = (Array.isArray(result.data?.activity) && result.data.activity.length > 0) ? result.data.activity : effectiveActivity

      const persisted = normalizeProfile({
        ...safeNext,
        ...result.data,
        avatarFrame: safeNext.avatarFrame,
        profileTheme: safeNext.profileTheme,
        featuredQuote: safeNext.featuredQuote,
        featuredReview: safeNext.featuredReview,
        animeList: remoteAnimeList,
        customLists: remoteCustomLists,
        activity: remoteActivity,
      }, user)
      profileRef.current = persisted
      setProfile(persisted)
      writeProfileStorage(browserStorage(), persisted)
      setStorageError('')
      return { ok: true, error: '' }
    }
    setStorageError('')
    return { ok: true, error: '' }
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
      writeProfileStorage(browserStorage(), profileRef.current)
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
      writeProfileStorage(browserStorage(), profileRef.current)
      setStorageError('')
      return { ok: true, error: '' }
    }
    return saveProfile((current) => ({ ...current, customLists: next }))
  }, [remote, repository, saveProfile, user?.id])
  const updateAnimeList = useCallback(async (nextOrUpdater) => {
    const next = normalizeAnimeList(typeof nextOrUpdater === 'function' ? nextOrUpdater(profileRef.current.animeList) : nextOrUpdater)
    if (remote) {
      const result = await repository.saveAnimeList(user.id, next)
      const persisted = normalizeAnimeList(result.data || next)
      profileRef.current = { ...profileRef.current, animeList: persisted }
      setProfile(profileRef.current)
      writeProfileStorage(browserStorage(), profileRef.current)
      if (result.error) {
        setStorageError(result.error)
        return { ok: false, error: result.error }
      }
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
