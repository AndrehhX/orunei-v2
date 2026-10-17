import { useState } from 'react';
import { Volume2, Check, X, Sparkles, AlertCircle } from 'lucide-react';

export default function SeasonAudioModal({
  animeTitle = 'este anime',
  availability = { hasLatino: true, hasCastellano: false },
  defaultPreference = 'latino',
  onConfirm,
  onClose,
}) {
  const [selected, setSelected] = useState(() => {
    if (availability.hasLatino) return 'latino';
    return 'sub_es';
  });
  const [rememberSeason, setRememberSeason] = useState(true);

  const handleConfirm = () => {
    onConfirm?.({
      preference: selected,
      remember: rememberSeason
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 p-4 sm:p-6 shadow-2xl shadow-brand/20 text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-modal-title"
      >
        {/* Glow de acento superior */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-brand/20 blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        {/* Encabezado */}
        <div className="flex items-start justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-brand/20 text-brand ring-1 ring-brand/30 shrink-0">
              <Volume2 size={20} className="text-brand sm:w-[22px] sm:h-[22px]" />
            </div>
            <div>
              <h3 id="audio-modal-title" className="text-sm sm:text-base font-bold text-white tracking-tight">
                Elige el idioma de la temporada
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                {animeTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-slate-300/90 mb-4 leading-relaxed">
          Selecciona tu experiencia de audio. Esta elección se mantendrá activa durante toda la temporada para que disfrutes de una reproducción continua sin interrupciones.
        </p>

        {/* Opciones de Idioma */}
        <div className="space-y-2.5 mb-5">
          {/* Opción 1: Español Latino DUB */}
          {availability.hasLatino && (
            <button
              type="button"
              onClick={() => setSelected('latino')}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                selected === 'latino'
                  ? 'border-brand bg-brand/15 shadow-md shadow-brand/10 ring-1 ring-brand'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl" role="img" aria-label="México">🇲🇽</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Español Latino</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Sparkles size={10} /> {availability.batchInfo ? availability.batchInfo.label : 'Full HD 1080p'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {availability.batchInfo
                      ? `Audio oficial en español latino (${availability.batchInfo.label}).`
                      : 'Audio doblado al español latino oficial verificado en toda la temporada.'}
                  </p>
                </div>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                  selected === 'latino' ? 'border-brand bg-brand text-white' : 'border-slate-500'
                }`}
              >
                {selected === 'latino' && <Check size={12} strokeWidth={3} />}
              </div>
            </button>
          )}

          {/* Opción 2: Español Castellano DUB */}
          {availability.hasCastellano && (
            <button
              type="button"
              onClick={() => setSelected('castellano')}
              className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                selected === 'castellano'
                  ? 'border-brand bg-brand/15 shadow-md shadow-brand/10 ring-1 ring-brand'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl" role="img" aria-label="España">🇪🇸</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Español Castellano</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      1080p
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Audio doblado al castellano oficial para toda la temporada.
                  </p>
                </div>
              </div>
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                  selected === 'castellano' ? 'border-brand bg-brand text-white' : 'border-slate-500'
                }`}
              >
                {selected === 'castellano' && <Check size={12} strokeWidth={3} />}
              </div>
            </button>
          )}

          {/* Opción 3: Japonés Subtitulado SUB */}
          <button
            type="button"
            onClick={() => setSelected('sub_es')}
            className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
              selected === 'sub_es'
                ? 'border-brand bg-brand/15 shadow-md shadow-brand/10 ring-1 ring-brand'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl" role="img" aria-label="Japón">🇯🇵</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">Japonés (Subtitulado)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-white/10">
                    Original
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Audio original en japonés con subtítulos completos en español.
                </p>
              </div>
            </div>
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                selected === 'sub_es' ? 'border-brand bg-brand text-white' : 'border-slate-500'
              }`}
            >
              {selected === 'sub_es' && <Check size={12} strokeWidth={3} />}
            </div>
          </button>
        </div>

        {/* Checkbox de recordar temporada */}
        <label className="flex items-center gap-2.5 mb-5 cursor-pointer text-xs text-slate-300 select-none">
          <input
            type="checkbox"
            checked={rememberSeason}
            onChange={(e) => setRememberSeason(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-brand focus:ring-brand accent-brand"
          />
          <span>Recordar mi elección para todos los episodios de esta temporada</span>
        </label>

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand/25 transition hover:brightness-110 active:scale-95"
          >
            <span>Confirmar y Reproducir</span>
          </button>
        </div>
      </div>
    </div>
  );
}
