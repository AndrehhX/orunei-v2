import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import Hls from 'hls.js';
import { SubtitleTrack } from '../types/anime';

export interface CinemaVideoPlayerRef {
  seek: (timeSeconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

interface CinemaVideoPlayerProps {
  streamUrl: string;
  isEmbed?: boolean;
  isPlaying: boolean;
  playbackSpeed: number;
  initialTime?: number;
  seekToTime?: number | null;
  subtitles?: SubtitleTrack[];
  selectedSubId?: string;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onBuffering?: (isBuffering: boolean) => void;
  isLoading?: boolean;
  serverName?: string;
  audioLanguage?: string;
}

export const CinemaVideoPlayer = forwardRef<CinemaVideoPlayerRef, CinemaVideoPlayerProps>(({
  streamUrl,
  isEmbed = false,
  isPlaying,
  playbackSpeed,
  initialTime = 0,
  seekToTime = null,
  subtitles = [],
  selectedSubId = 'sub-es',
  onTimeUpdate,
  onEnded,
  onBuffering,
  isLoading = false,
  serverName = 'Servidor Principal',
  audioLanguage = 'sub',
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [internalBuffering, setInternalBuffering] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Exponer métodos imperativos de seek
  useImperativeHandle(ref, () => ({
    seek: (timeSeconds: number) => {
      if (videoRef.current) {
        try {
          videoRef.current.currentTime = Math.max(0, timeSeconds);
        } catch (e) {
          console.warn('[CinemaVideoPlayer] Error al buscar tiempo:', e);
        }
      }
    },
    getCurrentTime: () => videoRef.current?.currentTime || 0,
    getDuration: () => videoRef.current?.duration || 0,
  }));

  // Reaccionar a cambios en seekToTime prop
  useEffect(() => {
    if (typeof seekToTime === 'number' && videoRef.current) {
      try {
        videoRef.current.currentTime = Math.max(0, seekToTime);
      } catch (e) {
        console.warn('[CinemaVideoPlayer] Error en seekToTime:', e);
      }
    }
  }, [seekToTime]);

  // Carga de Stream HLS / MP4
  useEffect(() => {
    setHasError(false);

    if (isEmbed || !streamUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('/proxy?');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000, // 60MB
      });
      hlsRef.current = hls;

      // Desactivar subtítulos internos del m3u8 para no solapar con los WebVTT oficiales
      try {
        hls.subtitleTrack = -1;
      } catch (_) {}

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setInternalBuffering(false);
        if (initialTime > 0) video.currentTime = initialTime;
        if (isPlaying) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setHasError(true);
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = streamUrl;
      if (initialTime > 0) video.currentTime = initialTime;
      if (isPlaying) video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, isEmbed]);

  // Control de reproducción y velocidad
  useEffect(() => {
    if (!videoRef.current || isEmbed) return;
    videoRef.current.playbackRate = playbackSpeed;
    if (isPlaying) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, playbackSpeed, isEmbed]);

  // Sincronización estricta de pistas de subtítulos en español / inglés
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isEmbed) return;

    if (hlsRef.current) {
      try {
        hlsRef.current.subtitleTrack = -1;
      } catch (_) {}
    }

    if (!selectedSubId || selectedSubId === 'off') {
      if (video.textTracks) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = 'disabled';
        }
      }
      return;
    }

    const targetTrack = subtitles?.find(
      (s) => s.id === selectedSubId || s.lang === selectedSubId
    ) || subtitles?.find((s) => s.lang?.startsWith('es')) || subtitles?.[0];

    if (!targetTrack) return;

    // Sincronizar textTracks de HTML5
    const syncTracks = () => {
      if (video.textTracks && video.textTracks.length > 0) {
        for (let i = 0; i < video.textTracks.length; i++) {
          const t = video.textTracks[i];
          const isMatch =
            (t.label && t.label === targetTrack.label) ||
            (t.language && t.language === targetTrack.lang) ||
            (t.language?.startsWith('es') && targetTrack.lang?.startsWith('es'));
          t.mode = isMatch ? 'showing' : 'disabled';
        }
      }
    };

    syncTracks();
    // Reintentar tras un breve tick para asegurar que los <track> se montaron en el DOM
    const tId = setTimeout(syncTracks, 300);
    return () => clearTimeout(tId);
  }, [subtitles, selectedSubId, isEmbed]);

  const showLoadingOverlay = isLoading || !streamUrl || internalBuffering;

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      {/* 1. Indicador de Carga Cinematográfico */}
      {showLoadingOverlay && (
        <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-forestMint/20 border-t-forestMint animate-spin" />
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-forestMint text-[20px] animate-pulse">
                play_circle
              </span>
            </div>
          </div>

          <h4 className="font-geist text-sm font-bold text-primary tracking-wide">
            Conectando con Servidores HD
          </h4>
          <p className="text-[11px] font-mono text-on-surface-variant mt-1 max-w-xs">
            {audioLanguage === 'latino' ? '🇲🇽 Decodificando Pista en Español Latino' : '🇯🇵 Sintonizando Transmisión HLS'} • {serverName}
          </p>

          <div className="flex items-center gap-2 mt-4 px-3 py-1 rounded-full bg-surface-container border border-white/[0.08]">
            <span className="w-2 h-2 rounded-full bg-forestMint animate-ping" />
            <span className="text-[9px] font-mono text-forestMint font-bold tracking-widest uppercase">
              STREAMING DIRECTO 1080P
            </span>
          </div>
        </div>
      )}

      {/* 2. Reproductor IFRAME Embed */}
      {isEmbed && streamUrl ? (
        <iframe
          src={streamUrl}
          className="w-full h-full border-0 bg-black relative z-10"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          title="Reproductor de Anime"
        />
      ) : (
        /* 3. Reproductor HTML5 / HLS Nativo con Subtítulos WebVTT */
        <video
          ref={videoRef}
          crossOrigin="anonymous"
          className="w-full h-full object-contain bg-black"
          playsInline
          onWaiting={() => {
            setInternalBuffering(true);
            onBuffering?.(true);
          }}
          onPlaying={() => {
            setInternalBuffering(false);
            onBuffering?.(false);
          }}
          onCanPlay={() => setInternalBuffering(false)}
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            onTimeUpdate(v.currentTime, v.duration || 0);
          }}
          onEnded={onEnded}
          onError={() => {
            console.warn('[CinemaVideoPlayer] Error de reproducción en fuente nativa');
            setHasError(true);
          }}
        >
          {/* Inyección de pistas oficiales de subtítulos en español e inglés */}
          {subtitles.map((tr) => (
            <track
              key={tr.id || (tr.lang + tr.src)}
              data-sub-id={tr.id}
              kind="subtitles"
              label={tr.label}
              srcLang={tr.lang}
              src={tr.src}
              default={Boolean(tr.default || tr.lang?.startsWith('es'))}
            />
          ))}
        </video>
      )}
    </div>
  );
});

CinemaVideoPlayer.displayName = 'CinemaVideoPlayer';
