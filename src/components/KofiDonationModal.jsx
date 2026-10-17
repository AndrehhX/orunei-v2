import { useState } from 'react';
import { Heart, Sparkles, Coffee, ShieldCheck, Zap, Radio, X, ExternalLink, Copy, Check } from 'lucide-react';
import { KOFI_DONATION_URL, KOFI_TIERS } from '../config/donation';

export default function KofiDonationModal({ isOpen, onClose }) {
  const [selectedTier, setSelectedTier] = useState(KOFI_TIERS[1].id);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const activeTier = KOFI_TIERS.find((t) => t.id === selectedTier) || KOFI_TIERS[1];

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(KOFI_DONATION_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch (_) {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-[#13141f] border border-amber-500/30 p-6 sm:p-8 text-white shadow-[0_0_50px_rgba(245,158,11,0.2)] space-y-6 animate-rise my-auto">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95 z-10"
          aria-label="Cerrar ventana de donaciones"
        >
          <X size={20} />
        </button>

        {/* Encabezado animado con aura de café */}
        <div className="text-center space-y-2.5">
          <div className="relative inline-flex items-center justify-center">
            {/* Anillo de resplandor animado */}
            <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-brand opacity-60 blur-lg animate-pulse" />
            <div className="relative h-20 w-20 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 grid place-items-center shadow-xl shadow-amber-500/30">
              <span className="text-4xl animate-bounce select-none" role="img" aria-label="Café">☕</span>
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md border-2 border-[#13141f]">
                <Heart size={12} className="fill-white animate-ping" />
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Sparkles size={12} />
              <span>Espacio de Donaciones Oficial</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Invítanos a un café en <span className="bg-gradient-to-r from-amber-400 via-rose-400 to-purple-400 bg-clip-text text-transparent">Ko-fi</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Orunei se mantiene como un proyecto 100% independiente y sin anuncios molestos. Tu donación nos ayuda a costear los servidores y seguir mejorando la plataforma.
            </p>
          </div>
        </div>

        {/* Selector interactivo de aportes */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Elige cómo deseas apoyar</span>
            <span className="text-amber-400 font-semibold">{activeTier.label} ({activeTier.amount})</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {KOFI_TIERS.map((tier) => {
              const isSelected = selectedTier === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`relative p-3 rounded-2xl border text-center transition-all duration-200 active:scale-95 flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-gradient-to-b from-amber-500/20 to-rose-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-2 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow">
                      Popular
                    </span>
                  )}
                  <span className="text-lg">{tier.coffees ? '☕'.repeat(tier.coffees) : '✨'}</span>
                  <span className="text-xs font-bold">{tier.amount}</span>
                  <span className="text-[10px] text-slate-400">{tier.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-center text-slate-400 italic pt-0.5">
            "{activeTier.description}"
          </p>
        </div>

        {/* Razones de apoyo */}
        <div className="grid gap-2.5 sm:grid-cols-2 text-left">
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Servidores 1080p sin cortes</p>
              <p className="text-[11px] text-slate-400">Ancho de banda rápido para ver anime en máxima calidad.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">100% Libre de Anuncios</p>
              <p className="text-[11px] text-slate-400">Cero ventanas emergentes, acortadores ni rastreadores.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <Radio size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Más Doblaje Latino & Castellano</p>
              <p className="text-[11px] text-slate-400">Ampliación e indexación constante de temporadas dobladas.</p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 shrink-0">
              <Coffee size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Desarrollo de la App Móvil</p>
              <p className="text-[11px] text-slate-400">Actualizaciones continuas y soporte de descargas offline.</p>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="space-y-2.5 pt-1">
          <a
            href={KOFI_DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center gap-2.5 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 text-white font-extrabold text-sm shadow-xl shadow-amber-500/25 hover:brightness-110 active:scale-95 transition-all duration-200"
          >
            <span className="text-base group-hover:scale-110 transition-transform">☕</span>
            <span>Apoyar en Ko-fi ({activeTier.amount})</span>
            <ExternalLink size={15} className="opacity-80" />
          </a>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition active:scale-95"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-400 font-bold">¡Enlace copiado al portapapeles!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar enlace de Ko-fi</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-slate-500">
            Cualquier aporte, por pequeño que sea, significa un mundo para mantener Orunei vivo ❤️
          </p>
        </div>
      </div>
    </div>
  );
}
