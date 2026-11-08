export interface MusicTrack {
  id: string;
  title: string;
  url: string;
  format: string; // e.g. 'audio/mpeg', 'MP3', 'WAV', 'OGG'
  sizeBytes: number;
  sizeFormatted: string; // e.g. '3.4 MB'
  storagePath?: string; // Path in Firebase Storage if applicable
  isActive: boolean;
  createdAt: number;
  uploadedBy?: string;
}

export interface MusicSettings {
  enabled: boolean; // Master switch for website background music
  activeTrackId: string | null;
  activeTrackUrl: string;
  activeTrackTitle: string;
  defaultVolume: number; // 0.0 - 1.0
  loop: boolean;
  updatedAt: number;
}

export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  enabled: true,
  activeTrackId: null,
  activeTrackUrl: '/audio/background-music.mp3',
  activeTrackTitle: 'Character Archive Melody',
  defaultVolume: 0.35,
  loop: true,
  updatedAt: Date.now(),
};
