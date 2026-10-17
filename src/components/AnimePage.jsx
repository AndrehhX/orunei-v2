import { useEffect, useRef, useState, useMemo } from 'react'
import { Star, X, SlidersHorizontal, Play, ChevronDown } from 'lucide-react'
import AnimeDetail from './AnimeDetail'
import { GENRES, EXTRA_CATEGORIES, FORMATS, STATUS, SORTS, T, title, searchAnime } from '../api/anime'
import { isMalIdDubbedInSpanish } from '../playback/dubSeasonManager.js'

const years = Array.from({ length: 14 }, (_, i) => String(new Date().getFullYear() + 1 - i))
const init = { genres: [], tags: [], format: '', status: '', year: '', sort: 'Popular' }

const Select = ({ label, value, onChange, options }) => (
  <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-sm transition focus-within:ring-2 focus-within:ring-brand/40 dark:bg-white/5">
    <span className="text-slate-500">{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent font-semibold outline-none dark:[&>option]:bg-slate-800">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </label>
)

export function AnimeCard({ m, onOpen }) {
  const open = () => onOpen(m.id)
  const bg = m.coverImage.color || '#6d5cff'
  const hasDub = isMalIdDubbedInSpanish(m.idMal || m.id)
  return (
    <article role="button" tabIndex="0" aria-label={`Ver ficha de ${title(m)}`} onClick={open} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open() } }} className="group cursor-pointer transition-transform duration-200 ease-out hover:-translate-y-1" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 420px' }}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-md transition-shadow duration-200 group-hover:shadow-xl" style={{ background: bg }}>
          <img src={m.coverImage.extraLarge} alt={title(m)} loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105" />
          {m.averageScore > 0 && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur"><Star size={11} className="fill-yellow-400 text-yellow-400" />{(m.averageScore / 10).toFixed(1)}</span>}
          {hasDub && (
            <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-emerald-600/95 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-extrabold text-white backdrop-blur shadow-md z-10 animate-fade">
              🇲🇽 DUB
            </span>
          )}
          <div className="absolute inset-0 flex flex-col justify-end gap-1.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="flex flex-wrap gap-1">{m.genres.slice(0, 3).map((g) => <span key={g} className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] text-white backdrop-blur">{g}</span>)}</div>
            <span className="flex w-fit translate-y-1 items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-semibold text-white transition-transform duration-200 group-hover:translate-y-0"><Play size={11} className="fill-white" />Ver ficha</span>
          </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-snug">{title(m)}</p>
      <p className="text-[11px] text-slate-500">{T[m.format] || m.format}{m.seasonYear ? ` · ${m.seasonYear}` : ''}{m.episodes ? ` · ${m.episodes} eps` : ''}</p>
    </article>
  )
}

