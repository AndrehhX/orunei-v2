import React from 'react';
import { motion } from 'framer-motion';

interface HeaderBarProps {
  onSearchPress?: () => void;
  onProfilePress?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onSearchPress, onProfilePress }) => {
  return (
    <header className="sticky top-0 w-full z-40 bg-surface/85 backdrop-blur-xl border-b border-white/[0.07] pt-safe transition-colors">
      <div className="h-14 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-geist text-[17px] font-extrabold tracking-[0.25em] text-primary uppercase select-none">
            ORUNEI
          </span>
          <span className="text-[9px] font-mono font-bold tracking-widest text-forestMint px-1.5 py-0.5 rounded bg-forestTagBg border border-forestMint/20">
            CINEMA
          </span>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onSearchPress}
            aria-label="Buscar anime"
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onProfilePress}
            aria-label="Perfil de usuario"
            className="w-10 h-10 flex items-center justify-center"
          >
            <img
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-white/20"
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
            />
          </motion.button>
        </div>
      </div>
    </header>
  );
};
