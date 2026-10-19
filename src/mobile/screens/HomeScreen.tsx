import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimeItem } from '../types/anime';
import { realAnimeService } from '../services/realAnimeService';

interface HomeScreenProps {
  onSelectAnime: (anime: AnimeItem) => void;
  onPlayEpisode: (anime: AnimeItem, epNumber: number) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onSelectAnime, onPlayEpisode }) => {
  const [selectedFilter, setSelectedFilter] = useState('Todo');
  const [heroAnime, setHeroAnime] = useState<AnimeItem | null>(null);
  const [trendingList, setTrendingList] = useState<AnimeItem[]>([]);
  const [latinoList, setLatinoList] = useState<AnimeItem[]>([]);
  const [continueList, setContinueList] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const filters = ['Todo', 'Tendencias', 'Doblaje Latino', 'Películas', 'Top Valorados'];

  useEffect(() => {
    let isMounted = true;
    const fetchHome = async () => {
      try {
        setIsLoading(true);
        const data = await realAnimeService.getHomeData();
        if (isMounted) {
          setHeroAnime(data.hero);
          setTrendingList(data.trending);
          setLatinoList(data.latino);
          setContinueList(data.continueWatching);
        }
      } catch (err) {
        console.error('Error fetching real home data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchHome();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayedTrending = selectedFilter === 'Doblaje Latino'
    ? trendingList.filter((a) => a.isDubbed)
    : selectedFilter === 'Películas'
    ? trendingList.filter((a) => a.format === 'Movie')
    : trendingList;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-surface">
      {/* 1. Quick Filter Pills */}
      <section className="w-full px-4 pt-3 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {filters.map((filter) => {
            const isActive = selectedFilter === filter;
            return (
              <motion.button
                key={filter}
                whileTap={{ scale: 0.94 }}
                onClick={() => setSelectedFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] font-medium tracking-tight whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-primary text-black font-bold shadow-sm'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {filter}
              </motion.button>
            );
          })}
        </div>
      </section>

      {isLoading ? (
        <div className="px-4 py-8 flex flex-col gap-6">
          <div className="w-full h-[380px] rounded-2xl bg-surface-container animate-pulse flex items-center justify-center">
            <span className="font-mono text-xs text-on-surface-variant">CARGANDO ANIMES OFICIALES...</span>
          </div>
          <div className="h-44 rounded-2xl bg-surface-container animate-pulse" />
        </div>
      ) : (
        <>
          {/* 2. Hero Spotlight Cinematográfico */}
          {heroAnime && (
            <section className="w-full px-4 mb-6">
              <div className="relative w-full rounded-2xl overflow-hidden bg-surface-container-low border border-white/[0.08] shadow-md group">
                {/* Fondo con viñeta cinematográfica */}
                <div
                  className="w-full h-[380px] bg-cover bg-center relative"
                  style={{ backgroundImage: `url('${heroAnime.bannerImage || heroAnime.coverImage}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-surface/80 via-transparent to-transparent" />
                </div>

                {/* Contenido sobre el banner */}
                <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-forestTagBg border border-forestMint/30 text-forestMint font-mono text-[10px] font-bold tracking-wider">
                      ★ TENDENCIA OFICIAL
                    </span>
                    {heroAnime.isDubbed && (
                      <span className="px-2 py-0.5 rounded bg-sakura/20 border border-sakura/30 text-sakura font-mono text-[10px] font-bold tracking-wider">
                        DOBLAJE LATINO
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-black/60 border border-white/10 text-on-surface-variant font-mono text-[10px]">
                      {heroAnime.studio} • {heroAnime.year}
                    </span>
                  </div>

                  {/* Título Oficial */}
                  <h1 className="font-geist text-2xl font-black text-primary tracking-tight leading-tight line-clamp-2">
                    {heroAnime.title}
                  </h1>

                  {/* Sinopsis */}
                  <p className="text-xs text-on-surface-variant line-clamp-2 mt-1 leading-relaxed max-w-[90%]">
                    {heroAnime.synopsis}
                  </p>

                  {/* Botones de Acción */}
                  <div className="flex items-center gap-2.5 mt-4">
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => onPlayEpisode(heroAnime, 1)}
                      className="flex-1 h-10 px-4 rounded-xl bg-primary text-on-primary font-geist font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                    >
                      <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                      Reproducir Ep. 1
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => onSelectAnime(heroAnime)}
                      className="h-10 px-4 rounded-xl bg-surface-container-high border border-white/[0.1] text-primary font-geist font-semibold text-xs flex items-center gap-1.5 hover:bg-surface-container-highest transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">info</span>
                      Ficha
                    </motion.button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 3. Continuar Viendo */}
          {continueList.length > 0 && (
            <section className="w-full px-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 rounded-full bg-forestMint" />
                  <h2 className="font-geist text-sm font-bold text-primary tracking-tight">
                    Continuar Viendo
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                  EN EMISIÓN
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {continueList.map((anime) => (
                  <motion.div
                    key={`continue-${anime.id}`}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onPlayEpisode(anime, anime.currentProgress?.episodeNumber || 1)}
                    className="flex-shrink-0 w-64 rounded-xl overflow-hidden bg-surface-container border border-white/[0.07] p-2.5 flex gap-3 cursor-pointer group hover:border-white/20 transition-all"
                  >
                    <div className="relative w-20 h-24 rounded-lg overflow-hidden bg-surface-container-lowest flex-shrink-0">
                      <img
                        src={anime.coverImage}
                        alt={anime.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-[24px]">
                          play_circle
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[9px] font-mono font-bold text-forestMint px-1 rounded bg-forestTagBg">
                            EP. {anime.currentProgress?.episodeNumber || 1}
                          </span>
                        </div>
                        <h3 className="font-geist text-xs font-bold text-primary truncate">
                          {anime.title}
                        </h3>
                        <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                          {anime.genres.slice(0, 2).join(' • ')}
                        </p>
                      </div>

                      <div className="w-full">
                        <div className="flex justify-between text-[9px] font-mono text-on-surface-variant mb-1">
                          <span>Quedan {anime.currentProgress?.remainingMinutes || 12} min</span>
                          <span>{anime.rating}★</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-forestMint rounded-full w-2/3" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Bento Grid: Tendencias de Temporada */}
          <section className="w-full px-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 rounded-full bg-secondary" />
                <h2 className="font-geist text-sm font-bold text-primary tracking-tight">
                  Tendencias de Temporada
                </h2>
              </div>
              <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                ANILIST OFICIAL
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {displayedTrending.map((anime) => (
                <motion.div
                  key={`trend-${anime.id}`}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelectAnime(anime)}
                  className="group rounded-xl overflow-hidden bg-surface-container border border-white/[0.07] hover:border-white/20 transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-container-lowest">
                    <img
                      src={anime.coverImage}
                      alt={anime.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-60" />

                    {/* Insignia DUB */}
                    {anime.isDubbed && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur border border-sakura/30">
                        <span className="text-[9px] font-mono font-bold text-sakura">
                          DUB
                        </span>
                      </div>
                    )}

                    {/* Calificación */}
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur border border-white/10 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px] text-amber-400">
                        star
                      </span>
                      <span className="text-[9px] font-mono font-bold text-primary">
                        {anime.rating}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="font-geist text-xs font-bold text-primary truncate group-hover:text-forestMint transition-colors">
                        {anime.title}
                      </h3>
                      <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                        {anime.genres.slice(0, 2).join(' • ')}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-white/[0.05]">
                      <span className="text-[9px] font-mono text-on-surface-variant">
                        {anime.episodesCount} eps
                      </span>
                      <span className="text-[9px] font-mono font-semibold text-forestMint">
                        {anime.year}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* 5. Fila: Colección Doblaje Latino */}
          {latinoList.length > 0 && (
            <section className="w-full px-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 rounded-full bg-sakura" />
                  <h2 className="font-geist text-sm font-bold text-primary tracking-tight">
                    Colección Doblaje Latino (1080p)
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-sakura uppercase tracking-wider font-bold">
                  VERIFICADOS
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                {latinoList.map((anime) => (
                  <motion.div
                    key={`latino-${anime.id}`}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => onSelectAnime(anime)}
                    className="flex-shrink-0 w-32 cursor-pointer group"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-surface-container-lowest border border-white/[0.07] group-hover:border-sakura/50 transition-all">
                      <img
                        src={anime.coverImage}
                        alt={anime.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 border border-sakura/40">
                        <span className="text-[8px] font-mono font-bold text-sakura">
                          ES-LA
                        </span>
                      </div>
                    </div>
                    <h3 className="font-geist text-xs font-semibold text-primary truncate mt-1.5 group-hover:text-sakura transition-colors">
                      {anime.title}
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-mono truncate">
                      {anime.genres[0]} • {anime.rating}★
                    </p>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