export default function AnimePage({ query, initialOpenId = null, initialPlayEpisode = null, onCloseDetail }) {
  const [f, setF] = useState(init)
  const [onlyDub, setOnlyDub] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [items, setItems] = useState([])
  const [more, setMore] = useState(false)
  const [page, setPage] = useState(1)
  const [state, setState] = useState('loading')
  const [open, setOpen] = useState(null)
  const req = useRef(0)
  const abort = useRef(null)
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const active = f.genres.length + f.tags.length + (f.format ? 1 : 0) + (f.status ? 1 : 0) + (f.year ? 1 : 0) + (f.sort !== 'Popular' ? 1 : 0) + (onlyDub ? 1 : 0)
  useEffect(() => { if (initialOpenId) setOpen(initialOpenId) }, [initialOpenId])

  const run = (p, append) => {
    const id = ++req.current
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setState('loading')
    searchAnime({ ...f, search: query.trim() }, p, controller.signal).then((r) => {
      if (id !== req.current) return
      setItems((x) => (append ? [...x, ...r.items.filter((n) => !x.some((o) => o.id === n.id))] : r.items)); setMore(r.more); setPage(p); setState('ok')
    }).catch((error) => { if (error.name !== 'AbortError' && id === req.current) setState('error') })
  }
  useEffect(() => { const t = setTimeout(() => run(1, false), query ? 400 : 0); return () => { clearTimeout(t); abort.current?.abort() } }, [f, query])

  const filteredItems = useMemo(() => {
    return onlyDub ? items.filter((m) => isMalIdDubbedInSpanish(m.idMal || m.id)) : items
  }, [items, onlyDub])

  if (open) return <AnimeDetail id={open} initialPlayEpisode={open === initialOpenId ? initialPlayEpisode : null} onClose={() => { setOpen(null); onCloseDetail?.() }} onOpen={setOpen} />

  return (
    <section className="space-y-5 pb-10">
      <div className="animate-rise"><h1 className="text-4xl font-extrabold tracking-tight">Anime</h1>
        <p className="text-sm text-slate-500">Explora el catálogo, filtra por lo que te apetece y abre cualquier ficha.</p></div>

      <div className="space-y-3 animate-rise" style={{ animationDelay: '.08s' }}>
        <div className="scroll-hide flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setOnlyDub((prev) => !prev)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 active:scale-95 ${
              onlyDub
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 ring-2 ring-emerald-400/50'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            <span>🇲🇽</span>
            <span>Audio Español</span>
          </button>
          {GENRES.map(([es, en]) => { const on = f.genres.includes(en); return (
            <button key={en} onClick={() => set('genres')(on ? f.genres.filter((g) => g !== en) : [...f.genres, en])}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ease-spring active:scale-90 ${on ? 'scale-105 bg-brand text-white shadow-md shadow-brand/30' : 'bg-white text-slate-600 hover:text-brand dark:bg-white/5 dark:text-slate-300'}`}>{es}</button>) })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-expanded={showExtra} onClick={() => setShowExtra((value) => !value)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:text-brand dark:bg-white/5 dark:text-slate-300">
            Más categorías <ChevronDown size={13} className={`transition-transform ${showExtra ? 'rotate-180' : ''}`} />
          </button>
          {f.tags.length > 0 && <span className="text-[11px] font-semibold text-brand">{f.tags.length} seleccionada{f.tags.length === 1 ? '' : 's'}</span>}
        </div>
        {showExtra && <div className="flex flex-wrap gap-2 rounded-2xl bg-white/60 p-3 dark:bg-white/[0.03]">
          {EXTRA_CATEGORIES.map(([es, en]) => { const on = f.tags.includes(en); return (
            <button key={en} type="button" onClick={() => set('tags')(on ? f.tags.filter((tag) => tag !== en) : [...f.tags, en])}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${on ? 'bg-brand text-white shadow-md shadow-brand/30' : 'bg-white text-slate-600 hover:text-brand dark:bg-white/5 dark:text-slate-300'}`}>{es}</button>) })}
        </div>}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal size={16} className="text-slate-400" />
          <Select label="Formato" value={f.format} onChange={set('format')} options={Object.keys(FORMATS).map((k) => [k, k || 'Todos'])} />
          <Select label="Año" value={f.year} onChange={set('year')} options={[['', 'Todos'], ...years.map((y) => [y, y])]} />
          <Select label="Estado" value={f.status} onChange={set('status')} options={Object.keys(STATUS).map((k) => [k, k || 'Todos'])} />
          <Select label="Orden" value={f.sort} onChange={set('sort')} options={Object.keys(SORTS).map((k) => [k, k])} />
          <button onClick={() => { setF(init); setOnlyDub(false); }} className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-red-500 transition-all duration-300 hover:bg-red-500/10 ${active ? 'scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'}`}><X size={13} />Limpiar ({active})</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {state === 'loading' && !items.length && Array.from({ length: 8 }, (_, k) => <div key={k} className="aspect-[2/3] animate-pulse rounded-2xl bg-slate-200/70 dark:bg-white/5" />)}
        {filteredItems.map((m) => (
          <AnimeCard key={m.id} m={m} onOpen={setOpen} />
        ))}
      </div>
      {state === 'ok' && !filteredItems.length && (
        <p className="py-16 text-center text-slate-500">Nada con esos filtros. Prueba quitando alguno.</p>
      )}
      {state === 'error' && <p className="py-10 text-center text-sm text-amber-600">No pudimos conectar con AniList. <button onClick={() => run(1, false)} className="font-semibold underline">Reintentar</button></p>}
      {more && state !== 'error' && (
        <div className="text-center"><button onClick={() => run(page + 1, true)} disabled={state === 'loading'} className="rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60">{state === 'loading' ? 'Cargando…' : 'Cargar más'}</button></div>
      )}
    </section>
  )
}
