/**
 * Gestor de persistencia del punto exacto de reproducción (Timestamp Resume)
 * y estado de visualización ("Visto" / porcentaje completado).
 * Permite reanudar un episodio en el segundo exacto y mostrar sutiles
 * barras de progreso en la lista de episodios sin saturar la interfaz.
 */

const STORAGE_KEY = 'orunei_playback_progress';
const WATCHED_STORAGE_KEY = 'orunei_watched_episodes';
const ANIME_LAST_WATCHED_KEY = 'orunei_anime_last_watched';

function getLocalStorage() {
  if (typeof globalThis.localStorage !== 'undefined') return globalThis.localStorage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  return null;
}

/**
 * Consulta el timestamp del momento más reciente en que se reprodujo un anime.
 */
export function getAnimeLastWatchedAt(animeId) {
  if (!animeId) return 0;
  const store = getStorage(ANIME_LAST_WATCHED_KEY);
  return Number(store[String(animeId)]) || 0;
}

/**
 * Registra o actualiza el timestamp de reproducción reciente de un anime.
 */
export function touchAnimeLastWatched(animeId, timestamp = Date.now()) {
  if (!animeId) return;
  const store = getStorage(ANIME_LAST_WATCHED_KEY);
  store[String(animeId)] = Number(timestamp) || Date.now();
  setStorage(ANIME_LAST_WATCHED_KEY, store);
}

function getStorage(key = STORAGE_KEY) {
  const storage = getLocalStorage();
  if (!storage) return {};
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStorage(key = STORAGE_KEY, data = {}) {
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(data));
  } catch {}
}

/**
 * Formatea segundos en formato M:SS o H:MM:SS
 */
export function formatTime(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const sec = Math.floor(seconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const sStr = s < 10 ? `0${s}` : `${s}`;

  if (h > 0) {
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mStr}:${sStr}`;
  }
  return `${m}:${sStr}`;
}

export function buildProgressKey(animeId, episode) {
  return `${animeId || 'unknown'}_ep_${episode || 1}`;
}

/**
 * Marca un episodio como completado/visto.
 */
export function markEpisodeWatched(animeId, episode) {
  if (!animeId || !episode) return;
  const store = getStorage(WATCHED_STORAGE_KEY);
  const aId = String(animeId);
  const epNum = Number(episode);

  const list = Array.isArray(store[aId]) ? store[aId] : [];
  if (!list.includes(epNum)) {
    store[aId] = [...list, epNum];
    setStorage(WATCHED_STORAGE_KEY, store);
  }

  // Al estar visto, limpiar prompt de reanudar
  clearPlaybackProgress(animeId, episode);
  touchAnimeLastWatched(aId);
}

/**
 * Desmarca un episodio como visto (ej. si el usuario desea volver a verlo desde el inicio).
 */
export function unmarkEpisodeWatched(animeId, episode) {
  if (!animeId || !episode) return;
  const store = getStorage(WATCHED_STORAGE_KEY);
  const aId = String(animeId);
  const epNum = Number(episode);

  if (Array.isArray(store[aId])) {
    store[aId] = store[aId].filter((e) => e !== epNum);
    setStorage(WATCHED_STORAGE_KEY, store);
  }
}

/**
 * Verifica si un episodio específico ya fue visto.
 */
export function isEpisodeWatched(animeId, episode) {
  if (!animeId || !episode) return false;
  const store = getStorage(WATCHED_STORAGE_KEY);
  const aId = String(animeId);
  const epNum = Number(episode);
  return Array.isArray(store[aId]) && store[aId].includes(epNum);
}

/**
 * Obtiene la lista completa de episodios vistos para un anime específico.
 */
export function getWatchedEpisodes(animeId) {
  if (!animeId) return [];
  const store = getStorage(WATCHED_STORAGE_KEY);
  const aId = String(animeId);
  return Array.isArray(store[aId]) ? store[aId] : [];
}


/**
 * Obtiene el progreso general de visualización para mostrar en la cuadrícula de episodios:
 * - watched: boolean
 * - percent: number (0 - 100)
 * - currentTime: number
 * - duration: number
 */
export function getEpisodeDisplayProgress(animeId, episode) {
  if (!animeId || !episode) {
    return { watched: false, percent: 0, currentTime: 0, duration: 0 };
  }

  if (isEpisodeWatched(animeId, episode)) {
    return { watched: true, percent: 100, currentTime: 0, duration: 0 };
  }

  const inProgress = getPlaybackProgress(animeId, episode);
  if (inProgress && inProgress.currentTime > 5) {
    const duration = inProgress.duration || 0;
    const percent = duration > 0 ? Math.min(99, Math.round((inProgress.currentTime / duration) * 100)) : 10;
    return {
      watched: false,
      percent,
      currentTime: inProgress.currentTime,
      duration,
    };
  }

  return { watched: false, percent: 0, currentTime: 0, duration: 0 };
}

/**
 * Guarda el progreso actual en segundos.
 * Si el usuario ya está a menos de 20s del final o vio más del 92%,
 * se marca automáticamente como "Visto" y se limpia de in-progress.
 */
export function savePlaybackProgress({ animeId, episode, currentTime, duration }) {
  if (!animeId || !episode || typeof currentTime !== 'number' || isNaN(currentTime)) return null;

  const validDuration = typeof duration === 'number' && !isNaN(duration) && duration > 0 ? duration : null;
  const store = getStorage(STORAGE_KEY);
  const key = buildProgressKey(animeId, episode);

  // Si está casi al final (> 92% o faltan menos de 20s)
  const isFinished = validDuration && (currentTime > validDuration - 20 || (currentTime / validDuration) > 0.92);

  if (isFinished) {
    markEpisodeWatched(animeId, episode);
    return null;
  }

  if (currentTime < 5) {
    if (store[key]) {
      delete store[key];
      setStorage(STORAGE_KEY, store);
    }
    return null;
  }

  const record = {
    animeId: String(animeId),
    episode: Number(episode),
    currentTime: Math.round(currentTime),
    duration: validDuration ? Math.round(validDuration) : null,
    updatedAt: Date.now(),
  };

  store[key] = record;
  setStorage(STORAGE_KEY, store);
  touchAnimeLastWatched(animeId, record.updatedAt);
  return record;
}

/**
 * Obtiene el registro de reproducción para un episodio específico.
 */
export function getPlaybackProgress(animeId, episode) {
  if (!animeId || !episode) return null;
  const store = getStorage(STORAGE_KEY);
  const key = buildProgressKey(animeId, episode);
  const entry = store[key];
  if (!entry || typeof entry.currentTime !== 'number') return null;
  return entry;
}

/**
 * Limpia el progreso guardado (ej. cuando el usuario desea reiniciar desde 0:00).
 */
export function clearPlaybackProgress(animeId, episode) {
  if (!animeId || !episode) return;
  const store = getStorage(STORAGE_KEY);
  const key = buildProgressKey(animeId, episode);
  if (store[key]) {
    delete store[key];
    setStorage(STORAGE_KEY, store);
  }
}
