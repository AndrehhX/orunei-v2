import { useMemo } from 'react'

export default function AvatarFrame({
  profile = {},
  frameId,
  size = 'lg',
  className = '',
  imgClassName = '',
  showGifBadge = true,
  onClick,
}) {
  const activeFrame = frameId || profile.avatarFrame || 'none'
  const isGif = typeof profile?.avatar === 'string' && (profile.avatar.toLowerCase().includes('.gif') || profile.avatar.startsWith('data:image/gif'))
  const initial = (profile?.displayName || 'U').slice(0, 1).toUpperCase()

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'xs':
        return 'h-8 w-8 text-xs'
      case 'sm':
        return 'h-10 w-10 text-sm'
      case 'md':
        return 'h-16 w-16 text-xl'
      case 'lg':
        return 'h-24 w-24 sm:h-28 sm:w-28 text-3xl'
      case 'xl':
        return 'h-32 w-32 text-4xl'
      default:
        return size // Permite clases personalizadas directas
    }
  }, [size])

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex shrink-0 items-center justify-center select-none ${sizeClasses} ${className}`}
    >
      {/* Marco de Avatar Animado SVG (Overlay) */}
      {activeFrame !== 'none' && (
        <svg
          viewBox="0 0 100 100"
          className="avatar-frame-svg pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            {/* Gradientes de marcos */}
            <linearGradient id="sakura-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="50%" stopColor="#fda4af" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>

            <linearGradient id="cyber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>

            <linearGradient id="flame-grad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#facc15" />
            </linearGradient>

            <linearGradient id="cosmic-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="35%" stopColor="#fef08a" />
              <stop offset="70%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            <linearGradient id="synth-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Filtros de Resplandor */}
            <filter id="glow-sakura" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="glow-cyber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="glow-flame" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="glow-gold" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* SAKURA BLOSSOM FRAME */}
          {activeFrame === 'sakura' && (
            <g style={{ filter: 'url(#glow-sakura)' }}>
              {/* Anillo de aura exterior adherido al círculo */}
              <circle
                cx="50"
                cy="50"
                r="41.7"
                fill="none"
                stroke="url(#sakura-grad)"
                strokeWidth="3.2"
                opacity="0.95"
                style={{ animation: 'frame-pulse-glow 3s ease-in-out infinite' }}
              />
              {/* Anillo orbital de pétalos girando suavemente */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-slow 22s linear infinite' }}>
                <circle cx="50" cy="50" r="43" fill="none" stroke="#fda4af" strokeWidth="1" strokeDasharray="3 14" opacity="0.6" />
                {/* 4 pétalos estilizados en órbita pegados al borde */}
                <path d="M 50 6 A 3.5 3.5 0 0 1 53.5 9.5 C 53.5 12 50 14.5 50 14.5 C 50 14.5 46.5 12 46.5 9.5 A 3.5 3.5 0 0 1 50 6 Z" fill="#f472b6" />
                <path d="M 94 50 A 3.5 3.5 0 0 1 90.5 53.5 C 88 53.5 85.5 50 85.5 50 C 85.5 50 88 46.5 90.5 46.5 A 3.5 3.5 0 0 1 94 50 Z" fill="#fda4af" />
                <path d="M 50 94 A 3.5 3.5 0 0 1 46.5 90.5 C 46.5 88 50 85.5 50 85.5 C 50 85.5 53.5 88 53.5 90.5 A 3.5 3.5 0 0 1 50 94 Z" fill="#f472b6" />
                <path d="M 6 50 A 3.5 3.5 0 0 1 9.5 46.5 C 12 46.5 14.5 50 14.5 50 C 14.5 50 12 53.5 9.5 53.5 A 3.5 3.5 0 0 1 6 50 Z" fill="#fda4af" />
              </g>
              {/* Pétalos florales adicionales con giro inverso */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-reverse 15s linear infinite' }}>
                <circle cx="21" cy="21" r="2.2" fill="#f472b6" opacity="0.9" />
                <circle cx="79" cy="79" r="2.2" fill="#fda4af" opacity="0.9" />
                <circle cx="79" cy="21" r="2" fill="#fb7185" opacity="0.8" />
                <circle cx="21" cy="79" r="2" fill="#fb7185" opacity="0.8" />
              </g>
            </g>
          )}

          {/* CYBER NEON FRAME */}
          {activeFrame === 'cyber' && (
            <g style={{ filter: 'url(#glow-cyber)' }}>
              {/* Anillo exterior segmentado rotativo pegado al círculo */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-slow 10s linear infinite' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="42.5"
                  fill="none"
                  stroke="url(#cyber-grad)"
                  strokeWidth="2.8"
                  strokeDasharray="20 12 6 12"
                />
              </g>
              {/* Anillo interior de pulso */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-reverse 7s linear infinite' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="40.8"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.2"
                  strokeDasharray="6 22"
                  opacity="0.85"
                />
              </g>
              {/* 4 Brackets esquineros de interfaz tecnológica cercanos */}
              <path d="M 10 24 L 10 10 L 24 10" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
              <path d="M 90 24 L 90 10 L 76 10" fill="none" stroke="#d946ef" strokeWidth="2" strokeLinecap="round" />
              <path d="M 10 76 L 10 90 L 24 90" fill="none" stroke="#d946ef" strokeWidth="2" strokeLinecap="round" />
              <path d="M 90 76 L 90 90 L 76 90" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
              {/* Puntos pulsantes en los ejes */}
              <circle cx="50" cy="7" r="1.8" fill="#06b6d4" />
              <circle cx="93" cy="50" r="1.8" fill="#d946ef" />
              <circle cx="50" cy="93" r="1.8" fill="#06b6d4" />
              <circle cx="7" cy="50" r="1.8" fill="#d946ef" />
            </g>
          )}

          {/* CRIMSON FLAME FRAME */}
          {activeFrame === 'flame' && (
            <g style={{ transformOrigin: '50px 50px', animation: 'frame-flame-flicker 2.4s ease-in-out infinite' }}>
              {/* Corona de fuego envolviendo el círculo */}
              <circle
                cx="50"
                cy="50"
                r="41.7"
                fill="none"
                stroke="url(#flame-grad)"
                strokeWidth="3.4"
              />
              {/* Llamas dinámicas superiores */}
              <path
                d="M 44 9 Q 47 2 50 5 Q 53 1 56 9 Q 60 5 64 13 Q 50 10 44 9 Z"
                fill="url(#flame-grad)"
                opacity="0.95"
              />
              {/* Lenguas de fuego laterales */}
              <path
                d="M 9 44 Q 3 48 7 51 Q 2 54 9 57 Q 10 49 9 44 Z"
                fill="#f97316"
                opacity="0.9"
              />
              <path
                d="M 91 44 Q 97 48 93 51 Q 98 54 91 57 Q 90 49 91 44 Z"
                fill="#f97316"
                opacity="0.9"
              />
              {/* Chispas flotantes */}
              <circle cx="49" cy="2" r="1.4" fill="#fef08a" />
              <circle cx="58" cy="4" r="1.2" fill="#facc15" />
              <circle cx="10" cy="40" r="1.3" fill="#f97316" />
              <circle cx="90" cy="61" r="1.3" fill="#facc15" />
            </g>
          )}

          {/* COSMIC NEBULA FRAME */}
          {activeFrame === 'cosmic' && (
            <g style={{ filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.8))' }}>
              {/* Anillo exterior adherido */}
              <circle
                cx="50"
                cy="50"
                r="41.7"
                fill="none"
                stroke="url(#cosmic-grad)"
                strokeWidth="2.8"
                style={{ animation: 'frame-pulse-glow 3.5s ease-in-out infinite' }}
              />
              {/* Órbita estelar giratoria */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-slow 16s linear infinite' }}>
                <circle cx="50" cy="50" r="43.5" fill="none" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="3 14" opacity="0.6" />
                {/* 4 estrellas de cuatro puntas en órbita */}
                <path d="M 50 6 L 51.2 9.5 L 54.5 10.7 L 51.2 11.9 L 50 15 L 48.8 11.9 L 45.5 10.7 L 48.8 9.5 Z" fill="#e0e7ff" />
                <path d="M 94 50 L 90.5 51.2 L 89.3 54.5 L 88.1 51.2 L 85 50 L 88.1 48.8 L 89.3 45.5 L 90.5 48.8 Z" fill="#c084fc" />
                <path d="M 50 94 L 48.8 90.5 L 45.5 89.3 L 48.8 88.1 L 50 85 L 51.2 88.1 L 54.5 89.3 L 51.2 90.5 Z" fill="#e0e7ff" />
                <path d="M 6 50 L 9.5 48.8 L 10.7 45.5 L 11.9 48.8 L 15 50 L 11.9 51.2 L 10.7 54.5 L 9.5 51.2 Z" fill="#38bdf8" />
              </g>
              {/* Polvo estelar centelleante */}
              <circle cx="23" cy="24" r="1.6" fill="#ffffff" style={{ animation: 'star-twinkle 2s ease-in-out infinite' }} />
              <circle cx="77" cy="76" r="1.4" fill="#67e8f9" style={{ animation: 'star-twinkle 2.5s ease-in-out 0.7s infinite' }} />
              <circle cx="76" cy="24" r="1.5" fill="#f472b6" style={{ animation: 'star-twinkle 2.2s ease-in-out 1.2s infinite' }} />
            </g>
          )}

          {/* IMPERIAL GOLD FRAME */}
          {activeFrame === 'gold' && (
            <g style={{ animation: 'frame-gold-shimmer 3s ease-in-out infinite' }}>
              {/* Anillo de oro pegado al borde */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#gold-grad)"
                strokeWidth="3.2"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#fef08a"
                strokeWidth="1"
                opacity="0.8"
              />
              {/* Corona Imperial en la parte superior */}
              <path
                d="M 42 7 L 45 11 L 50 6 L 55 11 L 58 7 L 57 14 L 43 14 Z"
                fill="url(#gold-grad)"
                stroke="#78350f"
                strokeWidth="0.5"
              />
              <circle cx="50" cy="7" r="1.3" fill="#fef08a" />
              {/* Sellos de gemas doradas */}
              <polygon points="16,16 19,13 22,16 19,19" fill="url(#gold-grad)" stroke="#fef08a" strokeWidth="0.5" />
              <polygon points="84,16 87,13 90,16 87,19" fill="url(#gold-grad)" stroke="#fef08a" strokeWidth="0.5" />
              <polygon points="16,84 19,81 22,84 19,87" fill="url(#gold-grad)" stroke="#fef08a" strokeWidth="0.5" />
              <polygon points="84,84 87,81 90,84 87,87" fill="url(#gold-grad)" stroke="#fef08a" strokeWidth="0.5" />
            </g>
          )}

          {/* SYNTHWAVE GLITCH FRAME */}
          {activeFrame === 'synthwave' && (
            <g style={{ animation: 'frame-synth-glitch 4s steps(2) infinite' }}>
              {/* Anillo de cuadrícula retro */}
              <circle
                cx="50"
                cy="50"
                r="41.7"
                fill="none"
                stroke="url(#synth-grad)"
                strokeWidth="2.8"
              />
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-slow 8s linear infinite' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="43.5"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1"
                  strokeDasharray="8 16"
                />
              </g>
              {/* Ticks laterales de sintetizador */}
              <line x1="6" y1="48" x2="13" y2="48" stroke="#ec4899" strokeWidth="1.8" />
              <line x1="6" y1="52" x2="13" y2="52" stroke="#06b6d4" strokeWidth="1.8" />
              <line x1="87" y1="48" x2="94" y2="48" stroke="#06b6d4" strokeWidth="1.8" />
              <line x1="87" y1="52" x2="94" y2="52" stroke="#ec4899" strokeWidth="1.8" />
            </g>
          )}
        </svg>
      )}

      {/* Círculo interior del Avatar */}
      <div
        className={`h-full w-full overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-slate-600 via-brand/30 to-slate-900 shadow-xl dark:border-[#171723] transition-transform duration-300 group-hover:scale-105 ${
          activeFrame === 'none' ? 'ring-2 ring-brand/40' : ''
        } ${imgClassName}`}
      >
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt=""
            onError={(event) => {
              event.currentTarget.style.display = 'none'
            }}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center font-bold text-white">
            {initial}
          </span>
        )}
      </div>

      {/* Badge GIF si aplica */}
      {showGifBadge && isGif && (
        <span className="absolute bottom-0 right-0 z-20 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-[8px] font-black uppercase text-white shadow-md border border-white/50 dark:border-slate-900 animate-pulse">
          GIF
        </span>
      )}
    </div>
  )
}
