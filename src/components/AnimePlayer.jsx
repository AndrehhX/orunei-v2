import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { X, ChevronLeft, ChevronRight, Settings, Subtitles, AlertCircle, Check, Loader2, Server, WifiOff, FastForward, Tv, Sun, Volume2, Play, Gauge, Maximize, Keyboard, Film, Zap, Sparkles, Cpu } from 'lucide-react';
import { getEpisodePlayback } from '../api/streamAdapter';
import { getOfflinePlaybackSource, getDownload, deleteDownload, isAutoDeleteWatchedEnabled } from '../offline/downloadEngine';
import { savePlaybackProgress, getPlaybackProgress, clearPlaybackProgress, markEpisodeWatched, formatTime } from '../playback/playbackProgress';
import { fetchSkipTimes, resolveActiveSkip, isAutoSkipEnabled, setAutoSkipEnabled } from '../playback/skipTimes';
import { useVideoGestures, togglePiP, isPiPSupported } from '../playback/useVideoGestures';
import { handlePlayerKeydown, PLAYER_SHORTCUTS } from '../playback/keyboardShortcuts';
import { SUPPORTED_SPEEDS, getStoredPlaybackSpeed, setStoredPlaybackSpeed, applyPlaybackSpeed } from '../playback/playbackSpeed';
import { shouldTriggerCountdown, COUNTDOWN_DURATION } from '../playback/nextEpisodeCountdown';
import { createAnimeEnhanceEngine, isWebGL2Supported, ANIME_ENHANCE_MODES } from '../playback/animeEnhanceEngine';
import { createWebGPUSuperResEngine, isWebGPUSupported, WEBGPU_SUPER_RES_MODES } from '../playback/webgpuSuperResEngine';


