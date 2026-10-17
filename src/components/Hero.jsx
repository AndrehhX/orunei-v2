import { useEffect, useMemo, useState } from 'react'
import { Sparkles, Star, Plus, Check, ChevronLeft, ChevronRight, Bookmark, Info } from 'lucide-react'
import Poster from './Poster'
import { slides, trending } from '../data'
import { useRec } from '../rec/rec'
import { useProfile } from '../profile/ProfileProvider'
import { createLibraryEntry } from '../profile/model.js'
import { formatHeroTitle, truncateWithEllipsis } from '../ui/text.js'
import { isMalIdDubbedInSpanish } from '../playback/dubSeasonManager.js'

export default function Hero({ onOpenDetail }) {
  const rec = useRec()
  const { profile, updateAnimeList, recordActivity } = useProfile()
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
      <div className="relative h-[360px] overflow-hidden rounded-2xl shadow-sm md:h-[340px] xl:h-[320px]" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)}>
        {currentSlides.map((s, n) => {
          const on = n === i
          return (
            <Poster key={s.title} {...s} wide title={s.title}
              className={`absolute inset-0 transition-all duration-[900ms] ease-out ${on ? 'opacity-100 scale-100' : 'pointer-events-none opacity-0 scale-[1.04]'}`}>
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/35 to-transparent" />
              <div className={`relative flex h-full max-w-[430px] flex-col justify-start gap-2 px-6 pb-12 pt-6 text-white transition-all duration-700 delay-150 ${on ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex w-fit items-center gap-1.5 rounded-full bg-black/45 border border-white/15 px-3 py-1 text-xs text-white/95 backdrop-blur-md shadow-sm"><Sparkles size={13} className="text-yellow-300" />{heroLabel}</span>
                  {isMalIdDubbedInSpanish(s.idMal || s.id) && (
                    <span className="flex w-fit items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-400/35 px-2.5 py-1 text-xs font-bold text-emerald-300 backdrop-blur-md shadow-sm animate-fade">
                      🇲🇽 DUB Latino
                    </span>
                  )}
                </div>
                <h2 className="line-clamp-2 h-[80px] shrink-0 overflow-hidden text-4xl font-extrabold leading-[1.05] tracking-tight">{formatHeroTitle(s.title)}</h2>
                <p className="text-xs text-white/80">{s.meta}</p>
                <p className="line-clamp-2 h-12 shrink-0 overflow-hidden text-sm leading-6 text-white/85">{s.desc}</p>
                <div className="mt-auto flex gap-2">
                  <button onClick={() => onOpenDetail?.(s)} className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand via-[#7968ff] to-[#9d8eff] shadow-[0_4px_20px_rgba(109,92,255,0.45)] hover:shadow-[0_6px_30px_rgba(109,92,255,0.7)] hover:brightness-110 px-4 py-2 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-95 text-white"><Info size={15} />Ver detalles</button>
                  <button onClick={() => toggleLibrary(s)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${inLibrary(s) ? 'bg-emerald-500/25 border-emerald-400/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.25)]' : 'border-white/20 bg-white/10 hover:bg-white/20 text-white'}`}>
                    {inLibrary(s) ? <Check size={16} /> : <Plus size={16} />}{inLibrary(s) ? 'En mi lista' : 'Agregar'}</button>
                  <button onClick={() => setSaved((a) => ({ ...a, [n]: !a[n] }))} aria-label="Guardar" className="grid w-10 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-md transition-all duration-300 hover:bg-white/20 hover:border-white/40 active:scale-90"><Bookmark size={16} className={`transition-all ${saved[n] ? 'fill-white' : ''}`} /></button>
                </div>
              </div>
            </Poster>
          )
        })}
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          {[[ChevronLeft, -1], [ChevronRight, 1]].map(([I, d]) => (
            <button key={d} onClick={() => go(d)} aria-label={d < 0 ? 'Anterior' : 'Siguiente'} className="grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md border border-white/10 transition hover:scale-110 hover:bg-black/70 active:scale-90"><I size={18} /></button>
          ))}
        </div>
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {currentSlides.map((_, n) => <i key={n} className={`h-1.5 rounded-full transition-all duration-500 ${n === i ? 'w-6 opacity-100 bg-brand shadow-[0_0_10px_rgba(109,92,255,0.8)]' : 'w-1.5 opacity-35 bg-white'}`} />)}
        </div>
      </div>
      <Poster {...currentTrending} onClick={() => onOpenDetail?.(currentTrending)} className="group hidden h-[360px] cursor-pointer rounded-2xl shadow-sm md:h-[340px] xl:h-[320px] md:block border border-white/5 hover:border-brand/30 transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/20" />
        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs text-white backdrop-blur-md border border-white/10"><Sparkles size={13} className="text-yellow-300" />Tendencia en Anime</span>
        {isMalIdDubbedInSpanish(currentTrending.idMal || currentTrending.id) && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-950/70 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300 backdrop-blur-md shadow-md z-10 animate-fade">
            DUB
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3 className="line-clamp-2 h-[48px] overflow-hidden text-lg font-bold leading-6 transition-colors duration-200 group-hover:text-brand">{formatHeroTitle(currentTrending.title, 34)}</h3>
          <p className="text-[11px] text-white/80">{currentTrending.meta}</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300 border border-amber-500/25">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {currentTrending.rating}
            </span>
          </p>
        </div>
        <button onClick={(event) => { event.stopPropagation(); toggleLibrary(currentTrending) }} aria-label="Agregar" className={`absolute bottom-4 right-4 grid h-9 w-9 place-items-center rounded-full transition-all duration-300 hover:scale-110 active:scale-90 ${inLibrary(currentTrending) ? 'rotate-[360deg] bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white text-black hover:bg-brand hover:text-white'}`}>{inLibrary(currentTrending) ? <Check size={18} /> : <Plus size={18} />}</button>
      </Poster>
    </section>
  )
}
