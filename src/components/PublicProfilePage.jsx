import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, BookOpen, Check, Copy, Eye, Heart, List, LockKeyhole, Sparkles } from 'lucide-react'
import Poster from './Poster'
import ProfileComments from './ProfileComments'
import { selectAnimeSections } from '../profile/profileData'
import { selectVisibleProfile } from '../profile/publicProfile'
import { getPublicProfileHash } from '../profile/navigation'
import { getPublicProfileAvatarClass } from '../ui/profileLayout.js'
import AvatarFrame from './AvatarFrame'
import ProfileThemeBackground from './ProfileThemeBackground'
import ProfileShowcase from './ProfileShowcase'

const tabs = [
  ['overview', 'Resumen', Sparkles],
  ['animeList', 'AnimeList', BookOpen],
  ['favorites', 'Favoritos', Heart],
  ['lists', 'Listas', List],
  ['activity', 'Actividad', Activity],
]

const groups = [
  ['watching', 'Viendo ahora', 'text-emerald-500'],
  ['planned', 'Planeo ver', 'text-blue-500'],
  ['paused', 'En pausa', 'text-amber-500'],
  ['completed', 'Terminados', 'text-emerald-500'],
  ['favorites', 'Favoritos', 'text-pink-500'],
]

function Avatar({ profile }) {
  return (
    <div className={`relative shrink-0 ${getPublicProfileAvatarClass()} group`}>
      <AvatarFrame
        profile={profile}
        frameId={profile?.avatarFrame}
        size="lg"
      />
    </div>
  )
}

