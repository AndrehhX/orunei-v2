import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AnimeItem } from '../types/anime';
import { realAnimeService } from '../services/realAnimeService';

interface CatalogScreenProps {
  onSelectAnime: (anime: AnimeItem) => void;
}

const GENRES = [
  'Todos',
  'Doblaje Latino',
  'Action',
  'Adventure',
  'Fantasy',
  'Drama',
  'Supernatural',
  'Comedy',
  'Sci-Fi',
  'Romance',
  'Mystery',
];

export const CatalogScreen: React.FC<CatalogScreenProps> = ({ onSelectAnime }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [onlyDubbed, setOnlyDubbed] = useState(false);
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    const fetchCatalog = async () => {
      setIsLoading(true);
      try {
        const items = await realAnimeService.searchCatalog(
          searchQuery,
          selectedGenre,
          onlyDubbed
        );
        if (!isCancelled) {
          setResults(items);
        }
      } catch (err) {
        console.warn('Error fetching catalog:', err);
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(
      () => {
        fetchCatalog();
      },
      searchQuery ? 400 : 0
    );

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimer);
    };
  }, [searchQuery, selectedGenre, onlyDubbed]);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-surface">
      {/* 1. Header & Barra de Búsqueda */}
      <div className="p-4 border-b border-white/[0.07] sticky top-0 bg-surface/90 backdrop-blur-xl z-20">
        <h1 className="font-geist text-lg font-bold text-primary tracking-tight mb-2.5">
          Explorar Catálogo Oficial
        </h1>

        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título (ej. Dandadan, Frieren, Chainsaw Man)..."
            className="w-full h-11 pl-11 pr-10 rounded-xl bg-surface-container border border-white/[0.1] text-xs font-inter text-primary placeholder:text-on-surface-variant focus:outline-none focus:border-forestMint transition-all"
          />
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* Toggle Solo Doblaje Latino */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnlyDubbed(!onlyDubbed)}
              className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider flex items-center gap-1.5 transition-all ${
                onlyDubbed
                  ? 'bg-sakura text-black font-extrabold shadow-sm'
                  : 'bg-surface-container-high text-on-surface-variant border border-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">translate</span>
              SOLO DOBLAJE LATINO
            </button>
          </div>

          <span className="text-[10px] font-mono font-semibold text-on-surface-variant">
            {results.length} RESULTADOS
          </span>
        </div>

        {/* Carrusel de Géneros */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-3">
          {GENRES.map((g) => {
            const isSelected = selectedGenre === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedGenre(g)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-semibold tracking-wider whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-forestMint text-black font-bold'
                    : 'bg-surface-container-low text-on-surface-variant hover:text-primary'
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Grid de Resultados */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">
              search_off
            </span>
            <p className="font-geist text-sm font-semibold text-primary">
              No se encontraron animes
            </p>
            <p className="text-xs text-on-surface-variant mt-1 max-w-xs">
              Intenta con otro término o elimina los filtros activos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {results.map((anime) => (
              <motion.div
                key={anime.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectAnime(anime)}
                className="group cursor-pointer flex flex-col"
              >
                <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-surface-container-lowest border border-white/[0.07] group-hover:border-white/20 transition-all">
                  <img
                    src={anime.coverImage}
                    alt={anime.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-60" />

                  {anime.isDubbed && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur border border-sakura/30">
                      <span className="text-[9px] font-mono font-bold text-sakura tracking-wider">
                        DUB
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur border border-white/10">
                    <span className="material-symbols-outlined text-[10px] text-amber-400">
                      star
                    </span>
                    <span className="text-[9px] font-mono font-bold text-primary">
                      {anime.rating}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col">
                  <h3 className="font-geist text-xs font-semibold text-primary truncate group-hover:text-forestMint transition-colors">
                    {anime.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-on-surface-variant font-mono">
                    <span className="truncate">{anime.genres.slice(0, 2).join(' • ')}</span>
                    <span>•</span>
                    <span>{anime.year}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
