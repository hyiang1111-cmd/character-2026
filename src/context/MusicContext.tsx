import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback
} from 'react';
import { MusicSettings, MusicTrack, DEFAULT_MUSIC_SETTINGS } from '../types/music';
import { subscribeToMusicSettings, subscribeToMusicTracks } from '../services/storage';

interface MusicContextType {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0.0 - 1.0
  settings: MusicSettings;
  tracks: MusicTrack[];
  activeTrack: MusicTrack | null;
  hasTrackSource: boolean;
  isAutoplayBlocked: boolean;
  loadError: string | null;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (vol: number) => void;
  startMusicOnEnter: () => Promise<boolean>;
  previewTrack: (track: MusicTrack | null) => void;
  previewingTrackId: string | null;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const LOCAL_STORAGE_VOL_KEY = 'pca_music_volume';
const LOCAL_STORAGE_MUTED_KEY = 'pca_music_muted';
const LOCAL_STORAGE_USER_PAUSED_KEY = 'pca_music_user_paused';

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<MusicSettings>(DEFAULT_MUSIC_SETTINGS);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_MUTED_KEY) === 'true';
    }
    return false;
  });
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_VOL_KEY);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
    }
    return 0.35;
  });

  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Single singleton audio element reference for the entire application
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = true;
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.warn('Background audio source not available or format not supported:', e);
      setLoadError('Không thể tải file âm thanh.');
      setIsPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Sync settings and tracks from Firestore in real-time
  useEffect(() => {
    const unsubSettings = subscribeToMusicSettings((newSettings) => {
      setSettings(newSettings);
    });

    const unsubTracks = subscribeToMusicTracks((newTracks) => {
      setTracks(newTracks);
    });

    return () => {
      unsubSettings();
      unsubTracks();
    };
  }, []);

  // Determine current active track or URL
  const activeTrack = tracks.find((t) => t.id === settings.activeTrackId) || null;
  const currentSrc = previewingTrackId
    ? tracks.find((t) => t.id === previewingTrackId)?.url || ''
    : settings.activeTrackUrl || (activeTrack?.url) || '';

  const hasTrackSource = Boolean(currentSrc && currentSrc.trim().length > 0);

  // Update audio source when track source changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!hasTrackSource || !settings.enabled) {
      if (isPlaying) {
        audio.pause();
      }
      return;
    }

    // Only update src if it has actually changed
    const resolvedUrl = currentSrc.startsWith('http')
      ? currentSrc
      : window.location.origin + (currentSrc.startsWith('/') ? currentSrc : '/' + currentSrc);

    if (audio.src !== resolvedUrl) {
      const wasPlaying = isPlaying;
      audio.src = currentSrc;
      audio.loop = settings.loop ?? true;
      audio.load();
      setLoadError(null);

      if (wasPlaying && settings.enabled) {
        audio.play().catch((err) => {
          console.warn('Audio auto-resume note:', err);
        });
      }
    }
  }, [currentSrc, hasTrackSource, settings.enabled, settings.loop]);

  // Volume & Mute synchronizer
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Handle User Volume changes
  const setVolume = useCallback((newVol: number) => {
    const clamped = Math.max(0, Math.min(1, newVol));
    setVolumeState(clamped);
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
      localStorage.setItem(LOCAL_STORAGE_MUTED_KEY, 'false');
    }
    localStorage.setItem(LOCAL_STORAGE_VOL_KEY, clamped.toString());
  }, [isMuted]);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem(LOCAL_STORAGE_MUTED_KEY, next.toString());
      return next;
    });
  }, []);

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !hasTrackSource) return;

    if (isPlaying) {
      audio.pause();
      localStorage.setItem(LOCAL_STORAGE_USER_PAUSED_KEY, 'true');
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_PAUSED_KEY);
      setIsAutoplayBlocked(false);
      audio.play().catch((err) => {
        console.warn('Play error:', err);
        setIsAutoplayBlocked(true);
      });
    }
  }, [isPlaying, hasTrackSource]);

  // Start music when user clicks "ENTER" on Welcome Screen
  const startMusicOnEnter = useCallback(async (): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio || !hasTrackSource || !settings.enabled) {
      return false;
    }

    // Check if user previously explicitly paused
    const userExplicitlyPaused = localStorage.getItem(LOCAL_STORAGE_USER_PAUSED_KEY) === 'true';
    if (userExplicitlyPaused) {
      return false;
    }

    try {
      if (!audio.src && currentSrc) {
        audio.src = currentSrc;
        audio.load();
      }
      audio.volume = isMuted ? 0 : volume;
      await audio.play();
      setIsAutoplayBlocked(false);
      setIsPlaying(true);
      return true;
    } catch (err) {
      console.warn('Browser prevented autoplay on enter:', err);
      setIsAutoplayBlocked(true);
      return false;
    }
  }, [hasTrackSource, settings.enabled, currentSrc, isMuted, volume]);

  // Preview track for Admin Dashboard
  const previewTrack = useCallback((track: MusicTrack | null) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!track) {
      // Stop preview, revert to active track
      setPreviewingTrackId(null);
      if (settings.enabled && activeTrack?.url) {
        audio.src = activeTrack.url;
        audio.load();
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      return;
    }

    setPreviewingTrackId(track.id);
    audio.src = track.url;
    audio.load();
    audio.play().catch((e) => {
      console.warn('Preview play error:', e);
    });
  }, [settings.enabled, activeTrack]);

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        settings,
        tracks,
        activeTrack,
        hasTrackSource,
        isAutoplayBlocked,
        loadError,
        togglePlay,
        toggleMute,
        setVolume,
        startMusicOnEnter,
        previewTrack,
        previewingTrackId,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
