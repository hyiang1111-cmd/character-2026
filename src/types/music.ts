export interface MusicTrack {
  id: string;
  title: string; // Song Name / Tên bài hát
  artist?: string; // Artist / Ca sĩ
  coverUrl?: string; // Cover Image URL / Ảnh bìa
  url: string; // Direct Audio URL (e.g. Catbox, MP3, WAV)
  format?: string; // e.g. 'Catbox Audio', 'MP3', 'Audio Link'
  isPublic: boolean; // Public visibility toggle (Hiển thị công khai)
  isActive: boolean; // Set as primary active background music
  order?: number; // Sorting order in playlist
  createdAt: number;
  updatedAt?: number;
  uploadedBy?: string;
  status?: 'published' | 'draft';
}

export interface MusicSettings {
  enabled: boolean; // Master switch for website background music
  activeTrackId: string | null;
  activeTrackUrl: string;
  activeTrackTitle: string;
  activeTrackArtist?: string;
  activeTrackCoverUrl?: string;
  defaultVolume: number; // 0.0 - 1.0
  loop: boolean;
  updatedAt: number;
}

export const DEFAULT_MUSIC_SETTINGS: MusicSettings = {
  enabled: true,
  activeTrackId: null,
  activeTrackUrl: '/audio/background-music.mp3',
  activeTrackTitle: 'Character Archive Melody',
  activeTrackArtist: 'Pink Character Archive',
  defaultVolume: 0.35,
  loop: true,
  updatedAt: Date.now(),
};
