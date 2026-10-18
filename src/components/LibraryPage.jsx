import { useState, useEffect } from 'react'
import { BookOpen, Check, Clock3, Heart, Pause, Plus, Trash2, Download, Play, WifiOff } from 'lucide-react'
import Poster from './Poster'
import { useProfile } from '../profile/ProfileProvider'
import { getAnime } from '../api/anime'
import { markAnimeWatched } from '../profile/model.js'
import {
  getAllDownloads,
  deleteDownload,
  clearAllDownloads,
  getTotalStorageUsed,
  subscribeDownloads,
  isNativeApp,
  getPreferredDownloadQuality,
  setPreferredDownloadQuality,
  isAutoDeleteWatchedEnabled,
  setAutoDeleteWatched,
} from '../offline/downloadEngine'
import OfflinePlayerModal from './OfflinePlayerModal'

const allFilters = [
  ['all', 'Todo'],
  ['watching', 'Viendo'],
  ['planned', 'Planeo ver'],
  ['paused', 'En pausa'],
  ['completed', 'Terminados'],
  ['favorites', 'Favoritos'],
  ['downloads', 'Descargas'],
]

const statusLabel = { watching: 'Viendo', planned: 'Planeo ver', paused: 'En pausa', completed: 'Terminado' }
const statusIcon = { watching: Clock3, planned: BookOpen, paused: Pause, completed: Check }

