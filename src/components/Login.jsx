import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Eye, EyeOff, Lock, Mail, Moon, MousePointer2, ShieldCheck, Sparkles, Sun, User } from 'lucide-react'
import { REGISTER_USERNAME_PLACEHOLDER } from '../auth/authModel.js'
import { getLoginPointerOffset, shouldEnableLoginParallax } from '../ui/loginVisual.js'
import OruneiLogo from './OruneiLogo'

function Field({ icon: Icon, label, children, ...props }) {
  return (
    <label className="login-field block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[.14em] text-slate-500 dark:text-slate-400">{label}</span>
      <span className="login-input-wrap group flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 transition-all duration-300 focus-within:border-brand focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(109,92,255,.12)] dark:border-white/10 dark:bg-white/[.06] dark:focus-within:bg-white/[.1]">
        <Icon size={17} strokeWidth={1.8} className="shrink-0 text-slate-400 transition-colors group-focus-within:text-brand" />
        <input {...props} className="h-12 w-full min-w-0 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500" />
        {children}
      </span>
    </label>
  )
}

function LoginArtwork() {
  const ref = useRef(null)
  const [parallax, setParallax] = useState(false)
  const frameRef = useRef(0)
  const pointerRef = useRef({ clientX: 0, clientY: 0 })
  const rectRef = useRef(null)

  useEffect(() => {
    const pointerQuery = window.matchMedia('(pointer: fine)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const resetStyles = () => {
      const element = ref.current
      if (!element) return
      element.style.setProperty('--login-x', '0px')
      element.style.setProperty('--login-y', '0px')
      element.style.setProperty('--login-glow-x', '50%')
      element.style.setProperty('--login-glow-y', '44%')
    }
    const renderPointer = () => {
      frameRef.current = 0
      const element = ref.current
      const rect = rectRef.current
      if (!element || !rect) return
      const offset = getLoginPointerOffset(pointerRef.current, rect)
      element.style.setProperty('--login-x', `${offset.x * 4}px`)
      element.style.setProperty('--login-y', `${offset.y * 3}px`)
      element.style.setProperty('--login-glow-x', `${50 + offset.x * 6}%`)
      element.style.setProperty('--login-glow-y', `${44 + offset.y * 5}%`)
    }
    const scheduleRender = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(renderPointer)
    }
    const refreshRect = () => {
      rectRef.current = ref.current?.getBoundingClientRect() ?? null
    }
    const sync = () => {
      const enabled = shouldEnableLoginParallax({ pointer: pointerQuery.matches ? 'fine' : 'coarse', reducedMotion: motionQuery.matches })
      setParallax(enabled)
      if (!enabled) {
        rectRef.current = null
        resetStyles()
      }
    }
    const move = (event) => {
      if (!shouldEnableLoginParallax({ pointer: pointerQuery.matches ? 'fine' : 'coarse', reducedMotion: motionQuery.matches })) return
      if (!rectRef.current) refreshRect()
      pointerRef.current = { clientX: event.clientX, clientY: event.clientY }
      scheduleRender()
    }
    const enter = () => {
      refreshRect()
      scheduleRender()
    }
    const leave = () => {
      pointerRef.current = { clientX: 0, clientY: 0 }
      rectRef.current = null
      resetStyles()
    }
    sync()
    ref.current?.addEventListener('pointermove', move, { passive: true })
    ref.current?.addEventListener('pointerenter', enter, { passive: true })
    ref.current?.addEventListener('pointerleave', leave)
    window.addEventListener('resize', refreshRect, { passive: true })
    pointerQuery.addEventListener?.('change', sync)
    motionQuery.addEventListener?.('change', sync)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      ref.current?.removeEventListener('pointermove', move)
      ref.current?.removeEventListener('pointerenter', enter)
      ref.current?.removeEventListener('pointerleave', leave)
      window.removeEventListener('resize', refreshRect)
      pointerQuery.removeEventListener?.('change', sync)
      motionQuery.removeEventListener?.('change', sync)
    }
  }, [])

  return (
    <aside
      ref={ref}
      className={`login-art-panel ${parallax ? 'login-art-panel--interactive' : ''}`}
      aria-label="Ilustración animada de Orunei"
    >
      <div className="login-art-noise" />
      <div className="login-art-orbit login-art-orbit--one" />
      <div className="login-art-orbit login-art-orbit--two" />
      <div className="login-art-copy">
        <span className="login-art-kicker"><Sparkles size={14} /> ORUNEI / TU UNIVERSO</span>
        <h2>Tu próxima historia empieza aquí.</h2>
        <p>Descubre, organiza y comparte todo lo que te mueve.</p>
      </div>
      <div className="login-art-stage" aria-hidden="true">
        <div className="login-art-shadow" />
        <img className="login-character" src="/assets/anime-login-girl.png" alt="" />
        <span className="login-art-spark login-art-spark--one">✦</span>
        <span className="login-art-spark login-art-spark--two">✧</span>
        <span className="login-art-spark login-art-spark--three">·</span>
      </div>
      <div className="login-art-footer">
        <span><ShieldCheck size={16} /> Tu espacio, tus historias</span>
        {parallax && <span className="login-art-cursor-hint"><MousePointer2 size={14} /> Mueve el cursor</span>}
      </div>
    </aside>
  )
}

