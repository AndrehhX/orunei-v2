import { useState } from 'react';
import { Coffee, ShieldCheck, Zap, Radio, X, ArrowUpRight, Copy, Check, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0d0f17] border border-white/10 p-6 sm:p-8 text-white shadow-[0_24px_60px_rgba(0,0,0,0.7)] space-y-6 animate-rise my-auto">
        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition active:scale-95"
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        {/* Encabezado Editorial Minimalista */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-mono tracking-widest uppercase bg-white/[0.04] text-slate-300 border border-white/10">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Fondo de Infraestructura Independiente</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
            Sostén la independencia de Orunei
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Orunei se mantiene sin publicidad comercial, ventanas emergentes ni venta de datos. Tu contribución financia directamente el ancho de banda CDN, los servidores dedicados 1080p y el mantenimiento del catálogo.
          </p>
        </div>

        {/* Selector Bento de Aportes */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400">
            <span>Modalidad de aporte</span>
            <span className="text-white font-medium">{activeTier.label} ({activeTier.amount})</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {KOFI_TIERS.map((tier) => {
              const isSelected = selectedTier === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedTier(tier.id)}
                  className={`relative p-3.5 rounded-xl border text-left transition-all duration-150 active:scale-[0.98] flex flex-col justify-between min-h-[96px] ${
                    isSelected
                      ? 'bg-white/[0.08] border-white text-white'
                      : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:border-white/25 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-mono font-bold text-white tracking-tight">{tier.amount}</span>
                    {tier.popular && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider bg-white/15 text-white">
                        Común
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{tier.label}</p>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{tier.coffees ? `${tier.coffees} café${tier.coffees > 1 ? 's' : ''}` : 'Monto libre'}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 font-mono pt-1">
            Impacto: <span className="text-slate-300">{activeTier.description}</span>
          </p>
        </div>

        {/* Desglose de Transparencia Editorial */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 divide-y divide-white/5 space-y-3">
          <div className="flex items-start gap-3 pt-0">
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">01</span>
            <div>
              <p className="text-xs font-semibold text-slate-200">Servidores 1080p dedicados</p>
              <p className="text-[11px] text-slate-400">Ancho de banda mensual para reproducción fluida sin cortes ni sobrecarga.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3">
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">02</span>
            <div>
              <p className="text-xs font-semibold text-slate-200">Cero anuncios comerciales</p>
              <p className="text-[11px] text-slate-400">Compromiso total sin pop-ups, acortadores de enlaces ni rastreadores.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 pt-3">
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">03</span>
            <div>
              <p className="text-xs font-semibold text-slate-200">Indexación y doblaje constante</p>
              <p className="text-[11px] text-slate-400">Actualización diaria de episodios con subtítulos y audio en español latino.</p>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="space-y-2 pt-1">
          <a
            href={KOFI_DONATION_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-sm transition-all duration-150 active:scale-[0.98]"
          >
            <span>Respaldar en Ko-fi ({activeTier.amount})</span>
            <ArrowUpRight size={16} />
          </a>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-white/10 hover:border-white/20 bg-transparent hover:bg-white/[0.03] text-slate-300 font-mono text-xs transition active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-400" />
                <span className="text-emerald-400 font-bold">Enlace copiado al portapapeles</span>
              </>
            ) : (
              <>
                <Copy size={13} />
                <span>Copiar enlace directo de Ko-fi</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center pt-1">
          <p className="text-[10px] font-mono text-slate-500">
            Transacciones procesadas de forma segura y externa mediante la plataforma oficial de Ko-fi.
          </p>
        </div>
      </div>
    </div>
  );
}
