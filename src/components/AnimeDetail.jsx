import { useEffect, useState } from 'react'
import { ArrowLeft, Star, Play, ExternalLink, Heart, ChevronDown, MessageSquare, ThumbsUp, Clock, BookOpen, Check, Download, CheckCircle2, Loader2, WifiOff, Bell, BellRing } from 'lucide-react'
import { getAnime, ratingJobs, commentJobs, title, crunchy, clean, T, ago, translateDescription } from '../api/anime'
import { AnimeCard } from './AnimePage'
import { useRec } from '../rec/rec'
import { useProfile } from '../profile/ProfileProvider'
import { createLibraryEntry, markAnimeWatched } from '../profile/model.js'
import { buildEpisodeCards } from '../api/episodeData.js'
import AnimePlayer from './AnimePlayer'
import SeasonAudioModal from './SeasonAudioModal'
import { getSeasonAudioPreference, setSeasonAudioPreference } from '../playback/audioPreference.js'
import { verifySeasonDubAvailability, isMalIdDubbedInSpanish } from '../playback/dubSeasonManager.js'
import { getMiruroId, getEpisodePlayback } from '../api/streamAdapter'
import { startEpisodeDownload, getDownload, cancelDownload, deleteDownload, subscribeDownloads, isNativeApp } from '../offline/downloadEngine'
import { hasAiringAlert, toggleAiringAlert } from '../offline/airingAlerts'
import { getEpisodeDisplayProgress, formatTime } from '../playback/playbackProgress'
import { calculateNextEpisodeToWatch, formatContinueWatchingLabel } from '../playback/continueWatching.js'

const TABS = ['Resumen', 'Episodios', 'Comunidad']
const SRC = { 'AniList': 'bg-sky-500', 'Foro AniList': 'bg-indigo-500', 'MyAnimeList': 'bg-blue-700', 'Reddit': 'bg-orange-500' }
const RATE = { anilist: ['AniList', 'bg-sky-500'], mal: ['MyAnimeList', 'bg-blue-700'], kitsu: ['Kitsu', 'bg-orange-500'], imdb: ['IMDb', 'bg-yellow-500'] }
const DESCRIPTION_LANGUAGE_KEY = 'orunei-description-language'

const savedDescriptionLanguage = () => {
  try { return localStorage.getItem(DESCRIPTION_LANGUAGE_KEY) === 'en' ? 'en' : 'es' } catch { return 'es' }
}

function formatAiringCountdown(airingAt) {
  if (!airingAt) return ''
  const diffMs = airingAt * 1000 - Date.now()
  if (diffMs <= 0) return 'en cualquier momento'

  const diffHours = Math.floor(diffMs / 36e5)
  const diffDays = Math.floor(diffMs / 864e5)

  if (diffDays === 0) {
    if (diffHours <= 1) return 'en menos de 1 hora'
    return `en ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  }
  if (diffDays === 1) {
    return 'mañana'
  }
  if (diffDays >= 14) {
    const weeks = Math.floor(diffDays / 7)
    const remDays = diffDays % 7
    return remDays > 0 ? `en ${weeks} semanas y ${remDays} días` : `en ${weeks} semanas`
  }
  if (diffDays >= 7) {
    const remDays = diffDays % 7
    return remDays > 0 ? `en 1 semana y ${remDays} días` : 'en 1 semana'
  }
  return `en ${diffDays} días`
}

function Ratings({ m }) {
  const [r, setR] = useState({})
  useEffect(() => {
    setR({})
    Object.entries(ratingJobs(m)).forEach(([k, job]) => job().then((v) => setR((x) => ({ ...x, [k]: v || { none: true } }))).catch(() => setR((x) => ({ ...x, [k]: { none: true } }))))
  }, [m.id])
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {Object.entries(RATE).map(([k, [name, color]]) => { const v = r[k]; return (
        <div key={k} className="card p-3.5">
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><i className={`h-2 w-2 rounded-full ${color}`} />{name}{v?.extra && <span className="ml-auto text-slate-400">{v.extra}</span>}</div>
          {!v ? <div className="h-8 animate-pulse rounded bg-slate-200/70 dark:bg-white/10" />
            : v.unavailable ? <p className="text-sm text-slate-400">No disponible</p>
            : v.none ? <p className="text-sm text-slate-400">{k === 'imdb' ? 'No disponible' : 'Sin datos'}</p> : (<>
              <p className="flex items-baseline gap-1 text-2xl font-extrabold"><Star size={16} className="self-center fill-yellow-400 text-yellow-400" />{v.v.toFixed(1)}<span className="text-xs font-medium text-slate-400">/10</span></p>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10"><div className={`h-full rounded-full ${color} transition-all duration-1000 ease-smooth`} style={{ width: v.v * 10 + '%' }} /></div>
              <p className="mt-1 text-[10px] text-slate-400">{v.n?.toLocaleString('es')} {v.label}</p></>)}
        </div>) })}
    </div>
  )
}

function Comment({ c }) {
  const [more, setMore] = useState(false)
  const [hide, setHide] = useState(!!c.spoiler)
  return (
    <article className="card p-4 transition-shadow hover:shadow-lg">
      <div className="mb-2 flex items-center gap-2.5">
        {c.avatar ? <img src={c.avatar} alt="" loading="lazy" className="h-9 w-9 rounded-full object-cover" /> : <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand to-pink-400 text-sm font-bold text-white">{c.user[0]?.toUpperCase()}</div>}
        <div className="min-w-0 leading-tight"><p className="truncate text-sm font-bold">{c.user}</p><p className="flex items-center gap-1 text-[11px] text-slate-500"><Clock size={10} />{ago(c.ts)}</p></div>
        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white ${SRC[c.src]}`}>{c.src}</span>
      </div>
      <p onClick={() => setHide(false)} className={`whitespace-pre-line text-sm leading-relaxed text-slate-700 transition-all duration-500 dark:text-slate-300 ${more ? '' : 'line-clamp-5'} ${hide ? 'cursor-pointer select-none blur-sm' : ''}`}>{c.text}</p>
      {hide && <p className="mt-1 text-[11px] font-semibold text-amber-600">Spoiler · toca para ver</p>}
      <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
        {c.score != null && <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200"><Star size={11} className="fill-yellow-400 text-yellow-400" />{c.score}</span>}
        {c.likes != null && <span className="flex items-center gap-1"><ThumbsUp size={11} />{c.likes}</span>}
        {c.replies != null && <span className="flex items-center gap-1"><MessageSquare size={11} />{c.replies}</span>}
        {c.text.length > 220 && <button onClick={() => setMore(!more)} className="flex items-center gap-0.5 font-semibold text-brand">{more ? 'Menos' : 'Leer más'}<ChevronDown size={12} className={`transition-transform ${more ? 'rotate-180' : ''}`} /></button>}
        <a href={c.link} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 font-semibold text-brand hover:underline">Ver original<ExternalLink size={11} /></a>
      </div>
    </article>
  )
}

