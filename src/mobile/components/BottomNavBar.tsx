import React from 'react';
import { motion } from 'framer-motion';
import { RootTab } from '../types/anime';

interface BottomNavBarProps {
  currentTab: RootTab;
  onSelectTab: (tab: RootTab) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { key: RootTab; label: string; icon: string }[] = [
    { key: 'inicio', label: 'INICIO', icon: 'home' },
    { key: 'catalogo', label: 'CATÁLOGO', icon: 'grid_view' },
    { key: 'favoritos', label: 'FAVORITOS', icon: 'bookmark' },
    { key: 'perfil', label: 'MI PERFIL', icon: 'person' },
  ];

  return (
    <nav className="sticky bottom-0 w-full z-40 bg-[#121315]/90 backdrop-blur-2xl border-t border-white/[0.07] pb-safe">
      <div className="h-16 px-2 flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.key;
          return (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.9 }}
              onClick={() => onSelectTab(tab.key)}
              className="flex-1 flex flex-col items-center justify-center py-1 relative group"
            >
              <div className="relative">
                <span
                  className={`material-symbols-outlined text-[22px] transition-colors ${
                    isActive ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'
                  }`}
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {tab.icon}
                </span>
              </div>
              <span
                className={`text-[9px] font-mono tracking-widest mt-1 uppercase transition-colors ${
                  isActive ? 'text-primary font-bold' : 'text-on-surface-variant'
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="w-1 h-1 rounded-full bg-primary mt-1"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
