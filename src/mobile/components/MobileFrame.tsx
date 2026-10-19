import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-[#070809] flex items-center justify-center p-0 sm:py-6 sm:px-4">
      {/* Contenedor móvil con proporción áurea de iPhone 16 Pro en desktop */}
      <div className="w-full max-w-[430px] h-[100dvh] sm:h-[890px] bg-surface relative flex flex-col overflow-hidden sm:rounded-[44px] sm:border-[6px] sm:border-[#222428] sm:shadow-[0_0_80px_rgba(0,0,0,0.9)]">
        {/* Dynamic Island en desktop */}
        <div className="hidden sm:flex absolute top-3 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-[100] items-center justify-between px-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[#151517]"></div>
          <div className="w-2 h-2 rounded-full bg-[#0d2a1a] flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-forestMint animate-pulse"></div>
          </div>
        </div>

        {/* Contenido de la Aplicación */}
        <div className="flex-1 flex flex-col w-full h-full relative overflow-hidden">
          {children}
        </div>

        {/* Barra inferior de navegación táctil (Home Indicator) */}
        <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-[100]"></div>
      </div>
    </div>
  );
};
