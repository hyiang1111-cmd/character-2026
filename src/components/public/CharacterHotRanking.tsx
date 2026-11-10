import React, { useState, useEffect } from 'react';
import {
  Crown,
  Sparkles,
  Award,
  MessageSquare,
  User
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  getCuratedRanking,
  subscribeToCuratedRanking,
  computeCuratedRankingList,
  CuratedRanking,
  DEFAULT_CURATED_RANKING
} from '../../services/curatedRankingStorage';

interface CharacterHotRankingProps {
  characters: Character[];
  onOpenDetails: (character: Character) => void;
  onStartChat?: (character: Character) => void;
}

export const CharacterHotRanking: React.FC<CharacterHotRankingProps> = ({
  characters,
  onOpenDetails,
  onStartChat,
}) => {
  const [curatedRanking, setCuratedRanking] = useState<CuratedRanking>(DEFAULT_CURATED_RANKING);
  const [isLoading, setIsLoading] = useState(true);

  // Filter published characters only
  const publishedChars = characters.filter((c) => c.status === 'published');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const ranking = await getCuratedRanking();
      setCuratedRanking(ranking);
    } catch (e) {
      console.warn('Failed to load curated ranking:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Realtime Cloud Firestore subscription for all users across the world
    const unsubscribe = subscribeToCuratedRanking((latestRanking) => {
      setCuratedRanking(latestRanking);
      setIsLoading(false);
    });

    const handleCuratedUpdated = (e: any) => {
      if (e?.detail?.ranking) {
        setCuratedRanking(e.detail.ranking);
      } else {
        loadData();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pca_curated_ranking_updated', handleCuratedUpdated);
    }
    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('pca_curated_ranking_updated', handleCuratedUpdated);
      }
    };
  }, [characters]);

  // Map IDs to actual character objects
  const rankedItems = computeCuratedRankingList(publishedChars, curatedRanking);

  // If no characters are assigned to any position in Top 3, hide the podium section
  if (publishedChars.length === 0 || rankedItems.length === 0) {
    return null;
  }

  // Find individual Top 1, Top 2, Top 3 objects
  const top1 = rankedItems.find((r) => r.rank === 1)?.character || null;
  const top2 = rankedItems.find((r) => r.rank === 2)?.character || null;
  const top3 = rankedItems.find((r) => r.rank === 3)?.character || null;

  return (
    <section className="relative overflow-hidden pt-8 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-96 bg-gradient-to-r from-amber-100/40 via-[#F3E5F5]/50 to-purple-100/40 blur-3xl -z-10 rounded-full pointer-events-none" />

      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-pink-500/10 border border-amber-300/60 text-xs font-bold text-[#774D8E] mb-3 shadow-2xs">
          <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
          <span>BẢNG XẾP HẠNG NHÂN VẬT NỔI BẬT</span>
        </div>

        <h2 className="font-serif-title text-3xl sm:text-4xl md:text-5xl font-bold text-[#51434A] tracking-tight">
          Top Personas
        </h2>

        <p className="text-xs sm:text-sm text-[#6E5C65] font-light mt-2 max-w-lg mx-auto leading-relaxed">
          Những gương mặt tiêu biểu nổi bật nhất được tuyển chọn trong thế giới Character Archive.
        </p>
      </div>

      {/* PODIUM TRIANGLE: TOP 1 CENTER, TOP 2 LEFT, TOP 3 RIGHT */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end justify-center">
          {/* TOP 2 (Left on Desktop) - Only rendered if assigned */}
          {top2 ? (
            <div
              onClick={() => onOpenDetails(top2)}
              className="group relative cursor-pointer rounded-3xl p-5 bg-gradient-to-b from-[#F5EEF8] to-[#EAE0F0] border-2 border-[#D8C7E2] shadow-[0_8px_25px_rgba(134,91,158,0.12)] hover:shadow-[0_12px_35px_rgba(134,91,158,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center order-2 md:order-1"
            >
              {/* Rank Badge #2 */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-slate-500 to-indigo-500 text-white text-[11px] font-black shadow-md border border-white flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>TOP 2</span>
              </div>

              {/* Avatar */}
              <div className="mt-3 mb-3 p-1 rounded-full bg-white/80 border-2 border-white ring-2 ring-[#D8C7E2] shadow-sm group-hover:scale-105 transition-transform">
                <img
                  src={top2.avatarUrl || top2.portraitUrl}
                  alt={top2.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                />
              </div>

              {/* Full Name */}
              <h3 className="font-serif-title font-bold text-base sm:text-lg text-[#51434A] group-hover:text-[#865B9E] transition-colors truncate w-full">
                {top2.fullName || top2.name}
              </h3>
              <p className="text-[11px] text-[#7A6973] truncate w-full mt-0.5 font-medium">
                {top2.category || 'Persona'} • {top2.occupation || top2.species || 'Archive'}
              </p>

              {/* Action Buttons */}
              <div className="w-full mt-4 pt-3 border-t border-white/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetails(top2);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-white/90 text-[#493B55] text-xs font-semibold hover:bg-white transition-all shadow-2xs"
                >
                  <User className="w-3.5 h-3.5 text-[#865B9E]" />
                  <span>Hồ sơ</span>
                </button>
                {onStartChat && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartChat(top2);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-[#865B9E] text-white text-xs font-semibold hover:bg-[#774D8E] transition-all shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:block order-1" />
          )}

          {/* TOP 1 (Center on Desktop, Crown & Gold Accent) - Only rendered if assigned */}
          {top1 ? (
            <div
              onClick={() => onOpenDetails(top1)}
              className="group relative cursor-pointer rounded-3xl p-6 sm:p-7 bg-gradient-to-b from-[#FFFDF0] via-[#FFF9E6] to-[#FFEFC2] border-2 border-[#FFD700] shadow-[0_12px_35px_rgba(255,215,0,0.28)] hover:shadow-[0_18px_45px_rgba(255,215,0,0.38)] hover:-translate-y-2 transition-all duration-300 flex flex-col items-center text-center order-1 md:order-2 z-10 scale-105"
            >
              {/* Crown Floating Icon */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-white flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-amber-400/50 animate-bounce">
                <Crown className="w-6 h-6 fill-white text-white drop-shadow-sm" />
              </div>

              {/* Rank Badge #1 */}
              <div className="mt-2 mb-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-black shadow-md border-2 border-white flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
                <span>QUÁN QUÂN • TOP 1</span>
              </div>

              {/* Avatar */}
              <div className="mt-1 mb-3.5 p-1.5 rounded-full bg-white border-2 border-white ring-4 ring-[#FFD700]/70 shadow-md group-hover:scale-105 transition-transform">
                <img
                  src={top1.avatarUrl || top1.portraitUrl}
                  alt={top1.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
                />
              </div>

              {/* Full Name */}
              <h3 className="font-serif-title font-bold text-lg sm:text-xl text-[#51434A] group-hover:text-amber-800 transition-colors truncate w-full leading-tight">
                {top1.fullName || top1.name}
              </h3>
              <p className="text-xs text-[#8E7A84] truncate w-full mt-0.5 font-medium">
                {top1.category || 'Persona'} • {top1.occupation || 'Archive Legend'}
              </p>

              {/* Action Buttons */}
              <div className="w-full mt-4 pt-3.5 border-t border-amber-200/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetails(top1);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-amber-900 text-xs font-bold hover:bg-amber-50 transition-all shadow-xs"
                >
                  <User className="w-3.5 h-3.5 text-amber-600" />
                  <span>Xem hồ sơ</span>
                </button>
                {onStartChat && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartChat(top1);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold hover:brightness-105 transition-all shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat ngay</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:block order-2" />
          )}

          {/* TOP 3 (Right on Desktop) - Only rendered if assigned */}
          {top3 ? (
            <div
              onClick={() => onOpenDetails(top3)}
              className="group relative cursor-pointer rounded-3xl p-5 bg-gradient-to-b from-[#FFF5F7] to-[#FCE4EC] border-2 border-[#F1C0CE] shadow-[0_8px_25px_rgba(216,140,163,0.15)] hover:shadow-[0_12px_35px_rgba(216,140,163,0.25)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center order-3"
            >
              {/* Rank Badge #3 */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-600 text-white text-[11px] font-black shadow-md border border-white flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>TOP 3</span>
              </div>

              {/* Avatar */}
              <div className="mt-3 mb-3 p-1 rounded-full bg-white/80 border-2 border-white ring-2 ring-[#F1C0CE] shadow-sm group-hover:scale-105 transition-transform">
                <img
                  src={top3.avatarUrl || top3.portraitUrl}
                  alt={top3.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                />
              </div>

              {/* Full Name */}
              <h3 className="font-serif-title font-bold text-base sm:text-lg text-[#51434A] group-hover:text-[#D88CA3] transition-colors truncate w-full">
                {top3.fullName || top3.name}
              </h3>
              <p className="text-[11px] text-[#7A6973] truncate w-full mt-0.5 font-medium">
                {top3.category || 'Persona'} • {top3.occupation || top3.species || 'Archive'}
              </p>

              {/* Action Buttons */}
              <div className="w-full mt-4 pt-3 border-t border-white/60 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetails(top3);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-white/90 text-[#493B55] text-xs font-semibold hover:bg-white transition-all shadow-2xs"
                >
                  <User className="w-3.5 h-3.5 text-[#D88CA3]" />
                  <span>Hồ sơ</span>
                </button>
                {onStartChat && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartChat(top3);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-[#D88CA3] text-white text-xs font-semibold hover:bg-[#C2788F] transition-all shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="hidden md:block order-3" />
          )}
        </div>
      </div>
    </section>
  );
};