function Banner({ profile }) {
  const isGif = typeof profile?.banner === 'string' && (profile.banner.toLowerCase().includes('.gif') || profile.banner.startsWith('data:image/gif'))
  return <div className="relative h-36 overflow-hidden bg-gradient-to-r from-[#22153d] via-brand/90 to-[#f08ab8] md:h-52">
    {profile.banner && <img src={profile.banner} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none' }} />}
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
    {isGif && <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-black tracking-wider uppercase text-pink-300 border border-pink-400/30 shadow-md">GIF animado</span>}
  </div>
}

function AnimeCard({ item }) {
  return <article className="min-w-0">
    <Poster {...item} title={item.t} className="aspect-[3/3.7] rounded-2xl shadow-sm" />
    <p className="mt-2 truncate text-sm font-bold">{item.t}</p>
    <p className="truncate text-[11px] text-slate-500">{item.s}</p>
  </article>
}

function Restricted({ section }) {
  return <div className="card grid min-h-44 place-items-center border-dashed p-6 text-center"><div><LockKeyhole className="mx-auto text-slate-400" size={22} /><p className="mt-2 font-semibold">Este apartado es privado</p><p className="mt-1 text-sm text-slate-500">La persona propietaria no comparte {section} con este tipo de visitante.</p></div></div>
}

export default function PublicProfilePage({ profile, viewer = {}, library = profile.animeList || [], onBack, onFriendRequest }) {
  const visibility = selectVisibleProfile(profile, viewer)
  const sections = useMemo(() => selectAnimeSections(library), [library])
  const visibleSectionKey = visibility.visibleSections.join('|')
  const availableTabs = useMemo(() => tabs.filter(([id]) => id === 'overview' || visibility.visibleSections.includes(id)), [visibleSectionKey])
  const [active, setActive] = useState('overview')
  const [relationship, setRelationship] = useState(viewer.relationship || 'none')
  const [friendRequesting, setFriendRequesting] = useState(false)
  const [friendError, setFriendError] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  useEffect(() => {
    if (!availableTabs.some(([id]) => id === active)) setActive('overview')
  }, [active, availableTabs])

  const featured = library.find((item) => item.q === profile.featuredAnimeId) || library.find((item) => item.s.startsWith('Favorito')) || library[0]
  const sharedWorks = ['watching', 'planned', 'paused', 'completed'].reduce((total, id) => total + sections[id].length, 0)
  const stats = [
    [visibility.visibleSections.includes('animeList') ? sharedWorks : '—', 'Obras'],
    [visibility.visibleSections.includes('favorites') ? sections.favorites.length : '—', 'Favoritos'],
    [visibility.visibleSections.includes('lists') ? profile.customLists.length : '—', 'Listas'],
  ]
  const requestFriendship = async () => {
    if (!onFriendRequest) return
    setFriendError('')
    setFriendRequesting(true)
    const result = await onFriendRequest()
    if (result?.error) setFriendError(result.error)
    else setRelationship('pending')
    setFriendRequesting(false)
  }
  const copyProfileLink = async () => {
    if (typeof window === 'undefined') return
    const link = `${window.location.origin}${window.location.pathname}${window.location.search}${getPublicProfileHash(profile.username)}`
    setCopyError('')
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(link)
      else {
        const input = document.createElement('textarea')
        input.value = link
        input.setAttribute('readonly', '')
        input.style.position = 'fixed'
        input.style.opacity = '0'
        document.body.appendChild(input)
        input.select()
        const copiedByFallback = document.execCommand('copy')
        input.remove()
        if (!copiedByFallback) throw new Error('copy failed')
      }
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2200)
    } catch { setCopyError('No se pudo copiar el enlace. Puedes copiarlo desde la barra del navegador.') }
  }

  const hasCustomTheme = profile.profileTheme && profile.profileTheme !== 'default'

  return <div className={`relative ${hasCustomTheme ? 'rounded-[32px] p-2 sm:p-4 lg:p-6 overflow-hidden' : ''} space-y-5 pb-10 animate-fade`}>
    {/* Fondo Temático Animado estilo Steam para todo el perfil público */}
    <ProfileThemeBackground themeId={profile.profileTheme} className="opacity-95" />

    <div className="relative z-10 space-y-5">
      <section className={`overflow-hidden rounded-[26px] border transition-all ${
        hasCustomTheme
          ? 'border-white/40 bg-white/80 dark:border-white/10 dark:bg-[#171723]/80 backdrop-blur-xl shadow-2xl'
          : 'border-white/80 bg-white/90 dark:border-white/5 dark:bg-[#171723] shadow-sm'
      }`}>
        <Banner profile={profile} />
        <div className="relative z-10 px-5 pb-5 md:px-8">
          <div className="-mt-12 flex flex-wrap items-end gap-4 md:-mt-14">
            <Avatar profile={profile} />
            <div className="min-w-[180px] flex-1 pb-1"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{profile.displayName}</h1><span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-1 text-[10px] font-semibold text-brand"><Eye size={11} /> Perfil público</span></div><p className="text-sm text-slate-500">@{profile.username}</p></div>
            <div className="flex flex-wrap gap-2">
              {!visibility.canEdit && onFriendRequest && <button onClick={requestFriendship} disabled={friendRequesting || relationship !== 'none'} className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{friendRequesting ? 'Enviando…' : relationship === 'pending' ? 'Solicitud enviada' : relationship === 'accepted' ? 'Amigos' : 'Agregar amigo'}</button>}
              <button onClick={copyProfileLink} disabled={!getPublicProfileHash(profile.username)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand disabled:opacity-50 dark:border-white/10 dark:text-slate-200" aria-label="Copiar enlace del perfil">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Enlace copiado' : 'Compartir perfil'}</button>
              {onBack && <button onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand dark:border-white/10 dark:text-slate-200"><ArrowLeft size={15} /> Volver</button>}
            </div>
          </div>
          {copyError && <p role="alert" className="mt-3 text-xs font-medium text-amber-600">{copyError}</p>}
          <div className="mt-4 max-w-2xl"><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{profile.bio || 'Este perfil aún no tiene una bio pública.'}</p>{profile.status && <p className="mt-2 text-xs font-medium text-brand">{profile.status}</p>}</div>
          {friendError && <p role="alert" className="mt-3 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600">{friendError}</p>}
          <div className="mt-5 grid grid-cols-2 divide-x divide-y divide-slate-200 rounded-2xl border border-slate-200/80 bg-slate-50/70 sm:grid-cols-3 sm:divide-y-0 dark:divide-white/10 dark:bg-white/5">{stats.map(([value, label]) => <div key={label} className="px-4 py-3 text-center"><p className="text-xl font-extrabold">{value}</p><p className="text-[11px] text-slate-500">{label}</p></div>)}</div>
        </div>
      </section>

      {active === 'overview' && <ProfileComments profile={profile} viewer={viewer} />}

      <nav className="scroll-hide flex gap-1 overflow-x-auto rounded-2xl bg-white/70 p-1.5 shadow-sm dark:bg-white/5" aria-label="Secciones públicas del perfil">{availableTabs.map(([id, label, Icon]) => <button key={id} onClick={() => setActive(id)} aria-pressed={active === id} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${active === id ? 'bg-brand text-white shadow-md shadow-brand/25' : 'text-slate-500 hover:bg-slate-100 hover:text-brand dark:hover:bg-white/10'}`}><Icon size={15} />{label}</button>)}</nav>

      {active === 'overview' && <div className="space-y-5">
        {/* Vitrina de Obra Maestra (Showcase estilo Steam) */}
        {visibility.visibleSections.includes('favorites') && (
          <ProfileShowcase
            profile={profile}
            library={library}
            isOwner={false}
          />
        )}

        {/* AnimeList compartido */}
        <section className="card p-5 min-w-0">
          <div className="mb-4">
            <h2 className="text-lg font-bold">AnimeList compartido</h2>
            <p className="text-xs text-slate-500">Lo que este perfil ha decidido mostrar.</p>
          </div>
          {visibility.visibleSections.includes('animeList') ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {groups.map(([id, label, color]) => (
                <div key={id} className="rounded-2xl border border-slate-200/80 p-3 dark:border-white/10 min-w-0">
                  <span className={`text-xs font-semibold ${color}`}>●</span>
                  <p className="mt-3 text-2xl font-extrabold">{sections[id].length}</p>
                  <p className="text-xs text-slate-500 truncate" title={label}>{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <Restricted section="su AnimeList" />
          )}
        </section>
      </div>}

      {active === 'animeList' && (visibility.visibleSections.includes('animeList') ? <section className="space-y-5"><div><h2 className="text-2xl font-extrabold">AnimeList</h2><p className="text-sm text-slate-500">La biblioteca que este perfil comparte.</p></div>{groups.map(([id, label]) => <section key={id}><div className="mb-3 flex items-center gap-2"><h3 className="font-bold">{label}</h3><span className="text-xs text-slate-500">{sections[id].length}</span></div>{sections[id].length ? <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">{sections[id].map((item) => <AnimeCard key={item.q} item={item} />)}</div> : <p className="text-sm text-slate-500">No hay títulos compartidos en esta sección.</p>}</section>)}</section> : <Restricted section="su AnimeList" />)}
      {active === 'favorites' && (visibility.visibleSections.includes('favorites') ? <section><div className="mb-5"><h2 className="text-2xl font-extrabold">Favoritos</h2><p className="text-sm text-slate-500">Las historias que este perfil ha elegido compartir.</p></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">{sections.favorites.map((item) => <AnimeCard key={item.q} item={item} />)}</div></section> : <Restricted section="sus favoritos" />)}
      {active === 'lists' && (visibility.visibleSections.includes('lists') ? <section><div className="mb-5"><h2 className="text-2xl font-extrabold">Listas</h2><p className="text-sm text-slate-500">Colecciones compartidas por este perfil.</p></div>{profile.customLists.length ? <div className="grid gap-4 md:grid-cols-2">{profile.customLists.map((list) => <article key={list.id} className="card p-5" style={{ borderColor: `${list.accent}55` }}><h3 className="font-bold">{list.title}</h3><p className="mt-1 text-xs text-slate-500">{list.description || 'Sin descripción'}</p><p className="mt-4 text-xs text-slate-500">{list.animeIds.length} obras</p></article>)}</div> : <p className="text-sm text-slate-500">Este perfil todavía no comparte listas.</p>}</section> : <Restricted section="sus listas" />)}
      {active === 'activity' && (visibility.visibleSections.includes('activity') ? <section><div className="mb-5"><h2 className="text-2xl font-extrabold">Actividad</h2><p className="text-sm text-slate-500">Actividad que este perfil decidió compartir.</p></div>{profile.activity?.length ? <div className="space-y-2">{profile.activity.slice().reverse().map((item) => <div key={item.id} className="flex items-start gap-3 rounded-xl bg-white/60 p-3 dark:bg-white/5"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand/10 text-brand"><Activity size={15} /></span><div><p className="text-sm font-medium">{item.label}</p><p className="mt-0.5 text-[11px] text-slate-500">{new Date(item.at).toLocaleDateString('es-GT')}</p></div></div>)}</div> : <p className="text-sm text-slate-500">Este perfil todavía no comparte actividad.</p>}</section> : <Restricted section="su actividad" />)}
    </div>
  </div>
}
