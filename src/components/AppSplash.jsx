import React, { useState, useEffect } from 'react';
import OruneiLogo from './OruneiLogo';

/**
 * Pantalla de entrada cinemática (Splash Screen) para Orunei:
 * Presenta una bienvenida visual con animación de entrada cósmica,
 * resplandor estelar y transición de desvanecimiento ultra-fluida.
 */
export default function AppSplash({ onFinish }) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Aceleración de progreso suave hasta completar la carga
    const pTimer1 = setTimeout(() => setProgress(65), 300);
    const pTimer2 = setTimeout(() => setProgress(100), 800);

    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 1100);

    const finishTimer = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, 1500);

    return () => {
      clearTimeout(pTimer1);
      clearTimeout(pTimer2);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  const handleDismiss = () => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, 300);
  };

  if (!visible) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090b14] select-none cursor-pointer transition-opacity duration-400 ease-out ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundImage: 'radial-gradient(circle at 50% 45%, rgba(109, 92, 255, 0.22) 0%, rgba(13, 15, 28, 0.95) 60%, #080911 100%)'
      }}
    >
      {/* Círculos de energía celestial pulsante */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/15 blur-2xl animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>

      <div className="relative flex flex-col items-center text-center px-6 animate-rise">
        {/* Logo oficial animado de Orunei */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-brand/30 blur-xl animate-pulse-glow" />
          <OruneiLogo size={84} withText={false} animated={true} />
        </div>

        {/* Título y eslogan */}
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
          <span className="bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
            ORUNEI
          </span>
        </h1>

        <p className="mt-2 text-xs sm:text-sm font-medium text-indigo-200/80 tracking-wide max-w-xs">
          Tu portal de anime en máxima calidad
        </p>

        {/* Barra de progreso de carga estilizada con shimmer */}
        <div className="mt-8 w-44 sm:w-56 h-1.5 rounded-full bg-white/10 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-brand via-purple-400 to-pink-400 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 w-1/2 h-full bg-white/40 skew-x-12 animate-shimmer-sweep pointer-events-none" />
          </div>
        </div>

        <span className="mt-3 text-[10px] text-slate-500 font-mono tracking-widest uppercase opacity-75">
          Iniciando experiencia...
        </span>
      </div>
    </div>
  );
}
