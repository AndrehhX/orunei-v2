import { useState } from 'react'
import { Award, Check, Image, LockKeyhole, Palette, Shield, Sparkles, Upload, X } from 'lucide-react'
import { useProfile } from '../profile/ProfileProvider'
import { AVATAR_FRAMES, PROFILE_THEMES } from '../profile/model.js'
import AvatarFrame from './AvatarFrame'
import ProfileThemeBackground from './ProfileThemeBackground'

const privacyLabels = { animeList: 'AnimeList', favorites: 'Favoritos', activity: 'Actividad', lists: 'Listas' }
const pinLabels = { overview: 'Resumen', animelist: 'AnimeList', favorites: 'Favoritos', lists: 'Listas', activity: 'Actividad' }

const clone = (value) => JSON.parse(JSON.stringify(value))

function UploadButton({ kind, onChange, current, fileName, onReset, uploading }) {
  const id = `profile-${kind}-upload`
  const isGif = typeof current === 'string' && (current.toLowerCase().includes('.gif') || current.startsWith('data:image/gif'))
  return <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 transition hover:border-brand/40">
    <div className={`${kind === 'avatar' ? 'h-16 w-16 rounded-full' : 'h-16 w-28 rounded-xl'} relative overflow-hidden bg-gradient-to-br from-brand to-pink-400 shadow-md ring-2 ring-white/50 dark:ring-white/10 shrink-0`}>
      <img key={current || 'empty'} src={current || undefined} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} className="h-full w-full object-cover" />
      {isGif && (
        <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-black/80 text-[8px] font-black uppercase text-pink-400 backdrop-blur border border-pink-500/30">
          GIF
        </span>
      )}
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
      {current && <button type="button" onClick={onReset} className="mt-1 text-[10px] font-semibold text-slate-500 hover:text-red-500 transition">Quitar imagen</button>}
    </div>
  </div>
}

