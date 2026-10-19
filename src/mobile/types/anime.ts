/**
 * Orunei Mobile - Tipos de Dominio
 */

export interface AnimeItem {
  id: string | number;
  malId?: number;
  title: string;
  originalTitle?: string;
  romajiTitle?: string;
  coverImage: string;
  bannerImage?: string;
  rating?: number;
  year?: number | string;
  episodesCount?: number;
  genres: string[];
  format?: 'TV' | 'Movie' | 'OVA' | 'ONA';
  isDubbed?: boolean;
  isSimulcast?: boolean;
  synopsis?: string;
  studio?: string;
  director?: string;
  currentProgress?: {
    episodeNumber: number;
    episodeTitle: string;
    watchedSeconds: number;
    totalSeconds: number;
    remainingMinutes: number;
  };
}

export interface EpisodeItem {
  id: string | number;
  number: number;
  title: string;
  thumbnail: string;
  durationSeconds: number;
  durationLabel: string;
  airedDate?: string;
  synopsis?: string;
  progressPercent?: number;
  isCompleted?: boolean;
  isDownloaded?: boolean;
}

export interface StreamSource {
  id: string;
  name: string;
  sourceName: string;
  quality: string;
  proxiedStreamUrl: string;
  embedUrl?: string;
  isEmbed: boolean;
  pingMs?: number;
  language: 'latino' | 'subtitulado';
  badgeLabel?: string;
  badgeType?: 'fast' | 'direct' | 'backup';
}

export type RootTab = 'inicio' | 'catalogo' | 'favoritos' | 'perfil';
