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

export type RepeatMode = 'all' | 'one' | 'off';

interface MusicContextType {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0.0 - 1.0
  repeatMode: RepeatMode;
  settings: MusicSettings;
  tracks: MusicTrack[];
  activeTrack: MusicTrack | null;
  hasTrackSource: boolean;
  isAutoplayBlocked: boolean;
  loadError: string | null;
  togglePlay: () => void;
  toggleMute: () => void;
  toggleRepeatMode: () => void;
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
const LOCAL_STORAGE_REPEAT_MODE_KEY = 'pca_music_repeat_mode';

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

  const [repeatMode, setRepeatModeState] = useState<RepeatMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOCAL_STORAGE_REPEAT_MODE_KEY);
      if (saved === 'one' || saved === 'off' || saved === 'all') return saved;
    }
    return 'all'; // Default: continuous playlist loop
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

  // Latest State Refs for stable event handlers without re-subscribing
  const playlistRef = useRef<MusicTrack[]>(effectivePlaylist);
  playlistRef.current = effectivePlaylist;

  const currentSelectedTrackRef = useRef<MusicTrack | null>(currentSelectedTrack);
  currentSelectedTrackRef.current = currentSelectedTrack;

  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  repeatModeRef.current = repeatMode;

  const consecutiveErrorCountRef = useRef<number>(0);

  // 1. Initialize HTMLAudioElement ONCE on mount at the highest app level
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = false; // Disable native single-file loop so ended event triggers continuous playlist next
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    const handlePlay = () => {
      setIsPlaying(true);
      setIsAutoplayBlocked(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handlePlaying = () => {
      setIsPlaying(true);
      setIsAutoplayBlocked(false);
      setLoadError(null);
      consecutiveErrorCountRef.current = 0;
    };

    const handleEnded = () => {
      const playlist = playlistRef.current;
      const currentTrack = currentSelectedTrackRef.current;
      const mode = repeatModeRef.current;
      const audioEl = audioRef.current;

      if (!audioEl) return;

      // Repeat single track mode
      if (mode === 'one') {
        audioEl.currentTime = 0;
        audioEl.play().catch((err) => console.warn('Repeat single track error:', err));
        return;
      }

      if (!playlist || playlist.length === 0) return;

      const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);

      // Stopped mode when reaching end of playlist
      if (mode === 'off' && currentIndex >= playlist.length - 1) {
        setIsPlaying(false);
        return;
      }

      // Continuous Playlist Auto-Next (loops to index 0 if at last track)
      const nextIndex = (currentIndex + 1) % playlist.length;
      const nextTrackObj = playlist[nextIndex];

      if (!nextTrackObj) return;

      if (nextTrackObj.id !== currentTrack?.id) {
        setSelectedTrackId(nextTrackObj.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, nextTrackObj.id);
        }
        setPreviewingTrackId(null);
        setIsPlaying(true);
      } else {
        // Single track in playlist continuous loop
        audioEl.currentTime = 0;
        audioEl.play().catch((err) => console.warn('Playlist loop single track error:', err));
      }
    };

    const handleError = (e: Event) => {
      const playlist = playlistRef.current;
      const currentTrack = currentSelectedTrackRef.current;
      const audioEl = audioRef.current;

      console.warn('Audio element load error for track:', currentTrack?.title, e);

      if (!playlist || playlist.length === 0) {
        setLoadError('URL âm thanh không hợp lệ hoặc không thể truy cập.');
        setIsPlaying(false);
        return;
      }

      consecutiveErrorCountRef.current += 1;

      // Auto-skip to next track if less than total playlist length
      if (consecutiveErrorCountRef.current < playlist.length) {
        setLoadError(`Bài "${currentTrack?.title || 'hát'}" bị lỗi, đang tự động chuyển bài tiếp theo...`);

        const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
        const nextIndex = (currentIndex + 1) % playlist.length;
        const nextTrackObj = playlist[nextIndex];

        if (nextTrackObj && nextTrackObj.id !== currentTrack?.id) {
          setSelectedTrackId(nextTrackObj.id);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, nextTrackObj.id);
          }
          setPreviewingTrackId(null);
          setIsPlaying(true);
        }
      } else {
        // All tracks in playlist failed
        setLoadError('Không thể tải bài hát nào trong playlist. Vui lòng kiểm tra lại liên kết audio.');
        setIsPlaying(false);
        consecutiveErrorCountRef.current = 0;
        if (audioEl) audioEl.pause();
      }
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = '';
    };
  }, []);

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

    // Keep native loop false so ended fires for continuous playlist auto-next
    audio.loop = false;

    // Resolve URL string to full absolute URL for accurate comparison with audio.src
    const resolvedUrl = currentSrc.startsWith('http')
      ? currentSrc
      : window.location.origin + (currentSrc.startsWith('/') ? currentSrc : '/' + currentSrc);

    // CRITICAL: Compare resolved absolute URL against loadedUrlRef to prevent resetting audio currentTime!
    if (loadedUrlRef.current !== resolvedUrl && audio.src !== resolvedUrl) {
      const wasPlaying = !audio.paused || isPlaying;
      loadedUrlRef.current = resolvedUrl;
      audio.src = currentSrc;
      audio.load();

      if (wasPlaying && settings.enabled) {
        audio.play().catch((err) => {
          console.warn('Audio auto-resume note:', err);
          if (err.name === 'NotAllowedError') {
            setIsAutoplayBlocked(true);
          }
        });
      }
    }
  }, [currentSrc, hasTrackSource, settings.enabled, isPlaying]);

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

  // Toggle Repeat Mode ('all' -> 'one' -> 'off' -> 'all')
  const toggleRepeatMode = useCallback(() => {
    setRepeatModeState((prev) => {
      let next: RepeatMode = 'all';
      if (prev === 'all') next = 'one';
      else if (prev === 'one') next = 'off';
      else if (prev === 'off') next = 'all';

      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_REPEAT_MODE_KEY, next);
      }
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
    const playlist = playlistRef.current;
    if (playlist.length === 0) return;
    const currentTrack = currentSelectedTrackRef.current;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    const nextT = playlist[nextIndex];
    if (nextT) {
      setSelectedTrackId(nextT.id);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, nextT.id);
      setPreviewingTrackId(null);
      setIsPlaying(true);
    }
  }, []);

  // Playlist Navigation: Previous Track
  const prevTrack = useCallback(() => {
    const playlist = playlistRef.current;
    if (playlist.length === 0) return;
    const currentTrack = currentSelectedTrackRef.current;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack?.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    const prevT = playlist[prevIndex];
    if (prevT) {
      setSelectedTrackId(prevT.id);
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, prevT.id);
      setPreviewingTrackId(null);
      setIsPlaying(true);
    }
  }, []);

  // Select specific track from playlist
  const selectTrack = useCallback((track: MusicTrack) => {
    setSelectedTrackId(track.id);
    localStorage.setItem(LOCAL_STORAGE_ACTIVE_TRACK_ID_KEY, track.id);
    setPreviewingTrackId(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_PAUSED_KEY);
    setIsPlaying(true);

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
        repeatMode,
        settings,
        tracks: effectivePlaylist,
        activeTrack: currentSelectedTrack,
        hasTrackSource,
        isAutoplayBlocked,
        loadError,
        togglePlay,
        toggleMute,
        toggleRepeatMode,
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

