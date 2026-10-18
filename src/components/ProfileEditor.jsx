import { useMemo, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  BookOpen,
  Check,
  Eye,
  Globe,
  Heart,
  Image,
  List,
  Lock,
  LockKeyhole,
  MessageCircle,
  Palette,
  Shield,
  Sliders,
  Sparkles,
  Tv,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { useProfile } from '../profile/ProfileProvider'
import { AVATAR_FRAMES, PROFILE_THEMES } from '../profile/model.js'
import AvatarFrame from './AvatarFrame'
import ProfileThemeBackground from './ProfileThemeBackground'

const SECTION_ORDER_METADATA = {
  showcase: {
    id: 'showcase',
    label: 'Vitrina de Obra Maestra',
    desc: 'Tu anime predilecto destacado con póster, cita emblemática y veredicto.',
    icon: Award,
    badge: 'Estilo Steam',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  comments: {
    id: 'comments',
    label: 'Muro de Comentarios',
    desc: 'Firmas, notas y mensajes de la comunidad de Orunei en tu perfil.',
    icon: MessageCircle,
    badge: 'Comunidad',
    color: 'text-brand',
    bg: 'bg-brand/10',
    border: 'border-brand/30',
  },
  animeList: {
    id: 'animeList',
    label: 'AnimeList & Biblioteca',
    desc: 'Resumen de series viendo, completadas, favoritas y afinidad algorítmica.',
    icon: BookOpen,
    badge: 'Biblioteca',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  activity: {
    id: 'activity',
    label: 'Actividad Reciente',
    desc: 'Últimos episodios vistos y actualizaciones cronológicas del perfil.',
    icon: Activity,
    badge: 'Historial',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/30',
  },
}

const privacySections = [
  { id: 'animeList', label: 'AnimeList (Biblioteca)', desc: 'Las series que estás viendo o completaste', icon: BookOpen },
  { id: 'favorites', label: 'Favoritos', desc: 'Tus animes predilectos destacados', icon: Heart },
  { id: 'lists', label: 'Listas personalizadas', desc: 'Colecciones creadas en tu cuenta', icon: List },
  { id: 'activity', label: 'Actividad reciente', desc: 'Historial de episodios y actualizaciones', icon: Activity },
]

const pinLabels = {
  overview: 'Resumen',
  animelist: 'AnimeList',
  favorites: 'Favoritos',
  lists: 'Listas',
  activity: 'Actividad',
}

const ACCENT_PRESETS = [
  { label: 'Púrpura Orunei', value: '#6d5cff' },
  { label: 'Rosa Sakura', value: '#ff66a8' },
  { label: 'Cian Ciberpunk', value: '#06b6d4' },
  { label: 'Ámbar Dorado', value: '#f59e0b' },
  { label: 'Rojo Carmesí', value: '#ef4444' },
  { label: 'Esmeralda Neón', value: '#10b981' },
]

const clone = (value) => JSON.parse(JSON.stringify(value))

function UploadButton({ kind, onChange, current, fileName, onReset, uploading }) {
  const id = `profile-${kind}-upload`
  const isGif = typeof current === 'string' && (current.toLowerCase().includes('.gif') || current.startsWith('data:image/gif'))
  return (
    <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 transition hover:border-brand/40 shadow-xs">
      <div className={`${kind === 'avatar' ? 'h-16 w-16 rounded-full' : 'h-16 w-28 rounded-xl'} relative overflow-hidden bg-gradient-to-br from-brand to-pink-400 shadow-md ring-2 ring-white/50 dark:ring-white/10 shrink-0`}>
        <img key={current || 'empty'} src={current || undefined} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <label htmlFor={id} aria-disabled={uploading} className={`inline-flex items-center gap-2 rounded-xl bg-white dark:bg-white/10 border border-slate-200/80 px-3.5 py-2 text-xs font-bold transition hover:border-brand hover:text-brand dark:border-white/10 shadow-xs active:scale-95 ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer'}`}>
          <Upload size={14} />
          <span>{uploading ? 'Subiendo…' : `Subir ${kind === 'avatar' ? 'avatar' : 'banner'} o GIF`}</span>
        </label>
        <input id={id} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onChange} disabled={uploading} className="sr-only" />
        <p aria-live="polite" className="mt-1 max-w-[260px] truncate text-[10px] text-slate-500" title={fileName}>
          {uploading ? `Subiendo ${kind === 'avatar' ? 'avatar' : 'banner'}…` : fileName || 'Soporta GIF animado, PNG, JPG o WebP (máximo 5 MB)'}
        </p>
        {current && (
          <button type="button" onClick={onReset} className="mt-1 text-[10px] font-semibold text-slate-500 hover:text-red-500 transition">
            Quitar imagen
          </button>
        )}
      </div>
    </div>
  )
}

function PrivacySegment({ value, onChange, label, desc, icon: Icon }) {
  const options = [
    { id: 'private', label: 'Solo tú', icon: Lock },
    { id: 'friends', label: 'Amigos', icon: Users },
    { id: 'public', label: 'Público', icon: Globe },
  ]
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-white/[0.02] transition hover:border-slate-300 dark:hover:border-white/10">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 shrink-0">
          <Icon size={16} />
        </span>
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{label}</h4>
          <p className="text-[11px] text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-white/5 shrink-0 self-start sm:self-auto">
        {options.map((opt) => {
          const isActive = (value || 'private') === opt.id
          const OptIcon = opt.icon
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand text-white shadow-sm shadow-brand/30 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <OptIcon size={12} />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function ProfileEditor({ onClose }) {
  const { profile, saveProfile, recordActivity, uploadProfileImage, storageError } = useProfile()
  const library = profile.animeList || []
  const [draft, setDraft] = useState(() => clone(profile))
  const [activeTab, setActiveTab] = useState('steam')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadingKind, setUploadingKind] = useState('')
  const [fileNames, setFileNames] = useState({ avatar: '', banner: '' })

  const setField = (field) => (event) => setDraft((current) => ({ ...current, [field]: event.target.value }))

  const handleImage = (kind) => async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setError('')
    setUploadingKind(kind)
    try {
      const upload = await uploadProfileImage(kind, file)
      if (!upload.ok) throw new Error(upload.error)
      setDraft((current) => ({ ...current, [kind]: upload.data }))
      setFileNames((current) => ({ ...current, [kind]: file.name }))
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setUploadingKind('')
      event.target.value = ''
    }
  }

  const togglePinned = (section) =>
    setDraft((current) => ({
      ...current,
      pinnedSections: current.pinnedSections.includes(section)
        ? current.pinnedSections.filter((item) => item !== section)
        : [...current.pinnedSections, section],
    }))

  const save = async () => {
    setSaving(true)
    const result = await saveProfile((current) => ({
      ...current,
      ...draft,
      animeList: (draft.animeList && draft.animeList.length > 0) ? draft.animeList : (current.animeList || []),
      customLists: (draft.customLists && draft.customLists.length > 0) ? draft.customLists : (current.customLists || []),
      activity: (draft.activity && draft.activity.length > 0) ? draft.activity : (current.activity || []),
    }))
    if (!result.ok) {
      setSaving(false)
      setError(result.error)
      return
    }
    const activityResult = await recordActivity('profile', 'Actualizó su perfil')
    if (!activityResult.ok) {
      setSaving(false)
      setError(activityResult.error)
      return
    }
    setSaving(false)
    onClose()
  }

  const resetAppearance = () => {
    setDraft((current) => ({
      ...current,
      avatar: '',
      banner: '',
      accent: '#6d5cff',
      avatarFrame: 'none',
      profileTheme: 'default',
      glassOpacity: 75,
    }))
    setFileNames({ avatar: '', banner: '' })
  }

  const resetImage = (kind) => {
    setDraft((current) => ({ ...current, [kind]: '' }))
    setFileNames((current) => ({ ...current, [kind]: '' }))
  }

  const selectedFeaturedAnime = useMemo(() => {
    if (!draft.featuredAnimeId) return null
    return library.find((item) => item.q === draft.featuredAnimeId || item.id === draft.featuredAnimeId) || null
  }, [draft.featuredAnimeId, library])

  const moveSection = (index, direction) => {
    const defaultOrder = ['showcase', 'comments', 'animeList', 'activity']
    const currentOrder = Array.isArray(draft.overviewOrder) && draft.overviewOrder.length > 0 ? draft.overviewOrder : defaultOrder
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= currentOrder.length) return
    const updated = [...currentOrder]
    const [moved] = updated.splice(index, 1)
    updated.splice(nextIndex, 0, moved)
    setDraft((current) => ({ ...current, overviewOrder: updated }))
  }

  const setOrderPreset = (presetOrder) => {
    setDraft((current) => ({ ...current, overviewOrder: presetOrder }))
  }

  const TABS = [
    { id: 'steam', label: 'Estilo Steam', icon: Sparkles, badge: 'Fondos & Marcos' },
    { id: 'showcase', label: 'Vitrina', icon: Award, badge: 'Obra Maestra' },
    { id: 'order', label: 'Orden del Perfil', icon: Sliders, badge: 'Secciones #1-#4' },
    { id: 'privacy', label: 'Privacidad', icon: LockKeyhole, badge: draft.visibility === 'public' ? 'Público' : 'Privado' },
    { id: 'identity', label: 'Identidad', icon: Shield, badge: 'Bio & Usuario' },
    { id: 'appearance', label: 'Multimedia', icon: Image, badge: 'Avatar & Banner' },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-2 sm:p-4 backdrop-blur-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
        className="mx-auto max-w-5xl rounded-[32px] border border-white/80 bg-[#f8f8fc] shadow-2xl dark:border-white/10 dark:bg-[#0f101b] overflow-hidden"
      >
        {/* Cabecera */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/80 bg-[#f8f8fc]/95 px-5 py-3.5 backdrop-blur dark:border-white/10 dark:bg-[#0f101b]/95 sm:px-7">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-brand">Estudio de Perfil</p>
            <h2 id="profile-editor-title" className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Personalización estilo Steam
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar editor"
            className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95"
          >
            <X size={18} />
          </button>
        </header>

        {/* Barra de Pestañas de Navegación de Configuración */}
        <div className="border-b border-slate-200/80 bg-slate-100/60 dark:border-white/5 dark:bg-white/[0.02] px-4 sm:px-7 py-2 overflow-x-auto scroll-hide">
          <nav className="flex gap-1.5 min-w-max" aria-label="Categorías de personalización">
            {TABS.map((tab) => {
              const TabIcon = tab.icon
              const isSelected = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-brand text-white shadow-md shadow-brand/20 scale-[1.02]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5'
                  }`}
                >
                  <TabIcon size={14} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-md font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Contenido en dos columnas: Opciones y Vista Previa */}
        <div className="grid gap-6 p-4 sm:p-7 lg:grid-cols-[1fr_330px]">
          <div className="space-y-5">
            {/* 1. PESTAÑA: ESTILO STEAM (Marcos y Fondos) */}
            {activeTab === 'steam' && (
              <div className="space-y-5 animate-fade">
                {/* MARCOS DE AVATAR */}
                <section className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-pink-500" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Marcos de Avatar Animados</h3>
                        <p className="text-xs text-slate-500">Efectos GPU circulares que abrazan tu foto de perfil.</p>
                      </div>
                    </div>
                    {draft.avatarFrame && draft.avatarFrame !== 'none' && (
                      <button
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, avatarFrame: 'none' }))}
                        className="text-xs font-semibold text-slate-500 hover:text-red-500 transition"
                      >
                        Quitar marco
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {AVATAR_FRAMES.map((frame) => {
                      const isSelected = (draft.avatarFrame || 'none') === frame.id
                      return (
                        <button
                          key={frame.id}
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, avatarFrame: frame.id }))}
                          className={`flex flex-col items-center p-3 rounded-2xl border text-center transition-all ${
                            isSelected
                              ? 'border-brand bg-brand/10 shadow-md ring-2 ring-brand/40 scale-[1.02]'
                              : 'border-slate-200/80 bg-white/60 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02]'
                          }`}
                        >
                          <div className="my-2">
                            <AvatarFrame
                              profile={{ ...draft, avatarFrame: frame.id }}
                              frameId={frame.id}
                              size="md"
                            />
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">{frame.label}</p>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{frame.desc}</p>
                          {isSelected ? (
                            <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                              <Check size={11} /> Equipado
                            </span>
                          ) : (
                            <span className="mt-2 text-[9px] font-semibold text-slate-400">Seleccionar</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* FONDOS TEMÁTICOS DE PÁGINA COMPLETA */}
                <section className="card p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette size={18} className="text-cyan-500" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Fondos de Perfil con Físicas Animadas</h3>
                        <p className="text-xs text-slate-500">Cubre la totalidad de tu perfil público y privado al estilo Steam.</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PROFILE_THEMES.map((theme) => {
                      const isSelected = (draft.profileTheme || 'default') === theme.id
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, profileTheme: theme.id }))}
                          className={`flex flex-col items-start p-3.5 rounded-2xl border text-left transition-all ${
                            isSelected
                              ? 'border-brand bg-brand/10 shadow-md ring-2 ring-brand/40 scale-[1.01]'
                              : 'border-slate-200/80 bg-white/60 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 mb-1.5 w-full">
                            <span
                              className="h-4 w-4 rounded-full shadow-xs shrink-0 ring-2 ring-white/50"
                              style={{ backgroundColor: theme.color }}
                            />
                            <span className="text-xs font-bold truncate flex-1 text-slate-900 dark:text-slate-100">
                              {theme.label}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                                <Check size={11} /> Activo
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{theme.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* 3. TRANSPARENCIA DE TARJETAS / CRISTAL ESMERILADO (FROSTED GLASS) */}
                <section className="card p-5">
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-cyan-400" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">
                          Cristal Esmerilado de Paneles (Frosted Glass)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Ajusta la transparencia de las tarjetas para fusionar el contenido con el fondo animado.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                        {draft.glassOpacity ?? 75}% opacidad
                      </span>
                    </div>
                  </div>

                  {/* Slider de control continuo */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>🧊 Ultra Translúcido (30%)</span>
                      <span className="text-brand">Equilibrado (75%)</span>
                      <span>🛡️ Sólido (95%)</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={95}
                      step={5}
                      value={draft.glassOpacity ?? 75}
                      onChange={(e) => setDraft((curr) => ({ ...curr, glassOpacity: Number(e.target.value) }))}
                      className="w-full h-2.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand transition-all"
                    />
                  </div>

                  {/* Presets Rápidos */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: '🧊 Cristal Puro', value: 40, desc: 'Máximo fondo visible' },
                      { label: '🔮 Translúcido', value: 60, desc: 'Fusión atmosférica' },
                      { label: '✨ Esmerilado', value: 75, desc: 'Equilibrio ideal' },
                      { label: '🛡️ Sólido', value: 95, desc: 'Máxima lectura' },
                    ].map((preset) => {
                      const isSelected = (draft.glassOpacity ?? 75) === preset.value
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setDraft((curr) => ({ ...curr, glassOpacity: preset.value }))}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-brand bg-brand/10 shadow-xs ring-1 ring-brand/30'
                              : 'border-slate-200/80 bg-white/60 dark:border-white/5 dark:bg-white/[0.02] hover:border-slate-300'
                          }`}
                        >
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{preset.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{preset.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* 2. PESTAÑA: VITRINA DE OBRA MAESTRA */}
            {activeTab === 'showcase' && (
              <div className="space-y-5 animate-fade">
                <section className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Award size={18} className="text-amber-500" />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Vitrina de Obra Maestra (Showcase)</h3>
                      <p className="text-xs text-slate-500">Presenta tu anime predilecto con cita destacada y tu veredicto personal.</p>
                    </div>
                  </div>

                  {/* Selector visual de anime */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Anime destacado en la vitrina
                      </label>
                      {draft.featuredAnimeId && (
                        <button
                          type="button"
                          onClick={() => setDraft((current) => ({ ...current, featuredAnimeId: '' }))}
                          className="text-[10px] font-semibold text-brand hover:underline"
                        >
                          Usar favorito predeterminado
                        </button>
                      )}
                    </div>

                    {selectedFeaturedAnime && (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-brand/5 border border-brand/20">
                        <img
                          src={selectedFeaturedAnime.img}
                          alt=""
                          className="h-14 w-10 rounded-lg object-cover shadow-sm shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-black uppercase text-brand tracking-wider">Obra Maestra Elegida</span>
                          <p className="text-sm font-bold truncate text-slate-900 dark:text-slate-100">
                            {selectedFeaturedAnime.t}
                          </p>
                          <p className="text-xs text-slate-500">
                            {selectedFeaturedAnime.year ? `${selectedFeaturedAnime.year} · ` : ''}{selectedFeaturedAnime.s || 'En biblioteca'}
                          </p>
                        </div>
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand text-white shadow-sm shrink-0">
                          <Check size={14} />
                        </span>
                      </div>
                    )}

                    {library.length > 0 ? (
                      <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 p-3 bg-white/50 dark:bg-white/[0.02]">
                        <p className="text-[11px] font-bold text-slate-500 mb-2">Selecciona de tu biblioteca:</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                          {library.map((item) => {
                            const isMatch = draft.featuredAnimeId === item.q || draft.featuredAnimeId === item.id
                            return (
                              <button
                                key={item.q || item.id}
                                type="button"
                                onClick={() => setDraft((current) => ({ ...current, featuredAnimeId: item.q }))}
                                className={`flex items-center gap-2 p-1.5 rounded-xl border text-left transition ${
                                  isMatch
                                    ? 'border-brand bg-brand/10 ring-2 ring-brand/30 shadow-xs'
                                    : 'border-slate-200/60 dark:border-white/5 bg-white dark:bg-white/5 hover:border-brand/40'
                                }`}
                              >
                                <img
                                  src={item.img}
                                  alt=""
                                  className="h-10 w-7 rounded-md object-cover shrink-0"
                                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                                />
                                <span className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">
                                  {item.t}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 text-center">
                        <p className="text-xs text-slate-500">Tu biblioteca no tiene obras aún. Al reproducir o agregar animes a tu lista aparecerán aquí.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Frase o cita memorable de la vitrina
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {(draft.featuredQuote || '').length}/140
                      </span>
                    </div>
                    <input
                      value={draft.featuredQuote || ''}
                      onChange={setField('featuredQuote')}
                      maxLength={140}
                      placeholder="Ej: Una obra maestra que cambió mi forma de ver el anime."
                      className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white dark:bg-white/5 px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Tu reseña o veredicto personal
                      </label>
                      <span className="text-[10px] text-slate-400">
                        {(draft.featuredReview || '').length}/400
                      </span>
                    </div>
                    <textarea
                      value={draft.featuredReview || ''}
                      onChange={setField('featuredReview')}
                      maxLength={400}
                      rows={3}
                      placeholder="Ej: La evolución de los personajes, la dirección artística y la banda sonora en el clímax son insuperables..."
                      className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white dark:bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 text-slate-900 dark:text-slate-100"
                    />
                  </div>
                </section>
              </div>
            )}

            {/* PESTAÑA: ORDEN DEL PERFIL */}
            {activeTab === 'order' && (
              <div className="space-y-5 animate-fade">
                <section className="card p-5">
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sliders size={18} className="text-brand" />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Orden Personalizado de Secciones</h3>
                        <p className="text-xs text-slate-500">
                          Define qué contenido se muestra primero en tu perfil debajo de la cabecera.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderPreset(['showcase', 'comments', 'animeList', 'activity'])}
                      className="text-xs font-semibold text-slate-500 hover:text-brand transition self-start sm:self-auto"
                    >
                      Restablecer orden por defecto
                    </button>
                  </div>

                  {/* Presets Rápidos */}
                  <div className="mb-5 rounded-2xl bg-slate-100/70 p-3.5 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-2">
                      Plantillas rápidas de disposición:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderPreset(['showcase', 'comments', 'animeList', 'activity'])}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-brand transition shadow-xs"
                      >
                        ⭐ Vitrina primero
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderPreset(['comments', 'showcase', 'animeList', 'activity'])}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-brand transition shadow-xs"
                      >
                        💬 Comentarios primero
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderPreset(['animeList', 'showcase', 'comments', 'activity'])}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-brand transition shadow-xs"
                      >
                        📚 Biblioteca primero
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderPreset(['activity', 'showcase', 'comments', 'animeList'])}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-white/10 border border-slate-200/80 dark:border-white/10 hover:border-brand transition shadow-xs"
                      >
                        ⚡ Actividad primero
                      </button>
                    </div>
                  </div>

                  {/* Lista Reordenable */}
                  <div className="space-y-3">
                    {(draft.overviewOrder || ['showcase', 'comments', 'animeList', 'activity']).map((sectionId, index, array) => {
                      const def = SECTION_ORDER_METADATA[sectionId]
                      if (!def) return null
                      const Icon = def.icon
                      const isFirst = index === 0
                      const isLast = index === array.length - 1

                      return (
                        <div
                          key={sectionId}
                          className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                            isFirst
                              ? 'border-brand/40 bg-brand/[0.03] dark:bg-brand/[0.06] shadow-sm'
                              : 'border-slate-200/80 bg-white/70 dark:bg-white/[0.02] dark:border-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* Posición # */}
                            <span
                              className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-black text-xs ${
                                isFirst
                                  ? 'bg-brand text-white shadow-sm shadow-brand/30'
                                  : 'bg-slate-200/70 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                              }`}
                            >
                              #{index + 1}
                            </span>

                            {/* Icono de la sección */}
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${def.bg} ${def.color}`}>
                              <Icon size={18} />
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {def.label}
                                </h4>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${def.bg} ${def.color}`}>
                                  {def.badge}
                                </span>
                                {isFirst && (
                                  <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand/10 text-brand border border-brand/20">
                                    ⭐ Principal
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-slate-500 truncate">{def.desc}</p>
                            </div>
                          </div>

                          {/* Botones de Reordenar (Arriba / Abajo) */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => moveSection(index, -1)}
                              disabled={isFirst}
                              aria-label={`Subir ${def.label}`}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 transition hover:border-brand hover:text-brand disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-xs"
                            >
                              <ArrowUp size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(index, 1)}
                              disabled={isLast}
                              aria-label={`Bajar ${def.label}`}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 transition hover:border-brand hover:text-brand disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-xs"
                            >
                              <ArrowDown size={16} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-100/60 dark:bg-white/[0.02] p-3 text-[11px] text-slate-500 border border-slate-200/60 dark:border-white/5">
                    💡 <b>Privacidad inteligente:</b> Si tienes alguna sección marcada como «Privada» en la pestaña de Privacidad, los visitantes de tu perfil público directamente no la verán, y el resto de secciones mantendrán este orden preferido.
                  </div>
                </section>
              </div>
            )}

            {/* 3. PESTAÑA: PRIVACIDAD Y VISIBILIDAD */}
            {activeTab === 'privacy' && (
              <div className="space-y-5 animate-fade">
                {/* Master Switch: Perfil Público vs Privado */}
                <section className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <LockKeyhole size={18} className="text-brand" />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Estado de Visibilidad del Perfil</h3>
                      <p className="text-xs text-slate-500">Define si toda la comunidad puede acceder a tu espacio o solo tú.</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, visibility: 'public' }))}
                      className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${
                        draft.visibility === 'public'
                          ? 'border-brand bg-brand/[0.08] dark:bg-brand/10 shadow-md ring-2 ring-brand/30'
                          : 'border-slate-200/80 bg-white/70 dark:bg-white/[0.02] hover:border-slate-300 dark:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand">
                          <Globe size={18} />
                        </span>
                        {draft.visibility === 'public' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-brand bg-brand/10 px-2 py-0.5 rounded-full">
                            <Check size={12} /> Activo
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Perfil Público</h4>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Cualquier persona puede ver tu perfil, tu fondo temático animado, tu marco de avatar exclusivo y tu vitrina de obra maestra.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, visibility: 'private' }))}
                      className={`flex flex-col items-start p-4 rounded-2xl border text-left transition-all ${
                        draft.visibility === 'private'
                          ? 'border-amber-500 bg-amber-500/[0.08] dark:bg-amber-500/10 shadow-md ring-2 ring-amber-500/30'
                          : 'border-slate-200/80 bg-white/70 dark:bg-white/[0.02] hover:border-slate-300 dark:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
                          <Lock size={18} />
                        </span>
                        {draft.visibility === 'private' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                            <Check size={12} /> Activo
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Perfil Privado</h4>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Tu perfil se oculta para visitas externas. Nadie fuera de tu cuenta podrá ver tus fondos, actividad ni vitrina de anime.
                      </p>
                    </button>
                  </div>
                </section>

                {/* Control granular de privacidad de secciones */}
                <section className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-brand" />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Privacidad de Secciones Específicas</h3>
                      <p className="text-xs text-slate-500">Decide con quién compartes cada apartado de tu cuenta.</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {privacySections.map((sec) => (
                      <PrivacySegment
                        key={sec.id}
                        label={sec.label}
                        desc={sec.desc}
                        icon={sec.icon}
                        value={draft.privacy[sec.id]}
                        onChange={(nextVal) =>
                          setDraft((current) => ({
                            ...current,
                            privacy: { ...current.privacy, [sec.id]: nextVal },
                          }))
                        }
                      />
                    ))}
                  </div>
                </section>

                {/* Navegación y Secciones fijadas */}
                <section className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Tv size={18} className="text-brand" />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Navegación y Pestañas Fijadas</h3>
                      <p className="text-xs text-slate-500">Organiza qué pestañas aparecen fijadas y cuál abre al ingresar.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                        Pestaña predeterminada al abrir
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(pinLabels).map(([id, label]) => {
                          const isSelected = draft.landingSection === id
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => setDraft((current) => ({ ...current, landingSection: id }))}
                              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                isSelected
                                  ? 'bg-brand text-white shadow-sm'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">Secciones fijadas</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(pinLabels).map(([id, label]) => {
                          const isPinned = draft.pinnedSections.includes(id)
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => togglePinned(id)}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                                isPinned
                                  ? 'border-brand bg-brand/10 text-brand shadow-xs'
                                  : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300'
                              }`}
                            >
                              {isPinned && <Check size={13} />}
                              <span>{label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* 4. PESTAÑA: IDENTIDAD */}
            {activeTab === 'identity' && (
              <div className="space-y-5 animate-fade">
                <section className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-brand" />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Identidad del Usuario</h3>
                      <p className="text-xs text-slate-500">Configura tu nombre público, usuario y estado.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Nombre visible
                      <input
                        value={draft.displayName}
                        onChange={setField('displayName')}
                        maxLength={50}
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white dark:bg-white/5 px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 text-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Usuario (@handle)
                      <input
                        value={draft.username}
                        onChange={setField('username')}
                        maxLength={24}
                        className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white dark:bg-white/5 px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 text-slate-900 dark:text-slate-100"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Biografía
                    <textarea
                      value={draft.bio}
                      onChange={setField('bio')}
                      maxLength={280}
                      rows={3}
                      placeholder="Cuéntale a la comunidad sobre ti y tus géneros de anime preferidos..."
                      className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-white dark:bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 text-slate-900 dark:text-slate-100"
                    />
                  </label>

                  <label className="mt-4 block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Estado actual
                    <input
                      value={draft.status}
                      onChange={setField('status')}
                      maxLength={100}
                      placeholder="¿Qué estás viendo hoy?"
                      className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white dark:bg-white/5 px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 text-slate-900 dark:text-slate-100"
                    />
                  </label>
                </section>
              </div>
            )}

            {/* 5. PESTAÑA: MULTIMEDIA & APARIENCIA */}
            {activeTab === 'appearance' && (
              <div className="space-y-5 animate-fade">
                <section className="card p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Image size={18} className="text-brand" />
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">Avatar, Banner y GIFs</h3>
                      <p className="text-xs text-slate-500">Soporte nativo para imágenes estáticas y GIFs animados.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <UploadButton
                      kind="avatar"
                      current={draft.avatar}
                      fileName={fileNames.avatar}
                      uploading={uploadingKind === 'avatar'}
                      onReset={() => resetImage('avatar')}
                      onChange={handleImage('avatar')}
                    />
                    <UploadButton
                      kind="banner"
                      current={draft.banner}
                      fileName={fileNames.banner}
                      uploading={uploadingKind === 'banner'}
                      onReset={() => resetImage('banner')}
                      onChange={handleImage('banner')}
                    />
                  </div>

                  {/* Color de acento con presets */}
                  <div className="mt-6 border-t border-slate-200/80 dark:border-white/5 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">Color de acento del perfil</h4>
                        <p className="text-[11px] text-slate-500">Se refleja en bordes, brillos y badges destacados.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draft.accent}
                          onChange={setField('accent')}
                          className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                          title="Elegir color personalizado"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ACCENT_PRESETS.map((p) => {
                        const isMatch = draft.accent.toLowerCase() === p.value.toLowerCase()
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setDraft((current) => ({ ...current, accent: p.value }))}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                              isMatch
                                ? 'border-brand bg-brand/10 shadow-xs'
                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                            }`}
                          >
                            <span className="h-3.5 w-3.5 rounded-full shadow-xs" style={{ backgroundColor: p.value }} />
                            <span>{p.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={resetAppearance}
                      className="text-xs font-semibold text-slate-500 hover:text-red-500 transition"
                    >
                      Restablecer multimedia a predeterminados
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>

          {/* COLUMNA LATERAL: VISTA PREVIA EN TIEMPO REAL */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center justify-between">
              <span>Vista previa en vivo</span>
              <span className={`inline-flex items-center gap-1 font-bold ${draft.visibility === 'public' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {draft.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
                {draft.visibility === 'public' ? 'Público' : 'Privado'}
              </span>
            </div>

            <div
              className="card overflow-hidden relative shadow-2xl rounded-[24px] border border-white/60 dark:border-white/10"
              style={{ '--profile-accent': draft.accent }}
            >
              {/* Fondo animado estilo Steam activo en el preview */}
              <ProfileThemeBackground themeId={draft.profileTheme} />

              {/* Banner */}
              <div className="relative h-24 overflow-hidden bg-gradient-to-br from-brand to-pink-400 z-10">
                {draft.banner && (
                  <img
                    src={draft.banner}
                    alt=""
                    onError={(event) => { event.currentTarget.style.display = 'none' }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
              </div>

              {/* Contenido del usuario */}
              <div
                className="px-4 pb-5 relative z-10 transition-all duration-300"
                style={{
                  backgroundColor: `rgba(20, 21, 35, ${((draft.glassOpacity ?? 75) / 100).toFixed(2)})`,
                  backdropFilter: `blur(${(draft.glassOpacity ?? 75) <= 45 ? '24px' : (draft.glassOpacity ?? 75) <= 70 ? '16px' : '10px'})`,
                  WebkitBackdropFilter: `blur(${(draft.glassOpacity ?? 75) <= 45 ? '24px' : (draft.glassOpacity ?? 75) <= 70 ? '16px' : '10px'})`,
                }}
              >
                <div className="-mt-10">
                  <AvatarFrame
                    profile={draft}
                    frameId={draft.avatarFrame}
                    size="md"
                  />
                </div>

                <div className="mt-2.5">
                  <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {draft.displayName || 'Tu nombre'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">@{draft.username || 'usuario'}</p>
                </div>

                {/* Chips de personalización */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-brand/10 text-[10px] font-bold text-brand">
                    Marco: {AVATAR_FRAMES.find((f) => f.id === draft.avatarFrame)?.label || 'Sin marco'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                    Fondo: {PROFILE_THEMES.find((t) => t.id === draft.profileTheme)?.label || 'Clásico'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-[10px] font-bold text-cyan-600 dark:text-cyan-400">
                    Cristal: {draft.glassOpacity ?? 75}%
                  </span>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500 line-clamp-3">
                  {draft.bio || 'Tu biografía aparecerá aquí.'}
                </p>

                {draft.status && (
                  <div className="mt-3 rounded-xl bg-[var(--profile-accent)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--profile-accent)] truncate">
                    {draft.status}
                  </div>
                )}

                {/* Mini lista de orden de secciones */}
                <div className="mt-3 pt-3 border-t border-slate-200/70 dark:border-white/10">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                    <span>Orden de Secciones</span>
                    <span className="text-brand font-bold">#1 a #4</span>
                  </p>
                  <div className="space-y-1">
                    {(draft.overviewOrder || ['showcase', 'comments', 'animeList', 'activity']).map((id, idx) => {
                      const def = SECTION_ORDER_METADATA[id]
                      if (!def) return null
                      const Icon = def.icon
                      return (
                        <div
                          key={id}
                          className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-semibold ${
                            idx === 0
                              ? 'bg-brand/10 text-brand border border-brand/20'
                              : 'bg-slate-100/70 dark:bg-white/5 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-[9px] font-black text-slate-400">#{idx + 1}</span>
                            <Icon size={11} className={idx === 0 ? 'text-brand' : 'text-slate-400'} />
                            <span className="truncate">{def.label}</span>
                          </div>
                          {idx === 0 && <span className="text-[8px] font-black uppercase text-brand">Top</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-xs leading-5 text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-2 font-semibold text-brand">
                <Sparkles size={14} /> Ecosistema Steam Activo
              </p>
              <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                Tus selecciones de marcos, fondos y vitrina se aplican instantáneamente tanto en tu espacio privado como en tu perfil público de la comunidad.
              </p>
            </div>
          </aside>
        </div>

        {/* Mensajes de error */}
        {(error || storageError) && (
          <p role="alert" className="mx-5 mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs font-medium text-red-600 sm:mx-7">
            {error || storageError}
          </p>
        )}

        {/* Footer de Acciones */}
        <footer className="flex items-center justify-between gap-3 rounded-b-[32px] border-t border-slate-200/80 bg-[#f8f8fc]/95 px-5 py-4 dark:border-white/10 dark:bg-[#0f101b]/95 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
          >
            {saving ? (
              'Guardando…'
            ) : (
              <>
                <Check size={16} />
                Guardar cambios
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
