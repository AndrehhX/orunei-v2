import { useEffect, useState, useMemo } from 'react'
import { ChevronRight, Star, MoreHorizontal, X, Play } from 'lucide-react'
import LikeBtn from './LikeBtn'
import { useRec } from '../rec/rec'
import Poster from './Poster'
import { useNews, NewsLink } from '../news'
import { useProfile } from '../profile/ProfileProvider'
import { enrichContinueWatchingItem, sortContinueWatchingList, filterContinueWatchingList } from '../playback/continueWatching.js'
import { isMalIdDubbedInSpanish } from '../playback/dubSeasonManager.js'

export const Title = ({ children, onClick }) => (
  <div className="mb-3.5 flex items-center justify-between">
    <h3
      onClick={onClick}
      className={`group/title flex items-center gap-1.5 text-base sm:text-[17px] font-extrabold tracking-tight transition-colors ${
        onClick ? 'cursor-pointer hover:text-brand' : ''
      }`}
    >
      <span>{children}</span>
      {onClick && (
        <ChevronRight size={16} className="text-slate-400 group-hover/title:text-brand group-hover/title:translate-x-0.5 transition-all" />
      )}
    </h3>
  </div>
)
const Dots = ({ onClick }) => (
  <button
    onClick={(event) => { event.stopPropagation(); onClick?.() }}
    aria-label="Abrir biblioteca"
    className="absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm border border-white/10 hover:bg-black/80"
  >
    <MoreHorizontal size={14} />
  </button>
)

