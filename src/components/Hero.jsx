import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Star, Plus, Check, ChevronLeft, ChevronRight, Bookmark, Info } from 'lucide-react'
import Poster from './Poster'
import { slides, trending } from '../data'
import { useRec } from '../rec/rec'
import { useProfile } from '../profile/ProfileProvider'
import { createLibraryEntry } from '../profile/model.js'
import { formatHeroTitle, truncateWithEllipsis } from '../ui/text.js'
import { isMalIdDubbedInSpanish } from '../playback/dubSeasonManager.js'

export default function Hero({ onOpenDetail, theme }) {
  const rec = useRec()
  const { profile, updateAnimeList, recordActivity } = useProfile()
  const isSakura = theme === 'sakura'
  const latest = rec.latest || []
  const currentSlides = useMemo(() => latest.length >= 3 ? latest.map((item) => ({
    id: item.id,
    idMal: item.idMal,
    title: item.title,
    q: item.title,
    img: item.img,
    banner: item.banner,
    meta: `${item.year || '—'} · Anime${item.genres?.length ? ` · ${item.genres.slice(0, 2).join(' · ')}` : ''}`,
    desc: truncateWithEllipsis(item.description || 'Descubre una nueva historia que acaba de llegar a Orunei.'),
    grad: 'linear-gradient(135deg,#1b1f4d,#c0627a)',
  })) : slides.map((slide) => ({ ...slide, desc: truncateWithEllipsis(slide.desc) })), [latest])
  const currentTrending = useMemo(() => latest[0] ? {
    id: latest[0].id,
    idMal: latest[0].idMal,
    title: latest[0].title,
    q: latest[0].title,
    img: latest[0].img,
    banner: latest[0].banner,
    meta: `${latest[0].year || '—'} · Anime${latest[0].genres?.length ? ` · ${latest[0].genres.slice(0, 2).join(' · ')}` : ''}`,
    rating: latest[0].score ? (latest[0].score / 10).toFixed(1) : '—',
    grad: 'linear-gradient(135deg,#2a0f3a,#1f6b5a)',
  } : trending, [latest])
  const [i, setI] = useState(0)
  const [pause, setPause] = useState(false)
  const [saved, setSaved] = useState({})
  const heroLabel = rec.personalized && latest.length >= 3 ? 'Recomendación para ti' : 'Descubre ahora'
  const go = (d) => setI((v) => (v + d + currentSlides.length) % currentSlides.length)
  const inLibrary = (slide) => profile.animeList.some((item) => item.q === slide.q || item.t === slide.title)
  const toggleLibrary = async (slide) => {
    const exists = inLibrary(slide)
    const result = await updateAnimeList((items) => exists ? items.filter((item) => item.q !== slide.q && item.t !== slide.title) : [...items, createLibraryEntry(slide)])
    if (!result?.ok) return
    rec.addByQuery(slide.q, !exists)
    recordActivity('library', `${exists ? 'Quitó' : 'Añadió'} “${slide.title}” ${exists ? 'de' : 'a'} su biblioteca`)
  }
  useEffect(() => {
    if (pause) return
    const id = setInterval(() => go(1), 7000)
    return () => clearInterval(id)
  }, [pause, currentSlides.length])
  useEffect(() => setI((value) => currentSlides.length ? value % currentSlides.length : 0), [currentSlides.length])

  return (
    <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px] animate-rise">
      <div className={`relative h-[360px] overflow-hidden rounded-2xl shadow-sm md:h-[340px] xl:h-[320px] transition-all duration-500 ${isSakura ? 'border border-pink-400/40 shadow-[0_16px_50px_-10px_rgba(251,111,146,0.38)] ring-1 ring-pink-300/30' : ''}`} onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
        {currentSlides.map((s, n) => {
          const on = n === i
          return (
            <Poster key={s.title} {...s} wide title={s.title}
              className={`absolute inset-0 transition-all duration-[900ms] ease-out ${on ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-[1.04]'}`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent sm:bg-gradient-to-r sm:from-black/95 sm:via-black/60 sm:to-transparent pointer-events-none" />
              {isSakura && (
                <div className="absolute inset-0 bg-gradient-to-tr from-pink-950/25 via-transparent to-rose-500/10 pointer-events-none mix-blend-screen" />
              )}
              <div className={`relative flex h-full max-w-[430px] flex-col justify-start gap-2 px-6 pb-12 pt-6 text-white transition-all duration-700 delay-150 ${on ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md shadow-sm ${isSakura ? 'bg-pink-950/70 border border-pink-400/50 text-pink-100 shadow-[0_0_15px_rgba(251,111,146,0.35)]' : 'bg-black/50 border border-white/20 text-white/95'}`}>
                    <Sparkles size={13} className={isSakura ? 'text-pink-300' : 'text-yellow-300'} />
                    {isSakura ? `🌸 ${heroLabel}` : heroLabel}
                  </span>
                  {isMalIdDubbedInSpanish(s.idMal || s.id) && (
                    <span className="flex w-fit items-center gap-1.5 rounded-full bg-emerald-950/80 border border-emerald-400/40 px-2.5 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md shadow-sm animate-fade">
                      🇲🇽 DUB Latino
                    </span>
                  )}
                </div>
                <h2 className="line-clamp-2 h-[80px] shrink-0 overflow-hidden text-3xl sm:text-4xl font-black leading-tight sm:leading-[1.08] tracking-tight drop-shadow-sm">{formatHeroTitle(s.title)}</h2>
                <p className="text-xs font-medium text-white/80">{s.meta}</p>
                <p className="line-clamp-2 h-12 shrink-0 overflow-hidden text-sm leading-6 text-white/85">{s.desc}</p>
                <div className="mt-auto flex gap-2">
                  <button onClick={() => onOpenDetail?.(s)} className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold tracking-tight transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-white ${isSakura ? 'bg-gradient-to-r from-[#fb6f92] via-[#ff758f] to-[#e11d48] shadow-[0_4px_22px_rgba(251,111,146,0.55)] hover:shadow-[0_8px_30px_rgba(251,111,146,0.85)] hover:brightness-110' : 'bg-gradient-to-r from-brand via-[#7968ff] to-[#9d8eff] shadow-[0_4px_20px_rgba(109,92,255,0.45)] hover:shadow-[0_6px_30px_rgba(109,92,255,0.7)] hover:brightness-110'}`}><Info size={15} />Ver detalles</button>
                  <button onClick={() => toggleLibrary(s)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${inLibrary(s) ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]' : (isSakura ? 'border-pink-300/30 bg-pink-950/30 hover:bg-pink-900/40 text-white' : 'border-white/20 bg-white/10 hover:bg-white/20 text-white')}`}>
                    {inLibrary(s) ? <Check size={16} /> : <Plus size={16} />}{inLibrary(s) ? 'En mi lista' : 'Agregar'}</button>
                  <button onClick={() => setSaved((a) => ({ ...a, [n]: !a[n] }))} aria-label="Guardar" className={`grid w-10 place-items-center rounded-xl border backdrop-blur-md transition-all duration-300 active:scale-90 ${isSakura ? 'border-pink-300/30 bg-pink-950/30 hover:bg-pink-900/40 hover:border-pink-300/50' : 'border-white/20 bg-white/10 hover:bg-white/20 hover:border-white/40'}`}><Bookmark size={16} className={`transition-all ${saved[n] ? (isSakura ? 'fill-pink-300 text-pink-300' : 'fill-white') : ''}`} /></button>
                </div>
              </div>
            </Poster>
          )
        })}
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          {[[ChevronLeft, -1], [ChevronRight, 1]].map(([I, d]) => (
            <button key={d} onClick={() => go(d)} aria-label={d < 0 ? 'Anterior' : 'Siguiente'} className={`grid h-9 w-9 place-items-center rounded-full backdrop-blur-md border transition hover:scale-110 active:scale-90 ${isSakura ? 'bg-pink-950/60 text-pink-100 border-pink-400/40 hover:bg-pink-900/80 hover:border-pink-300/60 shadow-[0_0_12px_rgba(251,111,146,0.3)]' : 'bg-black/45 text-white border-white/10 hover:bg-black/70'}`}><I size={18} /></button>
          ))}
        </div>
        <div className={`absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 p-1 rounded-full backdrop-blur-sm border ${isSakura ? 'bg-pink-950/40 border-pink-400/30 shadow-[0_0_14px_rgba(251,111,146,0.25)]' : 'bg-black/25 border border-white/10'}`}>
          {currentSlides.map((_, n) => (
            <button
              key={n}
              onClick={() => setI(n)}
              aria-label={`Ir a la diapositiva ${n + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${n === i ? (isSakura ? 'w-7 opacity-100 bg-gradient-to-r from-[#ff8fab] via-[#fb6f92] to-[#e11d48] shadow-[0_0_12px_rgba(251,111,146,0.95)]' : 'w-6 opacity-100 bg-brand shadow-[0_0_10px_rgba(109,92,255,0.85)]') : (isSakura ? 'w-1.5 opacity-50 bg-pink-200 hover:opacity-90' : 'w-1.5 opacity-40 bg-white hover:opacity-75')}`}
            />
          ))}
        </div>
      </div>
      <Poster {...currentTrending} onClick={() => onOpenDetail?.(currentTrending)} className={`group hidden h-[360px] cursor-pointer rounded-2xl shadow-sm md:h-[340px] xl:h-[320px] md:block border transition-all duration-300 hover:shadow-xl ${isSakura ? 'border-pink-400/30 hover:border-pink-400/80 hover:shadow-[0_12px_36px_-6px_rgba(251,111,146,0.4)]' : 'border-white/5 hover:border-brand/40'}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />
        {isSakura && (
          <div className="absolute inset-0 bg-gradient-to-tr from-pink-950/20 via-transparent to-rose-400/10 pointer-events-none mix-blend-screen" />
        )}
        <span className={`absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md border shadow-sm ${isSakura ? 'bg-pink-950/70 border-pink-400/40 text-pink-100 shadow-[0_0_10px_rgba(251,111,146,0.25)]' : 'bg-black/60 border-white/15 text-white'}`}><Sparkles size={13} className={isSakura ? 'text-pink-300' : 'text-yellow-300'} />Tendencia en Anime</span>
        {isMalIdDubbedInSpanish(currentTrending.idMal || currentTrending.id) && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-950/80 border border-emerald-400/40 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 backdrop-blur-md shadow-md z-10 animate-fade">
            DUB
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className={`line-clamp-2 h-[48px] overflow-hidden text-lg font-bold leading-6 transition-colors duration-200 ${isSakura ? 'group-hover:text-pink-300' : 'group-hover:text-brand'}`}>{formatHeroTitle(currentTrending.title, 34)}</h3>
          <p className="text-[11px] font-medium text-white/80">{currentTrending.meta}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold">
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {currentTrending.rating}
            </span>
          </p>
        </div>
        <button onClick={(event) => { event.stopPropagation(); toggleLibrary(currentTrending) }} aria-label="Agregar" className={`absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-full transition-all duration-300 hover:scale-110 active:scale-90 ${inLibrary(currentTrending) ? 'rotate-[360deg] bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : (isSakura ? 'bg-white text-pink-900 hover:bg-[#fb6f92] hover:text-white shadow-[0_0_12px_rgba(251,111,146,0.4)]' : 'bg-white text-black hover:bg-brand hover:text-white')}`}>{inLibrary(currentTrending) ? <Check size={18} /> : <Plus size={18} />}</button>
      </Poster>
    </section>
  )
}
