import { useState, useEffect, useRef } from 'react';
import { Send, Smile, Users, Radio, Sparkles } from 'lucide-react';

const QUICK_REACTIONS = ['🔥', '😭', '😱', '❤️', '👏', '😂'];

export default function PartyChat({ messages = [], onSendMessage, isDemo = false, roomName = 'Noche de anime' }) {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage?.(inputText);
    setInputText('');
  };

  const handleQuickReaction = (emoji) => {
    onSendMessage?.(emoji);
  };

  return (
    <div className="flex flex-col h-full bg-[#11131c] rounded-2xl border border-white/10 shadow-xl overflow-hidden animate-fade">
      {/* Cabecera del chat */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-base select-none">💬</span>
          <span className="text-xs font-bold text-white tracking-wide">Chat de la Party</span>
        </div>
        {isDemo && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-slate-300 border border-white/10">
            Demo
          </span>
        )}
      </div>

      {/* Lista de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-8 space-y-2">
            <span className="text-2xl opacity-60">🎉</span>
            <p className="font-semibold text-slate-400">¡Bienvenidos a la Party!</p>
            <p className="text-[11px] max-w-[200px]">Escribe un mensaje o reacciona para comentar el anime con tus amigos.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const initial = (msg.senderName || 'U').charAt(0).toUpperCase();
            const colors = ['#6d5cff', '#00b4d8', '#f72585', '#fb8500', '#10b981'];
            const color = colors[Math.abs(initial.charCodeAt(0)) % colors.length];

            return (
              <div key={msg.id || index} className="flex items-start gap-2.5 animate-rise">
                <div
                  className="h-7 w-7 rounded-full shrink-0 flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm"
                  style={{ backgroundColor: color }}
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-slate-300 text-[11px]">{msg.senderName}</span>
                    {msg.timestamp && (
                      <span className="text-[9px] text-slate-500">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-white text-xs mt-0.5 break-words font-medium">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reacciones rápidas */}
      <div className="px-3 py-1.5 bg-black/20 border-t border-white/5 flex items-center justify-around">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleQuickReaction(emoji)}
            className="text-base hover:scale-125 transition-transform active:scale-95 p-1 select-none"
            title={`Reaccionar con ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input de mensaje */}
      <form onSubmit={handleSubmit} className="p-3 bg-white/[0.02] border-t border-white/10 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escribe algo..."
          className="flex-1 bg-white/5 hover:bg-white/10 focus:bg-white/10 text-xs text-white placeholder:text-slate-500 px-3.5 py-2.5 rounded-xl border border-white/10 focus:border-brand outline-none transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-brand text-white disabled:opacity-30 disabled:pointer-events-none hover:brightness-110 active:scale-95 transition shadow-sm shrink-0"
          title="Enviar mensaje"
        >
          <Send size={14} />
        </button>
      </form>

      {isDemo && (
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 text-[10px] text-slate-500 text-center">
          Chat interactivo en tiempo real conectado con Supabase.
        </div>
      )}
    </div>
  );
}
