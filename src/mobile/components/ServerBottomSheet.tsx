import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StreamSource } from '../types/anime';

interface ServerBottomSheetProps {
  visible: boolean;
  currentServer: StreamSource;
  availableServers?: StreamSource[];
  onClose: () => void;
  onSelectServer: (server: StreamSource) => void;
  onSelectLanguage?: (lang: 'latino' | 'sub') => void;
}

export const ServerBottomSheet: React.FC<ServerBottomSheetProps> = ({
  visible,
  currentServer,
  availableServers = [],
  onClose,
  onSelectServer,
  onSelectLanguage,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<'latino' | 'sub'>(currentServer.language || 'latino');
  const [selectedServerId, setSelectedServerId] = useState(currentServer.id);
  const [selectedResolution, setSelectedResolution] = useState('AUTO');
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [autoSkipAniSkip, setAutoSkipAniSkip] = useState(true);

  useEffect(() => {
    setSelectedServerId(currentServer.id);
    if (currentServer.language) setSelectedLanguage(currentServer.language);
  }, [currentServer]);

  const resolutions = ['AUTO', '1080P', '720P', '480P'];

  const handleApply = () => {
    const s = availableServers.find((srv) => srv.id === selectedServerId) || currentServer;
    onSelectServer(s);
    onClose();
  };

  const handleLanguageChange = (lang: 'latino' | 'sub') => {
    setSelectedLanguage(lang);
    onSelectLanguage?.(lang);
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Backdrop con desenfoque de cristal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
          />

          {/* Sheet deslizable con físicas de resorte */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-[430px] bg-surface-container-low border-t border-white/[0.12] rounded-t-[28px] max-h-[88dvh] overflow-y-auto no-scrollbar pb-8 z-10"
          >
            {/* Handle táctil */}
            <div className="w-full flex justify-center py-3">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>

            <div className="px-6 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <div>
                  <h3 className="font-geist text-base font-bold text-primary tracking-tight">
                    Servidores y Ajustes de Audio
                  </h3>
                  <p className="font-mono text-[10px] text-on-surface-variant font-bold tracking-wider mt-0.5 uppercase">
                    RESOLUCIÓN DIRECTA • SIN ANUNCIOS
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Selector de Pista de Audio */}
              <div className="space-y-2">
                <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Pista de Audio
                </span>
                <div className="p-1.5 rounded-xl bg-surface-container border border-white/10 flex gap-2">
                  <button
                    onClick={() => handleLanguageChange('latino')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                      selectedLanguage === 'latino'
                        ? 'bg-sakura/20 text-white border border-sakura shadow-[0_0_15px_rgba(255,77,141,0.3)]'
                        : 'text-white/60 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-sakura shadow-[0_0_8px_#ff4d8d]" />
                    <span>🇲🇽 Español Latino</span>
                  </button>
                  <button
                    onClick={() => handleLanguageChange('sub')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-2 ${
                      selectedLanguage === 'sub'
                        ? 'bg-forestMint/20 text-white border border-forestMint shadow-[0_0_15px_rgba(13,242,134,0.3)]'
                        : 'text-white/60 hover:text-white border border-transparent'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-forestMint shadow-[0_0_8px_#0df286]" />
                    <span>🇯🇵 Japonés (Sub)</span>
                  </button>
                </div>
              </div>

              {/* Lista de Servidores de Transmisión */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Servidores Disponibles
                  </span>
                  <span className="font-mono text-[9px] text-forestMint font-bold">
                    {availableServers.length} ESPEJOS ACTIVOS
                  </span>
                </div>

                <div className="space-y-2">
                  {availableServers.map((server) => {
                    const isSelected = selectedServerId === server.id;
                    return (
                      <motion.div
                        key={server.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedServerId(server.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-surface-container-high border-forestMint/60 shadow-lg shadow-forestMint/5'
                            : 'bg-surface-container border-white/[0.06] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-forestMint bg-forestMint' : 'border-white/30'
                            }`}
                          >
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-geist text-xs font-bold text-primary">
                                {server.sourceName}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-black/50 text-[9px] font-mono font-bold text-on-surface-variant">
                                {server.quality}
                              </span>
                              {server.badgeLabel && (
                                <span className="px-1.5 py-0.5 rounded bg-forestTagBg border border-forestMint/30 text-[8px] font-mono font-bold text-forestMint">
                                  {server.badgeLabel}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-on-surface-variant block mt-0.5">
                              {server.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-forestMint">
                          <span className="w-1.5 h-1.5 rounded-full bg-forestMint animate-pulse" />
                          <span>{server.pingMs || 18}ms</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Calidad Máxima */}
              <div className="space-y-2">
                <span className="font-mono text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Resolución
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {resolutions.map((res) => {
                    const isSelected = selectedResolution === res;
                    return (
                      <button
                        key={res}
                        onClick={() => setSelectedResolution(res)}
                        className={`py-2 rounded-lg font-mono text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-primary text-black border-transparent font-extrabold'
                            : 'bg-surface-container border-white/[0.08] text-on-surface-variant hover:text-primary'
                        }`}
                      >
                        {res}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opciones Avanzadas */}
              <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-geist text-xs font-semibold text-primary block">
                      Auto-Skip Opening y Ending
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      AniSkip API automático (+85s)
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoSkipAniSkip(!autoSkipAniSkip)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                      autoSkipAniSkip ? 'bg-forestMint' : 'bg-surface-container-high'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        autoSkipAniSkip ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-geist text-xs font-semibold text-primary block">
                      Reproducción Continua
                    </span>
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      Iniciar siguiente capítulo al terminar
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoPlayNext(!autoPlayNext)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 ${
                      autoPlayNext ? 'bg-forestMint' : 'bg-surface-container-high'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        autoPlayNext ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Botón Aplicar */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleApply}
                className="w-full h-11 rounded-xl bg-primary text-black font-geist font-bold text-xs tracking-wider uppercase shadow-xl mt-4"
              >
                Confirmar y Aplicar Cambios
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
