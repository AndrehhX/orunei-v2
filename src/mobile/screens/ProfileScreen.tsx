import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { storageService, WatchProgress, UserPreferences } from '../services/storageService';
import { AnimeItem } from '../types/anime';
import { realAnimeService } from '../services/realAnimeService';

interface ProfileScreenProps {
  onPlayResume?: (animeId: string | number, epNumber: number) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onPlayResume }) => {
  const [profileTab, setProfileTab] = useState<'animelist' | 'historial' | 'ajustes'>('animelist');
  const [history, setHistory] = useState<WatchProgress[]>([]);
  const [favorites, setFavorites] = useState<AnimeItem[]>([]);
  const [libraryList, setLibraryList] = useState<AnimeItem[]>([]);
  const [listCategory, setListCategory] = useState<'viendo' | 'favoritos' | 'terminados'>('viendo');

  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultAudio: 'latino',
    autoSkipAniSkip: true,
    autoPlayNext: true,
    preferredQuality: '1080P',
  });

  useEffect(() => {
    let isMounted = true;
    const loadProfileData = async () => {
      const h = await storageService.getHistory();
      if (isMounted) setHistory(h);
      const f = await storageService.getFavorites();
      if (isMounted) setFavorites(f);
      const p = await storageService.getPreferences();
      if (isMounted) setPreferences(p);

      // Cargar animes de la biblioteca desde trending
      try {
        const homeData = await realAnimeService.getHomeData();
        if (isMounted && homeData?.trending?.length > 0) {
          setLibraryList(homeData.trending);
        }
      } catch (_) {}
    };

    loadProfileData();
    return () => {
      isMounted = false;
    };
  }, []);

  const updatePref = async (key: keyof UserPreferences, value: any) => {
    const updated = await storageService.updatePreferences({ [key]: value });
    setPreferences(updated);
  };

  const displayedList =
    listCategory === 'favoritos'
      ? favorites.length > 0
        ? favorites
        : libraryList.slice(0, 4)
      : listCategory === 'terminados'
      ? libraryList.slice(2, 6)
      : libraryList.slice(0, 4);

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-surface text-on-surface">
      {/* 1. Banner Cinematográfico Oficial de Perfil */}
      <div className="relative w-full h-44 overflow-hidden bg-surface-container-lowest">
        <img
          src="https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg"
          alt="Banner de Perfil"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-forestMint animate-pulse" />
          <span className="font-mono text-[9px] font-bold text-forestMint tracking-widest uppercase">
            SUPABASE SYNC
          </span>
        </div>
      </div>

      {/* 2. Tarjeta Principal de Usuario (Estilo Orunei Web + Stitch) */}
      <div className="px-4 -mt-14 relative z-10 space-y-4">
        <div className="flex items-end justify-between">
          {/* Avatar con anillo de resplandor */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-forestMint shadow-[0_0_20px_rgba(13,242,134,0.3)] bg-surface-container-high">
              <img
                src="https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg"
                alt="Avatar Andreh"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-black/90 border border-white/20 text-[8px] font-mono font-extrabold text-forestMint">
              LV. 24
            </span>
          </div>

          {/* Badges de Estado */}
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-1 rounded-lg bg-forestTagBg border border-forestMint/30 text-[10px] font-mono font-bold text-forestMint tracking-wider">
              ★ ORUNEI PRO
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-sakura/20 border border-sakura/30 text-[10px] font-mono font-bold text-sakura tracking-wider">
              FUNDADOR
            </span>
          </div>
        </div>

        {/* Nombre y Biografía */}
        <div>
          <h1 className="font-geist text-xl font-black text-primary tracking-tight">
            Andreh
          </h1>
          <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">
            @andrehh • Coleccionista de Doblajes Latinos y Cinema 1080p
          </p>
          <p className="text-xs text-on-surface-variant font-inter leading-relaxed mt-2 max-w-sm">
            Disfrutando de la temporada con decodificación directa a 120Hz sin anuncios.
          </p>
        </div>

        {/* 3. Métricas y Estadísticas de Perfil */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center">
            <span className="font-geist text-base font-bold text-primary">38</span>
            <span className="text-[8px] font-mono font-bold text-on-surface-variant uppercase mt-0.5">
              ANIMES
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center">
            <span className="font-geist text-base font-bold text-forestMint">94h</span>
            <span className="text-[8px] font-mono font-bold text-on-surface-variant uppercase mt-0.5">
              TIEMPO
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center">
            <span className="font-geist text-base font-bold text-primary">18</span>
            <span className="text-[8px] font-mono font-bold text-on-surface-variant uppercase mt-0.5">
              VISTOS
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center">
            <span className="font-geist text-base font-bold text-sakura">1080p</span>
            <span className="text-[8px] font-mono font-bold text-on-surface-variant uppercase mt-0.5">
              CALIDAD
            </span>
          </div>
        </div>

        {/* 4. Selector de Pestañas de Perfil */}
        <div className="flex border-b border-white/[0.08] pt-2 gap-4">
          <button
            onClick={() => setProfileTab('animelist')}
            className={`pb-2.5 text-xs font-mono font-bold tracking-wider relative transition-colors ${
              profileTab === 'animelist' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            ANIMELIST ({displayedList.length})
            {profileTab === 'animelist' && (
              <motion.div layoutId="profileTabIndicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-forestMint" />
            )}
          </button>

          <button
            onClick={() => setProfileTab('historial')}
            className={`pb-2.5 text-xs font-mono font-bold tracking-wider relative transition-colors ${
              profileTab === 'historial' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            HISTORIAL ({history.length})
            {profileTab === 'historial' && (
              <motion.div layoutId="profileTabIndicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-forestMint" />
            )}
          </button>

          <button
            onClick={() => setProfileTab('ajustes')}
            className={`pb-2.5 text-xs font-mono font-bold tracking-wider relative transition-colors ${
              profileTab === 'ajustes' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            AJUSTES
            {profileTab === 'ajustes' && (
              <motion.div layoutId="profileTabIndicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-forestMint" />
            )}
          </button>
        </div>

        {/* 5. Contenido de la Pestaña Activa */}
        <AnimatePresence mode="wait">
          {/* Pestaña: AnimeList */}
          {profileTab === 'animelist' && (
            <motion.div
              key="tab-animelist"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3 pt-1"
            >
              {/* Categorías de listas */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {(['viendo', 'favoritos', 'terminados'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setListCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition-all ${
                      listCategory === cat
                        ? 'bg-forestMint text-black shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {cat === 'viendo' ? 'Viendo Ahora' : cat === 'favoritos' ? 'Favoritos' : 'Terminados'}
                  </button>
                ))}
              </div>

              {/* Grid de animes en la lista */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {displayedList.map((anime) => (
                  <motion.div
                    key={`profile-anime-${anime.id}`}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onPlayResume?.(anime.id, 1)}
                    className="p-2 rounded-xl bg-surface-container border border-white/[0.07] hover:border-white/20 transition-all cursor-pointer flex flex-col group"
                  >
                    <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-black mb-2">
                      <img
                        src={anime.coverImage}
                        alt={anime.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {anime.isDubbed && (
                        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[8px] font-bold text-sakura">
                          DUB
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-[24px]">
                          play_circle
                        </span>
                      </div>
                    </div>

                    <h4 className="font-geist text-xs font-bold text-primary truncate">
                      {anime.title}
                    </h4>
                    <span className="text-[10px] font-mono text-on-surface-variant block mt-0.5">
                      {anime.genres[0]} • {anime.rating}★
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Pestaña: Historial de Reproducción */}
          {profileTab === 'historial' && (
            <motion.div
              key="tab-historial"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-2 pt-1"
            >
              {history.length === 0 ? (
                <div className="p-6 rounded-xl bg-surface-container border border-white/[0.07] text-center">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant mb-1">
                    history
                  </span>
                  <p className="font-geist text-xs font-semibold text-primary">
                    Sin historial registrado
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Los animes que reproduzcas aparecerán aquí automáticamente.
                  </p>
                </div>
              ) : (
                history.map((item, idx) => (
                  <motion.div
                    key={`${item.animeId}-${item.episodeNumber}-${idx}`}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onPlayResume?.(item.animeId, item.episodeNumber)}
                    className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] hover:border-white/20 transition-all flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="relative w-18 h-12 rounded-lg overflow-hidden bg-black flex-shrink-0">
                      <img
                        src={item.coverImage}
                        alt={item.animeTitle}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          play_arrow
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-geist text-xs font-semibold text-primary truncate">
                        {item.animeTitle}
                      </h4>
                      <p className="text-[10px] text-on-surface-variant truncate mt-0.5">
                        Episodio {item.episodeNumber} • {item.episodeTitle}
                      </p>
                      <div className="w-full h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-forestMint rounded-full"
                          style={{
                            width: `${Math.min((item.currentTime / (item.duration || 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <span className="material-symbols-outlined text-[20px] text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0">
                      play_circle
                    </span>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* Pestaña: Ajustes y Preferencias */}
          {profileTab === 'ajustes' && (
            <motion.div
              key="tab-ajustes"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-3 pt-1"
            >
              <div className="rounded-2xl bg-surface-container border border-white/[0.07] divide-y divide-white/[0.05]">
                {/* Priorizar Audio Latino */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="font-geist text-xs font-semibold text-primary block">
                      Priorizar Audio Latino
                    </span>
                    <span className="text-[10px] text-on-surface-variant block mt-0.5">
                      Seleccionar doblaje latino automáticamente si está disponible
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      updatePref('defaultAudio', preferences.defaultAudio === 'latino' ? 'sub' : 'latino')
                    }
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      preferences.defaultAudio === 'latino' ? 'bg-forestMint' : 'bg-surface-container-high'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        preferences.defaultAudio === 'latino' ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* AutoSkip AniSkip */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-geist text-xs font-semibold text-primary">
                        Auto-Skip Opening y Ending
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-sakura/20 text-[9px] font-mono font-bold text-sakura border border-sakura/30">
                        AniSkip
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant block mt-0.5">
                      Omitir secuencias de créditos (+85s)
                    </span>
                  </div>
                  <button
                    onClick={() => updatePref('autoSkipAniSkip', !preferences.autoSkipAniSkip)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      preferences.autoSkipAniSkip ? 'bg-forestMint' : 'bg-surface-container-high'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        preferences.autoSkipAniSkip ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Reproducción Continua */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="font-geist text-xs font-semibold text-primary block">
                      Reproducción Continua
                    </span>
                    <span className="text-[10px] text-on-surface-variant block mt-0.5">
                      Cargar automáticamente el siguiente episodio
                    </span>
                  </div>
                  <button
                    onClick={() => updatePref('autoPlayNext', !preferences.autoPlayNext)}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      preferences.autoPlayNext ? 'bg-forestMint' : 'bg-surface-container-high'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        preferences.autoPlayNext ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Info de Motor */}
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-white/[0.06] text-center">
                <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest block">
                  ORUNEI CINEMA ENGINE • V2.1.0 HYBRID
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
