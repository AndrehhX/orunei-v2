/**
 * Motor centralizado para "Donde lo dejaste" (Continue Watching).
 * Resuelve inteligentemente:
 * 1. Qué episodio corresponde ver a continuación (si terminó el Ep. 1, sugiere Ep. 2).
 * 2. Si el episodio está a medias, calcula el timestamp exacto y porcentaje para la barra de avance.
 * 3. Si la serie está terminada, permite repetir desde el episodio 1.
 */

import { isEpisodeWatched, getWatchedEpisodes, getPlaybackProgress, formatTime, getAnimeLastWatchedAt } from './playbackProgress.js';

export function calculateNextEpisodeToWatch({
  animeId,
  savedEpisode = 1,
  totalEpisodes = null,
}) {
  const aId = String(animeId || '');
  const ep = Number(savedEpisode) > 0 ? Number(savedEpisode) : 1;
  const total = Number(totalEpisodes) > 0 ? Number(totalEpisodes) : null;

  // 1. Revisar si el episodio actual tiene progreso a medias guardado
  const progress = getPlaybackProgress(aId, ep);
  if (progress && progress.currentTime > 5 && !isEpisodeWatched(aId, ep)) {
    const duration = progress.duration || 0;
    const percent = duration > 0 ? Math.min(99, Math.round((progress.currentTime / duration) * 100)) : 10;
    return {
      episode: ep,
      currentTime: progress.currentTime,
      duration,
      percent,
      isNewEpisode: false,
      isSeriesCompleted: false,
    };
  }

  // 2. Si el episodio actual ya fue completado ("visto")
  if (isEpisodeWatched(aId, ep)) {
    // Buscar si hay un siguiente episodio disponible que no esté visto
    let nextEp = ep + 1;
    while (total ? nextEp <= total : true) {
      if (!isEpisodeWatched(aId, nextEp)) {
        break;
      }
      nextEp++;
      if (total && nextEp > total) {
        break;
      }
    }

    if (!total || nextEp <= total) {
      // Verificar si el siguiente episodio tiene progreso guardado
      const nextProgress = getPlaybackProgress(aId, nextEp);
      if (nextProgress && nextProgress.currentTime > 5 && !isEpisodeWatched(aId, nextEp)) {
        const duration = nextProgress.duration || 0;
        const percent = duration > 0 ? Math.min(99, Math.round((nextProgress.currentTime / duration) * 100)) : 10;
        return {
          episode: nextEp,
          currentTime: nextProgress.currentTime,
          duration,
          percent,
          isNewEpisode: false,
          isSeriesCompleted: false,
        };
      }
      return {
        episode: nextEp,
        currentTime: 0,
        duration: 0,
        percent: 0,
        isNewEpisode: true,
        isSeriesCompleted: false,
      };
    }

    // Si ya completó todos los episodios
    return {
      episode: 1,
      currentTime: 0,
      duration: 0,
      percent: 100,
      isNewEpisode: false,
      isSeriesCompleted: true,
    };
  }

  // Si el último episodio de la serie ya está visto, toda la serie está completada
  if (total && isEpisodeWatched(aId, total)) {
    return {
      episode: 1,
      currentTime: 0,
      duration: 0,
      percent: 100,
      isNewEpisode: false,
      isSeriesCompleted: true,
    };
  }

  // 3. Episodio no completado y sin progreso
  return {
    episode: ep,
    currentTime: 0,
    duration: 0,
    percent: 0,
    isNewEpisode: true,
    isSeriesCompleted: false,
  };
}

/**
 * Determina si una obra fue marcada explícitamente como "Visto" o "Terminado" en la biblioteca.
 */
export function isAnimeCompletedInLibrary(anime) {
  if (!anime) return false;
  const status = String(anime.status || '').toLowerCase().trim();
  if (status === 'completed') return true;
  const s = String(anime.s || '').toLowerCase().trim();
  if (s.startsWith('terminado') || s.startsWith('visto') || s === 'completado') return true;
  return false;
}

/**
 * Determina si el usuario ya vio todos los episodios disponibles de la serie.
 */
export function isSeriesFullyWatched(anime) {
  if (!anime) return false;
  if (isAnimeCompletedInLibrary(anime)) return true;

  const animeId = anime.id || anime.animeId || anime.q;
  const totalEpisodes = Number(anime.episodes) || null;
  const savedEpisode = Number(anime.currentEpisode) || 1;

  if (totalEpisodes && totalEpisodes > 0) {
    if (isEpisodeWatched(animeId, totalEpisodes)) return true;
    if (savedEpisode >= totalEpisodes && isEpisodeWatched(animeId, savedEpisode)) return true;
    const watchedList = getWatchedEpisodes(animeId);
    if (watchedList.length >= totalEpisodes) return true;
  }

  const nextInfo = calculateNextEpisodeToWatch({
    animeId,
    savedEpisode,
    totalEpisodes,
  });

  return Boolean(nextInfo.isSeriesCompleted);
}