const Empty = ({ q, message }) => <div className="col-span-full rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02] backdrop-blur-sm px-6 py-8 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400 shadow-sm">{message || `Sin resultados para “${q}”`}</div>
const ok = (t = '', q) => String(t).toLowerCase().includes((q || '').toLowerCase())
export function Library({ query, onMore, onOpenAnime }) {
  const { profile } = useProfile()
  const source = Array.isArray(profile.animeList) ? profile.animeList : []

  // Filtrar estrictamente solo obras en curso (excluyendo las marcadas como vistas o con todos los caps completados)
  const list = useMemo(() => {
    const inProgress = filterContinueWatchingList(source)
    const sortedCandidates = sortContinueWatchingList(inProgress)
    return sortedCandidates.filter((a) => ok(a.t, query)).slice(0, 6)
  }, [source, query])

  const emptyMessage = query
    ? undefined
    : source.length > 0
      ? 'No tienes episodios pendientes en reproducción. ¡Explora el catálogo o retoma una serie!'
      : 'Tu biblioteca está vacía. Agrega obras a tu AnimeList para verlas aquí.'

  return (
    <section>
      <Title onClick={onMore}>Donde lo dejaste</Title>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:grid-cols-6">
        {!list.length && <Empty q={query} message={emptyMessage} />}
        {list.map((raw) => {
          const a = enrichContinueWatchingItem(raw)
          const totalEps = Number(a.episodes) || null

          return (
            <article
              key={a.id || a.t}
              onClick={() => onOpenAnime?.(a)}
              className="group card cursor-pointer overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl hover:border-brand/40"
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 320px' }}
            >
              <Poster {...a} title={a.t} className="aspect-[3/3.6] relative">
                <Dots onClick={onMore} />
                {/* Botón flotante Play al hacer hover */}
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenAnime?.(a, a.nextEpisode)
                  }}
                  className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  title={`Reproducir Ep. ${a.nextEpisode}`}
                >
                  <span className="p-3 rounded-full bg-brand text-white shadow-xl shadow-brand/50 transform group-hover:scale-110 transition-transform hover:brightness-110">
                    <Play size={18} className="fill-white ml-0.5" />
                  </span>
                </div>
                {/* Badges de episodio y doblaje integrados en top-left sin colisiones */}
                <div className="absolute left-2 top-2 flex items-center gap-1 z-10 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-extrabold text-white shadow border border-white/10">
                    Ep. {a.nextEpisode}
                  </span>
                  {isMalIdDubbedInSpanish(a.idMal || a.id) && (
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold backdrop-blur-md shadow-sm">
                      DUB
                    </span>
                  )}
                </div>
                {/* Barra de progreso de reproducción del episodio */}
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand via-purple-400 to-pink-400 rounded-r-full shadow-[0_0_8px_rgba(109,92,255,0.7)] transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(a.percent > 0 ? a.percent : 6, 0))}%` }}
                  />
                </div>
              </Poster>
              <div className="px-2.5 py-2">
                <p className="truncate text-[13px] font-bold group-hover:text-brand transition-colors" title={a.t}>
                  {a.t}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand mt-0.5">
                  <Play size={10} className="fill-brand shrink-0" />
                  <span className="truncate">
                    {a.displayLabel}
                    {totalEps ? ` · ${totalEps} eps` : ''}
                  </span>
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
const Stat = ({ y, r }) => (
  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
    <span className="font-medium tracking-wide text-slate-500 dark:text-slate-400">{y}</span>
    {r && r !== 'NaN' && (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
        <Star size={10} className="fill-amber-400 text-amber-400" />
        {r}
      </span>
    )}
  </div>
)

function RecCard({ i, rec, onOpenAnime }) {
  const [out, setOut] = useState(false)
  const { updateAnimeList, recordActivity } = useProfile()
  const act = (fn) => { setOut(true); setTimeout(() => fn(i.id), 320) } // card shrinks away, then the engine refills the row
  const handleLike = () => {
    act(rec.like)
    updateAnimeList?.((items) => {
      const existing = items.find((entry) => String(entry.id) === String(i.id) || entry.q === i.title)
      if (existing) {
        return items.map((entry) => String(entry.id) === String(existing.id) ? { ...entry, favorite: true } : entry)
      }
      return [...items, {
        id: String(i.id),
        animeId: String(i.id),
        q: i.title,
        t: i.title,
        status: 'planned',
        s: 'Favorito',
        favorite: true,
        img: i.banner || i.img,
        genres: Array.isArray(i.genres) ? i.genres : [],
        year: i.year || null,
        dot: 'bg-blue-500'
      }]
    })
    recordActivity?.('favorite', `Le gustó “${i.title}” desde Recomendaciones`)
  }

  return (
      <article onClick={() => onOpenAnime?.(i)} className={`group cursor-pointer will-change-transform transform-gpu transition-all duration-320 ease-out hover:-translate-y-1.5 ${out ? 'scale-75 opacity-0' : ''}`} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 260px' }}>
        <Poster img={i.banner || i.img} grad="linear-gradient(135deg,#241f4d,#423584)" title={i.title} className="aspect-[3/2.1] rounded-xl shadow-sm border border-white/5 group-hover:border-brand/40 group-hover:shadow-[0_12px_30px_-8px_rgba(109,92,255,0.35)] transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          {isMalIdDubbedInSpanish(i.idMal || i.id) && (
            <div className="absolute left-2 top-2 px-1.5 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-400/30 text-[9px] font-extrabold text-emerald-300 backdrop-blur-md shadow-sm z-10 animate-fade">
              DUB
            </div>
          )}
          <div className="absolute right-1.5 top-1.5 flex translate-y-1 gap-1 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <LikeBtn on={rec.isLiked(i.id)} onClick={handleLike} />
            <button onClick={(event) => { event.stopPropagation(); act(rec.dismiss) }} aria-label="No me interesa" className="grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur border border-white/10 transition hover:scale-110 hover:bg-rose-500/90 active:scale-90"><X size={14} /></button>
          </div>
          <p className="absolute inset-x-0 bottom-0 p-2.5 text-[10px] font-semibold leading-tight text-white/95 opacity-0 transition-opacity duration-300 group-hover:opacity-100 drop-shadow">{i.reason}</p>
        </Poster>
        <p className="mt-2 truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100 transition-colors duration-200 group-hover:text-brand">{i.title}</p>
        <Stat y={i.year} r={(i.score / 10).toFixed(1)} />
      </article>
  )
}

function RecommendationSection({ title, items, query, rec, onOpenAnime, used, emptyMessage, reasonFallback }) {
  const list = []
  for (const item of items || []) {
    const id = String(item.id)
    if (used.has(id) || !ok(item.title || item.t, query)) continue
    used.add(id)
    list.push({ ...item, reason: item.reason || reasonFallback })
    if (list.length === 6) break
  }
  if (!list.length && !emptyMessage) return null
  return <section className="animate-fade">
    <Title>{title}</Title>
    <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
      {!list.length && <Empty q={query} message={emptyMessage} />}
      {list.map((item) => <RecCard key={`${title}-${item.id}`} i={item} rec={rec} onOpenAnime={onOpenAnime} />)}
    </div>
  </section>
}

export function Because({ query, onOpenAnime }) {
  const rec = useRec()
  const { profile } = useProfile()
  const profileLibrary = Array.isArray(profile.animeList) ? profile.animeList : []
  const librarySignature = profileLibrary.map((item) => `${item.id}:${item.status}:${item.favorite ? '1' : '0'}`).join('|')
  useEffect(() => {
    if (rec.ready) rec.syncLibrary(profileLibrary)
  }, [rec.ready, rec.syncLibrary, librarySignature])
  const used = new Set()
  const libraryIds = new Set(profileLibrary.map((item) => String(item.id)))
  const coldStart = rec.coldStart || !rec.personalized
  const emptyMessage = query ? undefined : profileLibrary.length === 0 ? 'Añade obras a tu AnimeList para recibir recomendaciones personalizadas.' : rec.ready ? 'Todavía no encontramos recomendaciones para tu perfil.' : 'Estamos preparando recomendaciones para tu perfil…'
  const latest = (rec.latest || []).filter((item) => !libraryIds.has(String(item.id))).map((item) => ({ ...item, reason: coldStart ? 'Una obra reciente para descubrir' : 'Una obra reciente para ampliar tu biblioteca' }))
  return (
    <div className="space-y-7">
      <RecommendationSection title={!coldStart ? (rec.anchor ? `Porque te gusta ${rec.anchor}` : 'Recomendado para ti') : 'Tendencias para descubrir'} items={rec.recs} query={query} rec={rec} onOpenAnime={onOpenAnime} used={used} emptyMessage={emptyMessage} reasonFallback={!coldStart ? 'Seleccionado según tu actividad' : 'Popular y en tendencia ahora'} />
      <RecommendationSection title="Cerca de tus gustos" items={rec.affinityRecs} query={query} rec={rec} onOpenAnime={onOpenAnime} used={used} reasonFallback="Coincide con tus gustos" />
      <RecommendationSection title={rec.personalized ? 'Tendencias compatibles' : 'Tendencias de hoy'} items={rec.trendingRecs} query={query} rec={rec} onOpenAnime={onOpenAnime} used={used} reasonFallback="Está en tendencia ahora" />
      <RecommendationSection title="Descubre algo nuevo" items={rec.exploreRecs} query={query} rec={rec} onOpenAnime={onOpenAnime} used={used} reasonFallback="Algo nuevo que podría gustarte" />
      <RecommendationSection title="Recién llegados" items={latest} query={query} rec={rec} onOpenAnime={onOpenAnime} used={used} reasonFallback="Una obra reciente para descubrir" />
    </div>
  )
}
export function News({ query, onMore }) {
  const { items, status } = useNews()
  const rec = useRec()
  const list = items.filter((a) => ok(a.t, query)).slice(0, 2)
  return (
    <section className="pb-8">
      <Title onClick={onMore}>Noticias para ti</Title>
      <div className="grid gap-3 md:grid-cols-2">
        {status === 'loading' && !items.length && [0, 1].map((k) => <div key={k} className="card h-[122px] animate-pulse" />)}
        {status !== 'loading' && !list.length && <Empty q={query} />}
        {list.map((n) => (
            <NewsLink key={n.id} n={n} style={{ contentVisibility: 'auto', containIntrinsicSize: '0 130px' }} className="group card flex cursor-pointer gap-3 p-2.5 transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg">
              <Poster img={n.img} q={n.q} grad={n.grad} wide title="" className="h-[102px] w-[206px] shrink-0 rounded-xl"><LikeBtn on={rec.isNewsLiked(n.id)} onClick={() => rec.likeNews(n)} className="absolute right-1.5 top-1.5" /></Poster>
              <div className="flex min-w-0 flex-col justify-center"><h4 className="line-clamp-2 text-sm font-bold leading-snug">{n.t}</h4>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{n.d}</p>
                <p className="mt-2 text-[11px] text-slate-500">{n.s} · {n.h}</p></div>
            </NewsLink>
        ))}
      </div>
    </section>
  )
}
