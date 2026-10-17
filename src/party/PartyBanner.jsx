import { useState, useEffect } from 'react';
import { Users, Radio, CheckCircle, Clock, Volume2, Shield, Copy, Check, MessageSquare, Play, Pause } from 'lucide-react';

export default function PartyBanner({
  roomName = 'Noche de anime',
  isPrivate = true,
  participants = [],
  currentEpisode = 1,
  seasonText = 'Temporada 1',
  currentTime = 0,
  duration = 1460,
  isPlaying = false,
  isSynced = true,
  isHost = false,
  roomId = '',
  onTogglePlay,
  onOpenChat,
  unreadCount = 0,
}) {
  const [copied, setCopied] = useState(false);

  const formatSeconds = (sec) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/?party=${roomId}` : `https://orunei.sbs/?party=${roomId}`;
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="w-full rounded-2xl bg-[#0e1017] border border-white/10 p-4 sm:p-5 text-white shadow-2xl space-y-4 animate-fade">
      {/* Fila superior: Tipo de sala y participantes conectados */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
            {isPrivate ? 'SALA PRIVADA' : 'SALA PÚBLICA'}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            <span>{roomName}</span>
            {isHost && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand/20 text-brand border border-brand/40">
                Anfitrión
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {roomId && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 transition active:scale-95"
              title="Copiar enlace de invitación"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span className="hidden sm:inline">{copied ? '¡Copiado!' : 'Invitar'}</span>
            </button>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{participants.length || 1} conectados</span>
          </div>
        </div>
      </div>

      {/* Avatares de los amigos en la sala */}
      <div className="flex items-center gap-6 overflow-x-auto py-2 scroll-hide">
        {participants.map((p, idx) => {
          const name = p.name || 'Invitado';
          const initial = name.charAt(0).toUpperCase();
          const colors = ['#6d5cff', '#00b4d8', '#f72585', '#fb8500', '#10b981'];
          const color = p.color || colors[idx % colors.length];

          return (
            <div key={p.id || idx} className="flex flex-col items-center gap-1.5 shrink-0 animate-scaleUp">
              <div
                className="h-11 w-11 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md ring-2 ring-white/10"
                style={{ backgroundColor: color }}
              >
                {initial}
              </div>
              <span className="text-[11px] font-semibold text-slate-300 max-w-[60px] truncate text-center">
                {p.isMe ? 'Tú' : name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Línea de estado y progreso sincronizado */}
      <div className="space-y-2 pt-1 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">
              Episodio {currentEpisode} {seasonText ? `— ${seasonText}` : ''}
            </span>
            <Radio size={13} className="text-emerald-400 animate-pulse" />
          </div>

          <div className="font-mono text-xs text-slate-300">
            {formatSeconds(currentTime)} / {formatSeconds(duration)}
          </div>
        </div>

        {/* Barra de progreso sincronizada */}
        <div className="flex items-center gap-3">
          {onTogglePlay && isHost && (
            <button
              type="button"
              onClick={onTogglePlay}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
              title={isPlaying ? 'Pausar para todos' : 'Reproducir para todos'}
            >
              {isPlaying ? <Pause size={13} className="fill-white" /> : <Play size={13} className="fill-white" />}
            </button>
          )}

          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Estado de sincronización */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <CheckCircle size={14} />
            <span>{isSynced ? 'Todos sincronizados' : 'Alineando reproducción...'}</span>
          </div>

          {onOpenChat && (
            <button
              type="button"
              onClick={onOpenChat}
              className="relative inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
            >
              <MessageSquare size={13} />
              <span>Abrir chat</span>
              {unreadCount > 0 && (
                <span className="h-4 w-4 rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