/**
 * Determina si una obra califica estrictamente para "Continúa donde lo dejaste":
 * 1. NO haber sido marcada como "visto" o "terminado" en la biblioteca.
 * 2. NO haber completado todos los episodios disponibles.
 * 3. Estar actualmente en reproducción activa (status 'watching', progreso guardado o episodios vistos).
 */
export function isAnimeEligibleForContinueWatching(anime) {
  if (!anime) return false;

  // 1. Excluir si ya fue marcado como visto en biblioteca
  if (isAnimeCompletedInLibrary(anime)) return false;

  // 2. Excluir si ya se vieron todos los capítulos
  if (isSeriesFullyWatched(anime)) return false;

  const animeId = anime.id || anime.animeId || anime.q;
  const savedEpisode = Number(anime.currentEpisode) || 1;
  const status = String(anime.status || '').toLowerCase().trim();
  const labelStatus = String(anime.s || '').toLowerCase().trim();

  // 3. Comprobar que realmente esté en curso de visualización activa
  const isWatchingStatus = status === 'watching' || labelStatus.startsWith('viendo');
  const hasWatchedProgress = getAnimeLastWatchedAt(animeId) > 0;
  const hasEpisodeProgress = Boolean(getPlaybackProgress(animeId, savedEpisode));
  const hasWatchedAnyEpisode = isEpisodeWatched(animeId, 1) || isEpisodeWatched(animeId, savedEpisode);
  const isAdvancedEpisode = savedEpisode > 1;

  return isWatchingStatus || hasWatchedProgress || hasEpisodeProgress || hasWatchedAnyEpisode || isAdvancedEpisode;
}

/**
 * Filtra y prepara la lista para "Continúa donde lo dejaste".
 * NUNCA recurre a la biblioteca completa si no hay obras en curso.
 */
export function filterContinueWatchingList(items) {
  if (!Array.isArray(items)) return [];
  return items.filter(isAnimeEligibleForContinueWatching);
}


/**
 * Formatea el texto de llamada a la acción para botones y tarjetas.
 */
export function formatContinueWatchingLabel({ episode, currentTime = 0, isNewEpisode = false, isSeriesCompleted = false }) {
  if (isSeriesCompleted) {
    return 'Volver a ver ▸';
  }
  if (!isNewEpisode && currentTime > 5) {
    return `Ep. ${episode} · ${formatTime(currentTime)} ▸`;
  }
  return `Episodio ${episode} ▸`;
}

/**
 * Enriquece un elemento de anime para la sección "Donde lo dejaste".
 */
export function enrichContinueWatchingItem(anime) {
  if (!anime) return null;
  const animeId = anime.id || anime.animeId || anime.q;
  const totalEpisodes = Number(anime.episodes) || null;
  const savedEpisode = Number(anime.currentEpisode) || 1;

  const nextInfo = calculateNextEpisodeToWatch({
    animeId,
    savedEpisode,
    totalEpisodes,
  });

  return {
    ...anime,
    nextEpisode: nextInfo.episode,
    currentTime: nextInfo.currentTime,
    duration: nextInfo.duration,
    percent: nextInfo.percent,
    isNewEpisode: nextInfo.isNewEpisode,
    isSeriesCompleted: nextInfo.isSeriesCompleted,
    displayLabel: formatContinueWatchingLabel(nextInfo),
  };
}

/**
 * Ordena la lista de "Donde lo dejaste" por el timestamp de última reproducción real.
 * De esta forma, el anime visto hace 5 minutos siempre lidera la fila.
 */
export function sortContinueWatchingList(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => {
    const aId = a.id || a.animeId || a.q;
    const bId = b.id || b.animeId || b.q;
    const aTime = getAnimeLastWatchedAt(aId) || 0;
    const bTime = getAnimeLastWatchedAt(bId) || 0;

    if (aTime !== bTime) {
      return bTime - aTime;
    }

    const aIsWatching = a.status === 'watching' || (Number(a.currentEpisode) > 0 && a.status !== 'completed');
    const bIsWatching = b.status === 'watching' || (Number(b.currentEpisode) > 0 && b.status !== 'completed');
    if (aIsWatching && !bIsWatching) return -1;
    if (!aIsWatching && bIsWatching) return 1;

    return 0;
  });
}

