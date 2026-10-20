import { createProfile, normalizeProfile, PROFILE_KEY } from './model.js'

export function getUserProfileKey(userId) {
  const clean = typeof userId === 'string' ? userId.trim() : ''
  return clean ? `${PROFILE_KEY}-${clean}` : PROFILE_KEY
}

export function readProfileStorage(storage, user = {}) {
  const safeUser = user || {}
  if (!storage) return createProfile(safeUser)
  try {
    const userKey = getUserProfileKey(safeUser?.id)
    const rawUser = userKey !== PROFILE_KEY ? storage.getItem(userKey) : null
    const raw = rawUser || storage.getItem(PROFILE_KEY)
    return raw ? normalizeProfile(JSON.parse(raw), safeUser) : createProfile(safeUser)
  } catch {
    return createProfile(safeUser)
  }
}

export function writeProfileStorage(storage, profile, user = {}) {
  if (!storage) return { ok: false, error: 'El almacenamiento local no está disponible.' }
  try {
    const json = JSON.stringify(profile)
    storage.setItem(PROFILE_KEY, json)
    const targetId = user?.id || profile?.id
    if (targetId) {
      storage.setItem(getUserProfileKey(targetId), json)
    }
    return { ok: true, error: '' }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'No se pudo guardar el perfil.' }
  }
}

export function clearProfileStorage(storage, userId) {
  if (!storage) return
  try {
    storage.removeItem(PROFILE_KEY)
    if (userId) storage.removeItem(getUserProfileKey(userId))
  } catch {}
}
