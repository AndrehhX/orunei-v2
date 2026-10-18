import { useMemo, useState } from 'react'
import { Activity, ArrowDown, ArrowUp, BookOpen, Check, ChevronRight, Eye, Globe, Heart, List, LockKeyhole, Pencil, PlayCircle, Plus, Sparkles, Trash2, X } from 'lucide-react'
import Poster from './Poster'
import PublicProfilePage from './PublicProfilePage'
import ProfileAnimeListManager from './ProfileAnimeListManager'
import { useProfile } from '../profile/ProfileProvider'
import { selectAnimeSections, selectProfileStats, selectRecentActivity, selectTasteGenres, selectTasteMetrics } from '../profile/profileData'
import { addAnimeToList, createCustomList, deleteCustomList, moveCustomList, removeAnimeFromList, updateCustomList } from '../profile/profileLists'
import { getProfileLayoutClasses } from '../ui/profileLayout.js'
import { getAnime } from '../api/anime'
import { markAnimeWatched } from '../profile/model.js'
import AvatarFrame from './AvatarFrame'
import ProfileThemeBackground from './ProfileThemeBackground'
import ProfileShowcase from './ProfileShowcase'
import ProfileComments from './ProfileComments'

const tabs = [
  ['overview', 'Resumen', Sparkles],
  ['animelist', 'AnimeList', BookOpen],
  ['favorites', 'Favoritos', Heart],
  ['lists', 'Listas', List],
  ['activity', 'Actividad', Activity],
]
const groups = [
  ['watching', 'Viendo ahora', PlayCircle, 'text-emerald-500'],
  ['planned', 'Planeo ver', BookOpen, 'text-blue-500'],
  ['paused', 'En pausa', PlayCircle, 'text-amber-500'],
  ['completed', 'Terminados', Check, 'text-emerald-500'],
  ['favorites', 'Favoritos', Heart, 'text-pink-500'],
]

function Avatar({ profile, large = false }) {
  return (
    <div className={`relative ${large ? getProfileLayoutClasses().avatar : ''} group`}>
      <AvatarFrame
        profile={profile}
        frameId={profile?.avatarFrame}
        size={large ? 'lg' : 'sm'}
      />
    </div>
  )
}

function Banner({ src, className = '' }) {
  return <div className={`relative overflow-hidden bg-gradient-to-r from-[#22153d] via-brand/90 to-[#f08ab8] ${className}`}>
    {src && <img src={src} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} className="absolute inset-0 h-full w-full object-cover" />}
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
  </div>
}