export default function Login({ onSignIn, onSignUp, authStatus = 'ready', authError = '', dark, setDark, theme = (dark ? 'dark' : 'light'), setTheme }) {
  const [reg, setReg] = useState(false)
  const [f, setF] = useState({ name: '', email: '', pass: '' })
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [shake, setShake] = useState(0)
  const [state, setState] = useState('idle')
  const set = (key) => (event) => { setF((prev) => ({ ...prev, [key]: event.target.value })); setErr(''); setNotice('') }
  const handleEmailBlur = () => {
    setF((prev) => ({ ...prev, email: (prev.email || '').trim().toLowerCase() }))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (authStatus === 'misconfigured') return fail(authError || 'Configura Supabase para activar las cuentas reales.')
    
    const cleanEmail = (f.email || '').trim().toLowerCase()
    const cleanName = (f.name || '').trim()
    const cleanPass = f.pass

    if (reg && cleanName.length < 2) return fail('Dime tu nombre de usuario')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return fail('Ese correo no parece válido')
    if (cleanPass.length < 6) return fail('La contraseña necesita al menos 6 caracteres')
    setState('loading')
    const result = reg ? await onSignUp({ email: cleanEmail, password: cleanPass, name: cleanName }) : await onSignIn({ email: cleanEmail, password: cleanPass })
    if (result?.error) {
      setState('idle')
      return fail(result.error)
    }
    setState('done')
    if (reg && !result?.data?.session) {
      setNotice('Cuenta creada. Revisa tu correo para confirmar el acceso.')
      setTimeout(() => setState('idle'), 700)
    }
  }

  const translateAuthError = (err) => {
    if (!err) return 'Ocurrió un error inesperado al procesar la solicitud.'
    const msg = typeof err === 'string' ? err : err.message || ''
    const lower = msg.toLowerCase()
    if (lower.includes('rate limit') || lower.includes('over_email_send_rate_limit') || lower.includes('limit exceeded')) {
      return 'Límite de envíos por hora alcanzado en el servidor de correo. Intenta iniciar sesión si ya te registraste, o espera unos minutos.'
    }
    if (lower.includes('user already registered') || lower.includes('already exists')) {
      return 'Este correo ya tiene una cuenta registrada. Inicia sesión directamente.'
    }
    if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
      return 'Correo o contraseña incorrectos.'
    }
    if (lower.includes('email not confirmed')) {
      return 'Debes confirmar tu correo electrónico antes de ingresar.'
    }
    if (lower.includes('signup requires a valid password') || lower.includes('password should be at least')) {
      return 'La contraseña debe tener al menos 6 caracteres.'
    }
    return msg
  }

  const fail = (message) => { setErr(translateAuthError(message)); setNotice(''); setShake((value) => value + 1) }

  return (
    <>
      <main className="login-page relative min-h-screen overflow-hidden px-4 py-5 sm:px-8 sm:py-8 lg:px-12">
        <div className="login-background-blob login-background-blob--one" />
        <div className="login-background-blob login-background-blob--two" />
        <div className="login-frame relative mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-[1240px] overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-[0_30px_100px_rgba(44,37,92,.14)] backdrop-blur-xl dark:border-white/10 dark:bg-[#151522]/90 sm:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(390px,.84fr)_minmax(480px,1.16fr)]">
          <section className="login-form-panel relative flex flex-col px-6 py-7 sm:px-12 sm:py-10 lg:px-16 lg:py-12">
            <header className="flex items-center justify-between">
              <OruneiLogo size={28} withText={true} textClassName="text-xl font-extrabold tracking-tight" />
              <button
                type="button"
                onClick={() => {
                  const nextTheme = theme === 'dark' ? 'sakura' : theme === 'sakura' ? 'light' : 'dark';
                  if (setTheme) setTheme(nextTheme);
                  else setDark(!dark);
                }}
                aria-label={`Cambiar tema (actual: ${theme})`}
                title={`Cambiar tema (actual: ${theme})`}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-600 shadow-sm transition hover:rotate-12 hover:scale-110 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
              >
                {theme === 'sakura' ? <span className="text-base select-none">🌸</span> : theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            </header>

            <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col justify-center py-10">
              <div className="mb-8">
                <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-brand">Bienvenido a tu espacio</p>
                <h1 className="text-3xl font-extrabold tracking-[-.04em] sm:text-[2.45rem]">{reg ? 'Crea tu cuenta' : 'Bienvenido de vuelta'}</h1>
                <p className="mt-3 max-w-[320px] text-sm leading-6 text-slate-500 dark:text-slate-400">{authStatus === 'misconfigured' ? 'Las cuentas reales necesitan una configuración de Supabase.' : reg ? 'Empieza tu biblioteca y encuentra tu próxima obsesión.' : 'Tu próxima historia favorita te está esperando.'}</p>
                {authStatus === 'misconfigured' && <p role="alert" className="mt-4 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs font-medium leading-5 text-amber-700">{authError || 'Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'}</p>}
              </div>

              <form key={shake} onSubmit={submit} noValidate className={`space-y-5 ${shake ? 'animate-shake' : 'animate-rise'}`}>
                <div className={`grid transition-all duration-500 ease-smooth ${reg ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden"><div className="pb-1"><Field icon={User} label="Usuario" value={f.name} onChange={set('name')} placeholder={REGISTER_USERNAME_PLACEHOLDER} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck="false" tabIndex={reg ? 0 : -1} /></div></div>
                </div>
                <Field
                  icon={Mail}
                  label="Correo"
                  type="email"
                  value={f.email}
                  onChange={set('email')}
                  onBlur={handleEmailBlur}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  inputMode="email"
                />
                <Field
                  icon={Lock}
                  label="Contraseña"
                  type={show ? 'text' : 'password'}
                  value={f.pass}
                  onChange={set('pass')}
                  placeholder="••••••••"
                  autoComplete={reg ? 'new-password' : 'current-password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                >
                  <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="text-slate-400 transition hover:text-brand">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </Field>
                <div className="flex min-h-5 items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  {!reg ? <label className="inline-flex items-center gap-2"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand accent-brand" /> Recordarme</label> : <span>Tu cuenta empieza aquí.</span>}
                  {!reg && <button type="button" className="font-semibold text-brand hover:underline">¿Olvidaste tu contraseña?</button>}
                </div>
                <p role="alert" aria-live="polite" className={`text-xs text-red-500 transition-all duration-300 ${err ? 'max-h-16 opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`}>{err}</p>
                <p role="status" aria-live="polite" className={`text-xs text-emerald-600 transition-all duration-300 ${notice ? 'max-h-16 opacity-100' : 'max-h-0 overflow-hidden opacity-0'}`}>{notice}</p>
                <button disabled={state !== 'idle'} className={`group relative flex min-h-[3.25rem] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm font-bold text-white transition-all duration-500 ease-spring active:scale-[.98] ${state === 'done' ? 'bg-emerald-500' : 'bg-brand shadow-lg shadow-brand/25 hover:-translate-y-0.5 hover:brightness-110'}`}>
                  {state === 'idle' && <>{reg ? 'Crear cuenta' : 'Iniciar sesión'} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></>}
                  {state === 'loading' && <i className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  {state === 'done' && <Check size={20} className="animate-drop" />}
                </button>
                {/* Registro público desactivado temporalmente */}
              </form>
            </div>

            <p className="flex items-center gap-2 text-xs text-slate-400"><ShieldCheck size={15} /> Tus datos se mantienen protegidos.</p>
          </section>
          <LoginArtwork />
        </div>
      </main>
    </>
  )
}
