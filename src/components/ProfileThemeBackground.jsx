import { useMemo } from 'react'

export default function ProfileThemeBackground({ themeId = 'default', className = '' }) {
  // Generar partículas con valores estables y ligeros
  const particles = useMemo(() => {
    switch (themeId) {
      case 'sakura-shrine':
        return Array.from({ length: 12 }, (_, i) => ({
          id: i,
          left: `${(i * 8.3 + 3) % 96}%`,
          top: `${(i * 14.5 + 5) % 85}%`,
          size: 8 + (i % 4) * 3,
          duration: 7 + (i % 5) * 1.8,
          delay: (i * 0.7) % 4,
          rotate: (i * 37) % 360,
        }))

      case 'cyber-rain':
        return Array.from({ length: 14 }, (_, i) => ({
          id: i,
          left: `${(i * 7.1 + 2) % 98}%`,
          top: `-${(i * 12) % 40}%`,
          height: 35 + (i % 4) * 25,
          duration: 2.2 + (i % 3) * 0.8,
          delay: (i * 0.35) % 3,
          isCyan: i % 2 === 0,
        }))

      case 'deep-cosmos':
        return Array.from({ length: 24 }, (_, i) => ({
          id: i,
          left: `${(i * 4.3 + 2) % 96}%`,
          top: `${(i * 7.7 + 3) % 94}%`,
          size: 1.5 + (i % 3),
          duration: 2 + (i % 4) * 0.8,
          delay: (i * 0.4) % 3.5,
          color: i % 3 === 0 ? '#67e8f9' : i % 3 === 1 ? '#c084fc' : '#ffffff',
        }))

      case 'dark-abyss':
        return Array.from({ length: 16 }, (_, i) => ({
          id: i,
          left: `${(i * 6.2 + 4) % 94}%`,
          bottom: `${(i * 5) % 30}%`,
          size: 3 + (i % 3) * 2,
          duration: 3.5 + (i % 4) * 1.2,
          delay: (i * 0.5) % 4,
          isAmber: i % 2 === 0,
        }))

      case 'golden-dawn':
        return Array.from({ length: 14 }, (_, i) => ({
          id: i,
          left: `${(i * 7.3 + 5) % 92}%`,
          bottom: `${(i * 8) % 45}%`,
          size: 2.5 + (i % 3) * 2,
          duration: 4.5 + (i % 3) * 1.5,
          delay: (i * 0.6) % 4,
        }))

      default:
        return []
    }
  }, [themeId])

  if (themeId === 'default') {
    return null
  }

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden rounded-[28px] z-0 select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. SANTUARIO SAKURA */}
      {themeId === 'sakura-shrine' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-rose-500/10 via-pink-400/5 to-rose-600/15" />
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-rose-400/20 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-pink-500/15 blur-3xl" />
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute profile-theme-particle"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size * 0.75}px`,
                background: 'linear-gradient(135deg, #f472b6, #fda4af)',
                borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
                opacity: 0.75,
                filter: 'drop-shadow(0 0 6px rgba(244,114,182,0.6))',
                transform: `rotate(${p.rotate}deg)`,
                animation: `profile-ember-rise ${p.duration}s ease-in-out ${p.delay}s infinite reverse`,
              }}
            />
          ))}
        </>
      )}

      {/* 2. TOKYO CYBER RAIN */}
      {themeId === 'cyber-rain' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#021b29]/30 via-transparent to-[#180029]/30" />
          <div className="absolute -top-20 left-1/4 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-20 right-1/4 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-3xl" />
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute profile-rain-line w-[1.5px]"
              style={{
                left: p.left,
                top: p.top,
                height: `${p.height}px`,
                background: p.isCyan
                  ? 'linear-gradient(to bottom, transparent, #06b6d4, #e0f2fe)'
                  : 'linear-gradient(to bottom, transparent, #d946ef, #fdf4ff)',
                filter: p.isCyan
                  ? 'drop-shadow(0 0 4px #06b6d4)'
                  : 'drop-shadow(0 0 4px #d946ef)',
                animation: `profile-rain-stream ${p.duration}s linear ${p.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* 3. COSMOS INFINITO */}
      {themeId === 'deep-cosmos' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0b031c]/60 via-transparent to-[#021024]/60" />
          {/* Nubes de nebulosa galáctica */}
          <div
            className="absolute -top-32 -left-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"
            style={{ animation: 'profile-nebula-pulse 9s ease-in-out infinite' }}
          />
          <div
            className="absolute -bottom-28 -right-24 h-96 w-96 rounded-full bg-purple-600/25 blur-3xl"
            style={{ animation: 'profile-nebula-pulse 11s ease-in-out 3s infinite' }}
          />
          {/* Estrellas parpadeantes */}
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full profile-theme-particle"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 5px ${p.color}`,
                animation: `star-twinkle ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* 4. ABISMO CARMESÍ */}
      {themeId === 'dark-abyss' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-red-950/40 via-red-900/10 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 h-44 bg-gradient-to-t from-red-600/15 to-transparent blur-xl" />
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full profile-theme-particle"
              style={{
                left: p.left,
                bottom: p.bottom,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.isAmber ? '#fbbf24' : '#ef4444',
                boxShadow: p.isAmber
                  ? '0 0 8px #f59e0b, 0 0 14px #ef4444'
                  : '0 0 8px #dc2626, 0 0 12px #991b1b',
                animation: `profile-ember-rise ${p.duration}s ease-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* 5. AMANECER DORADO */}
      {themeId === 'golden-dawn' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 via-yellow-400/5 to-amber-600/10" />
          {/* Rayo de luz celestial */}
          <div
            className="absolute -top-32 -left-10 w-[120%] h-64 bg-gradient-to-b from-amber-300/20 via-yellow-200/5 to-transparent blur-2xl pointer-events-none"
            style={{ animation: 'profile-golden-beam 7s ease-in-out infinite' }}
          />
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full profile-theme-particle"
              style={{
                left: p.left,
                bottom: p.bottom,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: '#fef08a',
                boxShadow: '0 0 6px #f59e0b, 0 0 12px #fbbf24',
                animation: `profile-ember-rise ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
