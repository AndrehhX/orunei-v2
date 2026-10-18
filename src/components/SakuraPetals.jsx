import { memo } from 'react';

/**
 * Efecto visual de pétalos de flor de cerezo (Sakura) flotantes con física realista de anime.
 * Inspirado en la estética cinematográfica de Makoto Shinkai (5 Centimeters per Second):
 * - Se renderiza únicamente en modo Sakura.
 * - Descenso vertical desacoplado de la oscilación lateral y rotación 3D (Dual-axis animation).
 * - 3 capas de profundidad visual: primer plano dinámico, plano medio nítido y fondo etéreo suave.
 * - Animaciones 100% aceleradas por hardware GPU (transform: translate3d + rotate3d).
 * - Totalmente pasivo (pointer-events-none, z-30), sin listeners ni ciclos de JS en ejecución.
 * - Respeta estrictamente prefers-reduced-motion.
 */
function SakuraPetals() {
  const petals = [
    { id: 1, left: '6%', delay: '0s', duration: '13s', swayDuration: '4.2s', size: 18, driftX: '85px', flutter: 'sakura-flutter-1', layer: 'opacity-90' },
    { id: 2, left: '16%', delay: '4.5s', duration: '17s', swayDuration: '5.1s', size: 14, driftX: '-70px', flutter: 'sakura-flutter-2', layer: 'opacity-80' },
    { id: 3, left: '27%', delay: '1.2s', duration: '15s', swayDuration: '3.8s', size: 21, driftX: '110px', flutter: 'sakura-flutter-1', layer: 'opacity-95 drop-shadow-[0_4px_8px_rgba(251,111,146,0.35)]' },
    { id: 4, left: '39%', delay: '7.8s', duration: '18s', swayDuration: '4.7s', size: 12, driftX: '-55px', flutter: 'sakura-flutter-2', layer: 'opacity-70 blur-[0.4px]' },
    { id: 5, left: '49%', delay: '2.8s', duration: '14s', swayDuration: '3.6s', size: 17, driftX: '90px', flutter: 'sakura-flutter-1', layer: 'opacity-85' },
    { id: 6, left: '61%', delay: '9.2s', duration: '19s', swayDuration: '5.4s', size: 13, driftX: '-80px', flutter: 'sakura-flutter-2', layer: 'opacity-75 blur-[0.4px]' },
    { id: 7, left: '73%', delay: '0.8s', duration: '16s', swayDuration: '4.1s', size: 20, driftX: '105px', flutter: 'sakura-flutter-1', layer: 'opacity-90 drop-shadow-[0_4px_8px_rgba(251,111,146,0.35)]' },
    { id: 8, left: '84%', delay: '5.2s', duration: '15s', swayDuration: '4.4s', size: 15, driftX: '-65px', flutter: 'sakura-flutter-2', layer: 'opacity-85' },
    { id: 9, left: '93%', delay: '3.4s', duration: '17s', swayDuration: '4.9s', size: 16, driftX: '75px', flutter: 'sakura-flutter-1', layer: 'opacity-80' },
    { id: 10, left: '2%', delay: '11.5s', duration: '20s', swayDuration: '5.8s', size: 11, driftX: '-45px', flutter: 'sakura-flutter-2', layer: 'opacity-65 blur-[0.6px]' },
    { id: 11, left: '33%', delay: '13.2s', duration: '16s', swayDuration: '4.3s', size: 19, driftX: '95px', flutter: 'sakura-flutter-1', layer: 'opacity-90 drop-shadow-[0_4px_8px_rgba(251,111,146,0.35)]' },
    { id: 12, left: '68%', delay: '6.4s', duration: '14s', swayDuration: '3.9s', size: 17, driftX: '-90px', flutter: 'sakura-flutter-2', layer: 'opacity-85' },
    { id: 13, left: '81%', delay: '12.1s', duration: '18s', swayDuration: '5.2s', size: 13, driftX: '60px', flutter: 'sakura-flutter-1', layer: 'opacity-75 blur-[0.4px]' },
    { id: 14, left: '44%', delay: '10.5s', duration: '15s', swayDuration: '4.0s', size: 22, driftX: '120px', flutter: 'sakura-flutter-2', layer: 'opacity-95 drop-shadow-[0_5px_10px_rgba(251,111,146,0.4)]' },
  ];

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none"
    >
      {petals.map((p) => (
        <div
          key={p.id}
          className="sakura-falling-petal absolute top-[-6%]"
          style={{
            left: p.left,
            animationDuration: p.duration,
            animationDelay: p.delay,
            '--drift-x': p.driftX,
          }}
        >
          <div
            className={`sakura-sway-petal ${p.flutter} ${p.layer}`}
            style={{
              animationDuration: p.swayDuration,
              width: `${p.size}px`,
              height: `${Math.round(p.size * 1.35)}px`,
            }}
          >
            <svg
              viewBox="0 0 30 40"
              className="w-full h-full filter"
            >
              <path
                d="M15,0 C23,10 30,21 24,32 C19,41 11,41 6,32 C0,21 7,10 15,0 Z"
                fill="url(#sakuraPetalGrad)"
              />
              <defs>
                <linearGradient id="sakuraPetalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFE5EC" />
                  <stop offset="25%" stopColor="#FFB3C6" />
                  <stop offset="65%" stopColor="#FB6F92" />
                  <stop offset="100%" stopColor="#E11D48" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(SakuraPetals);
