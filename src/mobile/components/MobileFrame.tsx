import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="w-full h-full min-h-[100dvh] bg-[#070809] flex flex-col relative overflow-hidden select-none">
      {children}
    </div>
  );
};
