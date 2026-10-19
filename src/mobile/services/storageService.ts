/**
 * Orunei Mobile - Servicio de Persistencia Local
 * Gestiona favoritos, historial de progreso de episodios y preferencias del usuario.
 * Utiliza localStorage con fallback en memoria para máxima velocidad y fiabilidad en móvil y web.
 */
import { AnimeItem } from '../types/anime';

export interface WatchProgress {
  animeId: string | number;
  animeTitle: string;
  coverImage: string;
  episodeNumber: number;
  episodeTitle: string;
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface UserPreferences {
  defaultAudio: 'latino' | 'sub';
  autoSkipAniSkip: boolean;
  autoPlayNext: boolean;
  preferredQuality: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultAudio: 'latino',
  autoSkipAniSkip: true,
  autoPlayNext: true,
  preferredQuality: '1080P',
};

const KEYS = {
  FAVORITES: '@orunei_favorites_v1',
  HISTORY: '@orunei_history_v1',
  PREFERENCES: '@orunei_preferences_v1',
};

const memStore: Record<string, string> = {};

const storageDriver = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return memStore[key] || null;
    } catch {
      return memStore[key] || null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      memStore[key] = value;
    } catch {
      memStore[key] = value;
    }
  },
};

export const storageService = {
  /**
   * Obtiene la lista de favoritos guardados
   */
  async getFavorites(): Promise<AnimeItem[]> {
    try {
      const raw = await storageDriver.getItem(KEYS.FAVORITES);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  /**
   * Agrega o elimina un anime de favoritos
   */
  async toggleFavorite(anime: AnimeItem): Promise<boolean> {
    try {
      const list = await this.getFavorites();
      const exists = list.some((item) => String(item.id) === String(anime.id));
      let updated: AnimeItem[];

      if (exists) {
        updated = list.filter((item) => String(item.id) !== String(anime.id));
      } else {
        updated = [anime, ...list];
      }

      await storageDriver.setItem(KEYS.FAVORITES, JSON.stringify(updated));
      return !exists;
    } catch {
      return false;
    }
  },

  /**
   * Comprueba si un anime está en favoritos
   */
  async isFavorite(animeId: string | number): Promise<boolean> {
    try {
      const list = await this.getFavorites();
      return list.some((item) => String(item.id) === String(animeId));
    } catch {
      return false;
    }
  },

  /**
   * Guarda o actualiza el progreso de reproducción de un episodio
   */
  async saveProgress(progress: WatchProgress): Promise<void> {
    try {
      const history = await this.getHistory();
      const filtered = history.filter(
        (h) => !(String(h.animeId) === String(progress.animeId) && h.episodeNumber === progress.episodeNumber)
      );
      const updated = [{ ...progress, updatedAt: Date.now() }, ...filtered].slice(0, 50); // Máx 50 registros
      await storageDriver.setItem(KEYS.HISTORY, JSON.stringify(updated));
    } catch (err) {
      console.warn('[Storage] Error al guardar progreso:', err);
    }
  },

  /**
   * Obtiene el historial completo de reproducción
   */
  async getHistory(): Promise<WatchProgress[]> {
    try {
      const raw = await storageDriver.getItem(KEYS.HISTORY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  /**
   * Obtiene el progreso guardado de un episodio en particular
   */
  async getEpisodeProgress(animeId: string | number, epNumber: number): Promise<number> {
    try {
      const history = await this.getHistory();
      const match = history.find(
        (h) => String(h.animeId) === String(animeId) && h.episodeNumber === epNumber
      );
      return match ? match.currentTime : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Obtiene las preferencias del usuario
   */
  async getPreferences(): Promise<UserPreferences> {
    try {
      const raw = await storageDriver.getItem(KEYS.PREFERENCES);
      if (!raw) return DEFAULT_PREFERENCES;
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },

  /**
   * Guarda cambios parciales o totales en preferencias
   */
  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const current = await this.getPreferences();
      const merged = { ...current, ...updates };
      await storageDriver.setItem(KEYS.PREFERENCES, JSON.stringify(merged));
      return merged;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  },
};