export default function ProfileEditor({ onClose }) {
  const { profile, saveProfile, recordActivity, uploadProfileImage, storageError } = useProfile()
  const library = profile.animeList || []
  const [draft, setDraft] = useState(() => clone(profile))
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
  const togglePinned = (section) => setDraft((current) => ({ ...current, pinnedSections: current.pinnedSections.includes(section) ? current.pinnedSections.filter((item) => item !== section) : [...current.pinnedSections, section] }))
  const save = async () => {
    setSaving(true)
    const result = await saveProfile((current) => ({ ...current, ...draft, activity: current.activity }))
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
  const reset = () => { setDraft((current) => ({ ...current, avatar: '', banner: '', accent: '#6d5cff', avatarFrame: 'none', profileTheme: 'default', featuredAnimeId: '', featuredQuote: '', featuredReview: '' })); setFileNames({ avatar: '', banner: '' }) }
  const resetImage = (kind) => { setDraft((current) => ({ ...current, [kind]: '' })); setFileNames((current) => ({ ...current, [kind]: '' })) }

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
    <div role="dialog" aria-modal="true" aria-labelledby="profile-editor-title" className="mx-auto max-w-5xl rounded-[28px] border border-white/80 bg-[#f8f8fc] shadow-2xl dark:border-white/10 dark:bg-[#11111c]">
      <header className="sticky top-0 z-10 flex items-center justify-between rounded-t-[28px] border-b border-slate-200/80 bg-[#f8f8fc]/95 px-5 py-4 backdrop-blur dark:border-white/10 dark:bg-[#11111c]/95 sm:px-7"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-brand">Personalización de Perfil</p><h2 id="profile-editor-title" className="text-xl font-extrabold">Configuración estilo Steam</h2></div><button onClick={onClose} aria-label="Cerrar editor" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-slate-200 dark:hover:bg-white/10"><X size={18} /></button></header>
      <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="card p-5"><div className="mb-4 flex items-center gap-2"><Shield size={18} className="text-brand" /><div><h3 className="font-bold">Identidad</h3><p className="text-xs text-slate-500">Lo que verás en tu espacio privado.</p></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Nombre visible<input value={draft.displayName} onChange={setField('displayName')} maxLength={50} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10" /></label><label className="text-xs font-semibold">Usuario<input value={draft.username} onChange={setField('username')} maxLength={24} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10" /></label></div><label className="mt-4 block text-xs font-semibold">Bio<textarea value={draft.bio} onChange={setField('bio')} maxLength={280} rows={3} className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10" /></label><label className="mt-4 block text-xs font-semibold">Estado<input value={draft.status} onChange={setField('status')} maxLength={100} placeholder="¿Qué estás viendo hoy?" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10" /></label></section>

          {/* SECCIÓN ESTILO STEAM: MARCOS DE AVATAR ANIMADOS */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-pink-500" />
              <div>
                <h3 className="font-bold">Marcos de Avatar Animados</h3>
                <p className="text-xs text-slate-500">Marcos con efectos dinámicos GPU al estilo de la tienda de Steam.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {AVATAR_FRAMES.map((frame) => {
                const isSelected = (draft.avatarFrame || 'none') === frame.id
                return (
                  <button
                    key={frame.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, avatarFrame: frame.id }))}
                    className={`flex flex-col items-center p-3 rounded-2xl border text-center transition ${
                      isSelected
                        ? 'border-brand bg-brand/10 shadow-md ring-2 ring-brand/40'
                        : 'border-slate-200/80 bg-white/50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="my-2">
                      <AvatarFrame
                        profile={{ ...draft, avatarFrame: frame.id }}
                        frameId={frame.id}
                        size="md"
                      />
                    </div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1">{frame.label}</p>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{frame.desc}</p>
                    {isSelected && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-black uppercase text-brand">
                        <Check size={11} /> Equipado
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* SECCIÓN ESTILO STEAM: FONDOS / TEMAS DE PERFIL */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Palette size={18} className="text-cyan-500" />
              <div>
                <h3 className="font-bold">Fondos y Temas Temáticos</h3>
                <p className="text-xs text-slate-500">Transforma la atmósfera visual de tu perfil público y privado.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {PROFILE_THEMES.map((theme) => {
                const isSelected = (draft.profileTheme || 'default') === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, profileTheme: theme.id }))}
                    className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                      isSelected
                        ? 'border-brand bg-brand/10 shadow-md ring-2 ring-brand/40'
                        : 'border-slate-200/80 bg-white/50 hover:border-slate-300 dark:border-white/10 dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 w-full">
                      <span
                        className="h-3.5 w-3.5 rounded-full shadow-xs"
                        style={{ backgroundColor: theme.color }}
                      />
                      <span className="text-xs font-bold truncate flex-1">{theme.label}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{theme.desc}</p>
                    {isSelected && (
                      <span className="mt-2.5 inline-flex items-center gap-1 text-[9px] font-black uppercase text-brand">
                        <Check size={11} /> Activo
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          {/* SECCIÓN ESTILO STEAM: VITRINA DE OBRA MAESTRA */}
          <section className="card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Award size={18} className="text-amber-500" />
              <div>
                <h3 className="font-bold">Vitrina de Obra Maestra (Showcase)</h3>
                <p className="text-xs text-slate-500">Destaca tu anime predilecto con cita y veredicto personal.</p>
              </div>
            </div>
            <label className="block text-xs font-semibold">
              Anime para la vitrina
              <select
                value={draft.featuredAnimeId}
                onChange={setField('featuredAnimeId')}
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none dark:border-white/10"
              >
                <option value="">Usar mi favorito actual</option>
                {library.map((item) => (
                  <option key={item.q} value={item.q}>
                    {item.t}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-xs font-semibold">
              Frase o cita memorable de la vitrina (máximo 140 car.)
              <input
                value={draft.featuredQuote || ''}
                onChange={setField('featuredQuote')}
                maxLength={140}
                placeholder="Ej: Una obra maestra que cambió mi forma de ver el anime."
                className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10"
              />
            </label>

            <label className="mt-4 block text-xs font-semibold">
              Tu reseña o veredicto personal (máximo 400 car.)
              <textarea
                value={draft.featuredReview || ''}
                onChange={setField('featuredReview')}
                maxLength={400}
                rows={3}
                placeholder="Ej: La evolución de los personajes y la banda sonora en el clímax son insuperables..."
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10"
              />
            </label>
          </section>

          <section className="card p-5"><div className="mb-4 flex items-center gap-2"><Image size={18} className="text-brand" /><div><h3 className="font-bold">Apariencia</h3><p className="text-xs text-slate-500">Tus imágenes se guardan en tu cuenta cuando hay conexión.</p></div></div><div className="space-y-4"><UploadButton kind="avatar" current={draft.avatar} fileName={fileNames.avatar} uploading={uploadingKind === 'avatar'} onReset={() => resetImage('avatar')} onChange={handleImage('avatar')} /><UploadButton kind="banner" current={draft.banner} fileName={fileNames.banner} uploading={uploadingKind === 'banner'} onReset={() => resetImage('banner')} onChange={handleImage('banner')} /></div><div className="mt-5 flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-semibold">Color de acento<input type="color" value={draft.accent} onChange={setField('accent')} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0" /></label><button onClick={reset} className="text-xs font-semibold text-slate-500 transition hover:text-red-500">Restablecer apariencia</button></div></section>

          <section className="card p-5"><div className="mb-4 flex items-center gap-2"><Palette size={18} className="text-brand" /><div><h3 className="font-bold">Navegación del perfil</h3><p className="text-xs text-slate-500">Elige qué pestañas fijar y cuál abrir por defecto.</p></div></div><label className="block text-xs font-semibold">Sección al abrir<select value={draft.landingSection} onChange={setField('landingSection')} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-transparent px-3 text-sm outline-none dark:border-white/10">{Object.entries(pinLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label><div className="mt-5"><p className="text-xs font-semibold">Secciones fijadas</p><div className="mt-2 flex flex-wrap gap-2">{Object.entries(pinLabels).map(([id, label]) => <label key={id} className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition ${draft.pinnedSections.includes(id) ? 'border-brand bg-brand/10 text-brand' : 'border-slate-200 text-slate-500 dark:border-white/10'}`}><input type="checkbox" checked={draft.pinnedSections.includes(id)} onChange={() => togglePinned(id)} className="sr-only" />{draft.pinnedSections.includes(id) && <Check size={13} />}{label}</label>)}</div></div></section>

          <section className="card p-5"><div className="mb-4 flex items-center gap-2"><LockKeyhole size={18} className="text-brand" /><div><h3 className="font-bold">Privacidad</h3><p className="text-xs text-slate-500">Controla qué compartes con cada tipo de visitante.</p></div></div><div className="space-y-3">{Object.entries(privacyLabels).map(([id, label]) => <label key={id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs dark:bg-white/5"><span className="font-medium">{label}</span><select value={draft.privacy[id]} onChange={(event) => setDraft((current) => ({ ...current, privacy: { ...current.privacy, [id]: event.target.value } }))} className="rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-xs outline-none dark:border-white/10"><option value="private">Solo tú</option><option value="friends">Amigos</option><option value="public">Perfil público</option></select></label>)}</div></section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden relative shadow-xl" style={{ '--profile-accent': draft.accent }}>
            <ProfileThemeBackground themeId={draft.profileTheme} />
            <div className="relative h-24 overflow-hidden bg-gradient-to-br from-brand to-pink-400 z-10">
              {draft.banner && <img src={draft.banner} alt="" onError={(event) => { event.currentTarget.style.display = 'none' }} className="absolute inset-0 h-full w-full object-cover" />}
            </div>
            <div className="px-4 pb-5 relative z-10">
              <div className="-mt-10">
                <AvatarFrame
                  profile={draft}
                  frameId={draft.avatarFrame}
                  size="md"
                />
              </div>
              <p className="mt-2 text-lg font-extrabold">{draft.displayName || 'Tu nombre'}</p>
              <p className="text-xs text-slate-500">@{draft.username || 'usuario'}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-brand/10 text-[10px] font-bold text-brand">
                  Marco: {AVATAR_FRAMES.find((f) => f.id === draft.avatarFrame)?.label || 'Sin marco'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                  Fondo: {PROFILE_THEMES.find((t) => t.id === draft.profileTheme)?.label || 'Clásico'}
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{draft.bio || 'Tu bio aparecerá aquí.'}</p>
              <div className="mt-3 rounded-xl bg-[var(--profile-accent)]/10 px-3 py-2 text-xs font-medium text-[var(--profile-accent)]">{draft.status || 'Tu estado aparecerá aquí.'}</div>
            </div>
          </div>
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-xs leading-5 text-slate-600 dark:text-slate-300">
            <p className="flex items-center gap-2 font-semibold text-brand"><Sparkles size={14} /> Estilo Steam Activo</p>
            <p className="mt-1">Tus marcos y temas animados son visibles tanto en tu espacio privado como en tu perfil público.</p>
          </div>
        </aside>
      </div>
      {(error || storageError) && <p role="alert" className="mx-5 mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-xs font-medium text-red-600 sm:mx-7">{error || storageError}</p>}
      <footer className="flex justify-end gap-2 rounded-b-[28px] border-t border-slate-200/80 px-5 py-4 dark:border-white/10 sm:px-7"><button onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/10">Cancelar</button><button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/20 transition hover:-translate-y-0.5 disabled:opacity-60">{saving ? 'Guardando…' : <><Check size={16} /> Guardar cambios</>}</button></footer>
    </div>
  </div>
}
