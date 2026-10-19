import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { storageService, WatchProgress, UserPreferences } from '../services/storageService';
import { AnimeItem } from '../types/anime';
import { useAuth } from '../../auth/AuthProvider';
import { useProfile } from '../../profile/ProfileProvider';

interface ProfileScreenProps {
  onPlayResume?: (animeId: string | number, epNumber: number) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onPlayResume }) => {
  const { user, status: authStatus, error: authError, signIn, signUp, signOut } = useAuth();
  const { profile, updateAnimeList } = useProfile();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [profileTab, setProfileTab] = useState<'animelist' | 'historial' | 'ajustes'>('animelist');
  const [history, setHistory] = useState<WatchProgress[]>([]);
  const [listCategory, setListCategory] = useState<'viendo' | 'favoritos' | 'terminados' | 'planeo'>('viendo');

  const [preferences, setPreferences] = useState<UserPreferences>({
    defaultAudio: 'sub',
    autoSkipAniSkip: true,
    autoPlayNext: true,
    preferredQuality: '1080P',
  });

  useEffect(() => {
    let isMounted = true;
    const loadLocalData = async () => {
      const h = await storageService.getHistory();
      if (isMounted) setHistory(h);
      const p = await storageService.getPreferences();
      if (isMounted) setPreferences(p);
    };

    loadLocalData();
    return () => {
      isMounted = false;
    };
  }, []);

  const updatePref = async (key: keyof UserPreferences, value: any) => {
    const updated = await storageService.updatePreferences({ [key]: value });
    setPreferences(updated);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setAuthSubmitting(true);

    try {
      if (authMode === 'login') {
        const res = await signIn({ email, password });
        if (res.error) {
          setFormError(res.error);
        } else {
          setFormSuccess('¡Sesión iniciada con éxito!');
        }
      } else {
        const res = await signUp({ email, password, name });
        if (res.error) {
          setFormError(res.error);
        } else {
          setFormSuccess('¡Cuenta creada! Sincronizando con Orunei...');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Error al conectar con Supabase.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Animes de la cuenta de Supabase
  const rawAnimeList = Array.isArray(profile?.animeList) ? profile.animeList : [];
  
  const watchingList = rawAnimeList.filter((item: any) => item.status === 'watching');
  const favoritesList = rawAnimeList.filter((item: any) => Boolean(item.favorite));
  const completedList = rawAnimeList.filter((item: any) => item.status === 'completed');
  const plannedList = rawAnimeList.filter((item: any) => item.status === 'planned');

  const getFilteredAnimeList = () => {
    switch (listCategory) {
      case 'favoritos':
        return favoritesList;
      case 'terminados':
        return completedList;
      case 'planeo':
        return plannedList;
      case 'viendo':
      default:
        return watchingList;
    }
  };

  const activeCategoryList = getFilteredAnimeList();

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-24 bg-surface text-on-surface">
      {/* 1. Banner Cinematográfico Oficial de Perfil */}
      <div className="relative w-full h-44 overflow-hidden bg-surface-container-lowest">
        <img
          src={profile?.banner || 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-ivXNJ23SM1xB.jpg'}
          alt="Banner de Perfil"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${user ? 'bg-forestMint animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-mono text-[9px] font-bold text-primary tracking-widest uppercase">
            {user ? 'SUPABASE CONECTADO' : 'MODO INVITADO'}
          </span>
        </div>
      </div>

      {/* 2. Tarjeta Principal de Usuario */}
      <div className="px-4 -mt-14 relative z-10 space-y-4">
        <div className="flex items-end justify-between">
          {/* Avatar con anillo de resplandor */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-forestMint shadow-[0_0_20px_rgba(13,242,134,0.3)] bg-surface-container-high">
              <img
                src={profile?.avatar || 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg'}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded bg-black/90 border border-white/20 text-[8px] font-mono font-extrabold text-forestMint">
              {user ? 'NIVEL 12' : 'INVITADO'}
            </span>
          </div>

          {/* Badges de Estado */}
          <div className="flex items-center gap-2 mb-1">
            {user ? (
              <>
                <span className="px-2.5 py-1 rounded-lg bg-forestTagBg border border-forestMint/30 text-[10px] font-mono font-bold text-forestMint tracking-wider">
                  ★ ORUNEI CLOUD
                </span>
                <button
                  onClick={() => signOut()}
                  className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-mono font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  SALIR
                </button>
              </>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300 tracking-wider">
                SIN INICIAR SESIÓN
              </span>
            )}
          </div>
        </div>

        {/* Nombre y Biografía */}
        <div>
          <h1 className="font-geist text-xl font-black text-primary tracking-tight">
            {profile?.displayName || user?.name || user?.email?.split('@')[0] || 'Invitado de Orunei'}
          </h1>
          <p className="font-mono text-[11px] text-on-surface-variant mt-0.5">
            {user?.email || 'Inicia sesión con tu cuenta de Orunei Web para sincronizar tus animes'}
          </p>
          {profile?.bio && (
            <p className="text-xs text-on-surface-variant font-inter leading-relaxed mt-2 max-w-sm">
              {profile.bio}
            </p>
          )}
        </div>

        {/* FORMULARIO DE INICIO DE SESIÓN / REGISTRO SI NO ESTÁ AUTENTICADO */}
        {!user && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-surface-container border border-white/[0.08] shadow-lg space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-white/[0.07] pb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-forestMint text-lg">sync_saved_locally</span>
                <span className="font-geist text-xs font-bold text-primary uppercase tracking-wide">
                  Sincronizar con Orunei Web
                </span>
              </div>
              <div className="flex rounded-lg bg-surface-container-high p-0.5">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setFormError(''); }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                    authMode === 'login' ? 'bg-forestMint text-black shadow' : 'text-on-surface-variant'
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setFormError(''); }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
                    authMode === 'register' ? 'bg-forestMint text-black shadow' : 'text-on-surface-variant'
                  }`}
                >
                  Registrarse
                </button>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Usa las mismas credenciales de tu cuenta de Orunei Web para tener tus animes vistos, favoritos e historial en tu teléfono.
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-2.5">
              {authMode === 'register' && (
                <div>
                  <label className="text-[10px] font-mono font-bold text-on-surface-variant uppercase block mb-1">
                    Nombre o Nickname
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tu nombre en Orunei"
                    className="w-full h-9 px-3 rounded-xl bg-surface-container-highest border border-white/10 text-xs text-primary placeholder:text-white/20 focus:border-forestMint focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-mono font-bold text-on-surface-variant uppercase block mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@orunei.com"
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-highest border border-white/10 text-xs text-primary placeholder:text-white/20 focus:border-forestMint focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-on-surface-variant uppercase block mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 rounded-xl bg-surface-container-highest border border-white/10 text-xs text-primary placeholder:text-white/20 focus:border-forestMint focus:outline-none"
                />
              </div>

              {formError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="p-2.5 rounded-xl bg-forestMint/10 border border-forestMint/20 text-forestMint text-[11px]">
                  {formSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full h-10 rounded-xl bg-forestMint text-black font-geist font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-forestMint/10 active:scale-98 transition-all disabled:opacity-50"
              >
                {authSubmitting ? (
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      {authMode === 'login' ? 'login' : 'person_add'}
                    </span>
                    {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Mi Cuenta'}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* 3. Métricas y Estadísticas de Perfil */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center">
            <span className="font-geist text-base font-bold text-primary">
              {rawAnimeList.length}
            </span>
            <span className="text-[8px] font-mono font-bold text-on-surface-variant uppercase mt-0.5">
              BIBLIOTECA
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center">
            <span className="font-geist text-base font-bold text-forestMint">
              {watchingList.length}
            </span>
            <span className="text-[8px] font-mono font-bold text-on-surface-variant uppercase mt-0.5">
              VIENDO
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center">
            <span className="font-geist text-base font-bold text-sakura">
              {favoritesList.length}
            </span>
            <span className="text-[8px] font-mono font-bold text-on-surface-variant uppercase mt-0.5">
              FAVORITOS
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-container border border-white/[0.07] flex flex-col items-center justify-center">
            <span className="font-geist text-base font-bold text-amber-400">
              {completedList.length}
            </span>
            <span className="text-[8px] font-mono font-bold text-on-surface-variant uppercase mt-0.5">
              VISTOS
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
            ANIMELIST ({rawAnimeList.length})
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
              transition={{ duration: 0.15 }}
              className="space-y-3 pt-1"
            >
              {/* Categorías de listas */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {(['viendo', 'favoritos', 'terminados', 'planeo'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setListCategory(cat)}
                    className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition-all ${
                      listCategory === cat
                        ? 'bg-forestMint text-black shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:text-primary'
                    }`}
                  >
                    {cat === 'viendo'
                      ? `Viendo (${watchingList.length})`
                      : cat === 'favoritos'
                      ? `Favoritos (${favoritesList.length})`
                      : cat === 'terminados'
                      ? `Terminados (${completedList.length})`
                      : `Planeo ver (${plannedList.length})`}
                  </button>
                ))}
              </div>

              {/* Grid de animes en la lista */}
              {activeCategoryList.length === 0 ? (
                <div className="p-8 rounded-2xl bg-surface-container border border-white/[0.07] text-center space-y-2">
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant">
                    video_library
                  </span>
                  <h4 className="font-geist text-xs font-bold text-primary">
                    No hay animes en esta sección
                  </h4>
                  <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto">
                    {user
                      ? 'Los animes que marques o reproduzcas en Orunei Web o en la app se sincronizan aquí automáticamente.'
                      : 'Inicia sesión con tu cuenta de Orunei Web arriba para sincronizar tu lista.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {activeCategoryList.map((entry: any) => (
                    <motion.div
                      key={`profile-entry-${entry.id || entry.animeId}`}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onPlayResume?.(entry.id || entry.animeId, 1)}
                      className="p-2 rounded-xl bg-surface-container border border-white/[0.07] hover:border-white/20 transition-all cursor-pointer flex flex-col group"
                    >
                      <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden bg-black mb-2">
                        <img
                          src={entry.img || entry.coverImage || 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx154587-qQTzQnEJJ3oB.jpg'}
                          alt={entry.t || entry.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {entry.status && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[8px] font-bold text-forestMint">
                            {entry.s || entry.status}
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-white text-[24px]">
                            play_circle
                          </span>
                        </div>
                      </div>

                      <h4 className="font-geist text-xs font-bold text-primary truncate">
                        {entry.t || entry.title || 'Anime de Orunei'}
                      </h4>
                      <span className="text-[10px] font-mono text-on-surface-variant block mt-0.5">
                        {entry.year || '2024'} • {entry.genres?.[0] || 'Anime'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Pestaña: Historial de Reproducción */}
          {profileTab === 'historial' && (
            <motion.div
              key="tab-historial"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
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
              transition={{ duration: 0.15 }}
              className="space-y-3 pt-1"
            >
              <div className="rounded-2xl bg-surface-container border border-white/[0.07] divide-y divide-white/[0.05]">
                {/* Priorizar Audio Latino */}
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <span className="font-geist text-xs font-semibold text-primary block">
                      Audio Predeterminado
                    </span>
                    <span className="text-[10px] text-on-surface-variant block mt-0.5">
                      Por defecto inicia en Japonés Subtitulado ('sub'). Activa esto si prefieres Latino por defecto.
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
                  ORUNEI CINEMA ENGINE • SUPABASE SYNCED • 120HZ
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
