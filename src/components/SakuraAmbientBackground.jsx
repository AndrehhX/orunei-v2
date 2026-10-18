import { memo, useMemo } from 'react';

/**
 * Fondo ambiental animado único para el Tema Sakura.
 * Diseñado con estética cinematográfica inspirada en las atmósferas de Makoto Shinkai y Kyoto Animation:
 * - 4 orbes fluidos (auroras de cerezo) con respiración y traslación tridimensional continua.
 * - Motas de luz etéreas (polen de sakura) que ascienden suavemente creando profundidad de campo visual.
 * - Textura de grano analógico sutil para eliminar banding en gradientes pasteles.
 * - 100% acelerado por GPU (transform: translate3d + scale), 0 ciclos pesados de JS.
 * - Totalmente pasivo (pointer-events-none, z-0) y respeta prefers-reduced-motion.
 */
function SakuraAmbientBackground() {
  // Motas de luz estáticas memorizadas para evitar re-cálculos
  const motes = useMemo(() => [
    { id: 1, left: '10%', bottom: '-5%', size: 4, duration: '18s', delay: '0s', drift: '25px', opacity: 0.65 },
    { id: 2, left: '22%', bottom: '-5%', size: 6, duration: '22s', delay: '4s', drift: '-30px', opacity: 0.75 },
    { id: 3, left: '35%', bottom: '-5%', size: 3, duration: '16s', delay: '1.5s', drift: '20px', opacity: 0.55 },
    { id: 4, left: '48%', bottom: '-5%', size: 5, duration: '20s', delay: '7s', drift: '-25px', opacity: 0.7 },
    { id: 5, left: '59%', bottom: '-5%', size: 4, duration: '19s', delay: '3s', drift: '35px', opacity: 0.6 },
    { id: 6, left: '71%', bottom: '-5%', size: 7, duration: '24s', delay: '8.5s', drift: '-40px', opacity: 0.8 },
    { id: 7, left: '83%', bottom: '-5%', size: 3, duration: '15s', delay: '2s', drift: '15px', opacity: 0.5 },
    { id: 8, left: '92%', bottom: '-5%', size: 5, duration: '21s', delay: '6s', drift: '-20px', opacity: 0.65 },
    { id: 9, left: '15%', bottom: '-5%', size: 4, duration: '17s', delay: '10s', drift: '30px', opacity: 0.6 },
    { id: 10, left: '78%', bottom: '-5%', size: 6, duration: '23s', delay: '12s', drift: '-35px', opacity: 0.7 },
  ], []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none sakura-ambient-container transform-gpu"
      style={{ contain: 'strict' }}
    >
      {/* Orbe Aurora 1: Rosa cerezo suave superior izquierdo */}
      <div
        className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] max-w-[850px] max-h-[850px] rounded-full sakura-aurora-orb sakura-aurora-orb-1 opacity-70"
        style={{
          background: 'radial-gradient(circle, rgba(255,194,209,0.55) 0%, rgba(255,229,236,0.3) 45%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Orbe Aurora 2: Rosa algodón de azúcar y lavanda superior derecho */}
      <div
        className="absolute -top-[10%] -right-[15%] w-[50vw] h-[50vw] max-w-[800px] max-h-[800px] rounded-full sakura-aurora-orb sakura-aurora-orb-2 opacity-65"
        style={{
          background: 'radial-gradient(circle, rgba(255,179,198,0.5) 0%, rgba(255,240,245,0.25) 50%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Orbe Aurora 3: Rouge cálido y rubí etéreo inferior izquierdo */}
      <div
        className="absolute -bottom-[20%] -left-[15%] w-[60vw] h-[60vw] max-w-[900px] max-h-[900px] rounded-full sakura-aurora-orb sakura-aurora-orb-3 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(251,111,146,0.32) 0%, rgba(255,143,171,0.2) 45%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Orbe Aurora 4: Cuarzo dorado-rosado central/inferior derecho */}
      <div
        className="absolute top-[35%] right-[10%] w-[45vw] h-[45vw] max-w-[700px] max-h-[700px] rounded-full sakura-aurora-orb sakura-aurora-orb-4 opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(254,205,211,0.4) 0%, rgba(255,228,230,0.2) 40%, transparent 65%)',
          filter: 'blur(65px)',
        }}
      />

      {/* Marca de agua japonesa sutil: Silueta floral estilizada de cerezo */}
      <svg
        className="absolute bottom-8 right-8 w-72 h-72 text-pink-300/10 -rotate-12 pointer-events-none"
        viewBox="0 0 200 200"
        fill="currentColor"
      >
        <path d="M100,100 C110,60 130,40 150,50 C170,60 160,90 130,100 C160,110 170,140 150,150 C130,160 110,140 100,100 Z" />
        <path d="M100,100 C60,110 40,130 50,150 C60,170 90,160 100,130 C110,160 140,170 150,150 C160,130 140,110 100,100 Z" transform="rotate(72 100 100)" />
        <path d="M100,100 C60,110 40,130 50,150 C60,170 90,160 100,130 C110,160 140,170 150,150 C160,130 140,110 100,100 Z" transform="rotate(144 100 100)" />
        <path d="M100,100 C60,110 40,130 50,150 C60,170 90,160 100,130 C110,160 140,170 150,150 C160,130 140,110 100,100 Z" transform="rotate(216 100 100)" />
        <path d="M100,100 C60,110 40,130 50,150 C60,170 90,160 100,130 C110,160 140,170 150,150 C160,130 140,110 100,100 Z" transform="rotate(288 100 100)" />
      </svg>

      {/* Motas de luz etéreas ascendentes (Polen de flor de cerezo) */}
      {motes.map((m) => (
        <div
          key={m.id}
          className="sakura-light-mote absolute rounded-full"
          style={{
            left: m.left,
            bottom: m.bottom,
            width: `${m.size}px`,
            height: `${m.size}px`,
            opacity: m.opacity,
            animationDuration: m.duration,
            animationDelay: m.delay,
            '--mote-drift': m.drift,
            background: 'radial-gradient(circle, #ffffff 15%, #FFB3C6 70%, rgba(251,111,146,0) 100%)',
            boxShadow: '0 0 10px rgba(255, 179, 198, 0.9), 0 0 20px rgba(251, 111, 146, 0.4)',
          }}
        />
      ))}

      {/* Textura analógica sutil que elimina el banding de color */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export default memo(SakuraAmbientBackground);
