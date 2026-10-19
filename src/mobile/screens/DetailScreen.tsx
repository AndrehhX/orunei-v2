import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimeItem, EpisodeItem } from '../types/anime';
import { realAnimeService } from '../services/realAnimeService';

interface DetailScreenProps {
  anime: AnimeItem;
  onBack: () => void;
  onPlayEpisode: (anime: AnimeItem, epNumber: number) => void;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({ anime, onBack, onPlayEpisode }) => {
  const [selectedAudio, setSelectedAudio] = useState<'latino' | 'sub'>(anime.isDubbed ? 'latino' : 'sub');
  const [currentAnime, setCurrentAnime] = useState<AnimeItem>(anime);
  const [episodes, setEpisodes] = useState<EpisodeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      try {
        setIsLoading(true);
        const data = await realAnimeService.getAnimeDetail(anime.id);
        if (isMounted) {
          setCurrentAnime(data.anime);
          setEpisodes(data.episodes);
        }
      } catch (err) {
        console.warn('Error loading detail:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [anime.id]);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-surface">
      {/* Top Bar Flotante */}
      <header className="sticky top-0 w-full z-30 bg-surface/80 backdrop-blur-xl border-b border-white/[0.07] px-4 h-14 flex items-center justify-between">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </motion.button>
        <h1 className="font-geist text-sm font-bold text-primary tracking-wide truncate max-w-[200px]">
          {currentAnime.title}
        </h1>
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">bookmark</span>
          </motion.button>
        </div>
      </header>

      {/* Hero Visual Oficial */}
      <div
        className="relative w-full h-[320px] bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url('${currentAnime.bannerImage || currentAnime.coverImage}')` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        <div className="absolute top-4 left-4 flex items-center gap-2 px-2.5 py-1 rounded bg-black/70 backdrop-blur border border-white/10">
          <span className="w-1.5 h-1.5 rounded-full bg-forestMint animate-pulse" />
          <span className="font-mono text-[9px] font-bold text-primary tracking-wider uppercase">
            ORUNEI CINEMA MASTER
          </span>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="px-4 -mt-16 relative z-10 space-y-4">
        <div>
          <span className="font-mono text-[10px] font-extrabold text-forestMint tracking-widest uppercase block">
            {currentAnime.studio} • {currentAnime.year}
          </span>
          <h2 className="font-geist text-2xl font-black text-primary tracking-tight mt-1 leading-tight">
            {currentAnime.title}
          </h2>
          <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">
            {currentAnime.originalTitle}
          </p>
        </div>

        {/* Metadatos Rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container border border-white/[0.07]">
            <span className="material-symbols-outlined text-[14px] text-amber-400">star</span>
            <span className="font-mono text-xs font-bold text-primary">{currentAnime.rating}</span>
          </div>

          <span className="px-2 py-1 rounded bg-surface-container border border-white/[0.07] font-mono text-xs text-on-surface">
            {episodes.length || currentAnime.episodesCount} Episodios
          </span>

          {currentAnime.isDubbed && (
            <span className="px-2 py-1 rounded bg-sakura/20 border border-sakura/30 font-mono text-xs font-bold text-sakura">
              🇲🇽 Doblaje Latino (1080p)
            </span>
          )}
        </div>

        {/* Géneros */}
        <div className="flex gap-1.5 flex-wrap">
          {currentAnime.genres.map((g) => (
            <span
              key={g}
              className="px-2.5 py-1 rounded-md bg-surface-container-high text-[10px] font-mono font-medium text-on-surface-variant"
            >
              {g}
            </span>
          ))}
        </div>

        {/* Botón Principal: Reproducir Ep. 1 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onPlayEpisode(currentAnime, 1)}
          className="w-full h-12 rounded-xl bg-primary text-black font-geist font-bold text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-white/5"
        >
          <span className="material-symbols-outlined text-[24px]">play_arrow</span>
          Reproducir Episodio 1
        </motion.button>

        {/* Sinopsis Oficial */}
        <div className="p-4 rounded-xl bg-surface-container border border-white/[0.07]">
          <h3 className="font-geist text-xs font-bold text-primary uppercase tracking-wider mb-1.5">
            Sinopsis
          </h3>
          <p className="text-xs text-on-surface-variant leading-relaxed font-inter">
            {currentAnime.synopsis}
          </p>
        </div>

        {/* Selector de Pista de Audio de Alta Legibilidad */}
        <div className="p-1.5 rounded-xl bg-surface-container border border-white/10 flex gap-2">
          {currentAnime.isDubbed && (
            <button
              onClick={() => setSelectedAudio('latino')}
              className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                selectedAudio === 'latino'
                  ? 'bg-sakura/20 text-white border border-sakura shadow-[0_0_15px_rgba(255,77,141,0.3)]'
                  : 'text-white/60 hover:text-white border border-transparent'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sakura shadow-[0_0_8px_#ff4d8d]" />
              <span>🇲🇽 Español Latino</span>
            </button>
          )}

          <button
            onClick={() => setSelectedAudio('sub')}
            className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
              selectedAudio === 'sub'
                ? 'bg-forestMint/20 text-white border border-forestMint shadow-[0_0_15px_rgba(13,242,134,0.3)]'
                : 'text-white/60 hover:text-white border border-transparent'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-forestMint shadow-[0_0_8px_#0df286]" />
            <span>🇯🇵 Japonés (Sub)</span>
          </button>
        </div>

        {/* Lista de Episodios Oficiales */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-geist text-sm font-bold text-primary">
              Episodios de la Temporada
            </h3>
            <span className="font-mono text-[10px] text-on-surface-variant uppercase">
              {episodes.length} disponibles
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl bg-surface-container animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {episodes.map((ep) => (
                <motion.div
                  key={ep.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onPlayEpisode(currentAnime, ep.number)}
                  className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] hover:border-white/20 transition-all flex gap-3 cursor-pointer group"
                >
                  <div className="relative w-28 h-18 rounded-lg overflow-hidden bg-surface-container-lowest flex-shrink-0">
                    <img
                      src={ep.thumbnail}
                      alt={ep.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-white text-[22px]">
                        play_circle
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[10px] font-bold text-forestMint">
                          EP. {ep.number}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono">• {ep.durationLabel}</span>
                      </div>
                      <h4 className="font-geist text-xs font-semibold text-primary truncate">
                        {ep.title}
                      </h4>
                    </div>

                    <p className="text-[10px] text-on-surface-variant line-clamp-1 font-inter">
                      {ep.synopsis}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
