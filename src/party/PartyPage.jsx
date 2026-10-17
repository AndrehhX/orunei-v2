import { useState, useEffect } from 'react';
import { Users, Sparkles, Radio, Play, Plus, ArrowRight, CheckCircle, ShieldCheck } from 'lucide-react';
import CreatePartyModal from './CreatePartyModal';

export default function PartyPage({ onOpenAnime, onStartParty }) {
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Salas de demostración/comunidad activas
  const featuredRooms = [
    {
      id: 'otaku-night',
      name: 'Noche de anime',
      animeTitle: 'Shingeki no Kyojin',
      episode: 7,
      season: 'Temporada 2',
      participantsCount: 4,
      hostName: 'Alex',
      participants: ['Tú', 'Alex', 'Sofi', 'Luis'],
      isLive: true,
    },
    {
      id: 'jujutsu-s2',
      name: 'Maratón Shibuya',
      animeTitle: 'Jujutsu Kaisen',
      episode: 14,
      season: 'Temporada 2',
      participantsCount: 3,
      hostName: 'Carlos',
      participants: ['Carlos', 'Elena', 'Marco'],
      isLive: true,
    },
    {
      id: 'frieren-relax',
      name: 'Viendo Frieren juntos',
      animeTitle: 'Sousou no Frieren',
      episode: 10,
      season: 'Temporada 1',
      participantsCount: 2,
      hostName: 'Valeria',
      participants: ['Valeria', 'Mateo'],
      isLive: true,
    },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade">
      {/* Cabecera de la sección Party */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-purple-900/40 via-brand/20 to-pink-900/30 border border-white/10 shadow-2xl relative overflow-hidden animate-rise">
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-brand/20 text-brand border border-brand/40">
            <Radio size={13} className="text-emerald-400 animate-pulse" />
            <span>Sincronización en tiempo real</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Orunei Party
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Una sala. Un anime. Todos sincronizados. Mira anime con tus amigos desde cualquier dispositivo, con chat integrado y conservando tu idioma y subtítulos preferidos.
          </p>
        </div>

        <div className="z-10 shrink-0">
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-brand hover:brightness-110 text-white font-extrabold text-sm shadow-xl shadow-brand/40 transition active:scale-95"
          >
            <Plus size={18} />
            <span>Crear o unirse a una Party</span>
          </button>
        </div>

        {/* Círculos de luz decorativos de fondo */}
        <div className="absolute -top-12 -right-12 h-64 w-64 rounded-full bg-brand/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />
      </div>

      {/* Características clave */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-brand font-bold text-xs">
            <Radio size={15} />
            <span>Sincronización inteligente</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Alineación continua sin pausar ni congelar el video ante pequeños retrasos de red.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs">
            <Sparkles size={15} />
            <span>Idiomas independientes</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Tú puedes verlo en japonés con subtítulos y tus amigos en latino, completamente sincronizados.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <CheckCircle size={15} />
            <span>Chat en vivo y reacciones</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Comenta cada momento épico con mensajes instantáneos y emojis sin salir del reproductor.
          </p>
        </div>
      </div>

      {/* Salas destacadas activas */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Salas activas de la comunidad</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              En vivo
            </span>
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredRooms.map((room) => (
            <div
              key={room.id}
              className="card p-4 rounded-2xl bg-[#141522]/90 border border-white/10 flex flex-col justify-between gap-4 transition hover:-translate-y-1 shadow-md"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Host: {room.hostName}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {room.participantsCount} amigos
                  </span>
                </div>

                <div>
                  <h3 className="font-extrabold text-sm text-white">{room.name}</h3>
                  <p className="text-xs text-brand font-semibold">{room.animeTitle} · Ep. {room.episode}</p>
                  <p className="text-[11px] text-slate-400">{room.season}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onStartParty?.({
                    roomId: room.id,
                    roomName: room.name,
                    isHost: false,
                    animeTitle: room.animeTitle,
                    episode: room.episode,
                  });
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-brand text-white font-bold text-xs border border-white/10 hover:border-brand transition active:scale-95"
              >
                <span>Entrar a la Party</span>
                <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <CreatePartyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onJoinOrCreate={(partyData) => {
          onStartParty?.(partyData);
        }}
      />
    </div>
  );
}
