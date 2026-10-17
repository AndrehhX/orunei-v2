import React from 'react';

/**
 * Logotipo oficial de Orunei: Estrella celestial de 4 puntas con destellos polares
 * y tipografía premium con gradiente espacial.
 */
export default function OruneiLogo({
  size = 28,
  withText = true,
  className = '',
  textClassName = 'text-xl font-black tracking-tight',
  animated = false
}) {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`relative grid place-items-center shrink-0 ${animated ? 'animate-pulse-glow' : ''}`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_12px_rgba(109,92,255,0.6)]"
        >
          <defs>
            <linearGradient id="oruneiStarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="45%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="oruneiInnerGlow" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.6" />
            </linearGradient>
            <filter id="oruneiGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Halo exterior suave */}
          <circle cx="50" cy="50" r="42" fill="url(#oruneiStarGrad)" opacity="0.15" />

          {/* Estrella principal de 4 puntas (Brújula celestial) */}
          <path
            d="M50 4 C50 32 32 50 4 50 C32 50 50 68 50 96 C50 68 68 50 96 50 C68 50 50 32 50 4 Z"
            fill="url(#oruneiStarGrad)"
            filter="url(#oruneiGlow)"
          />

          {/* Diamante o núcleo brillante interno */}
          <path
            d="M50 28 C50 42 42 50 28 50 C42 50 50 58 50 72 C50 58 58 50 72 50 C58 50 50 42 50 28 Z"
            fill="url(#oruneiInnerGlow)"
          />

          {/* Destellos secundarios diagonales */}
          <circle cx="28" cy="28" r="3" fill="#ffffff" opacity="0.85" />
          <circle cx="72" cy="72" r="3" fill="#a78bfa" opacity="0.85" />
          <circle cx="74" cy="26" r="2" fill="#f472b6" opacity="0.9" />
          <circle cx="26" cy="74" r="2" fill="#ffffff" opacity="0.75" />
        </svg>
      </div>

      {withText && (
        <span
          className={`bg-gradient-to-r from-white via-indigo-100 to-purple-300 dark:from-white dark:via-slate-100 dark:to-brand-soft bg-clip-text text-transparent font-extrabold ${textClassName}`}
        >
          Orunei
        </span>
      )}
    </div>
  );
}
