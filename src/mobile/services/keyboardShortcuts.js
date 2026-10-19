/**
 * Atajos de teclado universales para el reproductor de Anime
 * Inspirado en estándares como YouTube, Netflix y Crunchyroll.
 */

export const PLAYER_SHORTCUTS = [
  { key: 'Espacio / K', description: 'Reproducir / Pausar' },
  { key: 'F', description: 'Pantalla completa' },
  { key: 'T', description: 'Modo Cine / Teatro' },
  { key: 'M', description: 'Silenciar / Activar sonido' },
  { key: '← / J', description: 'Retroceder 10 segundos' },
  { key: '→ / L', description: 'Adelantar 10 segundos' },
  { key: '↑ / ↓', description: 'Ajustar volumen (+10% / -10%)' },
  { key: 'N', description: 'Siguiente episodio' },
  { key: 'P', description: 'Picture-in-Picture (PiP)' },
  { key: 'S', description: 'Saltar Intro / Ending' },
];

export function handlePlayerKeydown({
  event,
  video,
  activeSkip,
  onTriggerSkip,
  onNextEpisode,
  onPrevEpisode,
  onToggleFullscreen,
  onToggleTheater,
  onTogglePiP,
  showFeedback,
}) {
  if (!event) return false;

  // Ignorar eventos generados en campos de texto editables
  const tag = event.target?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) {
    return false;
  }

  const key = event.key;

  switch (key) {
    case ' ':
    case 'k':
    case 'K': {
      event.preventDefault?.();
      if (video) {
        if (video.paused) {
          video.play?.();
          showFeedback?.({ type: 'play', text: '▶ Reproducir' });
        } else {
          video.pause?.();
          showFeedback?.({ type: 'pause', text: '⏸ Pausar' });
        }
        return true;
      }
      break;
    }

    case 'f':
    case 'F': {
      event.preventDefault?.();
      onToggleFullscreen?.();
      return true;
    }

    case 't':
    case 'T': {
      event.preventDefault?.();
      onToggleTheater?.();
      return true;
    }

    case 'm':
    case 'M': {
      event.preventDefault?.();
      if (video) {
        video.muted = !video.muted;
        showFeedback?.({
          type: 'volume',
          value: video.muted ? 0 : Math.round((video.volume != null ? video.volume : 1) * 100),
        });
        return true;
      }
      break;
    }

    case 'ArrowLeft':
    case 'j':
    case 'J': {
      event.preventDefault?.();
      if (video) {
        const nextTime = Math.max(0, (video.currentTime || 0) - 10);
        video.currentTime = nextTime;
        showFeedback?.({ type: 'seek', direction: 'backward', text: '-10s' });
        return true;
      }
      break;
    }

    case 'ArrowRight':
    case 'l':
    case 'L': {
      event.preventDefault?.();
      if (video) {
        const dur = video.duration || Infinity;
        const nextTime = Math.min(dur, (video.currentTime || 0) + 10);
        video.currentTime = nextTime;
        showFeedback?.({ type: 'seek', direction: 'forward', text: '+10s' });
        return true;
      }
      break;
    }

    case 'ArrowUp': {
      event.preventDefault?.();
      if (video) {
        const curVol = typeof video.volume === 'number' ? video.volume : 1;
        const nextVol = Math.min(1, Math.round((curVol + 0.1) * 10) / 10);
        video.volume = nextVol;
        video.muted = false;
        showFeedback?.({ type: 'volume', value: Math.round(nextVol * 100) });
        return true;
      }
      break;
    }

    case 'ArrowDown': {
      event.preventDefault?.();
      if (video) {
        const curVol = typeof video.volume === 'number' ? video.volume : 1;
        const nextVol = Math.max(0, Math.round((curVol - 0.1) * 10) / 10);
        video.volume = nextVol;
        showFeedback?.({ type: 'volume', value: Math.round(nextVol * 100) });
        return true;
      }
      break;
    }

    case 'n':
    case 'N': {
      event.preventDefault?.();
      onNextEpisode?.();
      return true;
    }

    case 'p':
    case 'P': {
      event.preventDefault?.();
      onTogglePiP?.();
      return true;
    }

    case 's':
    case 'S': {
      if (activeSkip) {
        event.preventDefault?.();
        onTriggerSkip?.();
        return true;
      }
      break;
    }

    default:
      break;
  }

  return false;
}
