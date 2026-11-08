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
import { useAuth } from './AuthContext';

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
  nextTrack: () => void;
  prevTrack: () => void;
  selectTrack: (track: MusicTrack) => void;
  startMusicOnEnter: () => Promise<boolean>;
  previewTrack: (track: MusicTrack | null) => void;
  previewingTrackId: string | null;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const LOCAL_STORAGE_VOL_KEY = 'pca_music_volume';
const LOCAL_STORAGE_MUTED_KEY = 'pca_music_muted';
const LOCAL_STORAGE_USER_PAUSED_KEY = 'pca_music_user_paused';
const LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY = 'pca_music_active_track_id';

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<MusicSettings>(DEFAULT_MUSIC_SETTINGS);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);

  // Persistent track selection state by ID (avoids index shifts when list updates)
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY);
    }
    return null;
  });

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

  // SINGLETON HTMLAudioElement ref - instantiated ONCE for the entire application lifecycle
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Track currently loaded URL in audio element to prevent unnecessary src re-assignments
  const loadedUrlRef = useRef<string>('');

  // 1. Initialize HTMLAudioElement ONCE on mount at the highest app level
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = settings.loop ?? true;
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      console.warn('Background audio source failed to load or invalid URL:', e);
      setLoadError('URL âm thanh không hợp lệ hoặc không thể truy cập.');
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

  // 2. Real-time subscription to Firestore settings and playlist tracks
  useEffect(() => {
    const unsubSettings = subscribeToMusicSettings((newSettings) => {
      setSettings(newSettings);
    });

    const unsubTracks = subscribeToMusicTracks((newTracks) => {
      setTracks(newTracks);
    }, isAdmin);

    return () => {
      unsubSettings();
      unsubTracks();
    };
  }, [isAdmin]);

  // Compute public/effective playlist for visitor vs admin
  const publicTracks = tracks.filter((t) => t.isPublic !== false);
  const effectivePlaylist = publicTracks.length > 0 ? publicTracks : tracks;

  // Resolve current selected track object securely
  let currentSelectedTrack: MusicTrack | null = null;

  if (previewingTrackId) {
    currentSelectedTrack = tracks.find((t) => t.id === previewingTrackId) || null;
  } else if (selectedTrackId) {
    currentSelectedTrack = effectivePlaylist.find((t) => t.id === selectedTrackId) || null;
  }

  // Fallback to activeTrackId from global settings or first track in playlist
  if (!currentSelectedTrack && !previewingTrackId) {
    if (settings.activeTrackId) {
      currentSelectedTrack = effectivePlaylist.find((t) => t.id === settings.activeTrackId) || null;
    }
    if (!currentSelectedTrack && effectivePlaylist.length > 0) {
      currentSelectedTrack = effectivePlaylist[0];
    }
  }

  // Compute target audio URL string
  const currentSrc =
    currentSelectedTrack?.url ||
    settings.activeTrackUrl ||
    '/audio/background-music.mp3';

  const hasTrackSource = Boolean(currentSrc && currentSrc.trim().length > 0);

  // 3. Audio Source Synchronizer: Updates audio.src ONLY if URL is genuinely different
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!hasTrackSource || !settings.enabled) {
      if (!audio.paused) {
        audio.pause();
      }
      return;
    }

    // Resolve URL string to full absolute URL for accurate comparison with audio.src
    const resolvedUrl = currentSrc.startsWith('http')
      ? currentSrc
      : window.location.origin + (currentSrc.startsWith('/') ? currentSrc : '/' + currentSrc);

    // CRITICAL: Compare resolved absolute URL against loadedUrlRef to prevent resetting audio currentTime!
    if (loadedUrlRef.current !== resolvedUrl && audio.src !== resolvedUrl) {
      const wasPlaying = !audio.paused;
      loadedUrlRef.current = resolvedUrl;
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

  // 4. Synchronize loop mode and ended event
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = Boolean(settings.loop);

    const handleEnded = () => {
      if (!settings.loop && effectivePlaylist.length > 1) {
        // Auto-advance to next track when song finishes
        const currentIndex = effectivePlaylist.findIndex((t) => t.id === currentSelectedTrack?.id);
        const nextIndex = (currentIndex + 1) % effectivePlaylist.length;
        const nextTrackObj = effectivePlaylist[nextIndex];
        if (nextTrackObj) {
          setSelectedTrackId(nextTrackObj.id);
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, nextTrackObj.id);
        }
      }
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [settings.loop, effectivePlaylist, currentSelectedTrack]);

  // 5. Volume & Mute Synchronizer
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

    if (!audio.paused) {
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
  }, [hasTrackSource]);

  // Playlist Navigation: Next Track
  const nextTrack = useCallback(() => {
    if (effectivePlaylist.length === 0) return;
    const currentIndex = effectivePlaylist.findIndex((t) => t.id === currentSelectedTrack?.id);
    const nextIndex = (currentIndex + 1) % effectivePlaylist.length;
    const nextT = effectivePlaylist[nextIndex];
    if (nextT) {
      setSelectedTrackId(nextT.id);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, nextT.id);
      setPreviewingTrackId(null);
    }
  }, [effectivePlaylist, currentSelectedTrack]);

  // Playlist Navigation: Previous Track
  const prevTrack = useCallback(() => {
    if (effectivePlaylist.length === 0) return;
    const currentIndex = effectivePlaylist.findIndex((t) => t.id === currentSelectedTrack?.id);
    const prevIndex = (currentIndex - 1 + effectivePlaylist.length) % effectivePlaylist.length;
    const prevT = effectivePlaylist[prevIndex];
    if (prevT) {
      setSelectedTrackId(prevT.id);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, prevT.id);
      setPreviewingTrackId(null);
    }
  }, [effectivePlaylist, currentSelectedTrack]);

  // Select specific track from playlist
  const selectTrack = useCallback((track: MusicTrack) => {
    setSelectedTrackId(track.id);
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, track.id);
    setPreviewingTrackId(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_PAUSED_KEY);

    const audio = audioRef.current;
    if (audio) {
      const resolvedUrl = track.url.startsWith('http')
        ? track.url
        : window.location.origin + (track.url.startsWith('/') ? track.url : '/' + track.url);

      if (loadedUrlRef.current !== resolvedUrl) {
        loadedUrlRef.current = resolvedUrl;
        audio.src = track.url;
        audio.load();
      }
      audio.play().catch((e) => {
        console.warn('Error playing selected track:', e);
      });
    }
  }, []);

  // Start music when user clicks "ENTER" on Welcome Screen
  const startMusicOnEnter = useCallback(async (): Promise<boolean> => {
    const audio = audioRef.current;
    if (!audio || !hasTrackSource || !settings.enabled) {
      return false;
    }

    const userExplicitlyPaused = localStorage.getItem(LOCAL_STORAGE_USER_PAUSED_KEY) === 'true';
    if (userExplicitlyPaused) {
      return false;
    }

    try {
      const resolvedUrl = currentSrc.startsWith('http')
        ? currentSrc
        : window.location.origin + (currentSrc.startsWith('/') ? currentSrc : '/' + currentSrc);

      if (!audio.src || loadedUrlRef.current !== resolvedUrl) {
        loadedUrlRef.current = resolvedUrl;
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
      setPreviewingTrackId(null);
      if (settings.enabled && currentSrc) {
        const resolvedUrl = currentSrc.startsWith('http')
          ? currentSrc
          : window.location.origin + (currentSrc.startsWith('/') ? currentSrc : '/' + currentSrc);

        if (loadedUrlRef.current !== resolvedUrl) {
          loadedUrlRef.current = resolvedUrl;
          audio.src = currentSrc;
          audio.load();
        }
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
      return;
    }

    setPreviewingTrackId(track.id);
    const resolvedUrl = track.url.startsWith('http')
      ? track.url
      : window.location.origin + (track.url.startsWith('/') ? track.url : '/' + track.url);

    if (loadedUrlRef.current !== resolvedUrl) {
      loadedUrlRef.current = resolvedUrl;
      audio.src = track.url;
      audio.load();
    }
    audio.play().catch((e) => {
      console.warn('Preview play error:', e);
    });
  }, [settings.enabled, currentSrc]);

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        settings,
        tracks: effectivePlaylist,
        activeTrack: currentSelectedTrack,
        hasTrackSource,
        isAutoplayBlocked,
        loadError,
        togglePlay,
        toggleMute,
        setVolume,
        nextTrack,
        prevTrack,
        selectTrack,
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
