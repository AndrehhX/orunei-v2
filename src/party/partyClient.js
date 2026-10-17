/**
 * Cliente y sincronizador de salas para Orunei Party.
 * Arquitectura basada en Supabase Realtime (Broadcast + Presence).
 * Sincroniza eventos de reproducción (play, pause, seek, episode)
 * y estado de presencia con algoritmo de sincronización adaptativa sin interrupciones:
 * - Desfase < 250ms: No intervenir (reproducción suave).
 * - Desfase 250ms - 1000ms: Corrección gradual de velocidad de reproducción (playbackRate).
 * - Desfase > 1000ms: Salto suave (seek) al tiempo compartido del anfitrión.
 */

import { supabase } from '../auth/supabaseClient.js';

export const SYNC_THRESHOLDS = {
  IGNORE_MS: 250,
  GRADUAL_CORRECTION_MS: 1000,
};

export function createPartySessionId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function calculateSyncAction(clientTimeSeconds, hostTimeSeconds, isPaused) {
  if (isPaused) {
    const diff = Math.abs(clientTimeSeconds - hostTimeSeconds);
    if (diff > 0.3) {
      return { type: 'SEEK', targetTime: hostTimeSeconds };
    }
    return { type: 'NONE' };
  }

  const diffMs = Math.round((hostTimeSeconds - clientTimeSeconds) * 1000);
  const absDiffMs = Math.abs(diffMs);

  if (absDiffMs < SYNC_THRESHOLDS.IGNORE_MS) {
    return { type: 'NONE', diffMs };
  }

  if (absDiffMs <= SYNC_THRESHOLDS.GRADUAL_CORRECTION_MS) {
    // Si el cliente va atrasado respecto al anfitrión, acelerar ligeramente (1.05x - 1.1x)
    // Si va adelantado, desacelerar ligeramente (0.9x - 0.95x)
    const rate = diffMs > 0 ? 1.08 : 0.92;
    return { type: 'SPEED_ADJUST', rate, diffMs };
  }

  return { type: 'SEEK', targetTime: hostTimeSeconds, diffMs };
}

export class OruneiPartyClient {
  constructor(roomId, user, options = {}) {
    this.roomId = roomId;
    this.user = user;
    this.options = options;
    this.channel = null;
    this.isHost = Boolean(options.isHost);
    this.hostId = options.hostId || (this.isHost ? user.id : null);
    this.listeners = {
      state: [],
      presence: [],
      chat: [],
      sync: [],
    };
    this.currentRoomState = {
      animeId: options.animeId || null,
      animeTitle: options.animeTitle || '',
      episode: options.episode || 1,
      currentTime: options.initialTime || 0,
      isPlaying: false,
      serverTime: Date.now(),
      version: 1,
      hostId: this.hostId,
      roomName: options.roomName || 'Noche de anime',
    };
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return () => {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    };
  }

  emit(event, data) {
    (this.listeners[event] || []).forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[OruneiParty] Error in listener for ${event}:`, err);
      }
    });
  }

  connect() {
    if (!supabase) {
      // Modo fallback local/offline para demostración interactiva
      this.emit('presence', [{
        id: this.user.id || 'me',
        name: this.user.name || this.user.displayName || 'Tú',
        avatar: this.user.avatar || null,
        isHost: this.isHost,
        color: '#6d5cff',
      }]);
      return Promise.resolve();
    }

    const channelName = `party_${this.roomId}`;
    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: { ack: false, self: false },
        presence: { key: this.user.id || String(Date.now()) },
      },
    });

    // Escuchar eventos de sincronización de reproducción
    this.channel
      .on('broadcast', { event: 'playback_sync' }, ({ payload }) => {
        if (!payload) return;
        this.currentRoomState = { ...this.currentRoomState, ...payload };
        this.emit('sync', payload);
      })
      .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
        if (payload) {
          this.emit('chat', payload);
        }
      })
      .on('broadcast', { event: 'room_state_update' }, ({ payload }) => {
        if (payload) {
          this.currentRoomState = { ...this.currentRoomState, ...payload };
          this.emit('state', this.currentRoomState);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        const participants = [];
        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (Array.isArray(presences)) {
            presences.forEach((p) => participants.push(p));
          }
        });
        this.emit('presence', participants);
      });

    return new Promise((resolve) => {
      this.channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Registrar presencia del usuario
          this.channel.track({
            id: this.user.id || String(Date.now()),
            name: this.user.displayName || this.user.name || 'Espectador',
            avatar: this.user.avatar || null,
            isHost: this.isHost,
            joinedAt: Date.now(),
          });
          resolve();
        }
      });
    });
  }

  sendPlaybackEvent(action, currentTime, extra = {}) {
    if (!this.isHost && !this.options.allowParticipantControls) return;

    const payload = {
      action, // 'PLAY', 'PAUSE', 'SEEK', 'EPISODE_CHANGE'
      currentTime,
      isPlaying: action === 'PLAY',
      serverTime: Date.now(),
      version: (this.currentRoomState.version || 0) + 1,
      episode: extra.episode || this.currentRoomState.episode,
      animeId: extra.animeId || this.currentRoomState.animeId,
      hostId: this.hostId,
    };

    this.currentRoomState = { ...this.currentRoomState, ...payload };

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'playback_sync',
        payload,
      });
    }
    this.emit('sync', payload);
  }

  sendChatMessage(text) {
    if (!text || !text.trim()) return;
    const msg = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: this.user.id,
      senderName: this.user.displayName || this.user.name || 'Tú',
      avatar: this.user.avatar || null,
      text: text.trim(),
      timestamp: Date.now(),
    };

    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: msg,
      });
    }
    this.emit('chat', msg);
    return msg;
  }

  leave() {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
    }
  }
}
