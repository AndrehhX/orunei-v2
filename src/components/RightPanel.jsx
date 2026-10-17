import { ArrowRight, Flame, Users, UserRound, Sparkles } from 'lucide-react'
import Poster from './Poster'
import { useNews, NewsLink } from '../news'
import { useRec } from '../rec/rec'
import { formatCount } from '../rec/engine.js'
import { useProfile } from '../profile/ProfileProvider'
import { selectTasteGenres, selectTasteMetrics } from '../profile/profileData'
import { useSocial } from '../social/SocialProvider.jsx'
import { getProfileLayoutClasses } from '../ui/profileLayout.js'

const Head = ({ children, onAll, href = '#amigos' }) => <div className="mb-3 flex items-center justify-between"><h3 className="font-bold">{children}</h3>{onAll && <a href={href} onClick={(e) => { e.preventDefault(); onAll?.() }} className="flex items-center gap-1 text-[11px] text-brand">Ver todo <ArrowRight size={12} /></a>}</div>
const Avatar = ({ profile }) => <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-pink-400 text-white">{profile?.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : <UserRound size={15} />}</div>

export default function RightPanel({ onSeeNews, onSeeProfile, onSeeFriends, onOpenProfile, onOpenAnime }) {
  const { items, status: newsStatus } = useNews()
  const { ready: recReady, trends: liveTrends } = useRec()
  const { profile } = useProfile()
  const { friends } = useSocial()
  const profileAvatarClass = getProfileLayoutClasses().avatar
  const tasteGenres = selectTasteGenres(profile.animeList)
  const metrics = selectTasteMetrics(profile.animeList, tasteGenres, profile)
  const newsItems = newsStatus === 'loading' && !items.length ? [0, 1] : items.slice(2, 5)
  const trendRows = liveTrends.map((item) => ({ ...item, q: item.title, t: item.title, y: item.year || '—', v: formatCount(item.trend), grad: 'linear-gradient(135deg,#d9405a,#2a0f3a)' }))
  return (
    <aside className="scroll-hide sticky top-0 hidden h-screen w-[328px] shrink-0 space-y-5 self-start overflow-y-auto py-5 pr-6 xl:block animate-fade">
      <div className="card p-4">
        <div className="mb-2 flex justify-between"><h3 className="font-bold">Tu perfil</h3><a href="#perfil" onClick={(e) => { e.preventDefault(); onSeeProfile?.() }} className="flex items-center gap-1 text-[11px] text-brand">Ver perfil <ArrowRight size={12} /></a></div>
        <div className="relative h-16 overflow-hidden rounded-lg bg-gradient-to-r from-[#3a2a6a] via-[#c06a9a] to-[#f4a6c1]">{profile.banner && <img src={profile.banner} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} className="absolute inset-0 h-full w-full object-cover" />}</div>
        <div className="-mt-7 flex items-end gap-2 px-2"><div className={`${profileAvatarClass} h-[68px] w-[68px] overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-slate-600 to-slate-900 dark:border-[#171723]`}>{profile.avatar && <img src={profile.avatar} alt="" className="h-full w-full object-cover" />}</div>
          <div className="pb-1 leading-tight"><p className="font-bold text-sm">{profile.displayName}</p><p className="text-xs text-slate-500">@{profile.username}</p></div></div>
        <div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 dark:divide-white/10 text-center">
          {[[String(profile.animeList?.length || 0), 'Obras'], [String(profile.customLists.length), 'Listas'], [String(tasteGenres.length), 'Géneros']].map(([a, b]) => <div key={b}><p className="font-bold">{a}</p><p className="text-[11px] text-slate-500">{b}</p></div>)}
        </div>
      </div>
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold">Tus gustos</h3>
            <p className="text-[10px] font-semibold text-brand flex items-center gap-1 mt-0.5">
              <Sparkles size={11} /> {metrics.archetype}
            </p>
          </div>
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">{metrics.calibrationPct}% Peak</span>
        </div>
        {tasteGenres.length ? tasteGenres.map((g) => (
          <div key={g.name} className="mb-2.5 last:mb-0"><div className="mb-1 flex justify-between text-[11px]"><span className="font-medium">{g.name}</span><span className="text-slate-500">{g.count}/{g.total}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/70 dark:bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-brand to-pink-400 transition-all duration-700 ease-smooth" style={{ width: g.pct + '%' }} /></div></div>
        )) : <p className="text-xs leading-5 text-slate-500">{profile.animeList?.length ? 'Reproduce un anime o marca favoritos para calibrar tus gustos.' : 'Añade obras a tu AnimeList y este resumen se actualizará con sus géneros.'}</p>}
      </div>
      <div className="card p-4">
        <Head onAll={onSeeFriends}><span className="inline-flex items-center gap-2"><Users size={16} className="text-brand" />Amigos</span></Head>
        {friends.length ? friends.slice(0, 4).map((friendship) => <button key={friendship.id} onClick={() => friendship.profile?.username && onOpenProfile?.(friendship.profile.username)} className="flex w-full items-center gap-2.5 py-2 text-left"><Avatar profile={friendship.profile} /><div className="min-w-0 leading-tight"><p className="truncate text-sm font-semibold">{friendship.profile?.displayName || 'Perfil de Orunei'}</p><p className="truncate text-[11px] text-slate-500">@{friendship.profile?.username || 'usuario'}</p></div></button>) : <div className="space-y-2"><p className="text-xs leading-5 text-slate-500">Busca perfiles y conecta con personas reales.</p><button onClick={onSeeFriends} className="text-xs font-semibold text-brand transition hover:translate-x-0.5">Buscar perfiles <ArrowRight size={12} className="inline" /></button></div>}
      </div>
      <div className="card p-4">
        <Head>Tendencias hoy</Head>
        {!recReady && Array.from({ length: 5 }, (_, i) => <div key={i} className="my-2 flex h-[46px] animate-pulse items-center gap-3 rounded-lg bg-slate-200/60 dark:bg-white/5" />)}
        {recReady && trendRows.length ? trendRows.map((t, i) => (
          <button key={t.t} type="button" onClick={() => onOpenAnime?.(t)} className="group flex w-full items-center gap-3 rounded-lg py-1.5 text-left transition-transform duration-300 hover:translate-x-1">
            <span className="w-3 text-sm font-bold">{i + 1}</span><Poster {...t} title="" className="h-[46px] w-[46px] shrink-0 rounded-lg" /><div className="min-w-0 leading-tight"><p className="truncate text-sm font-semibold">{t.t}</p><p className="text-[11px] text-slate-500">Anime · {t.y}</p></div><span className="ml-auto flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300"><Flame size={14} className="text-orange-500" />{t.v}</span>
          </button>
        )) : recReady && <p className="py-2 text-xs text-slate-500">No hay tendencias disponibles ahora.</p>}
      </div>
      <div className="card p-4">
        <Head onAll={onSeeNews} href="#noticias">Noticias destacadas</Head>
        {!newsItems.length && newsStatus === 'error' && <p className="py-2 text-xs text-slate-500">Las fuentes no están disponibles ahora.</p>}
        {newsItems.map((f, i) => f === i ? <div key={i} className="my-2 h-[62px] animate-pulse rounded-lg bg-slate-200/60 dark:bg-white/5" /> : <NewsLink key={f.id} n={f} className="group flex cursor-pointer gap-3 rounded-lg py-2 transition-transform duration-300 hover:translate-x-1"><Poster img={f.img} q={f.q} grad={f.grad} wide title="" className="h-[62px] w-[98px] shrink-0 rounded-lg" /><div className="min-w-0 leading-snug"><p className="line-clamp-2 text-[13px] font-bold">{f.t}</p><p className="text-[11px] text-slate-500">{f.s} · {f.h}</p></div></NewsLink>)}
      </div>
    </aside>
  )
}
