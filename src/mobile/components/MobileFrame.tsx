import React from 'react';
import { isNativeApp } from '../../offline/platform';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const isNative = typeof window !== 'undefined' && (isNativeApp() || window.innerWidth < 768);

  // En Android nativo (APK) o dispositivos móviles: 100% Full-Screen Edge-to-Edge directo sin marcos
  if (isNative) {
    return (
      <div className="w-full h-full min-h-[100dvh] bg-[#070809] flex flex-col relative overflow-hidden select-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        <div className="flex-1 flex flex-col w-full h-full relative overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // En pantallas grandes de escritorio: marco Android elegante y limpio (sin Dynamic Island ni elementos de iOS)
  return (
    <div className="min-h-screen w-full bg-[#070809] flex items-center justify-center p-0 sm:py-6 sm:px-4">
      <div className="w-full max-w-[440px] h-[100dvh] sm:h-[900px] bg-surface relative flex flex-col overflow-hidden sm:rounded-[36px] sm:border-[2px] sm:border-white/10 sm:shadow-[0_0_80px_rgba(0,0,0,0.95)]">
        {/* Cámara punch-hole Android discreta */}
        <div className="hidden sm:block absolute top-3 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-black rounded-full z-[100] border border-white/10"></div>

        {/* Contenido de la Aplicación Android */}
        <div className="flex-1 flex flex-col w-full h-full relative overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};
