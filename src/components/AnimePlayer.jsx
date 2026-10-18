import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, ChevronLeft, ChevronRight, Settings, Subtitles, AlertCircle, Check, Loader2, Server, WifiOff, FastForward, Tv, Sun, Volume2, Play, Gauge, Maximize, Film } from 'lucide-react';
import { getEpisodePlayback } from '../api/streamAdapter';
import { getDubEpisodePlayback } from '../playback/dubStreamAdapter.js';
import { setSeasonAudioPreference } from '../playback/audioPreference.js';
import { markDubAsUnavailable } from '../playback/dubSeasonManager.js';
import { getOfflinePlaybackSource, getDownload, deleteDownload, isAutoDeleteWatchedEnabled } from '../offline/downloadEngine';
import { savePlaybackProgress, getPlaybackProgress, clearPlaybackProgress, markEpisodeWatched, formatTime } from '../playback/playbackProgress';
import { fetchSkipTimes, resolveActiveSkip, isAutoSkipEnabled, setAutoSkipEnabled } from '../playback/skipTimes';
import { useVideoGestures, togglePiP, isPiPSupported } from '../playback/useVideoGestures';
import { handlePlayerKeydown, PLAYER_SHORTCUTS } from '../playback/keyboardShortcuts';
import { SUPPORTED_SPEEDS, getStoredPlaybackSpeed, setStoredPlaybackSpeed, applyPlaybackSpeed } from '../playback/playbackSpeed';
import { shouldTriggerCountdown, COUNTDOWN_DURATION } from '../playback/nextEpisodeCountdown';
export default function AnimePlayer({
  animeId,
  malId,
  animeTitle,
  miruroId,
  initialEpisode = 1,
  totalEpisodes = 1,
  audioLanguage = 'sub_es',
  onAudioLanguageChange,
  dubAvailability = null,
  seasonId = 's1',
  userId = null,
  onClose,
  onEpisodeChange,
  onComplete,
}) {
  const containerRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const offlineSourceRef = useRef(null);

  const [episode, setEpisode] = useState(initialEpisode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playbackData, setPlaybackData] = useState(null);

  // Idioma de audio (Latino DUB / Japonés SUB)
  const [currentAudioLanguage, setCurrentAudioLanguage] = useState(audioLanguage || 'sub_es');
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const pendingSeekTimeRef = useRef(null);
  const prevPropAudioLangRef = useRef(audioLanguage);

  useEffect(() => {
    if (audioLanguage && audioLanguage !== prevPropAudioLangRef.current) {
      prevPropAudioLangRef.current = audioLanguage;
      setCurrentAudioLanguage(audioLanguage);
    }
  }, [audioLanguage]);

  // Servidores múltiples
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferNotice, setBufferNotice] = useState(false);

  // Calidad y Velocidad (Ajustes)
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
  const [showSettings, setShowSettings] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(() => {
    try { return localStorage.getItem('orunei_theater_mode') === 'true'; } catch { return false; }
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(() => getStoredPlaybackSpeed());


  // Subtítulos
  const [subTracks, setSubTracks] = useState([]);
  const [selectedSub, setSelectedSub] = useState('off');
  const [retryCount, setRetryCount] = useState(0);
  const [showSubMenu, setShowSubMenu] = useState(false);

  // Reanudación al segundo exacto (Resume Timestamp)
  const [resumePrompt, setResumePrompt] = useState(null);
  const lastSaveTimeRef = useRef(0);

  // Cuenta regresiva de Siguiente Episodio (Estilo Netflix)
  const [nextEpisodeCountdown, setNextEpisodeCountdown] = useState(null);
  const nextEpisodeDismissedRef = useRef(false);

  // Saltar Intro / Ending (AniSkip + Smart Fallback + Auto-Skip)
  const [skipIntervals, setSkipIntervals] = useState([]);
  const [activeSkip, setActiveSkip] = useState(null);
  const [autoSkipIntro, setAutoSkipIntro] = useState(() => isAutoSkipEnabled());
  const [skipNotice, setSkipNotice] = useState(null);
  const autoSkipTriggeredRef = useRef(false);

  // Cargar intervalos de skip desde AniSkip
  useEffect(() => {
    let isCancelled = false;
    setSkipIntervals([]);
    setActiveSkip(null);
    autoSkipTriggeredRef.current = false;

    const targetMalId = malId || animeId;
    if (targetMalId && episode) {
      fetchSkipTimes({ malId: targetMalId, episodeNumber: episode }).then((intervals) => {
        if (!isCancelled && Array.isArray(intervals)) {
          setSkipIntervals(intervals);
        }
      });
    }
    return () => { isCancelled = true; };
  }, [malId, animeId, episode]);

  // Sincronizar número de episodio si cambia desde afuera
  useEffect(() => {
    if (initialEpisode && initialEpisode !== episode) {
      setEpisode(initialEpisode);
    }
  }, [initialEpisode]);

  // Lista de servidores disponibles
  const servers = playbackData?.servers?.length
    ? playbackData.servers
    : (playbackData?.proxiedStreamUrl
      ? [{ id: 'srv-1', name: 'Servidor Principal', proxiedStreamUrl: playbackData.proxiedStreamUrl }]
      : []);

  const activeServer = servers[selectedServerIndex] || servers[0];
  const activeStreamUrl = activeServer?.proxiedStreamUrl || playbackData?.proxiedStreamUrl;

  // Cargar episodio al cambiar número de episodio, miruroId o reintento
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setQualities([]);
    setCurrentQuality(-1);
    setSubTracks([]);
    setSelectedSub('off');
    setSelectedServerIndex(0);
    setIsBuffering(false);
    setBufferNotice(false);
    setResumePrompt(null);
    setNextEpisodeCountdown(null);
    setSkipNotice(null);
    setActiveSkip(null);
    autoSkipTriggeredRef.current = false;
    nextEpisodeDismissedRef.current = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Verificar si el episodio se encuentra descargado localmente
    getOfflinePlaybackSource(animeId || miruroId, episode).then(async (source) => {
      if (isCancelled) return;
      if (source) {
        offlineSourceRef.current = source;
        const meta = await getDownload(animeId || miruroId, episode);
        if (isCancelled) return;

        if (Array.isArray(meta?.subtitles) && meta.subtitles.length > 0) {
          const offlineTracks = meta.subtitles.map((t, idx) => {
            const subBlob = new Blob([t.vttText], { type: 'text/vtt' });
            return {
              id: t.id || `offline-sub-${idx}`,
              lang: t.lang || 'es',
              label: t.label || (t.lang?.startsWith('es') ? 'Español' : t.lang),
              src: URL.createObjectURL(subBlob),
              default: Boolean(t.default),
            };
          });
          setSubTracks(offlineTracks);
          const defaultSub = offlineTracks.find(t => t.lang?.startsWith('es')) || offlineTracks[0];
          if (defaultSub) {
            setSelectedSub(defaultSub.id);
          }
        } else {
          setSubTracks([]);
          setSelectedSub('off');
        }

        setPlaybackData({
          proxiedStreamUrl: source.url,
          isOffline: true,
          servers: [{ id: 'offline-local', name: '💾 Descarga Offline (Local)', proxiedStreamUrl: source.url }],
        });
        setLoading(false);
        return;
      }

      // Reproducción en audio doblado al español (Latino o Castellano)
      if (currentAudioLanguage === 'latino' || currentAudioLanguage === 'castellano') {
        getDubEpisodePlayback({
          animeId,
          malId,
          animeTitle,
          episode,
          language: currentAudioLanguage
        })
          .then((data) => {
            if (isCancelled) return;
            setPlaybackData(data);
            setLoading(false);
            setSubTracks([]);
            setSelectedSub('off');
          })
          .catch((err) => {
            if (isCancelled) return;
            console.warn('[AnimePlayer] Error cargando audio doblado, conmutando a japonés subtitulado:', err.message);
            const isBatchBoundary = err.message && (err.message.includes('lote oficial') || err.message.includes('disponible hasta'));
            if (!isBatchBoundary) {
              markDubAsUnavailable(malId || animeId);
            }
            setSkipNotice(err.message || 'Doblaje no disponible para este episodio. Conmutando a versión original subtitulada...');
            setTimeout(() => setSkipNotice(null), 4500);
            prevPropAudioLangRef.current = 'sub_es';
            setCurrentAudioLanguage('sub_es');
            onAudioLanguageChange?.('sub_es');
          });
        return;
      }

      if (miruroId === undefined || miruroId === null) {
        const timer = setTimeout(() => {
          if (!isCancelled && !miruroId) {
            setError('Este título aún no cuenta con fuentes disponibles en el catálogo de transmisión.');
            setLoading(false);
          }
        }, 7000);
        return () => {
          isCancelled = true;
          clearTimeout(timer);
        };
      }

      if (!miruroId) {
        setError('Este título aún no cuenta con fuentes disponibles en el catálogo de transmisión.');
        setLoading(false);
        return;
      }

      getEpisodePlayback(miruroId, episode)
        .then((data) => {
          if (isCancelled) return;
          setPlaybackData(data);
          setLoading(false);

          // Configurar subtítulos disponibles con IDs únicos
          const rawTracks = data.subtitles?.tracks || [];
          const tracks = rawTracks.map((t, idx) => ({
            ...t,
            id: t.id || `sub-${t.lang || 'es'}-${idx}`
          }));
          setSubTracks(tracks);

          // Seleccionar automáticamente español si existe
          const defaultSub = tracks.find((t) => t.lang?.startsWith('es')) || tracks[0];
          if (defaultSub) {
            setSelectedSub(defaultSub.id);
          } else {
            setSelectedSub('off');
          }
        })
        .catch((err) => {
          if (isCancelled) return;
          const msg = err.message || '';
          if (msg.includes('502') || msg.includes('504') || msg.includes('Bad Gateway')) {
            setError('Los servidores de fuentes están procesando este episodio (502 Bad Gateway). Esto suele ocurrir en episodios de reciente emisión mientras se generan los flujos. Pulsa "Reintentar" para reconectar.');
          } else {
            setError(msg || 'Error al obtener el flujo de reproducción.');
          }
          setLoading(false);
        });
    });

    return () => {
      isCancelled = true;
      if (offlineSourceRef.current) {
        offlineSourceRef.current.revoke();
        offlineSourceRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [animeId, malId, animeTitle, miruroId, episode, retryCount, currentAudioLanguage]);

  // Monitoreo de buffering prolongado (aviso al usuario para cambiar de servidor)
  useEffect(() => {
    let stallTimer = null;
    if (isBuffering && servers.length > 1) {
      stallTimer = setTimeout(() => {
        setBufferNotice(true);
      }, 6000);
    } else {
      setBufferNotice(false);
    }
    return () => clearTimeout(stallTimer);
  }, [isBuffering, servers.length]);

  const switchToNextServer = () => {
    if (servers.length <= 1) return;
    const nextIdx = (selectedServerIndex + 1) % servers.length;
    setSelectedServerIndex(nextIdx);
    setBufferNotice(false);
    setIsBuffering(false);
  };

  const handleVideoError = () => {
    console.warn('[AnimePlayer] Error en reproducción de video HTML5:', videoRef.current?.error);
    if (servers.length > 1 && selectedServerIndex < servers.length - 1) {
      console.warn('[AnimePlayer] Conmutando automáticamente al siguiente servidor disponible...');
      setSelectedServerIndex((prev) => prev + 1);
    } else if (servers.length > 1 && selectedServerIndex === servers.length - 1) {
      setError('No se pudo reproducir en ninguno de los servidores disponibles para este episodio.');
    } else {
      setError('Error al reproducir el flujo multimedia.');
    }
  };

  // Inicializar Hls.js una vez cargada la fuente o cambiado el servidor
  useEffect(() => {
    if (activeServer?.isEmbed) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setIsBuffering(false);
      setBufferNotice(false);
      setQualities([]);
      return;
    }

    const video = videoRef.current;
    if (!video || !activeStreamUrl) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isMp4 = activeStreamUrl.includes('.mp4') || (!activeStreamUrl.includes('.m3u8') && !activeStreamUrl.includes('proxy?'));

    if (Hls.isSupported() && !isMp4) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        enableWebVTT: false, // Desactivar WebVTT nativo en Hls.js para evitar subtítulos duplicados
        renderTextTracksNatively: false, // Prevenir creación automática de TextTracks duplicados por Hls
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 4,
        manifestLoadingTimeOut: 15000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 15000,
        levelLoadingMaxRetry: 3
      });
      hlsRef.current = hls;

      // Mantener canal de subtítulos de Hls.js desactivado para no colisionar con los tracks de la app
      try {
        hls.subtitleTrack = -1;
      } catch (_) {}

      hls.loadSource(activeStreamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const levels = data.levels.map((lvl, index) => ({
          index,
          height: lvl.height,
          label: lvl.height ? `${lvl.height}p` : `Calidad ${index + 1}`,
          bitrate: lvl.bitrate
        }));
        setQualities(levels);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Si el servidor falla, conmutar automáticamente al siguiente servidor disponible
              if (servers.length > 1 && selectedServerIndex < servers.length - 1) {
                console.warn('[AnimePlayer] Fallo de red en el servidor actual, conmutando al siguiente...');
                setSelectedServerIndex((prev) => prev + 1);
              } else {
                hls.destroy();
                setError('Error de red al cargar el flujo de video. Pulsa "Reintentar" o selecciona otro servidor.');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (servers.length > 1 && selectedServerIndex < servers.length - 1) {
                console.warn('[AnimePlayer] Error fatal en decodificación, cambiando de servidor...');
                setSelectedServerIndex((prev) => prev + 1);
              } else {
                hls.destroy();
                setError('Ocurrió un error al decodificar la transmisión de video.');
              }
              break;
          }
        }
      });
    } else {
      video.src = activeStreamUrl;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStreamUrl, activeServer?.isEmbed]);

  // Actualizar y forzar el modo de pistas de subtítulos nativas de manera estrictamente unívoca
  const syncSubtitles = () => {
    const video = videoRef.current;
    if (!video) return;

    // Asegurar que Hls.js nunca active un subtítulo interno
    if (hlsRef.current) {
      try {
        hlsRef.current.subtitleTrack = -1;
      } catch (_) {}
    }

    // Modo desactivado (Off): apagar absolutamente todas las pistas del DOM y textTracks
    if (selectedSub === 'off') {
      const domTracks = video.querySelectorAll('track');
      domTracks.forEach((el) => {
        if (el.track) el.track.mode = 'disabled';
      });
      if (video.textTracks) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = 'disabled';
        }
      }
      return;
    }

    // Buscar la pista seleccionada por su ID único o por idioma
    const targetTrack = subTracks.find((s) => (s.id && s.id === selectedSub) || s.lang === selectedSub);
    if (!targetTrack) return;

    let domShowing = false;

    // 1. Sincronizar elementos <track> del DOM: exactamente uno activo, los demás en disabled
    const domTracks = video.querySelectorAll('track');
    domTracks.forEach((el) => {
      if (el.track) {
        const isMatch = !domShowing && (
          (el.dataset?.subId && targetTrack.id && el.dataset.subId === targetTrack.id) ||
          el.src === targetTrack.src ||
          (el.label === targetTrack.label && el.srclang === targetTrack.lang)
        );
        if (isMatch) {
          el.track.mode = 'showing';
          domShowing = true;
        } else {
          el.track.mode = 'disabled';
        }
      }
    });

    // 2. Sincronizar textTracks de la API HTML5
    // Asegurar que solo la pista correspondiente quede en 'showing' y ninguna otra
    if (video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        const t = video.textTracks[i];
        if (domShowing) {
          // Si el DOM ya activó la pista deseada, mantenerla activa si coincide la etiqueta, y apagar cualquier otra
          if (t.label === targetTrack.label && t.mode === 'showing') {
            // Mantener showing
          } else {
            t.mode = 'disabled';
          }
        } else {
          const isMatch = (t.label === targetTrack.label) || (t.language === targetTrack.lang);
          if (isMatch) {
            t.mode = 'showing';
            domShowing = true;
          } else {
            t.mode = 'disabled';
          }
        }
      }
    }
  };

  useEffect(() => {
    syncSubtitles();
    // Safety check para navegadores donde el textTrack tarda unos ms en enlazarse
    const timer = setTimeout(syncSubtitles, 500);
    return () => clearTimeout(timer);
  }, [selectedSub, subTracks]);

  const changeQuality = (levelIndex) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setCurrentQuality(levelIndex);
    }
    setShowSettings(false);
  };

  const handleChangeSpeed = (speed) => {
    const saved = setStoredPlaybackSpeed(speed);
    setPlaybackSpeed(saved);
    if (videoRef.current) {
      applyPlaybackSpeed(videoRef.current, saved);
    }
  };

  const handlePrevEp = () => {
    if (episode > 1) {
      const nextEp = episode - 1;
      setEpisode(nextEp);
      onEpisodeChange?.(nextEp);
    }
  };

  const handleNextEp = () => {
    if (!totalEpisodes || episode < totalEpisodes) {
      const nextEp = episode + 1;
      setEpisode(nextEp);
      onEpisodeChange?.(nextEp);
    }
  };

  // Cuenta regresiva de siguiente episodio (decremento cada 1s)
  useEffect(() => {
    if (!nextEpisodeCountdown || nextEpisodeCountdown.secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setNextEpisodeCountdown((prev) => {
        if (!prev) return null;
        if (prev.secondsLeft <= 1) {
          handleNextEp();
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [nextEpisodeCountdown, episode, totalEpisodes]);

  // Desvanecer prompt de reanudación después de 10s si el usuario no interactúa
  useEffect(() => {
    if (resumePrompt) {
      const timer = setTimeout(() => setResumePrompt(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [resumePrompt]);

  const handleLoadedMetadata = () => {
    syncSubtitles();
    if (videoRef.current) {
      applyPlaybackSpeed(videoRef.current, playbackSpeed);
      if (pendingSeekTimeRef.current !== null) {
        videoRef.current.currentTime = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
      }
    }
    const progress = getPlaybackProgress(animeId || miruroId, episode);
    if (progress && progress.currentTime > 8 && pendingSeekTimeRef.current === null) {
      setResumePrompt({
        time: progress.currentTime,
        formatted: formatTime(progress.currentTime),
      });
    } else {
      setResumePrompt(null);
    }
  };

  const handleSwitchAudioLanguage = (newLang) => {
    if (newLang === currentAudioLanguage) {
      setShowAudioMenu(false);
      return;
    }
    if (videoRef.current && videoRef.current.currentTime > 0) {
      pendingSeekTimeRef.current = videoRef.current.currentTime;
    }
    prevPropAudioLangRef.current = newLang;
    setCurrentAudioLanguage(newLang);
    setSeasonAudioPreference(animeId, seasonId, newLang, userId);
    onAudioLanguageChange?.(newLang);
    setShowAudioMenu(false);
    setLoading(true);
  };

  const handleResume = () => {
    if (videoRef.current && resumePrompt) {
      videoRef.current.currentTime = resumePrompt.time;
      videoRef.current.play().catch(() => {});
      setResumePrompt(null);
    }
  };

  const handleDismissResume = () => {
    clearPlaybackProgress(animeId || miruroId, episode);
    setResumePrompt(null);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    // Detectar si activar cuenta regresiva de siguiente episodio (últimos 15s)
    if (
      !nextEpisodeCountdown &&
      !nextEpisodeDismissedRef.current &&
      shouldTriggerCountdown({
        currentTime: video.currentTime,
        duration: video.duration,
        episode,
        totalEpisodes,
        isDismissed: nextEpisodeDismissedRef.current,
      })
    ) {
      setNextEpisodeCountdown({ secondsLeft: COUNTDOWN_DURATION });
    }

    // Detectar intervalo activo de intro o ending (AniSkip o Fallback inteligente)
    const skip = resolveActiveSkip({
      skipIntervals,
      currentTime: video.currentTime,
      duration: video.duration,
      allowFallback: true,
    });

    if (skip) {
      // Auto-Skip inteligente de Intro si el usuario lo tiene habilitado
      if (autoSkipIntro && skip.type === 'op' && !autoSkipTriggeredRef.current) {
        autoSkipTriggeredRef.current = true;
        video.currentTime = skip.targetTime;
        setSkipNotice('Intro saltado automáticamente');
        setTimeout(() => setSkipNotice(null), 2500);
        setActiveSkip(null);
      } else {
        setActiveSkip(skip);
      }
    } else if (activeSkip) {
      setActiveSkip(null);
    }

    const now = Date.now();
    if (now - lastSaveTimeRef.current >= 3000) {
      lastSaveTimeRef.current = now;
      if (video.currentTime > 5 && !video.paused) {
        savePlaybackProgress({
          animeId: animeId || miruroId,
          episode,
          currentTime: video.currentTime,
          duration: video.duration,
        });
      }
    }
  };

  const handleTriggerSkip = () => {
    if (videoRef.current && activeSkip) {
      videoRef.current.currentTime = activeSkip.targetTime;
      setActiveSkip(null);
    }
  };

  const handleToggleFullscreen = () => {
    const video = videoRef.current;
    const container = containerRef.current || video;
    if (!container && !video) return;

    const isStandardFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    if (isStandardFs) {
      if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().catch(() => {});
      } else if (typeof document.webkitExitFullscreen === 'function') {
        document.webkitExitFullscreen();
      }
      return;
    }

    if (typeof container.requestFullscreen === 'function') {
      container.requestFullscreen().catch(() => {
        if (typeof video?.webkitEnterFullscreen === 'function') {
          video.webkitEnterFullscreen();
        }
      });
      return;
    }

    if (typeof video?.webkitEnterFullscreen === 'function') {
      video.webkitEnterFullscreen();
    }
  };

  const handleTogglePiP = () => {
    togglePiP(videoRef.current);
  };

  const handleToggleTheater = () => {
    setIsTheaterMode((prev) => {
      const next = !prev;
      try { localStorage.setItem('orunei_theater_mode', String(next)); } catch {}
      showFeedback?.({ type: 'theater', text: next ? 'Modo Cine Activado' : 'Modo Normal' });
      return next;
    });
  };

  // Gestos táctiles y Picture-in-Picture (PiP)
  const {
    brightness,
    gestureFeedback,
    showFeedback,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useVideoGestures({
    videoRef,
  });

  // Atajos de teclado profesionales (Espacio, F, T, M, Flechas, J/L, N, P, S)
  useEffect(() => {
    const handleKeyDown = (e) => {
      handlePlayerKeydown({
        event: e,
        video: videoRef.current,
        activeSkip,
        onTriggerSkip: handleTriggerSkip,
        onNextEpisode: handleNextEp,
        onPrevEpisode: handlePrevEp,
        onToggleFullscreen: handleToggleFullscreen,
        onToggleTheater: handleToggleTheater,
        onTogglePiP: handleTogglePiP,
        showFeedback,
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSkip, episode, totalEpisodes, isTheaterMode]);


  const handlePause = () => {
    const video = videoRef.current;
    if (video && video.currentTime > 5) {
      savePlaybackProgress({
        animeId: animeId || miruroId,
        episode,
        currentTime: video.currentTime,
        duration: video.duration,
      });
    }
  };

  const handleEnded = () => {
    clearPlaybackProgress(animeId || miruroId, episode);
    markEpisodeWatched(animeId || miruroId, episode);
    if (isAutoDeleteWatchedEnabled()) {
      deleteDownload(animeId || miruroId, episode).catch(() => {});
    }
    if (totalEpisodes && episode >= totalEpisodes) {
      onComplete?.(episode);
    } else if (!nextEpisodeCountdown && !nextEpisodeDismissedRef.current) {
      setNextEpisodeCountdown({ secondsLeft: COUNTDOWN_DURATION });
    } else if (onEpisodeChange) {
      const nextEp = episode + 1;
      setEpisode(nextEp);
      onEpisodeChange(nextEp);
    }
  };

  return (
    <div
      ref={containerRef}
      id="player-theater"
      className={`relative mb-6 flex flex-col w-full bg-[#0f111a] border border-white/10 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.85)] overflow-hidden animate-rise transition-all duration-300 ${
        isTheaterMode
          ? 'rounded-none xl:rounded-2xl xl:-mx-8 xl:w-[calc(100%+4rem)] 2xl:-mx-14 2xl:w-[calc(100%+7rem)] max-w-none'
          : 'rounded-2xl'
      }`}
    >
      {/* Cabecera del reproductor con adaptación responsive para móvil, tablet y PC */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 border-b border-white/10 bg-[#161824]/95 backdrop-blur-md text-white gap-2">
        <div className="min-w-0 pr-1 sm:pr-4 flex-1">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="relative flex h-2 sm:h-2.5 w-2 sm:w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 sm:h-2.5 w-2 sm:w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <h3 className="text-xs sm:text-base font-bold truncate text-slate-100 max-w-[200px] sm:max-w-md md:max-w-xl">{animeTitle}</h3>
          </div>
          <p className="mt-0.5 text-[11px] sm:text-xs text-slate-400 font-medium">Episodio {episode}{totalEpisodes ? ` de ${totalEpisodes}` : ''}</p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Badge de idioma de audio / subtítulos */}
          {currentAudioLanguage === 'latino' && (
            <span className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <span>🇲🇽</span>
              <span className="hidden sm:inline">Español Latino (1080p)</span>
              <span className="inline sm:hidden">Latino 1080p</span>
            </span>
          )}

          {currentAudioLanguage === 'castellano' && (
            <span className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 text-[10px] sm:text-[11px] font-bold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
              <span>🇪🇸</span>
              <span className="hidden sm:inline">Español Castellano (1080p)</span>
              <span className="inline sm:hidden">Castellano 1080p</span>
            </span>
          )}

          {currentAudioLanguage !== 'latino' && currentAudioLanguage !== 'castellano' && playbackData && playbackData.hasSpanishSubtitles && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Check size={12} className="text-emerald-400" />
              Sub Español
            </span>
          )}

          {currentAudioLanguage !== 'latino' && currentAudioLanguage !== 'castellano' && playbackData && !playbackData.hasSpanishSubtitles && (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle size={13} />
              Sin Sub Español
            </span>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-all duration-200 active:scale-95 shadow-sm"
            title="Cerrar reproductor"
          >
            <X size={15} />
            <span className="hidden sm:inline">Cerrar</span>
          </button>
        </div>
      </div>

      {/* Área del reproductor de video contenida en pantalla con escalado dinámico */}
      <div
        ref={videoWrapperRef}
        className={`relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden mx-auto select-none transition-all duration-300 ${
          isTheaterMode ? 'max-h-[82vh]' : 'max-h-[52vh] sm:max-h-[62vh] md:max-h-[70vh] lg:max-h-[75vh]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 z-10 text-white">
            <Loader2 size={36} className="animate-spin text-brand" />
            <p className="text-sm font-medium">Cargando transmisión y audio…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center z-10 text-white">
            <AlertCircle size={40} className="text-rose-500" />
            <p className="text-sm max-w-md text-slate-300">{error}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              <button
                onClick={() => setRetryCount((c) => c + 1)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-brand text-white shadow-md hover:brightness-110 active:scale-95 transition"
              >
                Reintentar
              </button>
              {servers.length > 1 && (
                <button
                  onClick={switchToNextServer}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-white/10 text-slate-200 hover:bg-white/20 active:scale-95 transition"
                >
                  Probar otro servidor
                </button>
              )}
              {currentAudioLanguage === 'latino' && (
                <button
                  onClick={() => handleSwitchAudioLanguage('sub_es')}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-200 hover:bg-purple-600/50 active:scale-95 transition"
                >
                  Ver en Japonés (Subtitulado)
                </button>
              )}
            </div>
          </div>
        )}

        {/* Overlay de feedback de gestos táctiles */}
        {gestureFeedback && (
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
            {gestureFeedback.type === 'seek' && (
              <div className="px-5 py-3 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white font-extrabold text-base flex items-center gap-2 shadow-2xl animate-scaleUp">
                <span>{gestureFeedback.direction === 'backward' ? '⏪' : '⏩'}</span>
                <span>{gestureFeedback.text}</span>
              </div>
            )}
            {(gestureFeedback.type === 'play' || gestureFeedback.type === 'pause' || gestureFeedback.type === 'theater' || gestureFeedback.type === 'boost') && (
              <div className="px-5 py-3 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white font-extrabold text-base flex items-center gap-2 shadow-2xl animate-scaleUp">
                <span>{gestureFeedback.text}</span>
              </div>
            )}
            {gestureFeedback.type === 'brightness' && (
              <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-xl animate-fade">
                <Sun size={14} />
                <span>Brillo: {gestureFeedback.value}%</span>
              </div>
            )}
            {gestureFeedback.type === 'volume' && (
              <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-brand/50 text-brand font-bold text-xs flex items-center gap-1.5 shadow-xl animate-fade">
                <Volume2 size={14} />
                <span>Volumen: {gestureFeedback.value}%</span>
              </div>
            )}
          </div>
        )}

        {/* Aviso flotante de carga lenta con opción de cambio inmediato de servidor */}
        {bufferNotice && servers.length > 1 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex max-w-[92%] sm:max-w-none items-center justify-between gap-2.5 px-3 sm:px-4 py-2 rounded-xl bg-black/90 backdrop-blur-md border border-amber-500/40 text-amber-200 text-xs shadow-2xl animate-rise">
            <span className="truncate">¿Carga lenta o pausada?</span>
            <button
              onClick={switchToNextServer}
              className="shrink-0 px-3 py-1 rounded-lg bg-brand hover:brightness-110 font-bold text-white transition active:scale-95 shadow-md shadow-brand/30"
            >
              Cambiar servidor ▸
            </button>
          </div>
        )}

        {/* Aviso flotante de reanudación al segundo exacto */}
        {resumePrompt && (
          <div className="absolute top-4 left-4 z-30 flex items-center gap-3 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-black/90 backdrop-blur-md border border-brand/60 text-white shadow-2xl animate-rise max-w-[90vw]">
            <div className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-brand animate-pulse shrink-0" />
              <span>¿Reanudar en <b>{resumePrompt.formatted}</b>?</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleResume}
                className="px-3 py-1 rounded-lg bg-brand hover:brightness-110 text-white font-bold text-xs shadow-md shadow-brand/40 transition active:scale-95"
              >
                Reanudar
              </button>
              <button
                onClick={handleDismissResume}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition active:scale-95"
              >
                Reiniciar
              </button>
              <button
                onClick={() => setResumePrompt(null)}
                className="p-1 text-slate-400 hover:text-white transition"
                title="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Overlay elegante de Siguiente Episodio en 5s... (Estilo Netflix) */}
        {nextEpisodeCountdown && (
          <div className="absolute bottom-16 right-4 sm:right-6 z-40 w-72 max-w-[calc(100vw-32px)] rounded-2xl bg-[#131622]/95 border border-white/20 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-md text-white animate-rise">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-brand">Siguiente episodio</span>
                <h4 className="text-sm font-bold text-slate-100">Episodio {episode + 1}</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  nextEpisodeDismissedRef.current = true;
                  setNextEpisodeCountdown(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                title="Cancelar cuenta regresiva"
              >
                <X size={15} />
              </button>
            </div>

            {/* Barra de progreso de cuenta regresiva */}
            <div className="mt-2.5 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand to-indigo-400 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(nextEpisodeCountdown.secondsLeft / COUNTDOWN_DURATION) * 100}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-300 font-medium">
                En <strong className="text-white font-bold">{nextEpisodeCountdown.secondsLeft}s</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    nextEpisodeDismissedRef.current = true;
                    setNextEpisodeCountdown(null);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNextEpisodeCountdown(null);
                    handleNextEp();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-brand/30"
                >
                  <Play size={12} className="fill-white" />
                  Ver ahora
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aviso sutil de Auto-Skip */}
        {skipNotice && (
          <div className="absolute top-4 right-4 z-30 px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-brand/40 text-brand font-bold text-xs flex items-center gap-1.5 shadow-xl animate-fade">
            <FastForward size={14} />
            <span>{skipNotice}</span>
          </div>
        )}

        {/* Botón flotante Saltar Intro / Saltar Ending */}
        {activeSkip && (
          <button
            type="button"
            onClick={handleTriggerSkip}
            className="absolute bottom-16 right-4 sm:right-6 z-30 flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-black/85 hover:bg-brand text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-white/20 shadow-2xl transition-all duration-200 active:scale-95 group animate-rise"
            title={`${activeSkip.label} (Tecla S)`}
          >
            <span>{activeSkip.label}</span>
            <span className="hidden sm:inline-block text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/20 text-slate-200 font-mono">S</span>
            <FastForward size={16} className="text-brand group-hover:text-white transition-colors" />
          </button>
        )}

        {activeServer?.isEmbed ? (
          <iframe
            src={activeServer.embedUrl || activeStreamUrl}
            title={animeTitle || 'Reproductor de Video'}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            style={brightness !== 1 ? { filter: `brightness(${brightness})` } : undefined}
            className="w-full h-full object-contain"
            controls
            playsInline
            webkit-playsinline="true"
            x-webkit-airplay="allow"
            crossOrigin={subTracks.length > 0 ? 'anonymous' : undefined}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPlay={() => {
              setIsBuffering(false);
            }}
            onPause={() => {
              handlePause();
            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => { setIsBuffering(false); setBufferNotice(false); }}
            onCanPlay={() => setIsBuffering(false)}
            onError={handleVideoError}
            onEnded={handleEnded}
          >
            {subTracks.map((tr) => (
              <track
                key={tr.id || (tr.lang + tr.src)}
                data-sub-id={tr.id}
                kind="subtitles"
                label={tr.label}
                srcLang={tr.lang}
                src={tr.src}
              />
            ))}
          </video>
        )}
      </div>

      {/* Backdrop para cerrar menús desplegables al hacer clic en cualquier parte fuera o sobre el video */}
      {(showSettings || showServerMenu || showSubMenu || showAudioMenu) && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
          onClick={() => {
            setShowSettings(false);
            setShowServerMenu(false);
            setShowSubMenu(false);
            setShowAudioMenu(false);
          }}
        />
      )}

      {/* Barra de controles inferiores: Jerarquía limpia en 3 islas visuales responsivas */}
      <div className="relative z-40 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3 px-2.5 sm:px-6 py-2 sm:py-3 border-t border-white/10 bg-[#141724]/95 backdrop-blur-md text-sm text-white">
        {/* GRUPO 1: Navegación de Episodios (Isla encapsulada) */}
        <div className="flex items-center justify-between sm:justify-start gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner w-full sm:w-auto">
          <button
            onClick={handlePrevEp}
            disabled={episode <= 1 || loading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-95 flex-1 sm:flex-none"
            title="Episodio anterior"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <div className="px-3 py-1 text-xs font-bold text-slate-200 bg-white/5 rounded-xl border border-white/5 select-none text-center min-w-[80px]">
            <span className="text-brand font-black">Ep. {episode}</span>
            {totalEpisodes ? <span className="text-slate-400 font-normal"> / {totalEpisodes}</span> : null}
          </div>

          <button
            onClick={handleNextEp}
            disabled={(totalEpisodes && episode >= totalEpisodes) || loading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-95 flex-1 sm:flex-none"
            title="Episodio siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* GRUPOS 2 Y 3: Transmisión y Ajustes */}
        <div className="flex items-center justify-between lg:justify-end gap-1.5 sm:gap-2.5 flex-wrap sm:flex-nowrap w-full lg:w-auto">
          {/* GRUPO 2: Fuente y Pistas (Audio, Servidor y Subtítulos) */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10 flex-wrap sm:flex-nowrap">
          {/* Selector de Idioma de Audio (Latino / Castellano / Japonés) */}
          {(dubAvailability?.hasLatino || dubAvailability?.hasCastellano || currentAudioLanguage === 'latino' || currentAudioLanguage === 'castellano') && (
            <div className="relative">
              <button
                onClick={() => { setShowAudioMenu(!showAudioMenu); setShowServerMenu(false); setShowSubMenu(false); setShowSettings(false); }}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 active:scale-95 ${
                  currentAudioLanguage === 'latino'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : currentAudioLanguage === 'castellano'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                }`}
                title="Cambiar idioma de audio de la temporada"
              >
                <Volume2 size={14} className={currentAudioLanguage === 'latino' ? 'text-emerald-400' : currentAudioLanguage === 'castellano' ? 'text-amber-400' : 'text-slate-400'} />
                <span className="truncate">
                  {currentAudioLanguage === 'latino' ? '🇲🇽 Latino' : currentAudioLanguage === 'castellano' ? '🇪🇸 Castellano' : '🇯🇵 Japonés'}
                </span>
              </button>

              {showAudioMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 sm:left-0 sm:right-auto mb-2 w-56 max-w-[calc(100vw-24px)] rounded-xl bg-[#1b1f2e] border border-white/10 shadow-2xl p-1.5 z-50 animate-scaleUp"
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                    Idioma de Audio
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {(dubAvailability?.hasLatino || currentAudioLanguage === 'latino') && (
                      <button
                        onClick={() => handleSwitchAudioLanguage('latino')}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all ${
                          currentAudioLanguage === 'latino' ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>🇲🇽</span>
                          <span>Español Latino (1080p)</span>
                        </span>
                        {currentAudioLanguage === 'latino' && <Check size={14} />}
                      </button>
                    )}
                    {(dubAvailability?.hasCastellano || currentAudioLanguage === 'castellano') && (
                      <button
                        onClick={() => handleSwitchAudioLanguage('castellano')}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all ${
                          currentAudioLanguage === 'castellano' ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>🇪🇸</span>
                          <span>Español Castellano (1080p)</span>
                        </span>
                        {currentAudioLanguage === 'castellano' && <Check size={14} />}
                      </button>
                    )}
                    <button
                      onClick={() => handleSwitchAudioLanguage('sub_es')}
                      className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all ${
                        currentAudioLanguage === 'sub_es' ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>🇯🇵</span>
                        <span>Japonés (Subtitulado)</span>
                      </span>
                      {currentAudioLanguage === 'sub_es' && <Check size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selector de Servidor (cuando hay múltiples disponibles) */}
          {servers.length > 1 && (
            <div className="relative">
              <button
                onClick={() => { setShowServerMenu(!showServerMenu); setShowAudioMenu(false); setShowSubMenu(false); setShowSettings(false); }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 text-slate-200 transition active:scale-95 shadow-sm"
                title="Cambiar servidor de transmisión"
              >
                <Server size={14} className="text-brand shrink-0" />
                <span className="truncate max-w-[85px] sm:max-w-[130px]">{activeServer?.name || 'Servidor'}</span>
              </button>

              {showServerMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 sm:left-0 sm:right-auto mb-2 w-56 max-w-[calc(100vw-24px)] rounded-xl bg-[#1b1f2e] border border-white/10 shadow-2xl p-1.5 z-50 animate-scaleUp"
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                    Servidores disponibles ({servers.length})
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                    {servers.map((srv, idx) => (
                      <button
                        key={srv.id || idx}
                        onClick={() => { setSelectedServerIndex(idx); setShowServerMenu(false); }}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all ${selectedServerIndex === idx ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                        <span className="truncate">{srv.name}</span>
                        {selectedServerIndex === idx && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selector de Subtítulos */}
          {subTracks.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setShowSubMenu(!showSubMenu); setShowServerMenu(false); setShowSettings(false); setShowAudioMenu(false); }}
                className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 active:scale-95 ${selectedSub !== 'off' ? 'bg-brand text-white border-brand shadow-[0_0_15px_rgba(109,92,255,0.4)]' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
                title="Seleccionar subtítulos"
              >
                <Subtitles size={15} className="shrink-0" />
                <span className="hidden sm:inline">Subtítulos: </span>
                <span className="truncate max-w-[80px] sm:max-w-none">{selectedSub === 'off' ? 'Off' : (subTracks.find((s) => s.id === selectedSub || s.lang === selectedSub)?.label || 'Español')}</span>
              </button>

              {showSubMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-full left-0 sm:left-auto sm:right-0 mb-2 w-56 max-w-[calc(100vw-24px)] rounded-xl bg-[#1b1f2e] border border-white/10 shadow-2xl p-1.5 z-50 animate-scaleUp"
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                    Pistas disponibles
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => { setSelectedSub('off'); setShowSubMenu(false); }}
                      className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all duration-200 active:scale-95 ${selectedSub === 'off' ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                    >
                      <span>Desactivado (Off)</span>
                      {selectedSub === 'off' && <Check size={14} />}
                    </button>

                    {subTracks.map((tr) => (
                      <button
                        key={tr.id || tr.lang}
                        onClick={() => { setSelectedSub(tr.id || tr.lang); setShowSubMenu(false); }}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-all duration-200 active:scale-95 ${(selectedSub === tr.id || selectedSub === tr.lang) ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                        <span className="truncate">{tr.label}</span>
                        {(selectedSub === tr.id || selectedSub === tr.lang) && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
          {/* Fin GRUPO 2: Fuente y Pistas */}

          {/* Divisor vertical decorativo */}
          <div className="hidden sm:block h-6 w-px bg-white/10 my-auto" />

          {/* GRUPO 3: Ajustes, Modo Cine y Pantalla Completa */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
            {/* Menú de Configuración: Velocidad de reproducción y Calidad */}
            <div className="relative">
            <button
              onClick={() => { setShowSettings(!showSettings); setShowServerMenu(false); setShowSubMenu(false); setShowAudioMenu(false); }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 active:scale-95 ${showSettings || playbackSpeed !== 1 ? 'bg-brand/20 border-brand/50 text-white shadow-[0_0_12px_rgba(109,92,255,0.3)]' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
              title="Ajustes de reproducción (Velocidad y Calidad)"
            >
              <Settings size={15} className={`shrink-0 ${playbackSpeed !== 1 ? 'text-brand' : ''}`} />
              <span className="truncate max-w-[65px] sm:max-w-none">
                {playbackSpeed !== 1 ? `${playbackSpeed}x` : (currentQuality === -1 ? 'Auto' : qualities.find((q) => q.index === currentQuality)?.label || 'Ajustes')}
              </span>
            </button>

            {showSettings && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full right-0 mb-3 w-72 max-w-[calc(100vw-24px)] rounded-2xl bg-[#131622]/98 border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl p-3.5 z-50 animate-scaleUp"
              >
                {/* Cabecera */}
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Settings size={15} className="text-brand" />
                    <span className="text-xs font-bold text-white tracking-wide uppercase">Ajustes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                    title="Cerrar ajustes"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-0.5 custom-scrollbar">
                  {/* Calidad de video */}
                  {qualities.length > 0 && (
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Calidad de video
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => changeQuality(-1)}
                          className={`px-2.5 py-1 text-xs rounded-xl font-semibold transition ${
                            currentQuality === -1
                              ? 'bg-brand text-white font-bold shadow-md shadow-brand/30'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          Auto
                        </button>
                        {qualities.map((q) => (
                          <button
                            key={q.index}
                            type="button"
                            onClick={() => changeQuality(q.index)}
                            className={`px-2.5 py-1 text-xs rounded-xl font-semibold transition ${
                              currentQuality === q.index
                                ? 'bg-brand text-white font-bold shadow-md shadow-brand/30'
                                : 'bg-white/5 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Velocidad de reproducción */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      <span>Velocidad</span>
                      <span className="text-brand font-extrabold">{playbackSpeed}x</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {SUPPORTED_SPEEDS.map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => handleChangeSpeed(spd)}
                          className={`py-1 text-xs font-semibold rounded-xl text-center transition ${
                            playbackSpeed === spd
                              ? 'bg-brand text-white font-bold shadow-md shadow-brand/30'
                              : 'bg-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          {spd === 1 ? '1x Normal' : `${spd}x`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Auto-saltar Intro */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-slate-200 font-semibold">Auto-saltar Intro</span>
                      <span className="text-[10px] text-slate-400">Saltar intros automáticamente</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={autoSkipIntro}
                      onClick={() => {
                        const next = !autoSkipIntro;
                        setAutoSkipIntro(next);
                        setAutoSkipEnabled(next);
                      }}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoSkipIntro ? 'bg-brand shadow-sm shadow-brand/40' : 'bg-white/20'
                      }`}
                      title={autoSkipIntro ? 'Desactivar salto automático' : 'Activar salto automático'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          autoSkipIntro ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Botón Modo Cine / Teatro (Desktop) */}
          <button
            type="button"
            onClick={handleToggleTheater}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition active:scale-95 shadow-sm ${
              isTheaterMode
                ? 'bg-brand text-white border-brand shadow-[0_0_12px_rgba(109,92,255,0.4)]'
                : 'bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/15'
            }`}
            title={isTheaterMode ? 'Salir de Modo Cine (Tecla T)' : 'Activar Modo Cine / Teatro (Tecla T)'}
          >
            <Film size={15} className={isTheaterMode ? 'text-white' : 'text-brand'} />
            <span className="hidden md:inline">Cine</span>
          </button>

          {/* Botón Picture-in-Picture (PiP) */}
          {isPiPSupported() && (
            <button
              type="button"
              onClick={handleTogglePiP}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 text-slate-300 hover:text-white transition active:scale-95 shadow-sm"
              title="Ventana flotante / PiP (Tecla P)"
            >
              <Tv size={15} />
            </button>
          )}

          {/* Botón Pantalla Completa (Fullscreen) */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95 shadow-sm"
            title="Pantalla completa (Tecla F)"
          >
            <Maximize size={15} />
          </button>
        </div>
        {/* Fin GRUPO 3 */}
      </div>
    </div>
    </div>
  );
}
