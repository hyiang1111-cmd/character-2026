import React, { useState } from 'react';
import { Sparkles, ArrowRight, BookOpen, Music, Heart } from 'lucide-react';
import { useMusic } from '../../context/MusicContext';

interface WelcomeScreenProps {
  onEnter: () => void;
  siteName?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onEnter,
  siteName = 'Pink Character Archive',
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const { startMusicOnEnter, settings } = useMusic();

  const handleEnterClick = async () => {
    setIsExiting(true);

    // Start background music seamlessly on user gesture
    if (settings.enabled) {
      await startMusicOnEnter().catch((err) => {
        console.warn('Could not auto-start audio on enter:', err);
      });
    }

    // Persist enter flag for current session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('pca_welcome_entered', 'true');
    }

    // Allow graceful fade-out transition to complete
    setTimeout(() => {
      onEnter();
    }, 650);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden transition-all duration-700 ease-out select-none ${
        isExiting
          ? 'opacity-0 scale-95 pointer-events-none'
          : 'opacity-100 scale-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #FFF5F7 0%, #E8D7F7 45%, #E6C5FF 85%, #F4E4FC 100%)',
      }}
    >
      {/* Delicate floating background ambient orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-white/40 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-[#E5D4F5]/60 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/30 blur-2xl pointer-events-none" />

      {/* Center Welcome Card */}
      <div className="relative max-w-lg w-full text-center px-6 py-12 sm:py-16 rounded-3xl bg-white/40 backdrop-blur-md border-2 border-white/80 shadow-[0_12px_45px_rgba(119,77,142,0.12)] space-y-6 animate-in fade-in zoom-in-95 duration-700">
        {/* Decorative Top Crest with Double White Border */}
        <div className="flex justify-center">
          <div className="relative p-1 rounded-full bg-white/70 border-2 border-white ring-4 ring-white/60 ring-offset-2 ring-offset-[#E8D7F7] shadow-sm">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[#E8D7F7] to-[#E6C5FF] flex items-center justify-center shadow-inner">
              <BookOpen className="w-8 h-8 sm:w-9 sm:h-9 text-[#6D4785]" />
            </div>
            {/* Subtle floating sparkle badge */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-xs border border-white">
              <Sparkles className="w-3.5 h-3.5 text-[#A568C9]" />
            </div>
          </div>
        </div>

        {/* Website Label & Main Title */}
        <div className="space-y-2">
          <span className="text-[11px] sm:text-xs font-semibold tracking-[0.3em] uppercase text-[#774D8E] block">
            {siteName}
          </span>
          <h1 className="font-serif-title text-4xl sm:text-5xl font-bold text-[#493B55] tracking-tight">
            Character Archive
          </h1>

          {/* Delicate double horizontal hairline */}
          <div className="flex items-center justify-center gap-2 pt-1 pb-1">
            <div className="w-12 sm:w-16 h-[1.5px] bg-white/80 rounded-full" />
            <Sparkles className="w-3 h-3 text-[#774D8E]/70" />
            <div className="w-12 sm:w-16 h-[1.5px] bg-white/80 rounded-full" />
          </div>

          <p className="font-serif italic text-sm sm:text-base text-[#55445F]/90 max-w-sm mx-auto leading-relaxed">
            “A little world of stories and characters.”
          </p>
          <p className="text-xs text-[#774D8E]/75 font-light">
            Một thế giới nhỏ của những câu chuyện và nhân vật chờ đón bạn.
          </p>
        </div>

        {/* Enter Button */}
        <div className="pt-4 flex flex-col items-center gap-3">
          <button
            onClick={handleEnterClick}
            className="group relative inline-flex items-center justify-center gap-2.5 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full bg-white/95 hover:bg-white text-[#493B55] font-bold text-xs sm:text-sm tracking-wider uppercase border-2 border-white shadow-[0_8px_30px_rgba(119,77,142,0.18)] hover:shadow-[0_12px_40px_rgba(119,77,142,0.28)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <span>Khám phá thư viện</span>
            <ArrowRight className="w-4 h-4 text-[#774D8E] transition-transform duration-300 group-hover:translate-x-1" />
          </button>

          {/* Gentle Music Notice */}
          {settings.enabled && (
            <div className="inline-flex items-center gap-1.5 text-[11px] text-[#774D8E]/70 pt-1">
              <Music className="w-3 h-3 text-[#A568C9]" />
              <span>Âm nhạc nền dịu dàng sẽ phát khi bạn bước vào</span>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-[10px] text-[#774D8E]/60 flex items-center justify-center gap-1">
          <span>Curated with</span>
          <Heart className="w-2.5 h-2.5 fill-[#D88CA3] text-[#D88CA3]" />
          <span>Pastel Lavender Archive</span>
        </div>
      </div>
    </div>
  );
};
