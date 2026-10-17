import { memo } from 'react';

/**
 * Efecto visual de pétalos de flor de cerezo (Sakura) flotantes.
 * Optimizado para rendimiento extremo:
 * - Se renderiza únicamente en modo Sakura.
 * - Utiliza transformaciones CSS aceleradas por GPU (translate3d, rotate3d).
 * - Totalmente pasivo (pointer-events-none), sin listeners ni ciclos de JS en ejecución.
 */
function SakuraPetals() {
  const petals = [
    { id: 1, left: '8%', delay: '0s', duration: '14s', size: 16, rot: 25 },
    { id: 2, left: '22%', delay: '4s', duration: '18s', size: 13, rot: -35 },
    { id: 3, left: '38%', delay: '1.5s', duration: '16s', size: 18, rot: 50 },
    { id: 4, left: '55%', delay: '7s', duration: '19s', size: 14, rot: -15 },
    { id: 5, left: '72%', delay: '3s', duration: '15s', size: 17, rot: 40 },
    { id: 6, left: '88%', delay: '8.5s', duration: '17s', size: 12, rot: -45 },
    { id: 7, left: '46%', delay: '11s', duration: '20s', size: 15, rot: 30 },
    { id: 8, left: '94%', delay: '5.5s', duration: '16s', size: 14, rot: 60 },
  ];

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none"
    >
      {petals.map((p) => (
        <span
          key={p.id}
          className="sakura-falling-petal absolute top-[-5%]"
          style={{
            left: p.left,
            animationDuration: p.duration,
            animationDelay: p.delay,
            width: `${p.size}px`,
            height: `${p.size * 1.3}px`,
          }}
        >
          <svg
            viewBox="0 0 30 40"
            className="w-full h-full drop-shadow-[0_2px_4px_rgba(244,63,94,0.25)]"
            style={{ transform: `rotate(${p.rot}deg)` }}
          >
            <path
              d="M15,0 C22,12 30,22 24,32 C18,40 12,40 6,32 C0,22 8,12 15,0 Z"
              fill="url(#sakuraPetalGrad)"
              opacity="0.82"
            />
            <defs>
              <linearGradient id="sakuraPetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFB3C6" />
                <stop offset="50%" stopColor="#FB6F92" />
                <stop offset="100%" stopColor="#F43F5E" />
              </linearGradient>
            </defs>
          </svg>
        </span>
      ))}
    </div>
  );
}

export default memo(SakuraPetals);