function LibraryCard({ item, onStatusChange, onMarkWatched, onToggleFavorite, onRemove }) {
  const StatusIcon = statusIcon[item.status] || BookOpen
  return <article className="group min-w-0 rounded-2xl border border-slate-200/80 bg-white/80 p-2.5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 320px' }}>
    <Poster {...item} title={item.t} className="aspect-[3/4] rounded-xl" />
    <div className="px-0.5 pt-2">
      <p className="truncate text-sm font-bold" title={item.t}>{item.t}</p>
      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><StatusIcon size={12} />{statusLabel[item.status] || item.s}{item.year ? ` · ${item.year}` : ''}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <select value={item.status || 'planned'} onChange={(event) => onStatusChange(item.id, event.target.value)} aria-label={`Estado de ${item.t}`} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-1.5 py-1 text-[10px] text-slate-500 outline-none dark:border-white/10">
          <option value="watching">Viendo</option><option value="planned">Planeo ver</option><option value="paused">En pausa</option><option value="completed">Terminado</option>
        </select>
        <button onClick={() => onToggleFavorite(item.id)} aria-label={item.favorite ? `Quitar ${item.t} de favoritos` : `Marcar ${item.t} como favorito`} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${item.favorite ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}><Heart size={13} className={item.favorite ? 'fill-white' : ''} /></button>
        <button onClick={() => onRemove(item.id)} aria-label={`Quitar ${item.t} de la biblioteca`} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"><Trash2 size={13} /></button>
      </div>
      {item.status !== 'completed' && <button onClick={() => onMarkWatched(item.id)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-500 hover:text-white"><Check size={12} />Marcar visto</button>}
    </div>
  </article>
}

export default function LibraryPage({ query = '', onDiscover }) {
  const { profile, profileStatus, updateAnimeList, recordActivity } = useProfile()
  const [downloads, setDownloads] = useState([])
  const [storageStats, setStorageStats] = useState({ bytes: 0, formatted: '0 MB', count: 0 })
  const filters = allFilters.filter(([id]) => id !== 'downloads' || isNativeApp() || downloads.length > 0)
  const [filter, setFilter] = useState('all')
  const [playingOfflineEpisode, setPlayingOfflineEpisode] = useState(null)
  const [preferredQuality, setPreferredQuality] = useState(() => getPreferredDownloadQuality())
  const [autoDelete, setAutoDelete] = useState(() => isAutoDeleteWatchedEnabled())

  const library = Array.isArray(profile.animeList) ? profile.animeList : []
  const normalizedQuery = query.trim().toLowerCase()

  // Cargar y suscribirse a descargas locales
  useEffect(() => {
    let isCancelled = false
    const refreshDownloads = async () => {
      try {
        const [items, stats] = await Promise.all([getAllDownloads(), getTotalStorageUsed()])
        if (!isCancelled) {
          setDownloads(items)
          setStorageStats(stats)
        }
      } catch {}
    }

    refreshDownloads()
    const unsubscribe = subscribeDownloads(refreshDownloads)
    return () => {
      isCancelled = true
      unsubscribe()
    }
  }, [])

  const visible = library.filter((item) => {
    const matchesFilter = filter === 'all' || (filter === 'favorites' ? item.favorite : item.status === filter)
    const matchesQuery = !normalizedQuery || `${item.t} ${item.q}`.toLowerCase().includes(normalizedQuery)
    return matchesFilter && matchesQuery
  })

  const visibleDownloads = downloads.filter((item) => {
    if (!normalizedQuery) return true
    return `${item.animeTitle} ${item.episodeTitle}`.toLowerCase().includes(normalizedQuery)
  })

  const update = (id, patch) => updateAnimeList((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const toggleFavorite = (id) => {
    const item = library.find((entry) => entry.id === id)
    if (!item) return
    const next = !item.favorite
    update(id, { favorite: next })
    recordActivity?.('favorite', `${next ? 'Marcó' : 'Quitó'} “${item.t}” ${next ? 'como favorito' : 'de favoritos'}`)
  }
  const markWatched = async (id) => {
    const item = library.find((entry) => entry.id === id)
    if (!item) return
    let next = markAnimeWatched(item)
    const animeId = Number(item.id)
    if (!item.genres?.length && Number.isInteger(animeId)) {
      try { next = markAnimeWatched(item, await getAnime(animeId)) } catch {}
    }
    const result = await updateAnimeList((items) => items.map((entry) => entry.id === id ? next : entry))
    recordActivity?.('completed', `Terminó de ver “${item.t}”`)
    return result
  }
  const remove = (id) => {
    const item = library.find((entry) => entry.id === id)
    updateAnimeList((items) => items.filter((entry) => entry.id !== id))
    if (item) recordActivity?.('library', `Quitó “${item.t}” de su biblioteca`)
  }

  const handleDeleteDownload = async (animeId, episodeNumber) => {
    await deleteDownload(animeId, episodeNumber)
  }

  const handleClearAllDownloads = async () => {
    if (window.confirm('¿Deseas eliminar todos los episodios descargados de este dispositivo para liberar espacio?')) {
      await clearAllDownloads()
    }
  }

  if (profileStatus === 'loading') return <div className="card grid min-h-64 place-items-center p-8 text-sm text-slate-500">Cargando tu biblioteca…</div>

  return <section className="space-y-5 pb-10 animate-fade">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Biblioteca</h1>
        <p className="text-sm text-slate-500">Todo lo que has agregado y tus episodios guardados sin conexión.</p>
      </div>
      <span className="rounded-full bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand">
        {filter === 'downloads' ? `${downloads.length} ${downloads.length === 1 ? 'descarga' : 'descargas'}` : `${library.length} ${library.length === 1 ? 'obra' : 'obras'}`}
      </span>
    </div>

    <div className="scroll-hide flex gap-2 overflow-x-auto pb-1">
      {filters.map(([id, label]) => {
        const isDownloads = id === 'downloads'
        const count = isDownloads ? downloads.length : 0
        return (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition flex items-center gap-1.5 ${
              filter === id
                ? 'bg-brand text-white shadow-md shadow-brand/25'
                : 'bg-white text-slate-600 dark:bg-white/5 dark:text-slate-300'
            }`}
          >
            {isDownloads && <Download size={13} className={filter === id ? 'text-white' : 'text-brand'} />}
            <span>{label}</span>
            {id === 'favorites' && <Heart size={12} className="ml-1 inline" />}
            {isDownloads && count > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${filter === id ? 'bg-white/25 text-white' : 'bg-brand/10 text-brand'}`}>
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>

    {/* Vista especial de Descargas (Offline estilo Netflix / Crunchyroll) */}
    {filter === 'downloads' ? (
      <div className="space-y-4">
        {downloads.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Almacenamiento: <strong className="text-brand font-bold">{storageStats.formatted}</strong> usados ({downloads.length} episodios listos sin conexión)</span>
              </div>
              <button
                onClick={handleClearAllDownloads}
                className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 hover:underline transition"
              >
                Liberar espacio (Borrar todo)
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Calidad de descarga:</span>
                <select
                  value={preferredQuality}
                  onChange={(e) => {
                    const val = e.target.value
                    setPreferredQuality(val)
                    setPreferredDownloadQuality(val)
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 outline-none dark:border-white/15 dark:bg-slate-800 dark:text-white"
                  aria-label="Calidad de descarga preferida"
                >
                  <option value="auto">Automática (Mejor)</option>
                  <option value="1080p">1080p (FHD)</option>
                  <option value="720p">720p (HD Ligero)</option>
                  <option value="480p">480p (Ahorro de espacio)</option>
                </select>
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoDelete}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setAutoDelete(checked)
                    setAutoDeleteWatched(checked)
                  }}
                  className="rounded border-slate-300 text-brand focus:ring-brand h-4 w-4"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  Eliminar automáticamente episodios tras verlos
                </span>
              </label>
            </div>
          </div>
        )}

        {!downloads.length ? (
          <div className="card grid min-h-72 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-brand/10 text-brand shadow-inner">
                <Download size={30} />
              </span>
              <h2 className="mt-4 text-xl font-bold">Tus descargas para viajar</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Descarga episodios desde la ficha de cualquier anime y míralos cuando salgas de viaje, en el avión o cuando no tengas internet.
              </p>
              {onDiscover && (
                <button
                  onClick={onDiscover}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition hover:-translate-y-0.5"
                >
                  <Plus size={15} />
                  Explorar catálogo de anime
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleDownloads.map((item) => (
              <article
                key={item.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-white/5"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '0 160px' }}
              >
                <div className="flex gap-3">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                    <img
                      src={item.animeCover}
                      alt={item.animeTitle}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-white">
                      EP {item.episodeNumber}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate text-slate-900 dark:text-white" title={item.animeTitle}>
                      {item.animeTitle}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                      {item.episodeTitle}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                        <WifiOff size={10} /> {item.sizeFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-white/5">
                  <button
                    onClick={() => setPlayingOfflineEpisode(item)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-brand text-white text-xs font-bold hover:brightness-110 active:scale-95 transition shadow-sm shadow-brand/25"
                  >
                    <Play size={13} className="fill-white" />
                    Reproducir offline
                  </button>
                  <button
                    onClick={() => handleDeleteDownload(item.animeId, item.episodeNumber)}
                    className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                    title="Eliminar descarga"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    ) : (
      /* Vistas estándar de Biblioteca */
      !library.length ? (
        <div className="card grid min-h-72 place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
              <BookOpen size={25} />
            </span>
            <h2 className="mt-4 text-xl font-bold">Tu biblioteca está vacía</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Agrega anime desde el catálogo o desde las recomendaciones de Para ti y aparecerá aquí.
            </p>
            {onDiscover && (
              <button
                onClick={onDiscover}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/25 transition hover:-translate-y-0.5"
              >
                <Plus size={15} />
                Explorar anime
              </button>
            )}
          </div>
        </div>
      ) : visible.length ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((item) => (
            <LibraryCard
              key={item.id}
              item={item}
              onStatusChange={(id, status) => (status === 'completed' ? markWatched(id) : update(id, { status }))}
              onMarkWatched={markWatched}
              onToggleFavorite={toggleFavorite}
              onRemove={remove}
            />
          ))}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="font-semibold">No hay obras en este filtro</p>
          <p className="mt-1 text-sm text-slate-500">Prueba con otra categoría o agrega más títulos.</p>
        </div>
      )
    )}

    {/* Reproductor offline modal */}
    {playingOfflineEpisode && (
      <OfflinePlayerModal
        episode={playingOfflineEpisode}
        onClose={() => setPlayingOfflineEpisode(null)}
      />
    )}
  </section>
}

