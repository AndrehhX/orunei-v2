import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimeItem } from '../types/anime';
import { storageService } from '../services/storageService';
import { LATINO_CATALOG } from '../services/animeApi';
import { useProfile } from '../../profile/ProfileProvider';

interface FavoritesScreenProps {
  onSelectAnime: (anime: AnimeItem) => void;
  onExploreCatalog: () => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  onSelectAnime,
  onExploreCatalog,
}) => {
  const { profile, updateAnimeList } = useProfile();
  const [favorites, setFavorites] = useState<AnimeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadFavorites = async () => {
      setIsLoading(true);

      // Si el usuario tiene animes en Supabase
      const remoteList = Array.isArray(profile?.animeList) ? profile.animeList : [];
      const remoteFavs = remoteList.filter((item: any) => Boolean(item.favorite));

      if (remoteFavs.length > 0) {
        const mapped: AnimeItem[] = remoteFavs.map((item: any) => ({
          id: String(item.id || item.animeId),
          title: item.t || item.title || 'Anime Guardado',
          originalTitle: item.q || item.title || '',
          coverImage: item.img || item.coverImage || 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg',
          bannerImage: item.banner || '',
          rating: 9.0,
          year: String(item.year || '2024'),
          episodesCount: 24,
          genres: item.genres || ['Anime'],
          format: 'TV',
          isDubbed: true,
          synopsis: item.synopsis || '',
          studio: 'Estudio de Orunei',
        }));
        if (isMounted) {
          setFavorites(mapped);
          setIsLoading(false);
        }
        return;
      }

      // Fallback a almacenamiento local
      const list = await storageService.getFavorites();
      if (isMounted) {
        if (list.length === 0) {
          setFavorites(LATINO_CATALOG.slice(0, 3));
        } else {
          setFavorites(list);
        }
        setIsLoading(false);
      }
    };

    loadFavorites();
    return () => {
      isMounted = false;
    };
  }, [profile?.animeList]);

  const handleRemove = async (e: React.MouseEvent, anime: AnimeItem) => {
    e.stopPropagation();
    // Actualizar Supabase si está en la lista remota
    try {
      await updateAnimeList((prev: any[]) =>
        (prev || []).map((item) =>
          String(item.id || item.animeId) === String(anime.id)
            ? { ...item, favorite: false }
            : item
        )
      );
    } catch (_) {}

    // Y en almacenamiento local
    await storageService.toggleFavorite(anime);
    const updated = favorites.filter((f) => String(f.id) !== String(anime.id));
    setFavorites(updated);
  };

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-surface">
      {/* Cabecera de Biblioteca */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between border-b border-white/[0.07]">
        <div>
          <h1 className="font-geist text-lg font-bold text-primary tracking-tight">
            Biblioteca de Favoritos
          </h1>
          <p className="text-[10px] font-mono font-bold tracking-widest text-on-surface-variant uppercase mt-0.5">
            SINCRONIZADO CON ORUNEI CLOUD
          </p>
        </div>
        <div className="px-2.5 py-1 rounded bg-surface-container border border-white/[0.07] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-forestMint animate-pulse" />
          <span className="text-[10px] font-mono font-bold text-forestMint tracking-wider">
            {favorites.length} EN LISTA
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="w-7 h-7 border-2 border-forestMint/20 border-t-forestMint rounded-full animate-spin" />
          <p className="text-xs font-mono text-on-surface-variant tracking-wider">
            CARGANDO BIBLIOTECA...
          </p>
        </div>
      ) : favorites.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center px-6 py-20 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 border border-white/[0.07]">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant">
              bookmark_border
            </span>
          </div>
          <h2 className="font-geist text-base font-bold text-primary mb-1">
            Tu biblioteca está vacía
          </h2>
          <p className="text-xs text-on-surface-variant max-w-xs mb-6 leading-relaxed">
            Guarda series y películas desde el catálogo para tener acceso instantáneo a tus reproducciones y notificaciones.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onExploreCatalog}
            className="h-10 px-6 rounded-lg bg-primary text-on-primary font-geist font-semibold text-xs tracking-wide flex items-center gap-2 shadow-lg shadow-white/5"
          >
            <span className="material-symbols-outlined text-[18px]">explore</span>
            Explorar Catálogo
          </motion.button>
        </motion.div>
      ) : (
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3.5">
            <AnimatePresence>
              {favorites.map((anime) => (
                <motion.div
                  layout
                  key={anime.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelectAnime(anime)}
                  className="group relative cursor-pointer flex flex-col"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-surface-container-lowest border border-white/[0.07] group-hover:border-white/20 transition-all">
                    <img
                      src={anime.coverImage}
                      alt={anime.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-60" />

                    {/* Botón quitar de favoritos */}
                    <button
                      onClick={(e) => handleRemove(e, anime)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-sakura hover:bg-black/90 transition-all"
                      title="Quitar de favoritos"
                    >
                      <span className="material-symbols-outlined text-[16px]">bookmark_remove</span>
                    </button>

                    {/* Badge DUB */}
                    {anime.isDubbed && (
                      <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-sakura/30">
                        <span className="text-[9px] font-mono font-bold text-sakura tracking-wider">
                          DUB LATINO
                        </span>
                      </div>
                    )}

                    {/* Rating */}
                    {anime.rating && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-white/10">
                        <span className="material-symbols-outlined text-[11px] text-amber-400">
                          star
                        </span>
                        <span className="text-[9px] font-mono font-bold text-primary">
                          {anime.rating}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="mt-2 flex flex-col">
                    <h3 className="font-geist text-xs font-semibold text-primary truncate group-hover:text-forestMint transition-colors">
                      {anime.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-on-surface-variant font-mono truncate">
                        {(anime.genres || ['Anime']).slice(0, 2).join(' • ')}
                      </span>
                      {anime.year && (
                        <>
                          <span className="text-white/20 text-[9px]">•</span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {anime.year}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
