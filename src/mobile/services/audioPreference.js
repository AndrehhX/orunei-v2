/**
 * Gestor de persistencia de preferencias de audio por temporada.
 *
 * Estructura de almacenamiento:
 *   userId + animeId + seasonId → audioPreference
 *
 * Valores posibles:
 *   - 'latino': Audio Español Latino (DUB 1080p)
 *   - 'castellano': Audio Español Castellano (DUB)
 *   - 'sub_es': Audio Japonés con subtítulos en español (SUB - Experiencia estándar)
 */

const STORAGE_PREFIX = 'orunei_audio_pref_';

function getStorage() {
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

function buildKey(animeId, seasonId = 1, userId = null) {
  const cleanUser = userId ? String(userId).trim() : 'guest';
  const cleanAnime = animeId ? String(animeId).trim() : 'unknown';
  const cleanSeason = seasonId ? String(seasonId).trim() : 's1';
  return `${STORAGE_PREFIX}${cleanUser}_${cleanAnime}_${cleanSeason}`;
}

/**
 * Consulta la preferencia de idioma guardada para una temporada específica.
 */
export function getSeasonAudioPreference(animeId, seasonId = 1, userId = null) {
  const storage = getStorage();
  if (!storage || !animeId) return null;
  try {
    const key = buildKey(animeId, seasonId, userId);
    const value = storage.getItem(key);
    if (value && ['latino', 'castellano', 'sub_es'].includes(value)) {
      return value;
    }
    // Fallback a guest si el usuario inició sesión pero tenía preferencia previa
    if (userId) {
      const guestKey = buildKey(animeId, seasonId, null);
      const guestVal = storage.getItem(guestKey);
      if (guestVal && ['latino', 'castellano', 'sub_es'].includes(guestVal)) {
        return guestVal;
      }
    }
    return null;
  } catch (err) {
    console.warn('[audioPreference] Error al leer preferencia:', err);
    return null;
  }
}

/**
 * Guarda la preferencia de idioma para una temporada específica.
 */
export function setSeasonAudioPreference(animeId, seasonId = 1, preference, userId = null) {
  const storage = getStorage();
  if (!storage || !animeId || !preference) return;
  try {
    const key = buildKey(animeId, seasonId, userId);
    storage.setItem(key, preference);
  } catch (err) {
    console.warn('[audioPreference] Error al guardar preferencia:', err);
  }
}

/**
 * Elimina la preferencia guardada para forzar la reapertura del selector.
 */
export function clearSeasonAudioPreference(animeId, seasonId = 1, userId = null) {
  const storage = getStorage();
  if (!storage || !animeId) return;
  try {
    const key = buildKey(animeId, seasonId, userId);
    storage.removeItem(key);
  } catch (err) {
    console.warn('[audioPreference] Error al limpiar preferencia:', err);
  }
}
