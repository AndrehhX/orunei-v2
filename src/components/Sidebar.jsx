import { Sparkles, Home, Library, User, Users, Film, MonitorPlay, Gamepad2, Sun, Moon, LogOut, Smartphone } from 'lucide-react'
import { getMainDestination } from '../profile/navigation'
import { useProfile } from '../profile/ProfileProvider'
import { isNativeApp } from '../offline/platform'
import OruneiLogo from './OruneiLogo'

const main = [['Para ti', Home], ['Biblioteca', Library], ['Perfil', User], ['Amigos', Users]]
const explore = [['Anime', Sparkles], ['Películas', Film], ['Series', MonitorPlay]]

export default function Sidebar({ dark, setDark, theme = (dark ? 'dark' : 'light'), setTheme, user, onLogout, page, setPage, onDevelopmentFeature, onOpenDownloadApp }) {
  const { profile } = useProfile()
  return (
    <aside className="hidden lg:flex w-[216px] shrink-0 flex-col px-3 py-6 sticky top-0 h-screen">
      <div className="px-3 mb-8">
        <OruneiLogo size={30} withText={true} textClassName="text-2xl font-black tracking-tight" />
      </div>
      <nav className="space-y-1">
        {main.map(([n, I], i) => (
          <a key={n} href="#" onClick={(e) => { e.preventDefault(); const destination = getMainDestination(n); if (destination) setPage(destination) }} aria-current={(n === 'Para ti' && page === 'home') || (n === 'Biblioteca' && page === 'library') || (n === 'Perfil' && page === 'profile') || (n === 'Amigos' && page === 'friends') ? 'page' : undefined} className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition-all duration-200 hover:translate-x-0.5 ${(n === 'Para ti' && page === 'home') || (n === 'Biblioteca' && page === 'library') || (n === 'Perfil' && page === 'profile') || (n === 'Amigos' && page === 'friends') ? 'bg-brand-soft text-brand dark:bg-brand/20' : 'text-slate-700 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-white/5'}`}>
            {((n === 'Para ti' && page === 'home') || (n === 'Biblioteca' && page === 'library') || (n === 'Perfil' && page === 'profile') || (n === 'Amigos' && page === 'friends')) && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-brand" />}
            <I size={20} />{n}
          </a>
        ))}
      </nav>
      <hr className="my-6 mx-4 border-slate-200 dark:border-white/10" />
      <p className="px-4 mb-2 text-[15px] text-slate-500">Explorar</p>
      <nav className="space-y-1 text-slate-600 dark:text-slate-300">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setPage('anime') }}
          className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition hover:bg-white/70 dark:hover:bg-white/5 ${page === 'anime' ? 'bg-brand-soft font-semibold text-brand dark:bg-brand/20' : ''}`}
        >
          <Sparkles size={19} />
          <span>Anime</span>
        </a>

        {/* ORUNEI PARTY: Una sala. Un anime. Todos sincronizados. */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); setPage('party') }}
          className={`relative flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition hover:bg-white/70 dark:hover:bg-white/5 ${page === 'party' ? 'bg-brand-soft font-bold text-brand dark:bg-brand/20 shadow-sm' : ''}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-base select-none">🍿</span>
            <span>Party</span>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-500 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            En vivo
          </span>
        </a>
      </nav>
      <div className="mt-auto space-y-3">
        {onOpenDownloadApp && !isNativeApp() && (
          <button
            type="button"
            onClick={onOpenDownloadApp}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-bold text-brand bg-brand/10 hover:bg-brand/20 border border-brand/20 transition active:scale-95"
          >
            <Smartphone size={15} />
            <span>App Android (APK)</span>
          </button>
        )}
        <div className="relative inline-flex items-center rounded-full bg-slate-200/70 dark:bg-white/10 p-1 border border-slate-200/80 dark:border-white/5">
          <span
            className={`absolute left-1 top-1 h-8 w-8 rounded-full shadow transition-all duration-300 ease-spring ${
              theme === 'sakura'
                ? 'translate-x-[68px] bg-gradient-to-tr from-[#FFB3C6] to-[#FB6F92]'
                : theme === 'dark'
                ? 'translate-x-[34px] bg-white dark:bg-[#2a2a3c]'
                : 'translate-x-0 bg-white'
            }`}
          />
          <button
            type="button"
            onClick={() => (setTheme ? setTheme('light') : setDark(false))}
            aria-label="Modo claro"
            title="Modo claro"
            className={`relative grid h-8 w-8 place-items-center rounded-full text-xs transition-colors ${
              theme === 'light' ? 'text-amber-500 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Sun size={15} />
          </button>
          <button
            type="button"
            onClick={() => (setTheme ? setTheme('dark') : setDark(true))}
            aria-label="Modo oscuro"
            title="Modo oscuro"
            className={`relative grid h-8 w-8 place-items-center rounded-full text-xs transition-colors ${
              theme === 'dark' ? 'text-indigo-400 font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Moon size={15} />
          </button>
          <button
            type="button"
            onClick={() => (setTheme ? setTheme('sakura') : setDark(false))}
            aria-label="Tema Sakura 🌸"
            title="Tema Sakura 🌸"
            className={`relative grid h-8 w-8 place-items-center rounded-full text-xs transition-colors ${
              theme === 'sakura' ? 'text-white font-bold' : 'text-pink-400 hover:text-pink-600'
            }`}
          >
            <span className="text-sm select-none">🌸</span>
          </button>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-200 dark:border-white/10 pt-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-slate-600 to-slate-900 text-sm font-bold text-white">{profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : profile.displayName.slice(0, 1).toUpperCase()}</div>
          <div className="leading-tight"><p className="max-w-[90px] truncate font-bold text-sm">{profile.displayName || user.name}</p><p className="max-w-[90px] truncate text-xs text-slate-500">@{profile.username}</p></div>
          <button onClick={onLogout} title="Cerrar sesión" aria-label="Cerrar sesión" className="ml-auto grid h-8 w-8 place-items-center rounded-full text-slate-500 transition hover:bg-red-500/10 hover:text-red-500"><LogOut size={17} /></button>
        </div>
      </div>
    </aside>
  )
}
