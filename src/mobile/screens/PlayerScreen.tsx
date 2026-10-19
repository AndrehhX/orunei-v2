import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimeItem, StreamSource, EpisodeItem } from '../types/anime';
import { realAnimeService } from '../services/realAnimeService';
import { ServerBottomSheet } from '../components/ServerBottomSheet';
import { CinemaVideoPlayer } from '../components/CinemaVideoPlayer';
import { storageService } from '../services/storageService';

interface PlayerScreenProps {
  anime: AnimeItem;
  episodeNumber: number;
  onBack: () => void;
}

export const PlayerScreen: React.FC<PlayerScreenProps> = ({
  anime,
  episodeNumber: initialEpisodeNum,
  onBack,
}) => {
  const [currentEpNum, setCurrentEpNum] = useState<number>(initialEpisodeNum);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentAudio, setCurrentAudio] = useState<'latino' | 'sub'>(anime.isDubbed ? 'latino' : 'sub');
  const [isStreamLoading, setIsStreamLoading] = useState(true);
  const [isSavedInList, setIsSavedInList] = useState(false);
  const [activeTab, setActiveTab] = useState<'episodios' | 'detalles'>('episodios');

  const [currentServer, setCurrentServer] = useState<StreamSource>({
    id: 'initial-stream',
    name: 'Conectando...',
    sourceName: 'Orunei FastEdge',
    quality: '1080p FHD',
    proxiedStreamUrl: '',
    pingMs: 14,
    language: anime.isDubbed ? 'latino' : 'sub',
    badgeLabel: 'CONECTANDO',
    badgeType: 'fast',
  });
  const [availableServers, setAvailableServers] = useState<StreamSource[]>([]);
  const [episodesList, setEpisodesList] = useState<EpisodeItem[]>([]);
  const [showServerSheet, setShowServerSheet] = useState(false);
  const [brightness, setBrightness] = useState(0.75);
  const [volume, setVolume] = useState(0.6);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1440);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedBatch, setSelectedBatch] = useState(0);
  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(episodesList.length / BATCH_SIZE);
  const visibleEpisodes = episodesList.slice(selectedBatch * BATCH_SIZE, (selectedBatch + 1) * BATCH_SIZE);

  // Sincronizar automáticamente el bloque de episodios activo con el que se está reproduciendo
  useEffect(() => {
    if (episodesList.length > 0) {
      const batchForCurrentEp = Math.floor((currentEpNum - 1) / BATCH_SIZE);
      setSelectedBatch(batchForCurrentEp);
    }
  }, [currentEpNum, episodesList.length]);

  // Comprobar si el anime ya está en favoritos
  useEffect(() => {
    storageService.isFavorite(anime.id).then((fav) => setIsSavedInList(fav));
  }, [anime.id]);

  const toggleFavorite = async () => {
    const next = await storageService.toggleFavorite(anime);
    setIsSavedInList(next);
  };

  // Cargar servidores y lista de episodios para el episodio actual
  useEffect(() => {
    let isMounted = true;
    const loadStreamAndEpisodes = async () => {
      setIsStreamLoading(true);
      try {
        // 1. Cargar servidores de alta velocidad
        const srvs = await realAnimeService.getStreamingServers(
          anime.malId || anime.id,
          currentEpNum,
          currentAudio,
          anime.title,
          anime.id
        );
        if (isMounted && srvs.length > 0) {
          setAvailableServers(srvs);
          setCurrentServer(srvs[0]);
        }

        // 2. Cargar episodios de la temporada
        const detail = await realAnimeService.getAnimeDetail(anime.id);
        if (isMounted && detail?.episodes?.length > 0) {
          setEpisodesList(detail.episodes);
        }
      } catch (err) {
        console.warn('Error loading player data:', err);
      } finally {
        if (isMounted) setIsStreamLoading(false);
      }
    };

    loadStreamAndEpisodes();
    return () => {
      isMounted = false;
    };
  }, [anime.id, anime.malId, currentEpNum, currentAudio]);

  // Temporizador de auto-ocultamiento de controles
  const resetControlsTimer = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3500);
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Guardar progreso cada 10 segundos
  useEffect(() => {
    if (currentTime > 5) {
      storageService.saveProgress({
        animeId: anime.id,
        animeTitle: anime.title,
        coverImage: anime.coverImage,
        episodeNumber: currentEpNum,
        episodeTitle: `Episodio ${currentEpNum}`,
        currentTime: Math.floor(currentTime),
        duration: Math.floor(duration),
        updatedAt: Date.now(),
      });
    }
  }, [Math.floor(currentTime / 10)]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSkipAniSkip = () => {
    setCurrentTime((prev) => Math.min(duration, prev + 85));
    resetControlsTimer();
  };

  const currentEpisodeData = episodesList.find((e) => e.number === currentEpNum);

  return (
    <div className={`relative w-full h-full bg-surface flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* 1. Contenedor del Reproductor de Video */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden flex-shrink-0 group">
        <CinemaVideoPlayer
          streamUrl={currentServer.proxiedStreamUrl || currentServer.embedUrl || ''}
          isEmbed={currentServer.isEmbed}
          isPlaying={isPlaying}
          playbackSpeed={playbackSpeed}
          isLoading={isStreamLoading}
          serverName={currentServer.sourceName}
          audioLanguage={currentAudio}
          onTimeUpdate={(t, d) => {
            setCurrentTime(t);
            if (d > 0) setDuration(d);
          }}
          onEnded={() => {
            if (currentEpNum < (anime.episodesCount || episodesList.length || 12)) {
              setCurrentEpNum((prev) => prev + 1);
            }
          }}
        />

        {/* Capa invisible para toggle de controles */}
        <div
          className="absolute inset-0 z-10"
          onClick={() => {
            setShowControls(!showControls);
            resetControlsTimer();
          }}
        />

        {/* 2. Top Bar del Reproductor */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3.5 bg-gradient-to-b from-black/85 via-black/45 to-transparent"
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onBack}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur text-primary flex items-center justify-center border border-white/10"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </motion.button>

              <div className="flex-1 px-3">
                <span className="text-[9px] font-mono font-bold tracking-widest text-on-surface-variant block uppercase">
                  ORUNEI CINEMA ENGINE
                </span>
                <h3 className="font-geist text-xs font-bold text-primary truncate">
                  {anime.title} • Ep. {currentEpNum}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setShowServerSheet(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-primary"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-forestMint animate-pulse" />
                  <span className="text-[10px] font-mono font-bold">
                    {currentAudio === 'latino' ? '🇲🇽 DUB' : '🇯🇵 SUB'}
                  </span>
                  <span className="material-symbols-outlined text-[13px] text-on-surface-variant">
                    tune
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Gestos Laterales HUD: Brillo y Volumen */}
        {showControls && !isLocked && !isStreamLoading && (
          <>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center bg-black/65 backdrop-blur-md px-1.5 py-2.5 rounded-full border border-white/10">
              <span className="material-symbols-outlined text-xs text-on-surface-variant mb-1">
                brightness_medium
              </span>
              <input
                type="range"
                min="0.2"
                max="1"
                step="0.05"
                value={brightness}
                onChange={(e) => setBrightness(parseFloat(e.target.value))}
                className="w-14 -rotate-90 my-5 accent-forestMint cursor-pointer"
              />
              <span className="font-mono text-[8px] text-on-surface-variant font-bold mt-1">
                {Math.round(brightness * 100)}%
              </span>
            </div>

            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center bg-black/65 backdrop-blur-md px-1.5 py-2.5 rounded-full border border-white/10">
              <span className="material-symbols-outlined text-xs text-on-surface-variant mb-1">
                volume_up
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-14 -rotate-90 my-5 accent-primary cursor-pointer"
              />
              <span className="font-mono text-[8px] text-on-surface-variant font-bold mt-1">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </>
        )}

        {/* 4. Controles Centrales de Playback */}
        <AnimatePresence>
          {showControls && !isLocked && !isStreamLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-20 flex items-center justify-center gap-6 pointer-events-none"
            >
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentTime((prev) => Math.max(0, prev - 10));
                  resetControlsTimer();
                }}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur text-primary flex items-center justify-center border border-white/10 pointer-events-auto"
              >
                <span className="material-symbols-outlined text-[18px]">replay_10</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsPlaying(!isPlaying);
                  resetControlsTimer();
                }}
                className="w-14 h-14 rounded-full bg-primary text-black flex items-center justify-center shadow-2xl pointer-events-auto"
              >
                <span className="material-symbols-outlined text-[30px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentTime((prev) => Math.min(duration, prev + 10));
                  resetControlsTimer();
                }}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur text-primary flex items-center justify-center border border-white/10 pointer-events-auto"
              >
                <span className="material-symbols-outlined text-[18px]">forward_10</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 5. Botón Flotante AniSkip (+85s) */}
        {showControls && !isLocked && !isStreamLoading && (
          <div className="absolute right-3.5 bottom-12 z-20">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={handleSkipAniSkip}
              className="px-2.5 py-1 rounded-lg bg-black/80 backdrop-blur-md border border-white/20 text-primary flex items-center gap-1.5 shadow-xl hover:border-forestMint transition-all"
            >
              <span className="text-[9px] font-mono font-bold text-forestMint uppercase">AniSkip</span>
              <span className="text-[11px] font-geist font-semibold">+85s</span>
              <span className="material-symbols-outlined text-[14px]">fast_forward</span>
            </motion.button>
          </div>
        )}

        {/* 6. Barra de Progreso Inferior */}
        {showControls && (
          <div className="absolute bottom-0 inset-x-0 z-20 p-2.5 bg-gradient-to-t from-black/95 via-black/55 to-transparent">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-primary">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative flex items-center">
                <input
                  type="range"
                  min="0"
                  max={duration || 1440}
                  value={currentTime}
                  onChange={(e) => {
                    setCurrentTime(parseFloat(e.target.value));
                    resetControlsTimer();
                  }}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-forestMint"
                />
              </div>
              <span className="font-mono text-[9px] text-on-surface-variant">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Cuerpo Completo Bajo el Reproductor (Sin espacio vacío) */}
      {!isFullscreen && (
        <div className="flex-1 overflow-y-auto no-scrollbar bg-surface divide-y divide-white/[0.06]">
          {/* A. Encabezado de Episodio y Título */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded bg-forestTagBg border border-forestMint/25 text-[9px] font-mono font-bold text-forestMint uppercase">
                    TEMPORADA 1 • EP. {currentEpNum}
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    {anime.studio}
                  </span>
                </div>
                <h2 className="font-geist text-base font-bold text-primary truncate leading-tight">
                  {anime.title}
                </h2>
                <p className="text-xs text-on-surface-variant font-mono mt-0.5 truncate">
                  «{currentEpisodeData?.title || `Episodio ${currentEpNum}`}»
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-surface-container border border-white/10">
                  <span className="material-symbols-outlined text-[13px] text-amber-400">star</span>
                  <span className="font-mono text-xs font-bold text-primary">{anime.rating}</span>
                </div>
              </div>
            </div>

            {/* B. Barra de Acciones Rápidas (Estilo Netflix / Crunchyroll) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {/* Botón Mi Lista */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={toggleFavorite}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                  isSavedInList
                    ? 'bg-sakura/15 border-sakura text-sakura'
                    : 'bg-surface-container border-white/[0.07] text-on-surface-variant hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isSavedInList ? 'bookmark_added' : 'bookmark_add'}
                </span>
                <span className="text-[9px] font-mono font-bold tracking-tight">
                  {isSavedInList ? 'GUARDADO' : 'MI LISTA'}
                </span>
              </motion.button>

              {/* Selector de Servidores */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowServerSheet(true)}
                className="py-2 px-1 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center gap-1 text-on-surface-variant hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-[18px] text-forestMint">
                  tune
                </span>
                <span className="text-[9px] font-mono font-bold tracking-tight">
                  SERVIDORES
                </span>
              </motion.button>

              {/* Botón Descargar */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => alert(`Iniciando descarga en caché de: ${anime.title} Ep. ${currentEpNum}`)}
                className="py-2 px-1 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center gap-1 text-on-surface-variant hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span className="text-[9px] font-mono font-bold tracking-tight">DESCARGAR</span>
              </motion.button>

              {/* Botón Compartir */}
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.href);
                  alert('¡Enlace del episodio copiado!');
                }}
                className="py-2 px-1 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center gap-1 text-on-surface-variant hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span className="text-[9px] font-mono font-bold tracking-tight">COMPARTIR</span>
              </motion.button>
            </div>

            {/* C. Selector de Pista de Audio con Alto Contraste (Blanco y Resplandor) */}
            <div className="pt-2">
              <span className="text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                IDIOMA DE REPRODUCCIÓN
              </span>
              <div className="p-1 rounded-xl bg-surface-container border border-white/10 flex gap-2">
                {anime.isDubbed && (
                  <button
                    onClick={() => setCurrentAudio('latino')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                      currentAudio === 'latino'
                        ? 'bg-sakura/20 text-white border border-sakura shadow-[0_0_15px_rgba(255,77,141,0.3)]'
                        : 'text-white/60 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-sakura shadow-[0_0_8px_#ff4d8d]" />
                    <span>🇲🇽 Español Latino</span>
                  </button>
                )}

                <button
                  onClick={() => setCurrentAudio('sub')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                    currentAudio === 'sub'
                      ? 'bg-forestMint/20 text-white border border-forestMint shadow-[0_0_15px_rgba(13,242,134,0.3)]'
                      : 'text-white/60 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-forestMint shadow-[0_0_8px_#0df286]" />
                  <span>🇯🇵 Japonés (Sub)</span>
                </button>
              </div>
            </div>
          </div>

          {/* D. Pestañas: Episodios vs Sinopsis */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 border-b border-white/[0.08] pb-2">
              <button
                onClick={() => setActiveTab('episodios')}
                className={`text-xs font-mono font-bold tracking-wider pb-1 transition-colors relative ${
                  activeTab === 'episodios' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                EPISODIOS ({episodesList.length || anime.episodesCount})
                {activeTab === 'episodios' && (
                  <motion.div layoutId="playerTabUnderline" className="absolute bottom-0 inset-x-0 h-0.5 bg-forestMint" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('detalles')}
                className={`text-xs font-mono font-bold tracking-wider pb-1 transition-colors relative ${
                  activeTab === 'detalles' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
                }`}
              >
                SINOPSIS Y FICHA
                {activeTab === 'detalles' && (
                  <motion.div layoutId="playerTabUnderline" className="absolute bottom-0 inset-x-0 h-0.5 bg-forestMint" />
                )}
              </button>
            </div>

            {/* Contenido de la pestaña: Lista de Episodios con Miniaturas Oficiales */}
            {activeTab === 'episodios' && (
              <div className="space-y-2.5 pt-1">
                {/* Selector de Rango si hay más de 50 episodios (Bleach, One Piece, Naruto, etc.) */}
                {totalBatches > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 pt-0.5">
                    {Array.from({ length: totalBatches }).map((_, idx) => {
                      const start = idx * BATCH_SIZE + 1;
                      const end = Math.min((idx + 1) * BATCH_SIZE, episodesList.length);
                      const isActive = selectedBatch === idx;
                      return (
                        <button
                          key={`player-batch-${idx}`}
                          onClick={() => setSelectedBatch(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all ${
                            isActive
                              ? 'bg-forestMint text-black shadow-md shadow-forestMint/20'
                              : 'bg-surface-container border border-white/10 text-on-surface-variant hover:text-white'
                          }`}
                        >
                          {start} - {end}
                        </button>
                      );
                    })}
                  </div>
                )}

                {visibleEpisodes.map((ep) => {
                  const isCurrent = ep.number === currentEpNum;
                  return (
                    <motion.div
                      key={`rail-ep-${ep.id}`}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCurrentEpNum(ep.number);
                        setCurrentTime(0);
                      }}
                      className={`p-2 rounded-xl border transition-all flex gap-3 cursor-pointer ${
                        isCurrent
                          ? 'bg-surface-container-high border-forestMint/60 shadow-lg shadow-forestMint/5'
                          : 'bg-surface-container border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="relative w-28 h-16 rounded-lg overflow-hidden bg-black flex-shrink-0">
                        <img
                          src={ep.thumbnail}
                          alt={ep.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {isCurrent ? (
                          <div className="absolute inset-0 bg-forestMint/30 flex items-center justify-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-forestMint animate-ping" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white text-[20px]">
                              play_arrow
                            </span>
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 font-mono text-[8px] font-bold text-white">
                          {ep.durationLabel}
                        </span>
                      </div>

                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`text-[10px] font-mono font-bold ${
                              isCurrent ? 'text-forestMint' : 'text-on-surface-variant'
                            }`}
                          >
                            EPISODIO {ep.number}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-forestTagBg border border-forestMint/30 text-[8px] font-mono font-bold text-forestMint">
                              EN CURSO
                            </span>
                          )}
                        </div>
                        <h4 className="font-geist text-xs font-semibold text-primary truncate">
                          {ep.title}
                        </h4>
                        <p className="text-[10px] text-on-surface-variant font-inter line-clamp-1 mt-0.5">
                          {ep.synopsis}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Contenido de la pestaña: Detalles y Sinopsis */}
            {activeTab === 'detalles' && (
              <div className="space-y-3 pt-1">
                <div className="p-3.5 rounded-xl bg-surface-container border border-white/[0.07]">
                  <h4 className="font-geist text-xs font-bold text-primary mb-1">
                    Acerca de la Serie
                  </h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-inter">
                    {anime.synopsis}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-surface-container border border-white/[0.07]">
                    <span className="text-[9px] text-on-surface-variant block uppercase">Estudio</span>
                    <span className="font-bold text-primary mt-0.5 block">{anime.studio}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container border border-white/[0.07]">
                    <span className="text-[9px] text-on-surface-variant block uppercase">Año / Estado</span>
                    <span className="font-bold text-primary mt-0.5 block">{anime.year} • Finalizado</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Bottom Sheet */}
      <ServerBottomSheet
        visible={showServerSheet}
        currentServer={currentServer}
        availableServers={availableServers}
        onClose={() => setShowServerSheet(false)}
        onSelectLanguage={async (lang) => {
          setCurrentAudio(lang);
          setIsStreamLoading(true);
          const srvs = await realAnimeService.getStreamingServers(
            anime.malId || anime.id,
            currentEpNum,
            lang,
            anime.title,
            anime.id
          );
          if (srvs.length > 0) {
            setAvailableServers(srvs);
            setCurrentServer(srvs[0]);
          }
          setIsStreamLoading(false);
        }}
        onSelectServer={(srv) => {
          setCurrentServer(srv);
          setIsPlaying(true);
        }}
      />
    </div>
  );
};
