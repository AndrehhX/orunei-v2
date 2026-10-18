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
              {/* Anillo de aura exterior */}
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#sakura-grad)"
                strokeWidth="2.5"
                opacity="0.9"
                style={{ animation: 'frame-pulse-glow 3s ease-in-out infinite' }}
              />
              {/* Anillo orbital de pétalos girando suavemente */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-slow 22s linear infinite' }}>
                <circle cx="50" cy="50" r="48" fill="none" stroke="#fda4af" strokeWidth="1" strokeDasharray="4 16" opacity="0.7" />
                {/* 4 pétalos estilizados en órbita */}
                <path d="M 50 1 A 4 4 0 0 1 54 5 C 54 8 50 11 50 11 C 50 11 46 8 46 5 A 4 4 0 0 1 50 1 Z" fill="#f472b6" />
                <path d="M 99 50 A 4 4 0 0 1 95 54 C 92 54 89 50 89 50 C 89 50 92 46 95 46 A 4 4 0 0 1 99 50 Z" fill="#fda4af" />
                <path d="M 50 99 A 4 4 0 0 1 46 95 C 46 92 50 89 50 89 C 50 89 54 92 54 95 A 4 4 0 0 1 50 99 Z" fill="#f472b6" />
                <path d="M 1 50 A 4 4 0 0 1 5 46 C 8 46 11 50 11 50 C 11 50 8 54 5 54 A 4 4 0 0 1 1 50 Z" fill="#fda4af" />
              </g>
              {/* Pétalos florales adicionales con giro inverso */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-reverse 15s linear infinite' }}>
                <circle cx="20" cy="20" r="2.5" fill="#f472b6" opacity="0.9" />
                <circle cx="80" cy="80" r="2.5" fill="#fda4af" opacity="0.9" />
                <circle cx="80" cy="20" r="2" fill="#fb7185" opacity="0.8" />
                <circle cx="20" cy="80" r="2" fill="#fb7185" opacity="0.8" />
              </g>
            </g>
          )}

          {/* CYBER NEON FRAME */}
          {activeFrame === 'cyber' && (
            <g style={{ filter: 'url(#glow-cyber)' }}>
              {/* Anillo exterior segmentado rotativo */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-slow 10s linear infinite' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="46.5"
                  fill="none"
                  stroke="url(#cyber-grad)"
                  strokeWidth="2.5"
                  strokeDasharray="22 14 6 14"
                />
              </g>
              {/* Anillo interior en contragiro */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-reverse 7s linear infinite' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.2"
                  strokeDasharray="6 26"
                  opacity="0.8"
                />
              </g>
              {/* 4 Brackets esquineros de interfaz tecnológica */}
              <path d="M 4 22 L 4 4 L 22 4" fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 96 22 L 96 4 L 78 4" fill="none" stroke="#d946ef" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 4 78 L 4 96 L 22 96" fill="none" stroke="#d946ef" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M 96 78 L 96 96 L 78 96" fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" />
              {/* Puntos pulsantes de red en los 4 ejes */}
              <circle cx="50" cy="2" r="2" fill="#06b6d4" />
              <circle cx="98" cy="50" r="2" fill="#d946ef" />
              <circle cx="50" cy="98" r="2" fill="#06b6d4" />
              <circle cx="2" cy="50" r="2" fill="#d946ef" />
            </g>
          )}

          {/* CRIMSON FLAME FRAME */}
          {activeFrame === 'flame' && (
            <g style={{ transformOrigin: '50px 50px', animation: 'frame-flame-flicker 2.4s ease-in-out infinite' }}>
              {/* Corona de fuego exterior */}
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#flame-grad)"
                strokeWidth="3.2"
              />
              {/* Llamas dinámicas superiores */}
              <path
                d="M 42 6 Q 46 -3 50 2 Q 54 -4 58 6 Q 64 2 68 12 Q 50 8 42 6 Z"
                fill="url(#flame-grad)"
                opacity="0.95"
              />
              {/* Lenguas de fuego laterales */}
              <path
                d="M 6 42 Q -2 48 3 52 Q -4 56 6 60 Q 8 50 6 42 Z"
                fill="#f97316"
                opacity="0.9"
              />
              <path
                d="M 94 42 Q 102 48 97 52 Q 104 56 94 60 Q 92 50 94 42 Z"
                fill="#f97316"
                opacity="0.9"
              />
              {/* Chispas flotantes */}
              <circle cx="48" cy="-1" r="1.5" fill="#fef08a" />
              <circle cx="62" cy="3" r="1.2" fill="#facc15" />
              <circle cx="8" cy="38" r="1.3" fill="#f97316" />
              <circle cx="92" cy="65" r="1.4" fill="#facc15" />
            </g>
          )}

          {/* COSMIC NEBULA FRAME */}
          {activeFrame === 'cosmic' && (
            <g style={{ filter: 'drop-shadow(0 0 10px rgba(139,92,246,0.8))' }}>
              {/* Anillo de constelación exterior */}
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#cosmic-grad)"
                strokeWidth="2.5"
                style={{ animation: 'frame-pulse-glow 3.5s ease-in-out infinite' }}
              />
              {/* Órbita estelar giratoria */}
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-slow 16s linear infinite' }}>
                <circle cx="50" cy="50" r="48" fill="none" stroke="#a78bfa" strokeWidth="0.8" strokeDasharray="3 15" opacity="0.6" />
                {/* 4 estrellas de cuatro puntas en órbita */}
                <path d="M 50 2 L 51.5 6 L 55 7.5 L 51.5 9 L 50 13 L 48.5 9 L 45 7.5 L 48.5 6 Z" fill="#e0e7ff" />
                <path d="M 98 50 L 94 51.5 L 92.5 55 L 91 51.5 L 87 50 L 91 48.5 L 92.5 45 L 94 48.5 Z" fill="#c084fc" />
                <path d="M 50 98 L 48.5 94 L 45 92.5 L 48.5 91 L 50 87 L 51.5 91 L 55 92.5 L 51.5 94 Z" fill="#e0e7ff" />
                <path d="M 2 50 L 6 48.5 L 7.5 45 L 9 48.5 L 13 50 L 9 51.5 L 7.5 55 L 6 51.5 Z" fill="#38bdf8" />
              </g>
              {/* Polvo estelar centelleante */}
              <circle cx="22" cy="24" r="1.8" fill="#ffffff" style={{ animation: 'star-twinkle 2s ease-in-out infinite' }} />
              <circle cx="78" cy="76" r="1.5" fill="#67e8f9" style={{ animation: 'star-twinkle 2.5s ease-in-out 0.7s infinite' }} />
              <circle cx="76" cy="22" r="1.6" fill="#f472b6" style={{ animation: 'star-twinkle 2.2s ease-in-out 1.2s infinite' }} />
            </g>
          )}

          {/* IMPERIAL GOLD FRAME */}
          {activeFrame === 'gold' && (
            <g style={{ animation: 'frame-gold-shimmer 3s ease-in-out infinite' }}>
              {/* Anillo biselado exterior */}
              <circle
                cx="50"
                cy="50"
                r="46.5"
                fill="none"
                stroke="url(#gold-grad)"
                strokeWidth="3.2"
              />
              <circle
                cx="50"
                cy="50"
                r="43.5"
                fill="none"
                stroke="#fef08a"
                strokeWidth="1"
                opacity="0.8"
              />
              {/* Corona Imperial en la parte superior */}
              <path
                d="M 40 4 L 44 9 L 50 2 L 56 9 L 60 4 L 58 13 L 42 13 Z"
                fill="url(#gold-grad)"
                stroke="#78350f"
                strokeWidth="0.6"
              />
              <circle cx="50" cy="4" r="1.5" fill="#fef08a" />
              {/* Sellos de gemas doradas en las 4 esquinas */}
              <polygon points="12,12 16,8 20,12 16,16" fill="url(#gold-grad)" stroke="#fef08a" strokeWidth="0.5" />
              <polygon points="88,12 92,8 96,12 92,16" fill="url(#gold-grad)" stroke="#fef08a" strokeWidth="0.5" />
              <polygon points="12,88 16,84 20,88 16,92" fill="url(#gold-grad)" stroke="#fef08a" strokeWidth="0.5" />
              <polygon points="88,88 92,84 96,88 92,92" fill="url(#gold-grad)" stroke="#fef08a" strokeWidth="0.5" />
            </g>
          )}

          {/* SYNTHWAVE GLITCH FRAME */}
          {activeFrame === 'synthwave' && (
            <g style={{ animation: 'frame-synth-glitch 4s steps(2) infinite' }}>
              {/* Anillo de cuadrícula retro */}
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="url(#synth-grad)"
                strokeWidth="2.8"
              />
              <g style={{ transformOrigin: '50px 50px', animation: 'frame-spin-slow 8s linear infinite' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="48.5"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="1.2"
                  strokeDasharray="10 18"
                />
              </g>
              {/* Ticks laterales de sintetizador */}
              <line x1="2" y1="48" x2="10" y2="48" stroke="#ec4899" strokeWidth="2" />
              <line x1="2" y1="52" x2="10" y2="52" stroke="#06b6d4" strokeWidth="2" />
              <line x1="90" y1="48" x2="98" y2="48" stroke="#06b6d4" strokeWidth="2" />
              <line x1="90" y1="52" x2="98" y2="52" stroke="#ec4899" strokeWidth="2" />
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
