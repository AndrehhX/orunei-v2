import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Search, Sparkles, Sun, Moon, WifiOff } from 'lucide-react'
import { checkForUpdate } from './offline/appUpdater'
import UpdateModal from './components/UpdateModal'
import DownloadAppModal from './components/DownloadAppModal'
import KofiDonationModal from './components/KofiDonationModal'
import ActiveDownloadBar from './components/ActiveDownloadBar'
import { isNativeApp } from './offline/platform'
import { useNetworkStatus } from './offline/useNetworkStatus'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Hero from './components/Hero'
import RightPanel from './components/RightPanel'
import { Library, Because, News } from './components/Rows'
import { ProfileProvider, useProfile } from './profile/ProfileProvider'
import DevelopmentNotice from './components/DevelopmentNotice'
import CustomCursor from './components/CustomCursor'
import OruneiLogo from './components/OruneiLogo'
import AppSplash from './components/AppSplash'
import SakuraPetals from './components/SakuraPetals'
import { getPageScrollReset } from './ui/pageNavigation.js'
import { getHomeTabClass } from './ui/homeTabs.js'
import { getDonationThemeStyles } from './ui/donationButton.js'
import { getDevelopmentNotice } from './developmentNotice'
import { useAuth } from './auth/AuthProvider'
import { createProfileRepository } from './profile/profileRepository'
import { getPublicProfileHash, getPublicProfileUsername } from './profile/navigation'
import { supabase } from './auth/supabaseClient'
import { useRec } from './rec/rec'

const AnimePage = lazy(() => import('./components/AnimePage'))
const LibraryPage = lazy(() => import('./components/LibraryPage'))
const NewsPage = lazy(() => import('./components/NewsPage'))
const ProfilePage = lazy(() => import('./components/ProfilePage'))
const ProfileEditor = lazy(() => import('./components/ProfileEditor'))
const FriendsPage = lazy(() => import('./components/FriendsPage'))
const PublicProfileRoute = lazy(() => import('./components/PublicProfileRoute'))

function PageLoading() {
  return <div className="grid min-h-[18rem] place-items-center text-sm text-slate-500">Cargando…</div>
}

function GlobalTasteSync() {
  const { profile } = useProfile()
  const rec = useRec()
  const profileLibrary = Array.isArray(profile.animeList) ? profile.animeList : []
  const librarySignature = useMemo(() => profileLibrary.map((item) => `${item.id}:${item.status}:${item.favorite ? '1' : '0'}`).join('|'), [profileLibrary])

  useEffect(() => {
    if (rec.ready) {
      rec.syncLibrary(profileLibrary)
    }
  }, [rec.ready, rec.syncLibrary, librarySignature])

  return null
}

const tabs = ['Anime', 'Noticias']

