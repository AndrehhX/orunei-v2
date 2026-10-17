import { useEffect, useState, useRef } from 'react';
import { Download, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getActiveDownloads, subscribeDownloads, cancelDownload, isNativeApp } from '../offline/downloadEngine';

export default function ActiveDownloadBar({ onGoToDownloads }) {
  const [activeItems, setActiveItems] = useState([]);
  const [lastFinished, setLastFinished] = useState(null);
  const prevItemsRef = useRef([]);

  useEffect(() => {
    if (!isNativeApp()) return;
    const update = () => {
      const currentList = getActiveDownloads();
      
      // Detectar cuando un ítem que estaba descargando desaparece de la lista activa (se completó)
      if (prevItemsRef.current.length > 0 && currentList.length < prevItemsRef.current.length) {
        const completed = prevItemsRef.current.find(prev => !currentList.some(curr => curr.id === prev.id));
        if (completed && completed.progress >= 95) {
          setLastFinished(completed);
        }
      }
      
      prevItemsRef.current = currentList;
      setActiveItems(currentList);
    };

    update();
    const unsub = subscribeDownloads(update);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!lastFinished) return;
    const timer = setTimeout(() => {
      setLastFinished(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [lastFinished]);

  if (!isNativeApp()) return null;

  // Si acaba de completarse una descarga y no hay otras activas
  if (activeItems.length === 0 && lastFinished) {
    return (
      <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg animate-rise">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#0f1914]/95 backdrop-blur-xl border border-emerald-500/40 shadow-2xl shadow-emerald-500/20 text-white transition-all duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid place-items-center h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <CheckCircle2 size={22} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-300">¡Descarga completada con éxito!</p>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {lastFinished.animeTitle} · {lastFinished.episodeTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onGoToDownloads && (
              <button
                onClick={onGoToDownloads}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition active:scale-95 shadow-md shadow-emerald-500/30"
              >
                <span>Ver</span>
                <ArrowRight size={14} />
              </button>
            )}
            <button
              onClick={() => setLastFinished(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white transition"
              aria-label="Cerrar aviso"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeItems.length === 0) return null;

  const current = activeItems[0];

  return (
    <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg animate-rise">
      <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-[#141724]/95 backdrop-blur-xl border border-brand/40 shadow-2xl shadow-brand/20 text-white animate-pulse-glow transition-all duration-300">
        {/* Ícono animado con halo brillante */}
        <div className="relative flex items-center justify-center h-10 w-10 rounded-xl bg-brand/20 text-brand shrink-0 shadow-[0_0_15px_rgba(109,92,255,0.35)]">
          <Download size={20} className="animate-bounce" />
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
          </span>
        </div>

        {/* Título y barra de progreso */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="truncate pr-2 text-slate-100">{current.animeTitle} · {current.episodeTitle}</span>
            <span className="text-emerald-400 font-mono font-extrabold shrink-0">{current.progress}%</span>
          </div>

          {/* Barra de progreso fluida con efecto shimmer */}
          <div className="relative w-full h-2 rounded-full bg-white/10 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-brand via-indigo-500 to-emerald-400 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
              style={{ width: `${Math.max(current.progress, 4)}%` }}
            >
              <div className="absolute inset-0 w-1/2 h-full bg-white/30 skew-x-12 animate-shimmer-sweep pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 font-medium">
            <span className="tracking-tight">{current.sizeFormatted || 'Preparando...'}</span>
            {activeItems.length > 1 ? (
              <span className="text-brand font-semibold bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                +{activeItems.length - 1} en cola
              </span>
            ) : (
              <span className="text-emerald-400/90 text-[10px] font-bold tracking-wide uppercase">Descargando</span>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onGoToDownloads && (
            <button
              onClick={onGoToDownloads}
              className="p-2 rounded-xl bg-white/10 hover:bg-brand/20 hover:text-brand text-slate-200 transition-all duration-200 active:scale-95"
              title="Ir a Descargas"
              aria-label="Ir a Descargas"
            >
              <ArrowRight size={16} />
            </button>
          )}

          <button
            onClick={() => cancelDownload(current.animeId, current.episodeNumber)}
            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-all duration-200 active:scale-95"
            title="Cancelar descarga"
            aria-label="Cancelar descarga"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