export default function AnimePlayer({
  animeId,
  malId,
  animeTitle,
  miruroId,
  initialEpisode = 1,
  totalEpisodes = 1,
  onClose,
  onEpisodeChange,
  onComplete,
}) {
  const containerRef = useRef(null);
  const videoWrapperRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const offlineSourceRef = useRef(null);
  const gpuEngineRef = useRef(null);
  const webgpuEngineRef = useRef(null);

  const [episode, setEpisode] = useState(initialEpisode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playbackData, setPlaybackData] = useState(null);

  // Servidores múltiples
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferNotice, setBufferNotice] = useState(false);

  // Calidad y Velocidad (Ajustes)
  const [qualities, setQualities] = useState([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = Auto
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcutsList, setShowShortcutsList] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(() => {
    try { return localStorage.getItem('orunei_theater_mode') === 'true'; } catch { return false; }
  });
  const [playbackSpeed, setPlaybackSpeed] = useState(() => getStoredPlaybackSpeed());

  // AI Super Resolution (WebGPU CNN 2×)
  const [aiSuperResMode, setAiSuperResMode] = useState(() => {
    try {
      const saved = localStorage.getItem('orunei_ai_super_res_mode');
      if (saved && ['off', 'cnn-s', 'cnn-m'].includes(saved)) return saved;
      return 'off';
    } catch {
      return 'off';
    }
  });
  const [aiFps, setAiFps] = useState(null);
  const [aiAbCompare, setAiAbCompare] = useState(false);

  // Anime Enhance (WebGL2 Fallback)
  const [animeEnhanceMode, setAnimeEnhanceMode] = useState(() => {
    try {
      const saved = localStorage.getItem('orunei_anime_enhance_mode');
      if (saved && ['normal', 'balanced', 'high'].includes(saved)) return saved;
      return 'normal';
    } catch {
      return 'normal';
    }
  });
  const [gpuFps, setGpuFps] = useState(null);
  const [abCompareMode, setAbCompareMode] = useState(false);


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
  }, [animeId, miruroId, episode, retryCount]);

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

  // Inicializar Hls.js una vez cargada la fuente o cambiado el servidor
  useEffect(() => {
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
                hls.startLoad();
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
  }, [activeStreamUrl]);

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
    }
    const progress = getPlaybackProgress(animeId || miruroId, episode);
    if (progress && progress.currentTime > 8) {
      setResumePrompt({
        time: progress.currentTime,
        formatted: formatTime(progress.currentTime),
      });
    } else {
      setResumePrompt(null);
    }
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
    const el = containerRef.current || videoRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {
        if (videoRef.current?.webkitEnterFullscreen) {
          videoRef.current.webkitEnterFullscreen();
        }
      });
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

  // AI Super Resolution (WebGPU CNN 2×)
  const handleChangeAiSuperResMode = async (modeId) => {
    if (modeId !== 'off') {
      const supported = await isWebGPUSupported();
      if (!supported) {
        showFeedback?.({ type: 'boost', text: 'WebGPU no soportado en este navegador/dispositivo' });
        return;
      }
      // Desactivar Anime Enhance para evitar contención de recursos de GPU
      if (animeEnhanceMode !== 'normal') {
        setAnimeEnhanceMode('normal');
        try { localStorage.setItem('orunei_anime_enhance_mode', 'normal'); } catch {}
      }
    }
    setAiSuperResMode(modeId);
    try { localStorage.setItem('orunei_ai_super_res_mode', modeId); } catch {}
    const modeObj = WEBGPU_SUPER_RES_MODES.find((m) => m.id === modeId);
    if (webgpuEngineRef.current) {
      if (modeId === 'off') {
        webgpuEngineRef.current.destroy();
        webgpuEngineRef.current = null;
        setAiFps(null);
      } else {
        webgpuEngineRef.current.setMode(modeId);
      }
    }
    showFeedback?.({
      type: 'boost',
      text: modeId !== 'off' ? `🧠 AI Super Res: ${modeObj?.label || 'Activo'}` : 'AI Super Res: Normal (Desactivado)',
    });
  };

  const handleToggleAiAbCompare = () => {
    if (aiSuperResMode === 'off') {
      showFeedback?.({ type: 'boost', text: 'Activa CNN Small o Medium para comparar' });
      return;
    }
    setAiAbCompare((prev) => {
      const next = !prev;
      if (webgpuEngineRef.current) {
        webgpuEngineRef.current.setSplitComparison({ enabled: next, position: 0.5 });
      }
      showFeedback?.({
        type: 'boost',
        text: next ? 'Comparación A/B activa (Izq: Original | Der: CNN 2×)' : 'Vista completa procesada',
      });
      return next;
    });
  };

  const handleToggleAnimeEnhance = () => {
    if (!isWebGL2Supported()) {
      showFeedback?.({ type: 'boost', text: 'WebGL2 no soportado en este dispositivo' });
      return;
    }
    setAnimeEnhanceMode((prev) => {
      const next = prev === 'normal' ? 'balanced' : 'normal';
      if (next !== 'normal' && aiSuperResMode !== 'off') {
        setAiSuperResMode('off');
        try { localStorage.setItem('orunei_ai_super_res_mode', 'off'); } catch {}
      }
      try { localStorage.setItem('orunei_anime_enhance_mode', next); } catch {}
      const modeObj = ANIME_ENHANCE_MODES.find((m) => m.id === next) || ANIME_ENHANCE_MODES[0];
      showFeedback?.({
        type: 'boost',
        text: next !== 'normal' ? `✨ Anime Enhance: ${modeObj.label}` : 'Anime Enhance: Normal (Desactivado)',
      });
      return next;
    });
  };

  const handleChangeAnimeEnhanceMode = (modeId) => {
    if (modeId !== 'normal') {
      if (!isWebGL2Supported()) {
        showFeedback?.({ type: 'boost', text: 'WebGL2 no soportado en este dispositivo' });
        return;
      }
      if (aiSuperResMode !== 'off') {
        setAiSuperResMode('off');
        try { localStorage.setItem('orunei_ai_super_res_mode', 'off'); } catch {}
      }
    }
    setAnimeEnhanceMode(modeId);
    try { localStorage.setItem('orunei_anime_enhance_mode', modeId); } catch {}
    const modeObj = ANIME_ENHANCE_MODES.find((m) => m.id === modeId);
    if (gpuEngineRef.current) {
      if (modeId === 'normal') {
        gpuEngineRef.current.destroy();
        gpuEngineRef.current = null;
        setGpuFps(null);
      } else {
        gpuEngineRef.current.setMode(modeId);
      }
    }
    showFeedback?.({
      type: 'boost',
      text: `✨ Anime Enhance: ${modeObj?.label || 'Modo'}`,
    });
  };

  const handleToggleABCompare = () => {
    if (animeEnhanceMode === 'normal') {
      showFeedback?.({ type: 'boost', text: 'Activa Equilibrado o Alta def. para comparar' });
      return;
    }
    setAbCompareMode((prev) => {
      const next = !prev;
      if (gpuEngineRef.current) {
        gpuEngineRef.current.setSplitComparison({ enabled: next, position: 0.5 });
      }
      showFeedback?.({
        type: 'boost',
        text: next ? 'Comparación A/B activa (Izq: Original | Der: Procesado)' : 'Vista completa procesada',
      });
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

  // Ciclo de vida de AI Super Resolution (WebGPU CNN 2×)
  useEffect(() => {
    let isCancelled = false;

    if (aiSuperResMode === 'off') {
      if (webgpuEngineRef.current) {
        webgpuEngineRef.current.destroy();
        webgpuEngineRef.current = null;
      }
      setAiFps(null);
      return;
    }

    const video = videoRef.current;
    const wrapper = videoWrapperRef.current;
    if (!video || !wrapper) return;

    createWebGPUSuperResEngine({
      video,
      container: wrapper,
      mode: aiSuperResMode,
      splitMode: aiAbCompare ? 1 : 0,
      splitPos: 0.5,
      onFpsUpdate: (fps) => {
        if (!isCancelled) setAiFps(fps);
      },
      onPerformanceDrop: ({ fps }) => {
        if (isCancelled) return;
        setAiSuperResMode('off');
        try { localStorage.setItem('orunei_ai_super_res_mode', 'off'); } catch {}
        showFeedback?.({
          type: 'boost',
          text: `AI Super Res desactivado por rendimiento (${fps} FPS)`,
        });
      },
      onError: () => {
        if (isCancelled) return;
        setAiSuperResMode('off');
        try { localStorage.setItem('orunei_ai_super_res_mode', 'off'); } catch {}
        showFeedback?.({
          type: 'boost',
          text: 'AI Super Res no disponible en esta fuente/hardware',
        });
      },
    }).then((engine) => {
      if (isCancelled) {
        engine?.destroy();
        return;
      }
      webgpuEngineRef.current = engine;
    }).catch(() => {
      if (!isCancelled) {
        setAiSuperResMode('off');
      }
    });

    return () => {
      isCancelled = true;
      if (webgpuEngineRef.current) {
        webgpuEngineRef.current.destroy();
        webgpuEngineRef.current = null;
      }
      setAiFps(null);
    };
  }, [aiSuperResMode, episode]);

  // Ciclo de vida y sincronización de Anime Enhance (Anime4K + AMD FidelityFX CAS - Fallback WebGL2)
  useEffect(() => {
    if (animeEnhanceMode === 'normal' || aiSuperResMode !== 'off') {
      if (gpuEngineRef.current) {
        gpuEngineRef.current.destroy();
        gpuEngineRef.current = null;
      }
      setGpuFps(null);
      return;
    }

    const video = videoRef.current;
    const wrapper = videoWrapperRef.current;
    if (!video || !wrapper) return;

    try {
      const engine = createAnimeEnhanceEngine({
        video,
        container: wrapper,
        mode: animeEnhanceMode,
        splitMode: abCompareMode ? 1 : 0,
        splitPos: 0.5,
        onFpsUpdate: (fps) => setGpuFps(fps),
        onPerformanceDrop: ({ fps }) => {
          setAnimeEnhanceMode('normal');
          try { localStorage.setItem('orunei_anime_enhance_mode', 'normal'); } catch {}
          showFeedback?.({
            type: 'boost',
            text: `Anime Enhance desactivado por rendimiento (${fps} FPS)`,
          });
        },
        onError: () => {
          setAnimeEnhanceMode('normal');
          try { localStorage.setItem('orunei_anime_enhance_mode', 'normal'); } catch {}
          showFeedback?.({
            type: 'boost',
            text: 'Anime Enhance no disponible en esta fuente',
          });
        },
      });

      gpuEngineRef.current = engine;
    } catch {
      setAnimeEnhanceMode('normal');
    }

    return () => {
      if (gpuEngineRef.current) {
        gpuEngineRef.current.destroy();
        gpuEngineRef.current = null;
      }
      setGpuFps(null);
    };
  }, [animeEnhanceMode, aiSuperResMode, episode]);

  // Atajos de teclado profesionales (Espacio, F, T, M, Flechas, J/L, N, P, S, B)
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
        onToggleAnimeEnhance: handleToggleAnimeEnhance,
        onToggleGpuBoost: handleToggleAnimeEnhance,
        showFeedback,
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSkip, episode, totalEpisodes, isTheaterMode, animeEnhanceMode]);


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
      {/* Cabecera del reproductor */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#161824]/95 backdrop-blur-md text-white">
        <div className="min-w-0 pr-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            </span>
            <h3 className="text-sm sm:text-base font-bold truncate text-slate-100">{animeTitle}</h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400 font-medium">Episodio {episode}{totalEpisodes ? ` de ${totalEpisodes}` : ''}</p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Badge AI Super Resolution activo (WebGPU CNN) */}
          {aiSuperResMode !== 'off' && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.25)] animate-fade">
              <Cpu size={12} className="text-violet-400" />
              <span>
                {aiFps ? `${aiFps} FPS • ` : '🧠 '}
                AI Super Res: {WEBGPU_SUPER_RES_MODES.find((m) => m.id === aiSuperResMode)?.label}
                {aiAbCompare ? ' (A/B)' : ''}
              </span>
            </span>
          )}

          {/* Badge Anime Enhance activo (Fallback WebGL2) */}
          {aiSuperResMode === 'off' && animeEnhanceMode !== 'normal' && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-fade">
              <Sparkles size={12} className="fill-amber-400 text-amber-400" />
              <span>
                {gpuFps ? `${gpuFps} FPS • ` : '✨ '}
                Anime Enhance: {ANIME_ENHANCE_MODES.find((m) => m.id === animeEnhanceMode)?.label}
                {abCompareMode ? ' (A/B)' : ''}
              </span>
            </span>
          )}

          {/* Badge de subtítulos en español */}
          {playbackData && playbackData.hasSpanishSubtitles && (
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Check size={12} className="text-emerald-400" />
              Sub Español Disponible
            </span>
          )}

          {playbackData && !playbackData.hasSpanishSubtitles && (
            <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <AlertCircle size={13} />
              Subtítulos en español no disponibles
            </span>
          )}

          {/* Botón Picture-in-Picture (PiP) */}
          {isPiPSupported() && (
            <button
              type="button"
              onClick={handleTogglePiP}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-all duration-200 active:scale-95 shadow-sm"
              title="Modo Picture-in-Picture (Ventana flotante)"
            >
              <Tv size={14} className="text-brand shrink-0" />
              <span className="hidden sm:inline">PiP</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/15 border border-white/10 transition-all duration-200 active:scale-95 shadow-sm"
            title="Cerrar reproductor"
          >
            <X size={15} />
            <span className="hidden sm:inline">Cerrar</span>
          </button>
        </div>
      </div>

      {/* Área del reproductor de video contenida en pantalla */}
      <div
        ref={videoWrapperRef}
        className={`relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden mx-auto select-none transition-all duration-300 ${
          isTheaterMode ? 'max-h-[78vh]' : 'max-h-[50vh]'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 z-10 text-white">
            <Loader2 size={36} className="animate-spin text-brand" />
            <p className="text-sm font-medium">Cargando transmisión y subtítulos…</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center z-10 text-white">
            <AlertCircle size={40} className="text-rose-500" />
            <p className="text-sm max-w-md text-slate-300">{error}</p>
            <div className="flex gap-2 mt-2">
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

        <video
          ref={videoRef}
          style={brightness !== 1 ? { filter: `brightness(${brightness})` } : undefined}
          className="w-full h-full object-contain"
          controls
          playsInline
          crossOrigin="anonymous"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePause}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => { setIsBuffering(false); setBufferNotice(false); }}
          onCanPlay={() => setIsBuffering(false)}
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
      </div>

      {/* Barra de controles inferiores: Jerarquía limpia en 3 islas visuales */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-3 sm:px-6 py-2.5 sm:py-3 border-t border-white/10 bg-[#141724]/95 backdrop-blur-md text-sm text-white">
        {/* GRUPO 1: Navegación de Episodios (Isla encapsulada) */}
        <div className="flex items-center justify-between sm:justify-start gap-1 p-1 rounded-2xl bg-white/[0.04] border border-white/10 shadow-inner">
          <button
            onClick={handlePrevEp}
            disabled={episode <= 1 || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-95"
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 active:scale-95"
            title="Episodio siguiente"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* GRUPOS 2 Y 3: Transmisión y Ajustes */}
        <div className="flex items-center justify-between md:justify-end gap-2 sm:gap-2.5 flex-wrap sm:flex-nowrap">
          {/* GRUPO 2: Fuente y Pistas (Servidor y Subtítulos) */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
          {/* Selector de Servidor (cuando hay múltiples disponibles) */}
          {servers.length > 1 && (
            <div className="relative">
              <button
                onClick={() => { setShowServerMenu(!showServerMenu); setShowSubMenu(false); setShowSettings(false); }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 text-slate-200 transition active:scale-95 shadow-sm"
                title="Cambiar servidor de transmisión"
              >
                <Server size={14} className="text-brand shrink-0" />
                <span className="truncate max-w-[85px] sm:max-w-[130px]">{activeServer?.name || 'Servidor'}</span>
              </button>

              {showServerMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-32px)] rounded-xl bg-[#1b1f2e] border border-white/10 shadow-2xl p-1.5 z-30 animate-scaleUp">
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
          <div className="relative">
            <button
              onClick={() => { setShowSubMenu(!showSubMenu); setShowServerMenu(false); setShowSettings(false); }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 active:scale-95 ${selectedSub !== 'off' ? 'bg-brand text-white border-brand shadow-[0_0_15px_rgba(109,92,255,0.4)]' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
              title="Seleccionar subtítulos"
            >
              <Subtitles size={15} className="shrink-0" />
              <span className="hidden sm:inline">Subtítulos: </span>
              <span className="truncate max-w-[80px] sm:max-w-none">{selectedSub === 'off' ? 'Off' : (subTracks.find((s) => s.id === selectedSub || s.lang === selectedSub)?.label || 'Español')}</span>
            </button>

            {showSubMenu && (
              <div className="absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-32px)] rounded-xl bg-[#1b1f2e] border border-white/10 shadow-2xl p-1.5 z-30 animate-scaleUp">
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
          </div>
          {/* Fin GRUPO 2: Fuente y Pistas */}

          {/* Divisor vertical decorativo */}
          <div className="hidden sm:block h-6 w-px bg-white/10 my-auto" />

          {/* GRUPO 3: Ajustes, Modo Cine y Pantalla Completa */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.04] border border-white/10">
            {/* Menú de Configuración: Velocidad de reproducción y Calidad */}
            <div className="relative">
            <button
              onClick={() => { setShowSettings(!showSettings); setShowServerMenu(false); setShowSubMenu(false); }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all duration-200 active:scale-95 ${showSettings || playbackSpeed !== 1 ? 'bg-brand/20 border-brand/50 text-white shadow-[0_0_12px_rgba(109,92,255,0.3)]' : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'}`}
              title="Ajustes de reproducción (Velocidad y Calidad)"
            >
              <Settings size={15} className={`shrink-0 ${playbackSpeed !== 1 ? 'text-brand' : ''}`} />
              <span className="truncate max-w-[65px] sm:max-w-none">
                {playbackSpeed !== 1 ? `${playbackSpeed}x` : (currentQuality === -1 ? 'Auto' : qualities.find((q) => q.index === currentQuality)?.label || 'Ajustes')}
              </span>
            </button>

            {showSettings && (
              <div className="absolute bottom-full right-0 mb-2 w-56 max-w-[calc(100vw-32px)] rounded-2xl bg-[#1b1f2e] border border-white/10 shadow-2xl p-2 z-30 animate-scaleUp">
                {/* Sección de Velocidad */}
                <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Gauge size={13} className="text-brand" /> Velocidad</span>
                  <span className="text-brand font-extrabold">{playbackSpeed}x</span>
                </div>
                <div className="py-2 grid grid-cols-3 gap-1">
                  {SUPPORTED_SPEEDS.map((spd) => (
                    <button
                      key={spd}
                      onClick={() => handleChangeSpeed(spd)}
                      className={`py-1.5 text-xs font-semibold rounded-lg text-center transition ${playbackSpeed === spd ? 'bg-brand text-white font-bold shadow-sm' : 'text-slate-300 hover:bg-white/5'}`}
                    >
                      {spd === 1 ? '1x Normal' : `${spd}x`}
                    </button>
                  ))}
                </div>

                {/* Sección de Calidad (si hay niveles disponibles) */}
                {qualities.length > 0 && (
                  <>
                    <div className="mt-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10 border-t pt-2">
                      Calidad de video
                    </div>
                    <div className="mt-1 flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                      <button
                        onClick={() => changeQuality(-1)}
                        className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition ${currentQuality === -1 ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                      >
                        <span>Automática (Adaptativa)</span>
                        {currentQuality === -1 && <Check size={13} />}
                      </button>

                      {qualities.map((q) => (
                        <button
                          key={q.index}
                          onClick={() => changeQuality(q.index)}
                          className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition ${currentQuality === q.index ? 'bg-brand text-white font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          <span>{q.label}</span>
                          {currentQuality === q.index && <Check size={13} />}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Ajuste de AI Super Resolution (WebGPU CNN 2×) */}
                <div className="mt-2 pt-2 border-t border-white/10 flex flex-col px-2.5 py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs text-slate-200 font-semibold flex items-center gap-1.5">
                        <Cpu size={13} className={aiSuperResMode !== 'off' ? 'text-violet-400 fill-violet-400' : 'text-slate-400'} />
                        AI Super Resolution (WebGPU)
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {aiSuperResMode !== 'off'
                          ? (aiFps ? `${aiFps} FPS • ${WEBGPU_SUPER_RES_MODES.find((m) => m.id === aiSuperResMode)?.label}` : `Modo ${WEBGPU_SUPER_RES_MODES.find((m) => m.id === aiSuperResMode)?.label}`)
                          : 'Normal (Desactivado)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={aiSuperResMode !== 'off'}
                      onClick={() => handleChangeAiSuperResMode(aiSuperResMode === 'off' ? 'cnn-s' : 'off')}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${aiSuperResMode !== 'off' ? 'bg-violet-600' : 'bg-white/20'}`}
                      title={aiSuperResMode !== 'off' ? 'Desactivar AI Super Resolution' : 'Activar AI Super Resolution (WebGPU CNN 2×)'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${aiSuperResMode !== 'off' ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>

                  {/* Selector de los 3 modos: Normal, CNN Small 2×, CNN Medium 2× */}
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {WEBGPU_SUPER_RES_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleChangeAiSuperResMode(m.id)}
                        className={`py-1.5 px-1 text-[10px] rounded-lg text-center transition ${
                          aiSuperResMode === m.id
                            ? 'bg-violet-600 text-white font-extrabold shadow-sm'
                            : 'text-slate-300 bg-white/5 hover:bg-white/10 font-semibold'
                        }`}
                        title={m.description}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Comparación visual A/B para AI Super Resolution */}
                  {aiSuperResMode !== 'off' && (
                    <button
                      type="button"
                      onClick={handleToggleAiAbCompare}
                      className={`mt-2 flex items-center justify-between px-2.5 py-1.5 text-[11px] rounded-lg border transition ${
                        aiAbCompare
                          ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                      title="Comparar original vs CNN 2× con pantalla dividida (Split-Screen A/B)"
                    >
                      <span className="flex items-center gap-1.5">
                        <Cpu size={11} className={aiAbCompare ? 'text-violet-400' : 'text-slate-400'} />
                        Comparación A/B (Split 50%)
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                        {aiAbCompare ? 'Activo' : 'Off'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Ajuste de Anime Enhance (Anime4K + AMD FidelityFX CAS - Fallback WebGL2) */}
                <div className="mt-2 pt-2 border-t border-white/10 flex flex-col px-2.5 py-1">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col pr-2">
                      <span className="text-xs text-slate-200 font-semibold flex items-center gap-1.5">
                        <Sparkles size={13} className={animeEnhanceMode !== 'normal' ? 'text-amber-400 fill-amber-400' : 'text-slate-400'} />
                        Anime Enhance
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {animeEnhanceMode !== 'normal'
                          ? (gpuFps ? `${gpuFps} FPS • ${ANIME_ENHANCE_MODES.find((m) => m.id === animeEnhanceMode)?.label}` : `Modo ${ANIME_ENHANCE_MODES.find((m) => m.id === animeEnhanceMode)?.label}`)
                          : 'Normal (Original sin filtro)'}
                      </span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={animeEnhanceMode !== 'normal'}
                      onClick={handleToggleAnimeEnhance}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${animeEnhanceMode !== 'normal' ? 'bg-amber-500' : 'bg-white/20'}`}
                      title={animeEnhanceMode !== 'normal' ? 'Desactivar Anime Enhance' : 'Activar Anime Enhance (Anime4K + AMD CAS)'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${animeEnhanceMode !== 'normal' ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>

                  {/* Selector de los 3 modos: Normal, Equilibrado, Alta definición */}
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    {ANIME_ENHANCE_MODES.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleChangeAnimeEnhanceMode(m.id)}
                        className={`py-1.5 px-1 text-[10px] rounded-lg text-center transition ${
                          animeEnhanceMode === m.id
                            ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                            : 'text-slate-300 bg-white/5 hover:bg-white/10 font-semibold'
                        }`}
                        title={m.description}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {/* Comparación visual A/B */}
                  {animeEnhanceMode !== 'normal' && (
                    <button
                      type="button"
                      onClick={handleToggleABCompare}
                      className={`mt-2 flex items-center justify-between px-2.5 py-1.5 text-[11px] rounded-lg border transition ${
                        abCompareMode
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                          : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                      title="Comparar original vs mejorado con pantalla dividida (Split-Screen A/B)"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={11} className={abCompareMode ? 'text-amber-400' : 'text-slate-400'} />
                        Comparación A/B (Split)
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40">
                        {abCompareMode ? 'Activo' : 'Off'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Ajuste de Auto-saltar Intro */}
                <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between px-2.5 py-1">
                  <span className="text-xs text-slate-300 font-medium">Auto-saltar Intro</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSkipIntro}
                    onClick={() => {
                      const next = !autoSkipIntro;
                      setAutoSkipIntro(next);
                      setAutoSkipEnabled(next);
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoSkipIntro ? 'bg-brand' : 'bg-white/20'}`}
                    title={autoSkipIntro ? 'Desactivar salto automático de intro' : 'Activar salto automático de intro'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${autoSkipIntro ? 'translate-x-4' : 'translate-x-0'}`}
                    />
                  </button>
                </div>

                {/* Atajos de teclado desplegables */}
                <div className="mt-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowShortcutsList(!showShortcutsList)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-xs text-slate-300 hover:text-white rounded-lg transition"
                  >
                    <span className="font-medium flex items-center gap-1.5">
                      <Keyboard size={13} className="text-brand" /> Atajos de teclado
                    </span>
                    <span className="text-[10px] text-brand font-semibold">{showShortcutsList ? 'Ocultar' : 'Ver'}</span>
                  </button>
                  {showShortcutsList && (
                    <div className="mt-1.5 p-2 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-[11px] max-h-36 overflow-y-auto">
                      {PLAYER_SHORTCUTS.map((s) => (
                        <div key={s.key} className="flex items-center justify-between gap-2 text-slate-300">
                          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px] font-bold">{s.key}</kbd>
                          <span className="text-right text-slate-400 text-[10px]">{s.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
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
