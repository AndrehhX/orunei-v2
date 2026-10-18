import { useMemo } from 'react'
import { Award, BookOpen, ChevronRight, Heart, Play, Quote, Sparkles, Star } from 'lucide-react'
import Poster from './Poster'

export default function ProfileShowcase({
  profile,
  library = [],
  isOwner = false,
  onEdit,
  onSelectAnime,
}) {
  const profileLibrary = library.length ? library : profile.animeList || []

  // Anime destacado: especificado en profile.featuredAnimeId, o favorito, o primero de la lista
  const featured = useMemo(() => {
    if (profile?.featuredAnimeId) {
      const match = profileLibrary.find((item) => item.q === profile.featuredAnimeId || item.id === profile.featuredAnimeId)
      if (match) return match
    }
    return profileLibrary.find((item) => item.favorite || (typeof item.s === 'string' && item.s.startsWith('Favorito'))) || profileLibrary[0]
  }, [profile?.featuredAnimeId, profileLibrary])

  // Mini vitrina de favoritos adicionales (hasta 4)
  const favoriteSlots = useMemo(() => {
    return profileLibrary
      .filter((item) => item.id !== featured?.id)
      .slice(0, 4)
  }, [profileLibrary, featured?.id])

  if (!featured && !profileLibrary.length) {
    return (
      <div className="card col-span-full border-dashed p-6 text-center">
        <Sparkles className="mx-auto text-brand opacity-60" size={26} />
        <p className="mt-2 text-sm font-bold">Vitrina de Anime no configurada</p>
        <p className="mt-1 text-xs text-slate-500">
          {isOwner
            ? 'Añade animes a tu AnimeList y elige tu obra maestra en el editor de perfil.'
            : 'Este usuario aún no ha configurado su vitrina.'}
        </p>
        {isOwner && onEdit && (
          <button
            onClick={onEdit}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand/10 px-3.5 py-1.5 text-xs font-bold text-brand hover:bg-brand/20 transition"
          >
            Configurar vitrina
          </button>
        )}
      </div>
    )
  }

  const quote = profile?.featuredQuote || 'Una obra inolvidable que dejó huella en mi camino de anime.'
  const review = profile?.featuredReview

  return (
    <section className="card overflow-hidden p-0 border border-slate-200/80 dark:border-white/10 shadow-lg bg-gradient-to-b from-white/90 to-slate-50/90 dark:from-[#171725] dark:to-[#11111d] transition-all">
      {/* Header estilo Steam Showcase */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 dark:border-white/10 px-5 py-3.5 bg-slate-100/50 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 shadow-sm">
            <Award size={16} />
          </span>
          <div>
            <h2 className="text-xs font-black tracking-wider uppercase text-slate-700 dark:text-slate-200">
              Vitrina de Obra Maestra
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Historia insigne elegida por el usuario
            </p>
          </div>
        </div>
        {isOwner && onEdit && (
          <button
            onClick={onEdit}
            className="text-[11px] font-bold text-brand hover:underline inline-flex items-center gap-1"
          >
            Editar vitrina <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Tarjeta Panorámica Principal */}
      {featured && (
        <div className="relative overflow-hidden p-5 sm:p-6">
          {/* Banner difuminado de fondo para atmósfera inmersiva */}
          {featured.banner && (
            <div className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-25 overflow-hidden">
              <img
                src={featured.banner}
                alt=""
                className="h-full w-full object-cover blur-2xl scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-[#11111d] via-transparent to-transparent" />
            </div>
          )}

          <div className="relative z-10 flex flex-col sm:flex-row gap-5 items-start">
            {/* Poster con marco y resplandor */}
            <div
              onClick={() => onSelectAnime?.(featured)}
              className="group relative cursor-pointer shrink-0 mx-auto sm:mx-0"
            >
              <Poster
                {...featured}
                title={featured.t}
                className="h-44 w-32 sm:h-52 sm:w-36 rounded-2xl shadow-xl ring-2 ring-brand/30 transition-transform duration-300 group-hover:scale-105 group-hover:ring-brand/60"
              />
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100 grid place-items-center">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand text-white shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                  <Play size={18} className="translate-x-0.5 fill-white" />
                </span>
              </div>
            </div>

            {/* Metadatos y Crítica */}
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                    <Star size={11} className="fill-amber-400 text-amber-500" /> 10 / 10 Masterpiece
                  </span>
                  {featured.year && (
                    <span className="rounded-full bg-slate-200/70 dark:bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      {featured.year}
                    </span>
                  )}
                  {featured.favorite && (
                    <span className="rounded-full bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 text-[10px] font-bold text-pink-500 inline-flex items-center gap-1">
                      <Heart size={10} className="fill-pink-500" /> Favorito
                    </span>
                  )}
                </div>

                <h3
                  onClick={() => onSelectAnime?.(featured)}
                  className="cursor-pointer text-xl sm:text-2xl font-black text-slate-900 dark:text-white hover:text-brand transition line-clamp-2"
                  title={featured.t}
                >
                  {featured.t}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Estado: <span className="font-semibold text-slate-700 dark:text-slate-200">{featured.s || 'Completado'}</span>
                </p>
              </div>

              {/* Frase / Cita de Honor */}
              <div className="relative rounded-2xl bg-white/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 p-3.5 shadow-sm">
                <Quote size={20} className="absolute -top-2.5 -left-2 text-brand/40" />
                <p className="text-xs sm:text-sm italic font-medium leading-relaxed text-slate-700 dark:text-slate-200 pl-2">
                  “{quote}”
                </p>
              </div>

              {/* Reseña personalizada si existe */}
              {review && (
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-brand/5 border border-brand/15 rounded-xl p-3">
                  <p className="font-bold text-[11px] text-brand uppercase tracking-wider mb-1">
                    Veredicto personal
                  </p>
                  <p className="line-clamp-3">{review}</p>
                </div>
              )}

              {/* Botón de Reproducción / Ficha rápida */}
              {onSelectAnime && (
                <div className="pt-1">
                  <button
                    onClick={() => onSelectAnime(featured)}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand/25 transition hover:brightness-110 active:scale-95"
                  >
                    <Play size={13} className="fill-white" /> Reproducir obra
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini Vitrina de Colección de Obras Favoritas (estilo Steam Item Showcase) */}
      {favoriteSlots.length > 0 && (
        <div className="border-t border-slate-200/70 dark:border-white/10 px-5 py-4 bg-slate-50/50 dark:bg-white/[0.01]">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2.5">
            Colección destacada ({favoriteSlots.length})
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {favoriteSlots.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectAnime?.(item)}
                className="group flex items-center gap-2.5 p-2 rounded-xl bg-white/60 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 hover:border-brand/40 transition cursor-pointer"
              >
                <Poster
                  {...item}
                  title={item.t}
                  className="h-12 w-9 rounded-lg shrink-0 object-cover shadow-xs group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200 group-hover:text-brand transition" title={item.t}>
                    {item.t}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {item.s}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
