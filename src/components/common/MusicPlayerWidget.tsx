import React, { useState } from 'react';
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

export const MusicPlayerWidget: React.FC = () => {
  const {
    isPlaying,
    isMuted,
    volume,
    settings,
    activeTrack,
    hasTrackSource,
    isAutoplayBlocked,
    togglePlay,
    toggleMute,
    setVolume,
  } = useMusic();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // If music master switch is disabled by Admin, don't show the floating player
  if (!settings.enabled) {
    return null;
  }

  const trackTitle =
    activeTrack?.title ||
    settings.activeTrackTitle ||
    (hasTrackSource ? 'Nhạc nền Archive' : 'Chưa có nhạc nền');

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 select-none">
      {/* Autoplay Blocked Friendly Alert */}
      {isAutoplayBlocked && !isPlaying && (
        <div
          onClick={togglePlay}
          className="mb-2 px-3.5 py-2 rounded-2xl bg-[#E8D7F7] border-2 border-white shadow-md text-xs font-semibold text-[#493B55] flex items-center gap-2 cursor-pointer hover:scale-102 active:scale-98 transition-all animate-bounce"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#865B9E]" />
          <span>Bấm để bắt đầu phát nhạc nền</span>
        </div>
      )}

      {/* Main Floating Widget Box */}
      <div
        style={{
          backgroundColor: '#FAF6FC',
          borderTop: '2px solid #FFFFFF',
          borderBottom: '2px solid #FFFFFF',
        }}
        className="rounded-3xl border-x border-[#E8D7F7] shadow-[0_8px_30px_rgba(73,59,85,0.14)] p-2 sm:p-2.5 transition-all duration-300 max-w-xs sm:max-w-sm"
      >
        <div className="flex items-center gap-2.5">
          {/* Play / Pause Main Button */}
          <button
            onClick={togglePlay}
            disabled={!hasTrackSource}
            className={`p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs border border-white ${
              !hasTrackSource
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : isPlaying
                ? 'bg-[#E8D7F7] text-[#493B55] hover:bg-[#DCBFF2] ring-2 ring-white'
                : 'bg-white text-[#493B55] hover:bg-[#FAF6FC] ring-2 ring-white/80'
            }`}
            title={
              !hasTrackSource
                ? 'Chưa có bài nhạc nào được tải lên'
                : isPlaying
                ? 'Tạm dừng nhạc nền'
                : 'Phát nhạc nền'
            }
            aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-current text-[#6D4785]" />
            ) : (
              <Play className="w-4 h-4 fill-current text-[#6D4785] ml-0.5" />
            )}
          </button>

          {/* Track Info (Title & Status) */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="flex-1 min-w-0 pr-1 cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Music
                className={`w-3.5 h-3.5 text-[#865B9E] shrink-0 ${
                  isPlaying ? 'animate-pulse' : 'opacity-60'
                }`}
              />
              <span className="text-xs font-bold text-[#493B55] truncate max-w-[140px] sm:max-w-[170px]">
                {trackTitle}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-[#774D8E]/80">
              <span>{isPlaying ? 'Đang phát' : 'Đã dừng'}</span>
              <span>•</span>
              <span>{Math.round(isMuted ? 0 : volume * 100)}%</span>
            </div>
          </div>

          {/* Expand / Collapse Control */}
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-full hover:bg-white text-[#55445F] transition-colors"
            title="Điều chỉnh âm lượng"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
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

              {/* Volume Slider */}
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

            {!hasTrackSource && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50/70 p-1.5 rounded-xl border border-amber-200/60">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Admin chưa tải bài nhạc nào lên website.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