function Community({ m }) {
  const [list, setList] = useState([])
  const [status, setStatus] = useState({})
  const [src, setSrc] = useState('Todos')
  useEffect(() => {
    setList([]); setStatus({})
    Object.entries(commentJobs(m)).forEach(([k, job]) => job()
      .then((r) => { setList((x) => [...x, ...r].sort((a, b) => (b.likes || 0) - (a.likes || 0))); setStatus((s) => ({ ...s, [k]: r.length ? 'ok' : 'empty' })) })
      .catch(() => setStatus((s) => ({ ...s, [k]: 'fail' }))))
  }, [m.id])
  const loading = Object.keys(commentJobs(m)).some((k) => !status[k])
  const shown = list.filter((c) => src === 'Todos' || c.src === src)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['Todos', ...Object.keys(SRC)].map((s) => <button key={s} onClick={() => setSrc(s)} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 active:scale-95 ${src === s ? 'bg-brand text-white shadow-md shadow-brand/30' : 'bg-white text-slate-600 dark:bg-white/5 dark:text-slate-300'}`}>
          {s !== 'Todos' && <i className={`h-1.5 w-1.5 rounded-full ${status[s] === 'fail' ? 'bg-slate-400' : SRC[s]}`} />}{s}{s !== 'Todos' && status[s] === 'ok' && <span className="opacity-60">{list.filter((c) => c.src === s).length}</span>}</button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((c, i) => <div key={c.id} className="animate-rise" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}><Comment c={c} /></div>)}
        {loading && [0, 1].map((k) => <div key={k} className="card h-32 animate-pulse" />)}
      </div>
      {!loading && !shown.length && <p className="py-8 text-center text-sm text-slate-500">Aún no hay comentarios{src !== 'Todos' ? ` de ${src}` : ''}.</p>}
      {Object.entries(status).some(([, v]) => v === 'fail') && <p className="text-[11px] text-slate-400">No disponible ahora: {Object.entries(status).filter(([, v]) => v === 'fail').map(([k]) => k).join(', ')}.</p>}
    </div>
  )
}

function Episodes({ m, onPlayEpisode, currentEpisode, miruroId }) {
  const eps = buildEpisodeCards(m)
  const count = m.episodes || eps.length || 0
  const totalEpisodes = Math.max(count, eps.length, 0)
  const PAGE_SIZE = 50

  const initialPage = currentEpisode ? Math.floor((currentEpisode - 1) / PAGE_SIZE) : 0
  const [page, setPage] = useState(initialPage)
  const [downloadStates, setDownloadStates] = useState({})
  const [jumpEpInput, setJumpEpInput] = useState('')

  const handleJumpToEpisode = (e) => {
    e?.preventDefault?.()
    const target = parseInt(jumpEpInput, 10)
    if (!isNaN(target) && target >= 1 && target <= totalEpisodes) {
      const targetPage = Math.floor((target - 1) / PAGE_SIZE)
      setPage(targetPage)
      setJumpEpInput('')
      setTimeout(() => {
        const el = document.getElementById(`ep-card-${target}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          el.classList.add('ring-4', 'ring-brand', 'scale-[1.02]')
          setTimeout(() => el.classList.remove('ring-4', 'ring-brand', 'scale-[1.02]'), 2000)
        }
      }, 100)
    }
  }

  useEffect(() => {
    if (currentEpisode && currentEpisode > 0) {
      setPage(Math.floor((currentEpisode - 1) / PAGE_SIZE))
    }
  }, [currentEpisode])

  const totalPages = Math.ceil(totalEpisodes / PAGE_SIZE)
  const startEp = page * PAGE_SIZE + 1
  const endEp = Math.min((page + 1) * PAGE_SIZE, totalEpisodes)
  const currentSlice = totalEpisodes > 0 ? Array.from({ length: endEp - startEp + 1 }, (_, idx) => startEp + idx) : []

  useEffect(() => {
    let isCancelled = false
    const syncStatus = async () => {
      const states = {}
      for (const ep of currentSlice) {
        const item = await getDownload(m.id, ep)
        if (item) {
          states[ep] = item
        }
      }
      if (!isCancelled) setDownloadStates(states)
    }

    syncStatus()
    const unsub = subscribeDownloads(syncStatus)
    return () => {
      isCancelled = true
      unsub()
    }
  }, [m.id, page, totalEpisodes])

  const handleDownload = async (epNum, epTitle) => {
    const existing = downloadStates[epNum]
    if (existing?.status === 'completed') {
      if (window.confirm(`¿Deseas eliminar la descarga del Episodio ${epNum}?`)) {
        await deleteDownload(m.id, epNum)
      }
      return
    }
    if (existing?.status === 'downloading') {
      cancelDownload(m.id, epNum)
      return
    }

    try {
      const activeMiruroId = miruroId || await getMiruroId(m.id, title(m))
      if (!activeMiruroId) {
        alert('No se encontraron fuentes de transmisión para descargar este episodio.')
        return
      }
      const playback = await getEpisodePlayback(activeMiruroId, epNum)
      const streamUrl = playback?.proxiedStreamUrl || playback?.servers?.[0]?.proxiedStreamUrl
      if (!streamUrl) {
        alert('No se pudo obtener el flujo de video para la descarga.')
        return
      }
      startEpisodeDownload({
        animeId: m.id,
        animeTitle: title(m),
        animeCover: m.coverImage?.extraLarge || m.bannerImage || '',
        episodeNumber: epNum,
        episodeTitle: epTitle,
        streamUrl,
        subtitles: playback?.subtitles?.tracks || [],
      })
    } catch (err) {
      alert(`Error al iniciar descarga: ${err.message}`)
    }
  }

  if (totalEpisodes > 0) {
    const next = m?.nextAiringEpisode

    return (
      <div className="space-y-4">
        {next && (
          <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 shadow-sm animate-rise">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <div>
                <p className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                  Próximo estreno: Episodio {next.episode}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Se estrena {formatAiringCountdown(next.airingAt)}
                </p>
              </div>
            </div>
            <Clock size={22} className="text-emerald-500/80 shrink-0 hidden sm:block" />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
          <span>{totalEpisodes} episodios disponibles</span>
          <span className="text-[11px] text-brand">Audio Japonés · Subtítulos ES/EN</span>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
              {Array.from({ length: totalPages }, (_, idx) => {
                const pStart = idx * PAGE_SIZE + 1
                const pEnd = Math.min((idx + 1) * PAGE_SIZE, totalEpisodes)
                const isActive = idx === page
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPage(idx)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10'
                    }`}
                  >
                    {pStart} - {pEnd}
                  </button>
                )
              })}
            </div>

            {/* Salto Rápido a Episodio en Series Extensas */}
            <form onSubmit={handleJumpToEpisode} className="flex items-center gap-1.5 ml-auto shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Ir al Ep.</span>
              <input
                type="number"
                min="1"
                max={totalEpisodes}
                value={jumpEpInput}
                onChange={(e) => setJumpEpInput(e.target.value)}
                placeholder="1..."
                className="w-16 px-2.5 py-1 text-xs font-bold text-center rounded-lg bg-white dark:bg-black/30 border border-slate-300 dark:border-white/15 outline-none focus:border-brand focus:ring-1 focus:ring-brand text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!jumpEpInput}
                className="px-3 py-1 text-xs font-bold rounded-lg bg-brand text-white shadow-sm hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition"
              >
                Ir
              </button>
            </form>
          </div>
        )}

        <div className="max-h-[460px] overflow-y-auto pr-2">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentSlice.map((epNum) => {
              const isCurrent = currentEpisode === epNum
              const meta = eps[epNum - 1]
              const epTitle = meta?.title || `Episodio ${epNum}`
              const thumbnail = meta?.thumbnail || m.coverImage?.extraLarge || m.bannerImage || ''
              const dl = downloadStates[epNum]
              const isDownloaded = dl?.status === 'completed'
              const isDownloading = dl?.status === 'downloading'
              const epProgress = getEpisodeDisplayProgress(m.id, epNum)

              return (
                <div
                  id={`ep-card-${epNum}`}
                  key={epNum}
                  onClick={() => onPlayEpisode?.(epNum)}
                  className={`group card text-left overflow-hidden transition-all duration-300 cursor-pointer ${
                    isCurrent ? 'ring-2 ring-brand shadow-lg bg-brand/5 dark:bg-brand/10' : 'hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-300 dark:bg-slate-800">
                    {thumbnail ? (
                      <img src={thumbnail} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-slate-800 flex items-center justify-center text-slate-500 text-xs">Sin vista previa</div>
                    )}
                    <span className={`absolute inset-0 grid place-items-center transition-all ${
                      isCurrent ? 'bg-brand/40 opacity-100' : 'bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100'
                    }`}>
                      <Play size={26} className="fill-white text-white drop-shadow" />
                    </span>
                    <span className="absolute bottom-2 left-1.5 px-2 py-0.5 rounded bg-black/85 text-[10px] font-bold text-white z-10">
                      EP {epNum}
                    </span>
                    {isDownloaded && (
                      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-[10px] font-bold text-white shadow z-10">
                        <CheckCircle2 size={11} /> Offline
                      </span>
                    )}
                    {isDownloading && (
                      <span className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-brand/90 text-[10px] font-bold text-white shadow z-10 animate-pulse">
                        <Loader2 size={10} className="animate-spin" /> {dl?.progress}%
                      </span>
                    )}
                    {epProgress.watched && (
                      <span className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600/95 text-[10px] font-bold text-white shadow z-10">
                        <Check size={11} className="stroke-[3]" /> Visto
                      </span>
                    )}

                    {/* Barra de progreso de descarga activa */}
                    {isDownloading && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60 z-20 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand via-indigo-500 to-emerald-400 transition-all duration-300"
                          style={{ width: `${Math.max(dl?.progress || 0, 5)}%` }}
                        />
                      </div>
                    )}

                    {/* Barra de progreso de reproducción al pie de la miniatura */}
                    {!isDownloading && epProgress.percent > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 z-10">
                        <div
                          className={`h-full ${epProgress.watched ? 'bg-emerald-500' : 'bg-brand'}`}
                          style={{ width: `${epProgress.percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-xs font-semibold">{epTitle}</p>
                      <p className="mt-0.5 text-[10px] font-semibold text-brand">
                        {isCurrent
                          ? '▶ En reproducción'
                          : epProgress.watched
                          ? 'Completado'
                          : epProgress.percent > 0
                          ? `Continuar (${formatTime(epProgress.currentTime)}) ▸`
                          : 'Reproducir episodio ▸'}
                      </p>
                    </div>
                    {isNativeApp() && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDownload(epNum, epTitle)
                        }}
                        className={`p-2 rounded-xl transition-all duration-200 shrink-0 ml-2 active:scale-95 ${
                          isDownloaded
                            ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-sm shadow-emerald-500/20'
                            : isDownloading
                            ? 'text-brand bg-brand/15 border border-brand/30 shadow-md shadow-brand/20 animate-pulse'
                            : 'text-slate-400 hover:text-brand hover:bg-slate-200/50 dark:hover:bg-white/10'
                        }`}
                        title={
                          isDownloaded
                            ? 'Descargado (Click para eliminar)'
                            : isDownloading
                            ? `Descargando: ${dl?.progress}% (Click para cancelar)`
                            : 'Descargar para ver sin internet (Offline)'
                        }
                      >
                        {isDownloaded ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : isDownloading ? (
                          <div className="flex items-center gap-1">
                            <Loader2 size={13} className="animate-spin text-brand" />
                            <span className="text-[10px] font-bold text-brand font-mono">{dl?.progress}%</span>
                          </div>
                        ) : (
                          <Download size={15} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }


  const next = m?.nextAiringEpisode
  const url = crunchy(m)
  return (
    <div className="space-y-3">
      {next && (
        <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 shadow-sm animate-rise">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <p className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-300">
              Próximo estreno: Episodio {next.episode}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Se estrena {formatAiringCountdown(next.airingAt)}
            </p>
          </div>
        </div>
      )}
      <p className="text-sm text-slate-500">No hay episodios listados directamente para este título.</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onPlayEpisode?.(1)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 active:scale-95">
          <Play size={13} className="fill-white" /> Probar reproducción (Episodio 1)
        </button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#f47521] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 transition hover:-translate-y-0.5">
          Buscar en Crunchyroll <ExternalLink size={13} />
        </a>
      </div>
    </div>
  )
}

export default function AnimeDetail({ id, initialPlayEpisode = null, onClose, onOpen }) {
  const [m, setM] = useState(null)
  const [err, setErr] = useState(false)
  const [tab, setTab] = useState(0)
  const [spoil, setSpoil] = useState(false)
  const [descriptionLanguage, setDescriptionLanguage] = useState(savedDescriptionLanguage)
  const [localizedDescription, setLocalizedDescription] = useState('')
  const [descriptionState, setDescriptionState] = useState('idle')
  const [miruroId, setMiruroId] = useState(null)
  const [playingEpisode, setPlayingEpisode] = useState(initialPlayEpisode ? Number(initialPlayEpisode) : null)
  const [audioLanguage, setAudioLanguage] = useState('sub_es')
  const [dubAvailability, setDubAvailability] = useState(null)
  const [showSeasonAudioModal, setShowSeasonAudioModal] = useState(false)
  const [pendingPlayEpisode, setPendingPlayEpisode] = useState(null)
  const rec = useRec()
  const { profile, updateAnimeList, recordActivity } = useProfile()
  const close = () => onClose()

  useEffect(() => {
    setM(null)
    setErr(false)
    setTab(0)
    setPlayingEpisode(null)
    setMiruroId(null)
    setDubAvailability(null)
    setShowSeasonAudioModal(false)
    setPendingPlayEpisode(null)
    getAnime(id).then(setM).catch(() => setErr(true))
  }, [id])

  useEffect(() => {
    if (m?.id) {
      getMiruroId(m.id, title(m))
        .then((resId) => setMiruroId(resId))
        .catch(() => setMiruroId(null))

      verifySeasonDubAvailability({
        malId: m.idMal,
        animeTitle: title(m),
        expectedEpisodes: m.episodes || 1
      })
        .then((availability) => {
          setDubAvailability(availability)
          if (initialPlayEpisode) {
            handlePlayEpisode(Number(initialPlayEpisode))
          }
        })
        .catch(() => {
          setDubAvailability(null)
          if (initialPlayEpisode) {
            executePlayEpisode(Number(initialPlayEpisode))
          }
        })
    }
  }, [m])
  useEffect(() => {
    if (!m) return undefined
    const original = clean(m.description)
    if (descriptionLanguage === 'en' || !original) {
      setLocalizedDescription(original)
      setDescriptionState('ready')
      return undefined
    }
    const cacheKey = `orunei-description-es-${m.id}`
    try {
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) {
        setLocalizedDescription(cached)
        setDescriptionState('ready')
        return undefined
      }
    } catch {}
    const controller = new AbortController()
    setLocalizedDescription('')
    setDescriptionState('loading')
    translateDescription(original, 'es', controller.signal).then((translated) => {
      setLocalizedDescription(translated)
      setDescriptionState('ready')
      try { sessionStorage.setItem(cacheKey, translated) } catch {}
    }).catch((error) => {
      if (error?.name !== 'AbortError') {
        setLocalizedDescription(original)
        setDescriptionState('fallback')
      }
    })
    return () => controller.abort()
  }, [m?.id, m?.description, descriptionLanguage])
  useEffect(() => {
    try { localStorage.setItem(DESCRIPTION_LANGUAGE_KEY, descriptionLanguage) } catch {}
  }, [descriptionLanguage])
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  useEffect(() => {
    if (playingEpisode) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [playingEpisode])

  const accent = m?.coverImage?.color || '#6d5cff'
  const next = m?.nextAiringEpisode
  const liked = m && rec.isLiked(m.id)
  const existingLibraryEntry = m ? profile.animeList.find((item) => item.id === String(m.id) || item.q === title(m)) : null
  const inLibrary = Boolean(existingLibraryEntry)
  const continueInfo = calculateNextEpisodeToWatch({
    animeId: m?.id,
    savedEpisode: existingLibraryEntry?.currentEpisode || 1,
    totalEpisodes: m?.episodes || 0,
  })
  const currentEpToPlay = continueInfo.episode
  const continueLabel = formatContinueWatchingLabel(continueInfo)

  const [hasAlert, setHasAlert] = useState(() => (m && next ? hasAiringAlert(m.id, next.episode) : false))
  useEffect(() => {
    if (m && next) {
      setHasAlert(hasAiringAlert(m.id, next.episode))
    }
  }, [m?.id, next?.episode])

  const handleToggleAlert = () => {
    if (!m || !next) return
    const active = toggleAiringAlert({
      animeId: m.id,
      animeTitle: title(m),
      episode: next.episode,
      airingAt: next.airingAt,
    })
    setHasAlert(active)
  }

  const toggleLibrary = async () => {
    if (!m) return
    const result = await updateAnimeList((items) => inLibrary ? items.filter((item) => item.id !== String(m.id) && item.q !== title(m)) : [...items, createLibraryEntry(m)])
    if (result?.ok) recordActivity('library', `${inLibrary ? 'Quitó' : 'Añadió'} “${title(m)}” ${inLibrary ? 'de' : 'a'} su biblioteca`)
  }

  const executePlayEpisode = (ep) => {
    setPlayingEpisode(ep)
    if (m) {
      const existing = profile.animeList.find((item) => item.id === String(m.id) || item.q === title(m))
      const eps = m.episodes || existing?.episodes || null
      const updatedEntry = existing
        ? { ...existing, status: 'watching', s: `Viendo · Ep. ${ep}`, dot: 'bg-green-400', currentEpisode: ep, episodes: eps || existing.episodes }
        : { ...createLibraryEntry(m), status: 'watching', s: `Viendo · Ep. ${ep}`, dot: 'bg-green-400', currentEpisode: ep, episodes: eps }

      updateAnimeList((items) => existing ? items.map((i) => i.id === existing.id ? updatedEntry : i) : [...items, updatedEntry])
      recordActivity('watch', `Viendo “${title(m)}” (Ep. ${ep})`)
    }
  }

  const handlePlayEpisode = async (ep) => {
    if (!m) return
    const seasonId = m.season ? `${m.season}_${m.seasonYear || ''}` : 's1'
    const savedPref = getSeasonAudioPreference(m.id, seasonId, profile?.id)

    if (savedPref) {
      setAudioLanguage(savedPref)
      executePlayEpisode(ep)
      return
    }

    let currentDub = dubAvailability
    if (!currentDub && isMalIdDubbedInSpanish(m.idMal || m.id)) {
      try {
        currentDub = await verifySeasonDubAvailability({
          malId: m.idMal,
          animeTitle: title(m),
          expectedEpisodes: m.episodes || 1
        })
        setDubAvailability(currentDub)
      } catch (_) {}
    }

    if (currentDub?.available && currentDub?.hasLatino) {
      setPendingPlayEpisode(ep)
      setShowSeasonAudioModal(true)
    } else {
      setAudioLanguage('sub_es')
      executePlayEpisode(ep)
    }
  }

  const handleConfirmSeasonAudio = ({ preference, remember }) => {
    if (m && remember) {
      const seasonId = m.season ? `${m.season}_${m.seasonYear || ''}` : 's1'
      setSeasonAudioPreference(m.id, seasonId, preference, profile?.id)
    }
    setAudioLanguage(preference)
    setShowSeasonAudioModal(false)
    const ep = pendingPlayEpisode || 1
    setPendingPlayEpisode(null)
    executePlayEpisode(ep)
  }

  const handleCompleteSeries = async () => {
    if (!m) return
    const existing = profile.animeList.find((item) => item.id === String(m.id) || item.q === title(m))
    const entryToMark = existing || createLibraryEntry(m)
    const next = markAnimeWatched(entryToMark, m)
    await updateAnimeList((items) => existing ? items.map((i) => i.id === existing.id ? next : i) : [...items, next])
    recordActivity('completed', `Terminó de ver “${title(m)}”`)
    rec.likeMedia(m)
  }

  const handleToggleLike = async () => {
    if (!m) return
    const next = !liked
    rec.likeMedia(m)
    await updateAnimeList((items) => {
      const existing = items.find((item) => item.id === String(m.id) || item.q === title(m))
      if (existing) {
        return items.map((item) => item.id === existing.id ? { ...item, favorite: next } : item)
      } else if (next) {
        return [...items, { ...createLibraryEntry(m), favorite: true, status: 'planned', s: 'Favorito' }]
      }
      return items
    })
    recordActivity('favorite', `${next ? 'Marcó' : 'Quitó'} “${title(m)}” ${next ? 'como favorito' : 'de favoritos'}`)
  }

  const tags = (m && Array.isArray(m.tags)) ? m.tags.filter((t) => t && !t.isGeneralSpoiler && (spoil || !t.isMediaSpoiler)).slice(0, 14) : []
  const info = m && [
    ['Formato', T[m.format] || m.format || '—'],
    ['Episodios', m.episodes ? `${m.episodes}${m.duration ? ` × ${m.duration} min` : ''}` : '—'],
    ['Estado', T[m.status] || m.status || '—'],
    ['Temporada', m.season ? `${T[m.season]} ${m.seasonYear || ''}`.trim() : (m.seasonYear || '—')],
    ['Estudio', m.studios?.nodes?.[0]?.name || '—'],
    ['Favoritos', m.favourites != null ? m.favourites.toLocaleString('es') : '—']
  ]

  return (
    <div className="space-y-5 pb-10 animate-fade">
      <div className="flex items-center justify-between gap-3">
        <button onClick={close} className="inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-x-0.5 hover:text-brand dark:bg-white/10 dark:text-slate-200"><ArrowLeft size={16} />Volver al catálogo</button>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Ficha del anime</span>
      </div>

      {playingEpisode && m && (
        <div id="player-theater-top" className="animate-slideDown scroll-mt-4">
          <AnimePlayer
            animeId={m.id}
            malId={m.idMal}
            animeTitle={title(m)}
            miruroId={miruroId}
            initialEpisode={playingEpisode}
            totalEpisodes={m.episodes || 0}
            audioLanguage={audioLanguage}
            onAudioLanguageChange={setAudioLanguage}
            dubAvailability={dubAvailability}
            seasonId={m.season ? `${m.season}_${m.seasonYear || ''}` : 's1'}
            userId={profile?.id}
            onClose={() => setPlayingEpisode(null)}
            onEpisodeChange={executePlayEpisode}
            onComplete={handleCompleteSeries}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-3xl bg-[#f4f4fb] dark:bg-[#0e0e17]">
        {err && <p className="p-16 text-center text-slate-500">No pudimos cargar esta ficha. <button onClick={close} className="font-semibold text-brand underline">Volver</button></p>}
        {!m && !err && <div className="space-y-4 p-6"><div className="h-64 skeleton-shimmer rounded-2xl" /><div className="h-8 w-1/2 skeleton-shimmer rounded" /></div>}
        {m && (<>
          <header className="relative h-[280px] overflow-hidden" style={{ background: accent }}>
            {(m.bannerImage || m.coverImage?.extraLarge || m.coverImage?.large) && <img src={m.bannerImage || m.coverImage?.extraLarge || m.coverImage?.large} alt="" decoding="async" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#f4f4fb] via-[#f4f4fb]/30 to-black/30 dark:from-[#0e0e17] dark:via-[#0e0e17]/40" />
          </header>
          <div className="relative -mt-24 px-5 pb-8 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row">
              <img src={m.coverImage?.extraLarge || m.coverImage?.large || ''} alt={title(m)} className="h-[260px] w-[175px] shrink-0 rounded-2xl object-cover shadow-2xl ring-4 ring-[#f4f4fb] animate-rise dark:ring-[#0e0e17]" />
              <div className="flex min-w-0 flex-col justify-end gap-2 animate-rise" style={{ animationDelay: '.1s' }}>
                <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{title(m)}</h2>
                <p className="text-sm text-slate-500">{m.title?.native || ''}{m.title?.native && m.title?.romaji ? ' · ' : ''}{m.title?.romaji && m.title?.romaji !== title(m) ? m.title.romaji : ''}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(m.genres || []).map((g) => <span key={g} className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: accent }}>{g}</span>)}
                  {dubAvailability?.hasLatino && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm animate-fade">
                      <span>🇲🇽</span>
                      <span>Doblaje Latino (1080p)</span>
                    </span>
                  )}
                </div>
                {next && (
                  <div className="my-1.5 flex flex-wrap items-center gap-2 animate-rise">
                    <div className="inline-flex flex-wrap items-center gap-2.5 rounded-2xl bg-emerald-500/15 dark:bg-emerald-500/25 px-4 py-2.5 border border-emerald-500/35 text-emerald-800 dark:text-emerald-200 shadow-sm w-fit backdrop-blur-md">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <Clock size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="text-sm sm:text-base font-extrabold tracking-tight">
                        Episodio {next.episode} · Se estrena {formatAiringCountdown(next.airingAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleAlert}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 active:scale-95 shadow-sm border ${
                        hasAlert
                          ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30'
                          : 'bg-white/80 dark:bg-white/10 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-white/10 hover:bg-white'
                      }`}
                      title={hasAlert ? 'Recordatorio de estreno activado' : 'Avisarme cuando se estrene este episodio'}
                    >
                      {hasAlert ? <BellRing size={15} className="animate-bounce" /> : <Bell size={15} />}
                      <span>{hasAlert ? 'Aviso activo' : 'Avisarme'}</span>
                    </button>
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handlePlayEpisode(currentEpToPlay)}
                    className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
                  >
                    <Play size={15} className="fill-white" />
                    {continueLabel}
                  </button>
                  <a href={crunchy(m)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 active:scale-95 dark:bg-white/10">
                    Crunchyroll<ExternalLink size={13} />
                  </a>
                  {m.trailer?.site === 'youtube' && <a href={`https://youtu.be/${m.trailer.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 active:scale-95 dark:bg-white/10">Tráiler<ExternalLink size={13} /></a>}
                  <button onClick={toggleLibrary} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-spring active:scale-90 ${inLibrary ? 'bg-emerald-500 text-white' : 'bg-white shadow-sm dark:bg-white/10'}`}><BookOpen size={15} />{inLibrary ? <><Check size={14} />En biblioteca</> : 'Agregar a biblioteca'}</button>
                  <button onClick={handleToggleLike} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-spring active:scale-90 ${liked ? 'bg-pink-500 text-white' : 'bg-white shadow-sm dark:bg-white/10'}`}><Heart size={15} className={liked ? 'fill-white' : ''} />{liked ? 'Te gusta' : 'Me gusta'}</button>
                </div>
              </div>
            </div>

            <div className="mt-6"><Ratings m={m} /></div>

            <div className="relative mt-7 grid grid-cols-3 border-b border-slate-200 dark:border-white/10">
              {TABS.map((t, i) => <button key={t} onClick={() => setTab(i)} className={`py-3 text-sm font-semibold transition-colors ${tab === i ? 'text-brand' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'}`}>{t}</button>)}
              <span className="absolute bottom-0 h-0.5 w-1/3 rounded bg-brand transition-transform duration-300 ease-smooth" style={{ transform: `translateX(${tab * 100}%)` }} />
            </div>

            <div key={tab} className="mt-5 animate-fade">
              {tab === 0 && (
                <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Idioma de la sinopsis</span>
                        <div className="flex rounded-full bg-white p-1 text-[11px] shadow-sm dark:bg-white/5" role="group" aria-label="Idioma de la sinopsis">
                          <button type="button" aria-pressed={descriptionLanguage === 'es'} onClick={() => setDescriptionLanguage('es')} className={`rounded-full px-3 py-1 font-semibold transition ${descriptionLanguage === 'es' ? 'bg-brand text-white' : 'text-slate-500 hover:text-brand'}`}>Español</button>
                          <button type="button" aria-pressed={descriptionLanguage === 'en'} onClick={() => setDescriptionLanguage('en')} className={`rounded-full px-3 py-1 font-semibold transition ${descriptionLanguage === 'en' ? 'bg-brand text-white' : 'text-slate-500 hover:text-brand'}`}>English</button>
                        </div>
                      </div>
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{descriptionState === 'loading' ? 'Traduciendo sinopsis…' : localizedDescription || 'Sin sinopsis disponible.'}</p>
                      {descriptionState === 'fallback' && <p className="text-[11px] text-slate-400">No se pudo traducir ahora; mostramos la descripción original.</p>}
                    </div>
                    <div><div className="mb-2 flex items-center justify-between"><h3 className="font-bold">Etiquetas</h3><button onClick={() => setSpoil(!spoil)} className="text-[11px] font-semibold text-brand">{spoil ? 'Ocultar spoilers' : 'Mostrar spoilers'}</button></div>
                      <div className="flex flex-wrap gap-2">{tags.map((t, i) => <span key={t.name} className="animate-rise rounded-lg bg-white px-2.5 py-1 text-xs shadow-sm dark:bg-white/5" style={{ animationDelay: `${i * 30}ms` }}>{t.name} <b className="text-brand">{t.rank}%</b></span>)}</div></div>
                    {Array.isArray(m.recommendations?.nodes) && m.recommendations.nodes.length > 0 && <div><h3 className="mb-3 font-bold">Si te gustó, prueba</h3>
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{m.recommendations.nodes.filter((n) => n?.mediaRecommendation).map(({ mediaRecommendation: r }, i) => <AnimeCard key={r.id} m={r} i={i} onOpen={onOpen} />)}</div></div>}
                  </div>
                  <dl className="card h-fit divide-y divide-slate-200/70 p-1 text-sm dark:divide-white/10">{info.map(([k, v]) => <div key={k} className="flex justify-between gap-3 px-3 py-2.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}</dl>
                </div>)}
              {tab === 1 && <Episodes m={m} onPlayEpisode={handlePlayEpisode} currentEpisode={playingEpisode || currentEpToPlay} miruroId={miruroId} />}
              {tab === 2 && <Community m={m} />}
            </div>
          </div>
        </>)}
      </div>

      {showSeasonAudioModal && m && (
        <SeasonAudioModal
          animeTitle={title(m)}
          availability={dubAvailability || { hasLatino: true, hasCastellano: false }}
          defaultPreference={audioLanguage}
          onConfirm={handleConfirmSeasonAudio}
          onClose={() => {
            setShowSeasonAudioModal(false)
            setPendingPlayEpisode(null)
          }}
        />
      )}
    </div>
  )
}
