import { useState } from 'react';
import { Users, Sparkles, Plus, KeyRound, Radio, X, ArrowRight, ShieldCheck, Heart } from 'lucide-react';
import { createPartySessionId } from './partyClient';

export default function CreatePartyModal({ isOpen, onClose, animeTitle, animeId, currentEpisode = 1, onJoinOrCreate }) {
  const [roomName, setRoomName] = useState(animeTitle ? `Viendo ${animeTitle}` : 'Noche de anime');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'join'
  const [allowParticipantControls, setAllowParticipantControls] = useState(false);

  if (!isOpen) return null;

  const handleCreate = (e) => {
    e?.preventDefault();
    const roomId = createPartySessionId();
    onJoinOrCreate?.({
      roomId,
      roomName: roomName.trim() || 'Noche de anime',
      isHost: true,
      allowParticipantControls,
      animeId,
      animeTitle,
      episode: currentEpisode,
    });
    onClose?.();
  };

  const handleJoin = (e) => {
    e?.preventDefault();
    const clean = joinCode.trim().toLowerCase();
    if (!clean) return;
    onJoinOrCreate?.({
      roomId: clean,
      roomName: 'Sala compartida',
      isHost: false,
    });
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade">
      <div className="relative w-full max-w-md rounded-3xl bg-[#141622] border border-white/10 p-6 sm:p-7 text-white shadow-2xl space-y-5 animate-rise">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition active:scale-95"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        {/* Encabezado */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand to-pink-500 grid place-items-center shadow-lg shadow-brand/30 text-2xl">
            🍿
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Orunei Party
          </h2>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Una sala. Un anime. Todos sincronizados sin importar el audio o subtítulos de cada uno.
          </p>
        </div>

        {/* Selector de pestañas: Crear sala o Unirse */}
        <div className="flex rounded-xl bg-white/5 p-1 border border-white/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'create' ? 'bg-brand text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Crear nueva Party
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`flex-1 py-2 rounded-lg transition-all ${
              activeTab === 'join' ? 'bg-brand text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Unirme con código
          </button>
        </div>

        {/* Formulario Crear Sala */}
        {activeTab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Nombre de la sala</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Ej. Noche de anime con amigos"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:border-brand outline-none transition"
              />
            </div>

            {animeTitle && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400 truncate max-w-[220px]">{animeTitle}</span>
                <span className="font-bold text-brand shrink-0">Ep. {currentEpisode}</span>
              </div>
            )}

            <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">Permisos compartidos</span>
                <span className="text-[10px] text-slate-400">Permitir que tus amigos también puedan pausar y reanudar</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={allowParticipantControls}
                onClick={() => setAllowParticipantControls(!allowParticipantControls)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  allowParticipantControls ? 'bg-brand' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    allowParticipantControls ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-brand/30 transition active:scale-95"
            >
              <span>Generar sala privada y comenzar</span>
              <ArrowRight size={14} />
            </button>
          </form>
        ) : (
          /* Formulario Unirse a Sala */
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Código de sala o enlace</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Ej. abc123"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono uppercase focus:border-brand outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={!joinCode.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs shadow-lg shadow-brand/30 transition active:scale-95"
            >
              <span>Entrar a la sala</span>
              <ArrowRight size={14} />
            </button>
          </form>
        )}

        <div className="text-center pt-1 border-t border-white/5">
          <p className="text-[10px] text-slate-500">
            Cada participante reproduce su propia fuente con audio y subtítulos independientes sincronizados en tiempo real.
          </p>
        </div>
      </div>
    </div>
  );
}