function AnimeCard({ item, onStatusChange, onMarkWatched, onToggleFavorite }) {
  return <article className="group min-w-0">
    <Poster {...item} title={item.t} className="aspect-[3/3.7] rounded-2xl shadow-sm transition duration-500 ease-spring group-hover:-translate-y-1 group-hover:shadow-xl" />
    <p className="mt-2 truncate text-sm font-bold text-slate-800 dark:text-slate-100">{item.t}</p>
    <div className="mt-1 flex items-center gap-2">
      <select
        value={item.status || 'planned'}
        onChange={(event) => onStatusChange?.(item.id, event.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151522] px-1.5 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-200 outline-none"
      >
        <option value="watching" className="bg-white dark:bg-[#151522] text-slate-900 dark:text-slate-100">Viendo</option>
        <option value="planned" className="bg-white dark:bg-[#151522] text-slate-900 dark:text-slate-100">Planeo ver</option>
        <option value="paused" className="bg-white dark:bg-[#151522] text-slate-900 dark:text-slate-100">En pausa</option>
        <option value="completed" className="bg-white dark:bg-[#151522] text-slate-900 dark:text-slate-100">Terminado</option>
      </select>
      <button onClick={() => onToggleFavorite?.(item.id)} aria-label={item.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${item.favorite ? 'bg-pink-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}><Heart size={13} className={item.favorite ? 'fill-white' : ''} /></button>
    </div>
    {item.status !== 'completed' && <button onClick={() => onMarkWatched?.(item.id)} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-500 hover:text-white"><Check size={12} />Marcar visto</button>}
  </article>
}

function EmptyState({ title, detail, action }) {
  return <div className="card col-span-full grid min-h-40 place-items-center border-dashed p-6 text-center">
    <div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-slate-500">{detail}</p>{action}</div>
  </div>
}

function ActivityList({ activity }) {
  if (!activity.length) return <EmptyState title="Todavía no hay actividad" detail="Tus cambios de perfil y listas aparecerán aquí." />
  return <div className="space-y-2">{activity.map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl bg-white/60 p-3 dark:bg-white/5"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"><Activity size={15} /></span><div className="min-w-0"><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-[11px] text-slate-500">{new Date(item.at).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })}</p></div></div>)}</div>
}

export default function ProfilePage({ onEdit, onOpenDonation }) {
  const { profile, profileStatus, updateCustomLists, updateAnimeList, recordActivity, storageError } = useProfile()
  const [active, setActive] = useState(profile.landingSection || 'overview')
  const [publicView, setPublicView] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const [newListDescription, setNewListDescription] = useState('')
  const [listAnimeDraft, setListAnimeDraft] = useState({})
  const [deletePending, setDeletePending] = useState(null)
  const profileLibrary = profile.animeList || []
  const library = profileLibrary
  const sections = useMemo(() => selectAnimeSections(profileLibrary), [profileLibrary])
  const tasteGenres = useMemo(() => selectTasteGenres(profileLibrary), [profileLibrary])
  const stats = selectProfileStats(profileLibrary, tasteGenres.length, profile)
  const metrics = useMemo(() => selectTasteMetrics(profileLibrary, tasteGenres, profile), [profileLibrary, tasteGenres, profile])
  const activity = selectRecentActivity(profile, profileLibrary)
  const layout = getProfileLayoutClasses()
  const featured = profileLibrary.find((item) => item.q === profile.featuredAnimeId) || profileLibrary.find((item) => item.favorite) || profileLibrary[0]
  const changeAnime = (id, patch) => updateAnimeList((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item))
  const toggleFavorite = (id) => {
    const item = profileLibrary.find((entry) => entry.id === id)
    if (!item) return
    const next = !item.favorite
    changeAnime(id, { favorite: next })
    recordActivity('favorite', `${next ? 'Marcó' : 'Quitó'} “${item.t}” ${next ? 'como favorito' : 'de favoritos'}`)
  }
  const markWatched = async (id) => {
    const item = profileLibrary.find((entry) => entry.id === id)
    if (!item) return
    let next = markAnimeWatched(item)
    const animeId = Number(item.id)
    if (!item.genres?.length && Number.isInteger(animeId)) {
      try { next = markAnimeWatched(item, await getAnime(animeId)) } catch {}
    }
    const result = await updateAnimeList((items) => items.map((entry) => entry.id === id ? next : entry))
    recordActivity('completed', `Terminó de ver “${item.t}”`)
    return result
  }
  const changeAnimeStatus = (id, status) => status === 'completed' ? markWatched(id) : changeAnime(id, { status })
  const createList = async () => {
    const list = createCustomList(newListTitle, newListDescription)
    if (!list.title) return
    const result = await updateCustomLists((lists) => [...lists, list])
    if (!result?.ok) return
    recordActivity('list', `Creó la lista “${list.title}”`)
    setNewListTitle(''); setNewListDescription('')
  }
  const editList = (id, patch) => updateCustomLists((lists) => updateCustomList(lists, id, patch))
  const removeList = async (list) => { const result = await updateCustomLists((lists) => deleteCustomList(lists, list.id)); if (!result?.ok) return; recordActivity('list', `Eliminó la lista “${list.title}”`) }
  const moveList = (list, direction) => updateCustomLists((lists) => moveCustomList(lists, list.id, direction))
  const addToList = async (list) => {
    const animeId = listAnimeDraft[list.id]
    if (!animeId) return
    const result = await updateCustomLists((lists) => addAnimeToList(lists, list.id, animeId))
    if (!result?.ok) return
    recordActivity('list', `Añadió una obra a “${list.title}”`)
    setListAnimeDraft((current) => ({ ...current, [list.id]: '' }))
  }
  const removeFromList = async (list, animeId) => { const result = await updateCustomLists((lists) => removeAnimeFromList(lists, list.id, animeId)); if (!result?.ok) return; recordActivity('list', `Quitó una obra de “${list.title}”`) }

  if (publicView) return <PublicProfilePage profile={profile} viewer={{ id: 'public-preview', profileId: 'profile-owner', relationship: 'none', preview: true }} onBack={() => setPublicView(false)} />

  if (profileStatus === 'loading') return <div className="card grid min-h-64 place-items-center p-8 text-sm text-slate-500">Cargando tu perfil…</div>

  const hasCustomTheme = profile.profileTheme && profile.profileTheme !== 'default'

  return <div className={`relative ${hasCustomTheme ? 'rounded-[32px] p-2 sm:p-4 lg:p-6 overflow-hidden' : ''} ${layout.shell} space-y-5 pb-10 animate-fade`}>
    {/* Fondo Temático Animado estilo Steam que cubre todo el perfil */}
    <ProfileThemeBackground themeId={profile.profileTheme} className="opacity-95" />

    <div className="relative z-10 space-y-5">
      {storageError && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{storageError}</p>}
      <ProfileAnimeListManager visible={active === 'animelist'} />
      <section className={`overflow-hidden rounded-[28px] border transition-all ${
        hasCustomTheme
          ? 'border-white/40 bg-white/80 dark:border-white/10 dark:bg-[#141523]/80 backdrop-blur-xl shadow-2xl'
          : 'border-white/80 bg-white/95 dark:border-white/10 dark:bg-[#141523] shadow-lg shadow-black/5'
      }`}>
        <Banner src={profile.banner} className="h-36 bg-cover bg-center sm:h-44 lg:h-52 relative z-10" />
      <div className="relative z-10 min-w-0 px-5 pb-6 md:px-8">
        <div className="-mt-14 flex min-w-0 flex-wrap items-end gap-4 md:-mt-16">
          <Avatar profile={profile} large />
          <div className={layout.identity}>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-2xl font-black tracking-tight md:text-3xl bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                {profile.displayName}
              </h1>
              {profile.visibility === 'public' ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/15 border border-brand/30 px-2.5 py-0.5 text-[10px] font-bold text-brand shadow-xs">
                  <Globe size={11} /> Perfil público
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 shadow-xs">
                  <LockKeyhole size={11} /> Perfil privado
                </span>
              )}
            </div>
            <p className="truncate text-xs sm:text-sm font-semibold text-slate-400">@{profile.username}</p>
          </div>
          <div className={layout.actions}>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-brand/30 transition hover:-translate-y-0.5 hover:brightness-110 active:scale-95"
              >
                <Pencil size={15} /> Editar perfil
              </button>
            )}
            <button
              type="button"
              onClick={() => setPublicView(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white/60 dark:bg-white/5 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand dark:border-white/10 dark:text-slate-200 shadow-xs active:scale-95"
            >
              <Eye size={15} /> Vista pública
            </button>
          </div>
        </div>
        <div className="mt-4 max-w-2xl">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.bio || 'Añade una bio para contar qué historias te acompañan.'}</p>
          {profile.status && (
            <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-xs font-semibold text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              <span>{profile.status}</span>
            </div>
          )}
        </div>
        <div className={`${layout.stats} dark:divide-white/10 dark:bg-white/5 shadow-xs overflow-hidden`}>
          {[[stats.works, 'Obras', 'text-brand'], [stats.favorites, 'Favoritos', 'text-pink-500'], [stats.lists, 'Listas', 'text-emerald-500']].map(([value, label, color]) => (
            <div key={label} className="px-4 py-3.5 text-center transition hover:bg-slate-100/50 dark:hover:bg-white/[0.03]">
              <p className={`text-xl sm:text-2xl font-black ${color}`}>{value}</p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    <nav className="scroll-hide flex gap-1 overflow-x-auto rounded-2xl bg-white/70 p-1.5 shadow-sm dark:bg-white/5" aria-label="Secciones del perfil">
      {[...tabs].sort(([a], [b]) => (profile.pinnedSections.includes(a) ? 0 : 1) - (profile.pinnedSections.includes(b) ? 0 : 1)).map(([id, label, Icon]) => <button key={id} onClick={() => setActive(id)} aria-pressed={active === id} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${active === id ? 'bg-brand text-white shadow-md shadow-brand/25' : 'text-slate-500 hover:bg-slate-100 hover:text-brand dark:hover:bg-white/10'}`}><Icon size={15} />{label}</button>)}
    </nav>

    {active === 'overview' && (
      <div className="space-y-5">
        {(profile.overviewOrder || ['showcase', 'comments', 'animeList', 'activity']).map((sectionId) => {
          if (sectionId === 'showcase') {
            return (
              <ProfileShowcase
                key="showcase"
                profile={profile}
                library={profileLibrary}
                isOwner
                onEdit={onEdit}
              />
            )
          }

          if (sectionId === 'comments') {
            return (
              <div key="comments">
                <ProfileComments profile={profile} viewer={{ id: profile.id, profileId: profile.id, isOwner: true }} />
              </div>
            )
          }

          if (sectionId === 'animeList') {
            return (
              <div key="animeList" className="space-y-5">
                {/* Espacio privado de anime */}
                <section className="card p-5 min-w-0">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">Tu espacio de anime</h2>
                      <p className="text-xs text-slate-500">Una vista privada de lo que estás viendo.</p>
                    </div>
                    <button onClick={() => setActive('animelist')} className="text-xs font-semibold text-brand hover:underline">
                      Ver AnimeList <ChevronRight className="inline" size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                    {groups.map(([id, label, Icon, color]) => (
                      <button
                        key={id}
                        onClick={() => setActive('animelist')}
                        className="rounded-2xl border border-slate-200/80 p-3 text-left transition hover:-translate-y-0.5 hover:border-brand/40 dark:border-white/10 min-w-0"
                      >
                        <Icon size={17} className={color} />
                        <p className="mt-3 text-2xl font-extrabold">{sections[id].length}</p>
                        <p className="text-xs text-slate-500 truncate" title={label}>{label}</p>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="card p-5 lg:col-span-3 min-w-0">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-white/10">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold">Tus gustos & Algoritmo</h2>
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-bold text-brand">
                          <Sparkles size={12} className="text-brand" /> {metrics.archetype}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Estadísticas dinámicas sincronizadas con lo que ves, guardas en biblioteca, completas y marcas con me gusta.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs dark:bg-white/5">
                      <span className="text-slate-500">Calibración:</span>
                      <span className="font-extrabold text-brand">{metrics.calibrationPct}%</span>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {metrics.calibrationLabel}
                      </span>
                    </div>
                  </div>

                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-white/5 dark:bg-white/5">
                      <p className="text-[11px] font-medium text-slate-500">Episodios vistos</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white">{metrics.totalEpisodes}</p>
                      <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Progreso activo</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-white/5 dark:bg-white/5">
                      <p className="text-[11px] font-medium text-slate-500">Horas de anime</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white">~{metrics.watchHours} <span className="text-xs font-normal text-slate-500">hrs</span></p>
                      <p className="mt-1 text-[10px] text-slate-400">Estimado en Orunei</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-white/5 dark:bg-white/5">
                      <p className="text-[11px] font-medium text-slate-500">Tasa de finalización</p>
                      <p className="mt-1 text-2xl font-extrabold text-slate-800 dark:text-white">{metrics.completionRate}%</p>
                      <p className="mt-1 text-[10px] font-semibold text-brand">{metrics.completedCount} completadas</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-3.5 dark:border-white/5 dark:bg-white/5">
                      <p className="text-[11px] font-medium text-slate-500">Género dominante</p>
                      <p className="mt-1 truncate text-lg font-extrabold text-brand">{metrics.dominantGenre}</p>
                      <p className="mt-1 text-[10px] text-slate-400">Afinidad principal</p>
                    </div>
                  </div>

                  {tasteGenres.length ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>Distribución de afinidad de géneros</span>
                        <span>Porcentaje relativo</span>
                      </div>
                      {tasteGenres.map((genre, idx) => (
                        <div key={genre.name} className="group">
                          <div className="mb-1.5 flex justify-between text-xs">
                            <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                              <span className="grid h-4 w-4 place-items-center rounded bg-brand/10 text-[10px] font-bold text-brand">
                                {idx + 1}
                              </span>
                              {genre.name}
                            </span>
                            <span className="text-slate-500">
                              {genre.count} {genre.count === 1 ? 'obra' : 'obras'} · <b className="text-brand font-bold">{genre.pct}%</b>
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand via-purple-500 to-pink-400 transition-all duration-700 ease-spring"
                              style={{ width: `${genre.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-white/10">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Algoritmo en fase inicial</p>
                      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                        {profileLibrary.length
                          ? 'Reproduce un episodio o marca como favoritos para que el motor calibre tus estadísticas.'
                          : 'Añade animes a tu AnimeList, reprodúcelos o dales "Me gusta" para ver tus estadísticas en tiempo real.'}
                      </p>
                    </div>
                  )}
                </section>
              </div>
            )
          }

          if (sectionId === 'activity') {
            return (
              <section key="activity" className="card p-5 lg:col-span-3 min-w-0">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold">Actividad reciente</h2>
                  <button onClick={() => setActive('activity')} className="text-xs font-semibold text-brand">
                    Ver todo <ChevronRight className="inline" size={14} />
                  </button>
                </div>
                <ActivityList activity={activity.slice(0, 3)} />
              </section>
            )
          }

          return null
        })}
      </div>
    )}

    {active === 'animelist' && <section className="space-y-5"><div><h2 className="text-2xl font-extrabold">AnimeList</h2><p className="text-sm text-slate-500">Tu biblioteca organizada por estado.</p></div>{groups.map(([id, label, Icon, color]) => <section key={id}><div className="mb-3 flex items-center gap-2"><Icon size={17} className={color} /><h3 className="font-bold">{label}</h3><span className="text-xs text-slate-500">{sections[id].length}</span></div>{sections[id].length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">{sections[id].map((item) => <AnimeCard key={item.q} item={item} onStatusChange={changeAnimeStatus} onMarkWatched={markWatched} onToggleFavorite={toggleFavorite} />)}</div> : <EmptyState title={`No tienes títulos en “${label}”`} detail="Cuando actualices tu biblioteca aparecerán aquí." />}</section>)}</section>}

    {active === 'favorites' && <section><div className="mb-5"><h2 className="text-2xl font-extrabold">Favoritos</h2><p className="text-sm text-slate-500">Las historias que quieres tener siempre a mano.</p></div>{sections.favorites.length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">{sections.favorites.map((item) => <AnimeCard key={item.q} item={item} onStatusChange={changeAnimeStatus} onMarkWatched={markWatched} onToggleFavorite={toggleFavorite} />)}</div> : <div className="card p-8"><EmptyState title="Aún no tienes favoritos" detail="Marca un anime como favorito desde tu biblioteca." /></div>}</section>}

    {active === 'lists' && <section><div className="mb-5"><h2 className="text-2xl font-extrabold">Listas personalizadas</h2><p className="text-sm text-slate-500">Colecciones privadas para organizar tus historias.</p></div><div className="card mb-5 p-4"><div className="flex flex-col gap-2 sm:flex-row"><input value={newListTitle} onChange={(event) => setNewListTitle(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && createList()} placeholder="Nombre de la nueva lista" className="h-10 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-brand dark:border-white/10" /><input value={newListDescription} onChange={(event) => setNewListDescription(event.target.value)} placeholder="Descripción opcional" className="h-10 flex-1 rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none focus:border-brand dark:border-white/10" /><button onClick={createList} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white shadow-md shadow-brand/20"><Plus size={15} /> Crear lista</button></div><p className="mt-2 text-[11px] text-slate-500">Las listas son privadas y se sincronizan con tu cuenta.</p></div>{profile.customLists.length ? <div className="grid gap-4 md:grid-cols-2">{profile.customLists.map((list, index) => <article key={list.id} className="card p-5" style={{ borderColor: `${list.accent}55` }}><div className="flex items-start gap-3"><div className="min-w-0 flex-1"><input value={list.title} onChange={(event) => editList(list.id, { title: event.target.value })} aria-label={`Nombre de ${list.title}`} className="w-full bg-transparent font-bold outline-none focus:text-brand" /><input value={list.description} onChange={(event) => editList(list.id, { description: event.target.value })} placeholder="Añade una descripción" aria-label={`Descripción de ${list.title}`} className="mt-1 w-full bg-transparent text-xs text-slate-500 outline-none" /></div><input type="color" value={list.accent || '#6d5cff'} onChange={(event) => editList(list.id, { accent: event.target.value })} aria-label={`Color de ${list.title}`} className="h-7 w-7 cursor-pointer rounded border-0 bg-transparent p-0" /><div className="flex items-center gap-1"><button onClick={() => moveList(list, -1)} disabled={index === 0} aria-label={`Subir ${list.title}`} className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"><ArrowUp size={14} /></button><button onClick={() => moveList(list, 1)} disabled={index === profile.customLists.length - 1} aria-label={`Bajar ${list.title}`} className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"><ArrowDown size={14} /></button></div>{deletePending === list.id ? <div className="flex items-center gap-1"><button onClick={() => { removeList(list); setDeletePending(null) }} className="rounded-lg bg-red-500 px-2 py-1 text-[10px] font-bold text-white">Confirmar</button><button onClick={() => setDeletePending(null)} aria-label="Cancelar eliminación" className="grid h-7 w-7 place-items-center rounded-full text-slate-400"><X size={14} /></button></div> : <button onClick={() => setDeletePending(list.id)} aria-label={`Eliminar ${list.title}`} className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-red-500/10 hover:text-red-500"><Trash2 size={14} /></button>}</div><div className="mt-4 flex gap-2"><select value={listAnimeDraft[list.id] || ''} onChange={(event) => setListAnimeDraft((current) => ({ ...current, [list.id]: event.target.value }))} aria-label={`Añadir anime a ${list.title}`} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 bg-transparent px-2 text-xs outline-none dark:border-white/10"><option value="">Añadir anime…</option>{library.filter((item) => !list.animeIds.includes(item.q)).map((item) => <option key={item.q} value={item.q}>{item.t}</option>)}</select><button onClick={() => addToList(list)} className="rounded-lg border border-brand px-3 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white">Añadir</button></div><div className="mt-3 flex flex-wrap gap-2">{list.animeIds.length ? list.animeIds.map((animeId) => { const item = library.find((entry) => entry.q === animeId); return <span key={animeId} className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] dark:bg-white/10">{item?.t || animeId}<button onClick={() => removeFromList(list, animeId)} aria-label={`Quitar ${item?.t || animeId}`} className="text-slate-400 hover:text-red-500"><X size={12} /></button></span> }) : <span className="text-xs text-slate-500">Lista vacía. Añade una obra arriba.</span>}</div></article>)}</div> : <EmptyState title="Crea tu primera lista" detail="Agrupa tus anime por tema, mood o cualquier criterio personal." />}</section>}

    {active === 'activity' && <section><div className="mb-5"><h2 className="text-2xl font-extrabold">Actividad</h2><p className="text-sm text-slate-500">Un historial privado de tus cambios en Orunei.</p></div><ActivityList activity={activity} /></section>}
    </div>
  </div>
}