function AppHeader({ query, setQuery, onOpenProfile, dark, setDark, theme = (dark ? 'dark' : 'light'), setTheme, onOpenDownloadApp, onOpenDonation, isOffline, onOpenOfflineDownloads }) {
  const { profile } = useProfile()
  return (
    <header className="flex items-center gap-2.5 sm:gap-4 animate-fade">
      <div className="flex lg:hidden items-center shrink-0">
        <OruneiLogo size={28} withText={true} textClassName="text-base font-extrabold tracking-tight" />
      </div>
      <label className="flex h-10 sm:h-11 flex-1 max-w-[540px] items-center gap-2.5 sm:gap-3 rounded-xl bg-slate-200/60 dark:bg-white/5 px-3 sm:px-4 text-slate-500 transition focus-within:bg-white dark:focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-brand/40">
        <Search size={18} className="shrink-0" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-transparent text-xs sm:text-sm outline-none" placeholder="Buscar anime, películas, series..." />
      </label>
      {onOpenDonation && (() => {
        const donationStyle = getDonationThemeStyles(theme);
        return (
          <button
            type="button"
            onClick={onOpenDonation}
            title="Apoyar a Orunei en Ko-fi (Kofy)"
            aria-label="Apoyar a Orunei en Ko-fi"
            className={`group relative inline-flex h-9 sm:h-9 items-center justify-center gap-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all duration-300 active:scale-95 shrink-0 hover:-translate-y-0.5 ${donationStyle.container}`}
          >
            <span className="animate-kofi-cup text-sm sm:text-base select-none transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-12">
              {donationStyle.icon}
            </span>
            <span className="hidden sm:inline text-[11px] font-bold tracking-tight">
              Ko-fi
            </span>
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 ${donationStyle.ping || 'bg-amber-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${donationStyle.dot || 'bg-amber-500'}`} />
            </span>
          </button>
        );
      })()}
      {isOffline && (
        <button
          type="button"
          onClick={onOpenOfflineDownloads}
          title="Sin conexión a internet. Pulsa para ver tus descargas"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold transition active:scale-95 shrink-0"
        >
          <WifiOff size={14} />
          <span className="hidden sm:inline">Modo Offline</span>
        </button>
      )}
      {(setTheme || setDark) && (
        <button
          type="button"
          onClick={() => {
            const nextTheme = theme === 'dark' ? 'sakura' : theme === 'sakura' ? 'light' : 'dark';
            if (setTheme) setTheme(nextTheme);
            else setDark(nextTheme === 'dark');
          }}
          aria-label={`Tema actual: ${theme}. Pulsa para alternar.`}
          title={`Tema actual: ${theme}. Pulsa para alternar.`}
          className="lg:hidden grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200/80 bg-white/70 text-slate-600 shadow-sm transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 active:scale-95"
        >
          {theme === 'sakura' ? <span className="text-sm select-none">🌸</span> : theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      )}
      <button
        type="button"
        onClick={onOpenProfile}
        aria-label="Ver perfil"
        className="grid h-9 w-9 sm:h-10 sm:w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-slate-600 to-slate-900 text-xs sm:text-sm font-bold text-white transition hover:ring-2 hover:ring-brand/50 active:scale-95"
      >
        {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : profile.displayName.slice(0, 1).toUpperCase()}
      </button>
    </header>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const dark = theme === 'dark';
  const setDark = (val) => {
    if (typeof val === 'string') setTheme(val);
    else setTheme(val ? 'dark' : 'light');
  };
  const { user, status: authStatus, error: authError, signIn, signUp, signOut } = useAuth()
  const { isOnline, isOffline } = useNetworkStatus()
  const repository = useMemo(() => user?.id ? createProfileRepository(supabase) : null, [user?.id])
  const initialProfileUsername = getPublicProfileUsername(typeof window === 'undefined' ? '' : window.location.hash)
  const [page, setPage] = useState(initialProfileUsername ? 'public-profile' : 'home')
  const [tab, setTab] = useState('Anime')
  const [query, setQuery] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)
  const [selectedUsername, setSelectedUsername] = useState(initialProfileUsername)
  const [selectedAnimeId, setSelectedAnimeId] = useState(null)
  const [selectedPlayEpisode, setSelectedPlayEpisode] = useState(null)
  const [developmentNotice, setDevelopmentNotice] = useState(null)
  const [showDownloadApp, setShowDownloadApp] = useState(false)
  const [showDonationModal, setShowDonationModal] = useState(false)
  const [updateInfo, setUpdateInfo] = useState(null)
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return typeof window !== 'undefined' && !sessionStorage.getItem('orunei_splash_viewed')
    } catch {
      return false
    }
  })

  useEffect(() => {
    checkForUpdate().then((info) => {
      if (info && info.hasUpdate) {
        setUpdateInfo(info)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'sakura');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'sakura') {
      document.documentElement.classList.add('sakura');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {}
  }, [theme])

  useEffect(() => {
    window.scrollTo(getPageScrollReset())
  }, [page])

  useEffect(() => {
    const syncProfileHash = () => {
      const username = getPublicProfileUsername(window.location.hash)
      if (username) {
        setSelectedUsername(username)
        setPage('public-profile')
      } else if (page === 'public-profile') {
        setPage('friends')
      }
    }
    window.addEventListener('hashchange', syncProfileHash)
    return () => window.removeEventListener('hashchange', syncProfileHash)
  }, [page])

  const navigatePage = (nextPage) => {
    setPage(nextPage)
    if (nextPage !== 'anime') {
      setSelectedAnimeId(null)
      setSelectedPlayEpisode(null)
    }
    if (nextPage !== 'public-profile') {
      setSelectedUsername('')
      if (typeof window !== 'undefined' && getPublicProfileUsername(window.location.hash)) window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    }
  }
  const openAnime = (media, playEpisode = null) => {
    const id = typeof media === 'object' ? media?.id : media
    const queryValue = typeof media === 'object' ? media?.q : ''
    setSelectedAnimeId(id ? String(id) : null)
    setSelectedPlayEpisode(playEpisode ? Number(playEpisode) : null)
    setQuery(id ? '' : queryValue || '')
    setPage('anime')
  }
  const closeAnime = () => {
    setSelectedAnimeId(null)
    setSelectedPlayEpisode(null)
  }
  const openPublicProfile = (username) => {
    const hash = getPublicProfileHash(username)
    if (!hash) return
    setSelectedUsername(username)
    setPage('public-profile')
    if (typeof window !== 'undefined' && window.location.hash !== hash) window.location.hash = hash
  }

  const showDevelopmentNotice = (section) => {
    const notice = getDevelopmentNotice(section)
    if (notice) setDevelopmentNotice({ ...notice, id: Date.now() })
  }
  const handleTabChange = (nextTab) => {
    const notice = getDevelopmentNotice(nextTab)
    if (notice) {
      showDevelopmentNotice(nextTab)
      return
    }
    setTab(nextTab)
  }

  if (authStatus === 'loading') return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Cargando tu sesión…</div>
  if (!user) return <Login onSignIn={signIn} onSignUp={signUp} authStatus={authStatus} authError={authError} dark={dark} setDark={setDark} theme={theme} setTheme={setTheme} />
  return (
  <ProfileProvider user={user} repository={repository}>
    <GlobalTasteSync />
    <Suspense fallback={<PageLoading />}>
      {showSplash && (
        <AppSplash
          onFinish={() => {
            setShowSplash(false)
            try { sessionStorage.setItem('orunei_splash_viewed', 'true') } catch {}
          }}
        />
      )}
      <div className="mx-auto flex min-h-screen max-w-[1536px] animate-fade">
        <CustomCursor />
        {theme === 'sakura' && <SakuraPetals />}
        <Sidebar dark={dark} setDark={setDark} theme={theme} setTheme={setTheme} user={user} onLogout={signOut} page={page} setPage={navigatePage} onDevelopmentFeature={showDevelopmentNotice} onOpenDownloadApp={() => setShowDownloadApp(true)} />
        <main className="min-w-0 flex-1 space-y-6 px-3.5 sm:px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 lg:pb-8 lg:px-8">
          <AppHeader
            query={query}
            setQuery={setQuery}
            onOpenProfile={() => navigatePage('profile')}
            dark={dark}
            setDark={setDark}
            theme={theme}
            setTheme={setTheme}
            onOpenDownloadApp={() => setShowDownloadApp(true)}
            onOpenDonation={() => setShowDonationModal(true)}
            isOffline={isOffline}
            onOpenOfflineDownloads={() => navigatePage('library')}
          />
          {isOffline && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs shadow-sm animate-rise">
              <div className="flex items-center gap-2.5">
                <WifiOff size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold">Modo Sin Conexión activo</p>
                  <p className="text-[11px] opacity-80">Estás navegando sin internet. Tus episodios descargados están listos para ver en tu Biblioteca.</p>
                </div>
              </div>
              <button
                onClick={() => navigatePage('library')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition active:scale-95 shadow-md shadow-amber-500/30"
              >
                Ver mis descargas offline ▸
              </button>
            </div>
          )}
          <div key={page} className="animate-page-enter space-y-7">
            {page === 'anime' ? (
              <AnimePage
                query={query}
                initialOpenId={selectedAnimeId}
                initialPlayEpisode={selectedPlayEpisode}
                onCloseDetail={closeAnime}
              />
            ) : page === 'library' ? (
              <LibraryPage query={query} onDiscover={() => navigatePage('anime')} />
            ) : page === 'profile' ? (
              <ProfilePage onEdit={() => setEditingProfile(true)} />
            ) : page === 'friends' ? (
              <FriendsPage onOpenProfile={openPublicProfile} />
            ) : page === 'public-profile' ? (
              <PublicProfileRoute username={selectedUsername} onBack={() => navigatePage('friends')} />
            ) : <>
            <div className="flex flex-wrap items-end justify-between gap-6 animate-rise">
              <div><h1 className="text-4xl font-extrabold tracking-tight">Para ti</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">Descubre nuevas historias, mantente al día y explora contenido basado en tus gustos.</p></div>
              <div className="flex rounded-full bg-white/80 p-1 text-sm dark:bg-white/5">
                {tabs.map((t) => <button key={t} onClick={() => handleTabChange(t)} className={getHomeTabClass(t, tab)}>{t}</button>)}
              </div>
            </div>
            {tab === 'Noticias' ? <NewsPage query={query} /> : <><Hero onOpenDetail={openAnime} /><Library query={query} onMore={() => navigatePage('library')} onOpenAnime={openAnime} /><Because query={query} onOpenAnime={openAnime} /><News query={query} onMore={() => setTab('Noticias')} /></>}
            </>}
          </div>
        </main>
        {page === 'home' && <RightPanel onSeeNews={() => setTab('Noticias')} onSeeProfile={() => navigatePage('profile')} onSeeFriends={() => navigatePage('friends')} onOpenProfile={openPublicProfile} onOpenAnime={openAnime} />}
        {page === 'profile' && editingProfile && <ProfileEditor onClose={() => setEditingProfile(false)} />}
        <ActiveDownloadBar onGoToDownloads={() => navigatePage('library')} />
        <MobileNav page={page} setPage={navigatePage} />
        <DevelopmentNotice notice={developmentNotice} onClose={() => setDevelopmentNotice(null)} />
        <UpdateModal updateInfo={updateInfo} onClose={() => setUpdateInfo(null)} />
        <DownloadAppModal isOpen={showDownloadApp} onClose={() => setShowDownloadApp(false)} />
        <KofiDonationModal isOpen={showDonationModal} onClose={() => setShowDonationModal(false)} />
      </div>
    </Suspense>
  </ProfileProvider>
  )
}
