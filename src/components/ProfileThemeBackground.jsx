import { useMemo } from 'react'

export default function ProfileThemeBackground({
  themeId = 'default',
  className = '',
  fullPage = false,
}) {
  // Generar partículas y elementos visuales con valores estables y optimizados GPU
  const particles = useMemo(() => {
    switch (themeId) {
      case 'sakura-shrine':
        return Array.from({ length: 22 }, (_, i) => ({
          id: i,
          left: `${(i * 4.7 + 2) % 96}%`,
          top: `-${(i * 5) % 15}%`,
          size: 10 + (i % 4) * 4,
          duration: 6.5 + (i % 5) * 1.8,
          delay: (i * 0.45) % 5,
          blur: i % 3 === 0 ? 'blur(1.5px)' : 'none',
          opacity: 0.6 + (i % 4) * 0.1,
        }))

      case 'cyber-rain':
        return Array.from({ length: 26 }, (_, i) => ({
          id: i,
          left: `${(i * 3.8 + 1) % 98}%`,
          top: `-${(i * 10) % 35}%`,
          height: 40 + (i % 5) * 35,
          duration: 1.8 + (i % 3) * 0.7,
          delay: (i * 0.25) % 3,
          isCyan: i % 2 === 0,
        }))

      case 'deep-cosmos':
        return {
          stars: Array.from({ length: 38 }, (_, i) => ({
            id: i,
            left: `${(i * 2.6 + 1) % 98}%`,
            top: `${(i * 2.8 + 2) % 96}%`,
            size: 1.2 + (i % 3) * 1.1,
            duration: 1.8 + (i % 4) * 0.7,
            delay: (i * 0.3) % 4,
            color: i % 3 === 0 ? '#67e8f9' : i % 3 === 1 ? '#c084fc' : '#ffffff',
          })),
          meteors: Array.from({ length: 3 }, (_, i) => ({
            id: i,
            top: `${15 + i * 28}%`,
            right: `${10 + i * 25}%`,
            delay: i * 4.2,
          })),
        }

      case 'dark-abyss':
        return Array.from({ length: 24 }, (_, i) => ({
          id: i,
          left: `${(i * 4.2 + 2) % 96}%`,
          bottom: `${(i * 4) % 25}%`,
          size: 3 + (i % 3) * 2.5,
          duration: 3.2 + (i % 4) * 1.1,
          delay: (i * 0.38) % 3.5,
          isAmber: i % 2 === 0,
        }))

      case 'golden-dawn':
        return Array.from({ length: 20 }, (_, i) => ({
          id: i,
          left: `${(i * 5.1 + 3) % 94}%`,
          bottom: `${(i * 6) % 40}%`,
          size: 2.5 + (i % 3) * 2.5,
          duration: 4.2 + (i % 3) * 1.4,
          delay: (i * 0.5) % 4,
        }))

      case 'night-torii':
        return Array.from({ length: 18 }, (_, i) => ({
          id: i,
          left: `${(i * 5.5 + 4) % 92}%`,
          top: `${20 + (i * 7.5) % 70}%`,
          size: 4 + (i % 3) * 2,
          duration: 3.8 + (i % 4) * 1.2,
          delay: (i * 0.6) % 4.5,
        }))

      default:
        return []
    }
  }, [themeId])

  if (themeId === 'default') {
    return null
  }

  const baseClasses = fullPage
    ? 'fixed inset-0 pointer-events-none overflow-hidden z-0 select-none'
    : 'absolute inset-0 pointer-events-none overflow-hidden rounded-[28px] z-0 select-none'

  return (
    <div className={`${baseClasses} ${className}`} aria-hidden="true">
      {/* 1. 🌸 SANTUARIO SAKURA (Fondo animado completo con pétalos físicos) */}
      {themeId === 'sakura-shrine' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#2b101c] via-[#1a0c16] to-[#0f070e]" />
          <div className="absolute -top-32 -right-20 h-[500px] w-[500px] rounded-full bg-rose-500/20 blur-[120px]" />
          <div className="absolute top-1/3 -left-28 h-[450px] w-[450px] rounded-full bg-pink-600/15 blur-[100px]" />
          <div className="absolute -bottom-24 right-1/4 h-[400px] w-[400px] rounded-full bg-rose-400/15 blur-[110px]" />

          {/* Silueta de niebla mística al fondo */}
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-rose-950/40 to-transparent" />

          {/* Lluvia física continua de pétalos Sakura */}
          {Array.isArray(particles) &&
            particles.map((p) => (
              <div
                key={p.id}
                className="absolute profile-theme-particle pointer-events-none"
                style={{
                  left: p.left,
                  top: p.top,
                  width: `${p.size}px`,
                  height: `${p.size * 0.72}px`,
                  background: 'linear-gradient(135deg, #f472b6, #fda4af)',
                  borderRadius: '60% 40% 70% 30% / 50% 60% 40% 50%',
                  opacity: p.opacity,
                  filter: `${p.blur} drop-shadow(0 0 6px rgba(244,114,182,0.6))`,
                  animation: `sakura-flutter-flow ${p.duration}s ease-in-out ${p.delay}s infinite`,
                }}
              />
            ))}
        </>
      )}

      {/* 2. ⚡ TOKYO CYBER RAIN (Ciberpunk neón Matrix) */}
      {themeId === 'cyber-rain' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#02101e] via-[#090317] to-[#050012]" />
          <div className="absolute -top-28 left-1/4 h-[450px] w-[450px] rounded-full bg-cyan-500/15 blur-[120px]" />
          <div className="absolute -bottom-24 right-1/3 h-[450px] w-[450px] rounded-full bg-fuchsia-600/20 blur-[130px]" />

          {/* Cuadrícula holográfica en el horizonte inferior */}
          <div
            className="absolute bottom-0 inset-x-0 h-64 border-t border-cyan-500/20 bg-[linear-gradient(to_right,#06b6d415_1px,transparent_1px),linear-gradient(to_bottom,#06b6d415_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"
            style={{ animation: 'steam-grid-pulse 6s ease-in-out infinite' }}
          />

          {/* Haces de lluvia de datos digitales */}
          {Array.isArray(particles) &&
            particles.map((p) => (
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
                    ? 'drop-shadow(0 0 5px #06b6d4)'
                    : 'drop-shadow(0 0 5px #d946ef)',
                  animation: `profile-rain-stream ${p.duration}s linear ${p.delay}s infinite`,
                }}
              />
            ))}
        </>
      )}

      {/* 3. 🌌 COSMOS INFINITO (Nebulosas profundas y estrellas fugaces) */}
      {themeId === 'deep-cosmos' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-tr from-[#050212] via-[#0b0420] to-[#01091a]" />
          {/* Nubes de nebulosas gigantes en órbita */}
          <div
            className="absolute -top-40 -left-32 h-[550px] w-[550px] rounded-full bg-indigo-600/25 blur-[140px]"
            style={{ animation: 'profile-nebula-pulse 10s ease-in-out infinite' }}
          />
          <div
            className="absolute -bottom-36 -right-28 h-[550px] w-[550px] rounded-full bg-purple-600/30 blur-[140px]"
            style={{ animation: 'profile-nebula-pulse 12s ease-in-out 3s infinite' }}
          />
          <div
            className="absolute top-1/2 left-1/3 h-[400px] w-[400px] rounded-full bg-cyan-600/15 blur-[120px]"
            style={{ animation: 'profile-nebula-pulse 14s ease-in-out 6s infinite' }}
          />

          {/* Estrellas parpadeantes */}
          {particles?.stars?.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full profile-theme-particle"
              style={{
                left: p.left,
                top: p.top,
                width: `${p.size}px`,
                height: `${p.size}px`,
                backgroundColor: p.color,
                boxShadow: `0 0 6px ${p.color}`,
                animation: `star-twinkle ${p.duration}s ease-in-out ${p.delay}s infinite`,
              }}
            />
          ))}

          {/* Meteoritos / Estrellas fugaces periódicas */}
          {particles?.meteors?.map((m) => (
            <div
              key={m.id}
              className="absolute h-[1.5px] bg-gradient-to-l from-white via-cyan-300 to-transparent pointer-events-none"
              style={{
                top: m.top,
                right: m.right,
                animation: `shooting-star 6s ease-in-out ${m.delay}s infinite`,
                filter: 'drop-shadow(0 0 4px #a5f3fc)',
              }}
            />
          ))}
        </>
      )}

      {/* 4. 🔥 ABISMO CARMESÍ (Fuego volcánico, ascuas y humo) */}
      {themeId === 'dark-abyss' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f0508] via-[#120306] to-[#090203]" />
          <div className="absolute bottom-0 inset-x-0 h-72 bg-gradient-to-t from-red-600/25 via-orange-600/10 to-transparent blur-2xl" />
          <div className="absolute -bottom-32 left-1/4 h-[500px] w-[500px] rounded-full bg-red-600/20 blur-[130px]" />

          {/* Ascuas volcánicas que suben con física de convección */}
          {Array.isArray(particles) &&
            particles.map((p) => (
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
                    ? '0 0 8px #f59e0b, 0 0 16px #ef4444'
                    : '0 0 8px #dc2626, 0 0 14px #991b1b',
                  animation: `profile-ember-rise ${p.duration}s ease-out ${p.delay}s infinite`,
                }}
              />
            ))}
        </>
      )}

      {/* 5. ✨ AMANECER DORADO (Rayos celestiales y polvo dorado) */}
      {themeId === 'golden-dawn' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a1205] via-[#120c02] to-[#0a0701]" />
          <div className="absolute -top-32 -left-20 h-[500px] w-[500px] rounded-full bg-amber-500/25 blur-[130px]" />
          <div className="absolute top-1/3 -right-28 h-[450px] w-[450px] rounded-full bg-yellow-500/15 blur-[120px]" />

          {/* Haz de luz celestial dinámico */}
          <div
            className="absolute -top-40 -left-10 w-[130%] h-80 bg-gradient-to-b from-amber-300/20 via-yellow-200/5 to-transparent blur-3xl pointer-events-none"
            style={{ animation: 'profile-golden-beam 8s ease-in-out infinite' }}
          />

          {/* Motes de oro flotando */}
          {Array.isArray(particles) &&
            particles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full profile-theme-particle"
                style={{
                  left: p.left,
                  bottom: p.bottom,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: '#fef08a',
                  boxShadow: '0 0 7px #f59e0b, 0 0 14px #fbbf24',
                  animation: `profile-ember-rise ${p.duration}s ease-in-out ${p.delay}s infinite`,
                }}
              />
            ))}
        </>
      )}

      {/* 6. ⛩️ NOCHE DE TORII ZEN (Luna y danza de luciérnagas) */}
      {themeId === 'night-torii' && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-[#040817] via-[#060c24] to-[#020512]" />
          {/* Resplandor de la luna */}
          <div className="absolute top-12 right-16 h-36 w-36 rounded-full bg-sky-200/20 blur-2xl pointer-events-none" />
          <div className="absolute top-14 right-20 h-24 w-24 rounded-full border-4 border-sky-200/40 bg-gradient-to-tr from-sky-100/30 to-transparent shadow-[0_0_30px_rgba(56,189,248,0.3)] pointer-events-none" />

          {/* Luciérnagas místicas bailando */}
          {Array.isArray(particles) &&
            particles.map((p) => (
              <div
                key={p.id}
                className="absolute rounded-full profile-theme-particle"
                style={{
                  left: p.left,
                  top: p.top,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  backgroundColor: '#38bdf8',
                  borderRadius: '9999px',
                  animation: `firefly-dance ${p.duration}s ease-in-out ${p.delay}s infinite`,
                }}
              />
            ))}
        </>
      )}
    </div>
  )
}
