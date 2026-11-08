import React, { useState } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Volume1,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  ListMusic,
  Disc
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const MusicPlayerWidget: React.FC = () => {
  const {
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
    nextTrack,
    prevTrack,
    selectTrack,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showPlaylist, setShowPlaylist] = useState<boolean>(false);

  // If music master switch is disabled by Admin, hide player
  if (!settings.enabled) {
    return null;
  }

  const trackTitle =
    activeTrack?.title ||
    settings.activeTrackTitle ||
    (hasTrackSource ? 'Nhạc nền Archive' : 'Chưa có bài hát');

  const trackArtist = activeTrack?.artist || settings.activeTrackArtist || 'Pink Character Archive';
  const coverUrl = activeTrack?.coverUrl || settings.activeTrackCoverUrl || '';

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
      {/* Autoplay Blocked Notification */}
      {isAutoplayBlocked && !isPlaying && (
        <div
          onClick={togglePlay}
          className="mb-2 px-3.5 py-2 rounded-2xl bg-[#E8D7F7] border-2 border-white shadow-md text-xs font-semibold text-[#493B55] flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98 transition-all animate-bounce"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#865B9E]" />
          <span>Bấm để phát nhạc nền</span>
        </div>
      )}

      {/* Playlist Drawer Popup */}
      {showPlaylist && (
        <div className="mb-3 p-4 rounded-3xl bg-[#FAF6FC] border-2 border-white shadow-xl text-xs space-y-3 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200 min-w-[280px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8D7F7]">
            <div className="flex items-center gap-1.5 font-bold text-[#493B55]">
              <ListMusic className="w-4 h-4 text-[#865B9E]" />
              <span>Playlist công khai ({tracks.length})</span>
            </div>
            <button
              onClick={() => setShowPlaylist(false)}
              className="text-[10px] text-[#8E7A84] hover:text-[#493B55] font-semibold"
            >
              Đóng
            </button>
          </div>

          {tracks.length === 0 ? (
            <p className="text-[11px] text-[#8E7A84] italic py-2 text-center">
              Chưa có bài hát công khai nào trong danh sách.
            </p>
          ) : (
            <div className="space-y-1.5">
              {tracks.map((t) => {
                const isSelected = activeTrack?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      selectTrack(t);
                      setShowPlaylist(false);
                    }}
                    className={`p-2 rounded-xl flex items-center gap-2.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#E8D7F7] font-bold text-[#493B55]'
                        : 'bg-white hover:bg-white/80 text-[#55445F]'
                    }`}
                  >
                    {t.coverUrl ? (
                      <img
                        src={t.coverUrl}
                        alt={t.title}
                        className="w-7 h-7 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-[#E5D4F5] flex items-center justify-center shrink-0">
                        <Disc className={`w-4 h-4 text-[#865B9E] ${isSelected && isPlaying ? 'animate-spin' : ''}`} />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{t.title}</p>
                      {t.artist && (
                        <p className="text-[10px] text-[#8E7A84] truncate">{t.artist}</p>
                      )}
                    </div>

                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-[#865B9E] shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Floating Widget Card */}
      <div
        style={{
          backgroundColor: '#FAF6FC',
          borderTop: '2px solid #FFFFFF',
          borderBottom: '2px solid #FFFFFF',
        }}
        className="rounded-3xl border-x border-[#E8D7F7] shadow-[0_8px_30px_rgba(73,59,85,0.14)] p-2 sm:p-2.5 transition-all duration-300 max-w-xs sm:max-w-sm"
      >
        <div className="flex items-center gap-2.5">
          {/* Cover Art / Disc Icon */}
          <div
            onClick={() => setShowPlaylist((prev) => !prev)}
            className="relative cursor-pointer shrink-0"
            title="Mở danh sách bài hát"
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={trackTitle}
                className={`w-10 h-10 rounded-2xl object-cover border border-white shadow-2xs ${
                  isPlaying ? 'ring-2 ring-[#865B9E]/50' : ''
                }`}
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-[#E8D7F7] flex items-center justify-center border border-white text-[#865B9E] shadow-2xs">
                <Disc className={`w-5 h-5 ${isPlaying ? 'animate-spin' : ''}`} />
              </div>
            )}
          </div>

          {/* Track Info (Title & Artist) */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex-1 min-w-0 pr-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#493B55] truncate max-w-[130px] sm:max-w-[160px]">
                {trackTitle}
              </span>
            </div>

            <p className="text-[10px] text-[#774D8E]/80 truncate max-w-[130px] sm:max-w-[160px]">
              {trackArtist}
            </p>
          </div>

          {/* Control Buttons: Prev, Play/Pause, Next */}
          <div className="flex items-center gap-1">
            {tracks.length > 1 && (
              <button
                onClick={prevTrack}
                className="p-1.5 rounded-full hover:bg-white text-[#55445F] transition-colors"
                title="Bài trước"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={togglePlay}
              disabled={!hasTrackSource}
              className={`p-2.5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs border border-white ${
                !hasTrackSource
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isPlaying
                  ? 'bg-[#E8D7F7] text-[#493B55] hover:bg-[#DCBFF2] ring-2 ring-white'
                  : 'bg-white text-[#493B55] hover:bg-[#FAF6FC] ring-2 ring-white/80'
              }`}
              title={isPlaying ? 'Tạm dừng' : 'Phát nhạc'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current text-[#6D4785]" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current text-[#6D4785] ml-0.5" />
              )}
            </button>

            {tracks.length > 1 && (
              <button
                onClick={nextTrack}
                className="p-1.5 rounded-full hover:bg-white text-[#55445F] transition-colors"
                title="Bài tiếp theo"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setShowPlaylist((prev) => !prev)}
              className="p-1.5 rounded-full hover:bg-white text-[#55445F] transition-colors"
              title="Danh sách phát"
            >
              <ListMusic className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1 rounded-full hover:bg-white text-[#55445F] transition-colors ml-0.5"
              title="Điều chỉnh âm lượng"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Volume Slider & Controls */}
        {isExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-white/80 px-1 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <button
                onClick={toggleMute}
                className="p-1 rounded-full text-[#55445F] hover:text-[#493B55] hover:bg-white transition-colors"
                title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-500" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4 text-[#865B9E]" />
                ) : (
                  <Volume2 className="w-4 h-4 text-[#865B9E]" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-[#E8D7F7] rounded-lg appearance-none cursor-pointer accent-[#865B9E]"
                title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
              />

              <span className="text-[10px] font-mono font-medium text-[#55445F] w-7 text-right">
                {Math.round(isMuted ? 0 : volume * 100)}%
              </span>
            </div>

            {loadError && (
              <div className="flex items-center gap-1.5 text-[10px] text-rose-700 bg-rose-50/80 p-1.5 rounded-xl border border-rose-200/60">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{loadError}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
