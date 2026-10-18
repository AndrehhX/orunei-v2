import { memo, useEffect, useRef } from 'react';

/**
 * Efecto visual de pétalos de flor de cerezo (Sakura) Extra-Premium.
 * Inspirado en la dirección de arte cinematográfica de Makoto Shinkai (5 Centimeters per Second) y Kyoto Animation:
 * - 4 geometrías anatómicas de pétalo SVG: con muesca (notched), torsionado 3D (twisted), en copa (cupped) y flor miniatura (blossom).
 * - 3 capas de profundidad de campo cinematográfico (Foreground, Midground, Background bokeh).
 * - Movimiento físico desacoplado: caída por gravedad, turbulencia de viento lateral y rotación 3D tridimensional en X, Y y Z.
 * - Brisa interactiva reactiva al cursor mediante física pasiva amortiguada (damping via RAF).
 * - 100% acelerado por GPU (translate3d, rotate3d), cero repaints y estricto respeto a prefers-reduced-motion.
 */
function SakuraPetals() {
  const containerRef = useRef(null);
  const windOffsetRef = useRef(0);
  const targetWindRef = useRef(0);
  const rafIdRef = useRef(null);

  // 24 pétalos calibrados con distribución espectral sin aglomeración
  const petals = [
    // --- Capa 1: Primer Plano Dinámico (Grandes, nítidos, alta presencia) ---
    { id: 1, type: 'notched', left: '7%', delay: '0s', duration: '12s', swayDuration: '3.6s', size: 28, driftX: '110px', flutter: 'sakura-flutter-1', layer: 'opacity-95 drop-shadow-[0_4px_10px_rgba(251,111,146,0.45)] z-30' },
    { id: 2, type: 'twisted', left: '29%', delay: '4.8s', duration: '13.5s', swayDuration: '4.1s', size: 26, driftX: '-95px', flutter: 'sakura-flutter-3', layer: 'opacity-95 drop-shadow-[0_4px_10px_rgba(251,111,146,0.4)] z-30' },
    { id: 3, type: 'cupped', left: '58%', delay: '2.2s', duration: '11.8s', swayDuration: '3.4s', size: 30, driftX: '125px', flutter: 'sakura-flutter-2', layer: 'opacity-95 drop-shadow-[0_5px_12px_rgba(251,111,146,0.48)] z-30' },
    { id: 4, type: 'blossom', left: '84%', delay: '8.4s', duration: '14.2s', swayDuration: '4.6s', size: 27, driftX: '-85px', flutter: 'sakura-flutter-spin', layer: 'opacity-90 drop-shadow-[0_4px_8px_rgba(251,111,146,0.4)] z-30' },

    // --- Capa 2: Plano Medio Nítido (Foco principal del lienzo) ---
    { id: 5, type: 'notched', left: '14%', delay: '1.4s', duration: '15s', swayDuration: '4.2s', size: 20, driftX: '80px', flutter: 'sakura-flutter-1', layer: 'opacity-90 z-20' },
    { id: 6, type: 'twisted', left: '22%', delay: '6.2s', duration: '16.5s', swayDuration: '4.8s', size: 18, driftX: '-70px', flutter: 'sakura-flutter-2', layer: 'opacity-85 z-20' },
    { id: 7, type: 'cupped', left: '38%', delay: '3.1s', duration: '14.5s', swayDuration: '3.9s', size: 22, driftX: '95px', flutter: 'sakura-flutter-3', layer: 'opacity-90 drop-shadow-[0_2px_6px_rgba(251,111,146,0.3)] z-20' },
    { id: 8, type: 'notched', left: '46%', delay: '9.8s', duration: '17s', swayDuration: '5.2s', size: 19, driftX: '-65px', flutter: 'sakura-flutter-1', layer: 'opacity-85 z-20' },
    { id: 9, type: 'twisted', left: '65%', delay: '0.6s', duration: '15.8s', swayDuration: '4.4s', size: 21, driftX: '90px', flutter: 'sakura-flutter-2', layer: 'opacity-90 z-20' },
    { id: 10, type: 'cupped', left: '74%', delay: '5.5s', duration: '14s', swayDuration: '3.8s', size: 17, driftX: '-75px', flutter: 'sakura-flutter-3', layer: 'opacity-85 z-20' },
    { id: 11, type: 'blossom', left: '91%', delay: '11.2s', duration: '16.8s', swayDuration: '5.0s', size: 23, driftX: '85px', flutter: 'sakura-flutter-spin', layer: 'opacity-90 drop-shadow-[0_2px_6px_rgba(251,111,146,0.3)] z-20' },
    { id: 12, type: 'notched', left: '2%', delay: '12.5s', duration: '15.5s', swayDuration: '4.5s', size: 19, driftX: '-60px', flutter: 'sakura-flutter-1', layer: 'opacity-85 z-20' },
    { id: 13, type: 'twisted', left: '33%', delay: '7.6s', duration: '16s', swayDuration: '4.7s', size: 18, driftX: '85px', flutter: 'sakura-flutter-2', layer: 'opacity-85 z-20' },
    { id: 14, type: 'cupped', left: '52%', delay: '13.8s', duration: '14.8s', swayDuration: '4.0s', size: 20, driftX: '-80px', flutter: 'sakura-flutter-3', layer: 'opacity-90 z-20' },
    { id: 15, type: 'notched', left: '80%', delay: '3.7s', duration: '15.2s', swayDuration: '4.3s', size: 21, driftX: '70px', flutter: 'sakura-flutter-1', layer: 'opacity-85 z-20' },
    { id: 16, type: 'twisted', left: '96%', delay: '8.9s', duration: '17.2s', swayDuration: '5.1s', size: 17, driftX: '-70px', flutter: 'sakura-flutter-2', layer: 'opacity-80 z-20' },

    // --- Capa 3: Fondo Etéreo Suave (Bokeh desenfocado, flujo atmosférico) ---
    { id: 17, type: 'notched', left: '11%', delay: '4.2s', duration: '20s', swayDuration: '5.8s', size: 13, driftX: '55px', flutter: 'sakura-flutter-1', layer: 'opacity-65 blur-[0.7px] z-10' },
    { id: 18, type: 'cupped', left: '25%', delay: '10.2s', duration: '22s', swayDuration: '6.2s', size: 11, driftX: '-45px', flutter: 'sakura-flutter-2', layer: 'opacity-55 blur-[1px] z-10' },
    { id: 19, type: 'twisted', left: '42%', delay: '1.9s', duration: '19s', swayDuration: '5.5s', size: 14, driftX: '65px', flutter: 'sakura-flutter-3', layer: 'opacity-70 blur-[0.6px] z-10' },
    { id: 20, type: 'notched', left: '55%', delay: '8.1s', duration: '21s', swayDuration: '6.0s', size: 12, driftX: '-50px', flutter: 'sakura-flutter-1', layer: 'opacity-60 blur-[0.8px] z-10' },
    { id: 21, type: 'cupped', left: '68%', delay: '14.5s', duration: '23s', swayDuration: '6.5s', size: 10, driftX: '40px', flutter: 'sakura-flutter-2', layer: 'opacity-50 blur-[1.2px] z-10' },
    { id: 22, type: 'twisted', left: '77%', delay: '6.7s', duration: '18.5s', swayDuration: '5.3s', size: 13, driftX: '-60px', flutter: 'sakura-flutter-3', layer: 'opacity-65 blur-[0.7px] z-10' },
    { id: 23, type: 'notched', left: '88%', delay: '15.1s', duration: '20.5s', swayDuration: '5.9s', size: 12, driftX: '50px', flutter: 'sakura-flutter-1', layer: 'opacity-60 blur-[0.8px] z-10' },
    { id: 24, type: 'blossom', left: '3%', delay: '16.4s', duration: '24s', swayDuration: '6.8s', size: 14, driftX: '-40px', flutter: 'sakura-flutter-spin', layer: 'opacity-55 blur-[1px] z-10' },
  ];

  // Interacción sutil con el cursor: brisa reactiva amortiguada optimizada para 120Hz
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    let prevX = 0;
    let isRunning = false;

    const updatePhysics = () => {
      // Amortiguación hacia cero cuando se detiene el cursor
      targetWindRef.current *= 0.92;
      windOffsetRef.current += (targetWindRef.current - windOffsetRef.current) * 0.08;

      if (containerRef.current) {
        containerRef.current.style.setProperty('--cursor-wind-x', `${windOffsetRef.current.toFixed(1)}px`);
      }

      // Detener el bucle RAF si la oscilación ya es imperceptible (< 0.08px)
      if (Math.abs(windOffsetRef.current) > 0.08 || Math.abs(targetWindRef.current) > 0.08) {
        rafIdRef.current = requestAnimationFrame(updatePhysics);
      } else {
        if (containerRef.current) {
          containerRef.current.style.setProperty('--cursor-wind-x', '0px');
        }
        windOffsetRef.current = 0;
        targetWindRef.current = 0;
        isRunning = false;
        rafIdRef.current = null;
      }
    };

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - prevX;
      prevX = e.clientX;
      targetWindRef.current = Math.max(-35, Math.min(35, deltaX * 0.4));
      if (!isRunning) {
        isRunning = true;
        rafIdRef.current = requestAnimationFrame(updatePhysics);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Renderizador de geometría SVG según el tipo de pétalo
  const renderPetalSvg = (type) => {
    switch (type) {
      case 'notched':
        // Pétalo de cerezo japonés clásico con hendidura apical distintiva
        return (
          <path
            d="M15,2 C18.5,2 24,8.5 25,18 C26,27.5 19,37 15,39 C11,37 4,27.5 5,18 C6,8.5 11.5,2 15,2 M15,2 C14.2,4.8 13.5,6.2 15,7.5 C16.5,6.2 15.8,4.8 15,2 Z"
            fill="url(#sakuraPetalGradPremium)"
          />
        );
      case 'twisted':
        // Pétalo con torsión tridimensional en vuelo
        return (
          <path
            d="M16,1 C22,5 26,16 23,26 C20,36 12,39 9,37 C6,35 7,27 10,19 C13,11 10,6 16,1 Z"
            fill="url(#sakuraPetalGradTwisted)"
          />
        );
      case 'cupped':
        // Pétalo curvado en copa con sombra cóncava suave
        return (
          <path
            d="M15,1 C23.5,6 27,17 24,28 C21,37 9,37 6,28 C3,17 6.5,6 15,1 Z"
            fill="url(#sakuraPetalGradCupped)"
          />
        );
      case 'blossom':
        // Flor de cerezo miniatura completa de 5 pétalos
        return (
          <g>
            <path d="M15,15 C17,7 23,7 24,11 C25,15 19,17 15,15 Z" fill="url(#sakuraPetalGradPremium)" />
            <path d="M15,15 C23,13 25,19 23,22 C21,25 16,21 15,15 Z" fill="url(#sakuraPetalGradPremium)" />
            <path d="M15,15 C19,23 15,27 12,25 C9,23 12,17 15,15 Z" fill="url(#sakuraPetalGradPremium)" />
            <path d="M15,15 C7,21 5,16 7,12 C9,8 14,12 15,15 Z" fill="url(#sakuraPetalGradPremium)" />
            <path d="M15,15 C9,8 13,4 16,6 C19,8 17,13 15,15 Z" fill="url(#sakuraPetalGradPremium)" />
            <circle cx="15" cy="15" r="2.2" fill="#FDE047" opacity="0.9" />
          </g>
        );
      default:
        return (
          <path
            d="M15,0 C23,10 30,21 24,32 C19,41 11,41 6,32 C0,21 7,10 15,0 Z"
            fill="url(#sakuraPetalGradPremium)"
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none"
    >
      {/* Definición de gradientes multi-stop de alta fidelidad */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          {/* Gradiente principal con brillo perlado y sombra profunda */}
          <linearGradient id="sakuraPetalGradPremium" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="22%" stopColor="#FFE5EC" />
            <stop offset="55%" stopColor="#FFB3C6" />
            <stop offset="85%" stopColor="#FB6F92" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>

          {/* Gradiente para pétalos con torsión en perspectiva */}
          <linearGradient id="sakuraPetalGradTwisted" x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#FFF0F5" />
            <stop offset="35%" stopColor="#FFC2D1" />
            <stop offset="70%" stopColor="#FB6F92" />
            <stop offset="100%" stopColor="#BE123C" />
          </linearGradient>

          {/* Gradiente para pétalos en copa con luminancia central */}
          <radialGradient id="sakuraPetalGradCupped" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#FFE4E8" />
            <stop offset="75%" stopColor="#FF8FAB" />
            <stop offset="100%" stopColor="#FB6F92" />
          </radialGradient>
        </defs>
      </svg>

      {/* Renderizado de pétalos */}
      {petals.map((p) => (
        <div
          key={p.id}
          className="sakura-falling-petal absolute top-[-7%]"
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
              {renderPetalSvg(p.type)}
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(SakuraPetals);
