import React, { useState, useEffect } from 'react';
import {
  Flame,
  Crown,
  Star,
  MessageSquare,
  Eye,
  Sparkles,
  Trophy,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  HotCharacterRanked,
  computeHotRankingList,
  getRankingSettings,
  RankingSettings,
  DEFAULT_RANKING_SETTINGS
} from '../../services/characterRankingStorage';

interface CharacterHotRankingProps {
  characters: Character[];
  onOpenDetails: (character: Character) => void;
  onNavigateToReviews?: () => void;
}

export const CharacterHotRanking: React.FC<CharacterHotRankingProps> = ({
  characters,
  onOpenDetails,
  onNavigateToReviews,
}) => {
  const [rankedList, setRankedList] = useState<HotCharacterRanked[]>([]);
  const [settings, setSettings] = useState<RankingSettings>(DEFAULT_RANKING_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Filter published characters
  const publishedChars = characters.filter((c) => c.status === 'published');

  const loadRanking = async () => {
    setIsLoading(true);
    try {
      const [currentSettings, topList] = await Promise.all([
        getRankingSettings(),
        computeHotRankingList(publishedChars),
      ]);
      setSettings(currentSettings);
      setRankedList(topList);
    } catch (e) {
      console.error('Failed to load hot ranking:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRanking();
  }, [characters]);

  // If disabled by Admin or empty, don't display
  if (!settings.is_ranking_enabled || rankedList.length === 0) {
    return null;
  }

  // Top 1, 2, 3 items
  const top1 = rankedList.find((r) => r.rank === 1);
  const top2 = rankedList.find((r) => r.rank === 2);
  const top3 = rankedList.find((r) => r.rank === 3);

  // Top 4 to 10
  const restList = rankedList.filter((r) => r.rank >= 4 && r.rank <= 10);

  return (
    <section className="relative overflow-hidden pt-8 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Decorative ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-96 bg-gradient-to-r from-[#F6DCE5]/40 via-[#F3E5F5]/50 to-[#E8D7F7]/40 blur-3xl -z-10 rounded-full pointer-events-none" />

      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-[#E9A9BB]/60 text-xs font-bold text-[#865B9E] mb-3 shadow-2xs">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
          <span>BẢNG XẾP HẠNG NHÂN VẬT NỔI BẬT</span>
        </div>

        <h2 className="font-serif-title text-3xl sm:text-4xl md:text-5xl font-bold text-[#51434A] tracking-tight">
          Character Hot Ranking
        </h2>

        <p className="text-xs sm:text-sm text-[#6E5C65] font-light mt-2 max-w-lg mx-auto leading-relaxed">
          Vinh danh những persona được yêu thích nhất dựa trên đánh giá thực tế, điểm sao và mức độ quan tâm từ cộng đồng.
        </p>
      </div>

      {/* PODIUM TRIANGLE: TOP 1, 2, 3 */}
      {top1 && (
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* TOP 2 (Left on Desktop, Elevated rank 2) */}
            {top2 ? (
              <div
                onClick={() => onOpenDetails(top2.character)}
                className="group relative cursor-pointer rounded-3xl p-5 bg-gradient-to-b from-[#F5EEF8] to-[#EAE0F0] border-2 border-[#D8C7E2] shadow-[0_8px_25px_rgba(134,91,158,0.12)] hover:shadow-[0_12px_35px_rgba(134,91,158,0.2)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center order-2 md:order-1"
              >
                {/* Rank Badge #2 */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-slate-400 to-indigo-400 text-white text-[11px] font-black shadow-md border border-white flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>TOP 2</span>
                </div>

                {/* Avatar with Double White Ring */}
                <div className="mt-2 mb-3 p-1 rounded-full bg-white/80 border-2 border-white ring-2 ring-[#D8C7E2] shadow-sm group-hover:scale-105 transition-transform">
                  <img
                    src={top2.character.avatarUrl || top2.character.portraitUrl}
                    alt={top2.character.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                  />
                </div>

                {/* Full Name */}
                <h3 className="font-serif-title font-bold text-base sm:text-lg text-[#51434A] group-hover:text-[#865B9E] transition-colors truncate w-full">
                  {top2.character.fullName || top2.character.name}
                </h3>
                <p className="text-[11px] text-[#7A6973] truncate w-full mt-0.5">
                  {top2.character.category || 'Persona'}
                </p>

                {/* Stats */}
                <div className="w-full mt-3 pt-3 border-t border-white/60 flex items-center justify-around text-xs">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{top2.metrics.average_rating.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-[#8E7A84] block">
                      {top2.metrics.total_reviews} reviews
                    </span>
                  </div>

                  <div className="h-6 w-px bg-white/60" />

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[#865B9E] font-bold">
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{Math.round(top2.metrics.hot_score)}</span>
                    </div>
                    <span className="text-[10px] text-[#8E7A84] block">Hot Score</span>
                  </div>
                </div>
              </div>
            ) : <div className="hidden md:block order-1" />}

            {/* TOP 1 (Center on Desktop, Elevated, Crown & Gold Accent) */}
            <div
              onClick={() => onOpenDetails(top1.character)}
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

              {/* Avatar with Regal Double Gold/White Ring */}
              <div className="mt-1 mb-3.5 p-1.5 rounded-full bg-white border-2 border-white ring-4 ring-[#FFD700]/70 shadow-md group-hover:scale-105 transition-transform">
                <img
                  src={top1.character.avatarUrl || top1.character.portraitUrl}
                  alt={top1.character.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover"
                />
              </div>

              {/* Full Name */}
              <h3 className="font-serif-title font-bold text-lg sm:text-xl text-[#51434A] group-hover:text-amber-800 transition-colors truncate w-full leading-tight">
                {top1.character.fullName || top1.character.name}
              </h3>
              <p className="text-xs text-[#8E7A84] truncate w-full mt-0.5 font-medium">
                {top1.character.category || 'Persona'} • {top1.character.occupation || 'Archive Legend'}
              </p>

              {/* Hot Score & Rating Stats */}
              <div className="w-full mt-4 pt-3.5 border-t border-amber-200/60 flex items-center justify-around text-xs">
                <div>
                  <div className="flex items-center justify-center gap-1 text-amber-600 font-extrabold text-sm sm:text-base">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                    <span>{top1.metrics.average_rating.toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] text-[#8E7A84] block mt-0.5">
                    {top1.metrics.total_reviews} đánh giá
                  </span>
                </div>

                <div className="h-8 w-px bg-amber-200/80" />

                <div>
                  <div className="flex items-center justify-center gap-1 text-amber-600 font-extrabold text-sm sm:text-base">
                    <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span>{Math.round(top1.metrics.hot_score)}</span>
                  </div>
                  <span className="text-[10px] text-[#8E7A84] block mt-0.5 font-semibold">
                    Hot Score 🔥
                  </span>
                </div>
              </div>
            </div>

            {/* TOP 3 (Right on Desktop, Elevated rank 3) */}
            {top3 ? (
              <div
                onClick={() => onOpenDetails(top3.character)}
                className="group relative cursor-pointer rounded-3xl p-5 bg-gradient-to-b from-[#FFF5F7] to-[#FCE4EC] border-2 border-[#F1C0CE] shadow-[0_8px_25px_rgba(216,140,163,0.15)] hover:shadow-[0_12px_35px_rgba(216,140,163,0.25)] hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center order-3"
              >
                {/* Rank Badge #3 */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-rose-400 to-amber-500 text-white text-[11px] font-black shadow-md border border-white flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>TOP 3</span>
                </div>

                {/* Avatar with Double White Ring */}
                <div className="mt-2 mb-3 p-1 rounded-full bg-white/80 border-2 border-white ring-2 ring-[#F1C0CE] shadow-sm group-hover:scale-105 transition-transform">
                  <img
                    src={top3.character.avatarUrl || top3.character.portraitUrl}
                    alt={top3.character.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover"
                  />
                </div>

                {/* Full Name */}
                <h3 className="font-serif-title font-bold text-base sm:text-lg text-[#51434A] group-hover:text-[#D88CA3] transition-colors truncate w-full">
                  {top3.character.fullName || top3.character.name}
                </h3>
                <p className="text-[11px] text-[#7A6973] truncate w-full mt-0.5">
                  {top3.character.category || 'Persona'}
                </p>

                {/* Stats */}
                <div className="w-full mt-3 pt-3 border-t border-white/60 flex items-center justify-around text-xs">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{top3.metrics.average_rating.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-[#8E7A84] block">
                      {top3.metrics.total_reviews} reviews
                    </span>
                  </div>

                  <div className="h-6 w-px bg-white/60" />

                  <div>
                    <div className="flex items-center justify-center gap-1 text-[#D88CA3] font-bold">
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{Math.round(top3.metrics.hot_score)}</span>
                    </div>
                    <span className="text-[10px] text-[#8E7A84] block">Hot Score</span>
                  </div>
                </div>
              </div>
            ) : <div className="hidden md:block order-3" />}
          </div>
        </div>
      )}

      {/* TOP 4 TO TOP 10 VERTICAL ROWS */}
      {restList.length > 0 && (
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-[#F1D4DF] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F1D4DF] flex items-center justify-between">
            <span className="font-serif-title font-semibold text-xs sm:text-sm text-[#51434A] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#865B9E]" />
              <span>Hạng 4 đến Hạng {rankedList.length}</span>
            </span>

            {onNavigateToReviews && (
              <button
                onClick={onNavigateToReviews}
                className="text-xs text-[#865B9E] hover:underline font-semibold flex items-center gap-1"
              >
                <span>Xem tất cả đánh giá</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-[#F1D4DF]/60">
            {restList.map((item) => (
              <div
                key={item.character.id}
                onClick={() => onOpenDetails(item.character)}
                className="group px-4 sm:px-6 py-3.5 hover:bg-[#FAF5FB] transition-colors flex items-center justify-between gap-4 cursor-pointer"
              >
                {/* Left: Rank & Avatar & Full Name */}
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  {/* Rank Number Badge */}
                  <span className="w-7 sm:w-8 h-7 sm:h-8 rounded-xl bg-[#FFF5F7] text-[#865B9E] font-black text-xs sm:text-sm flex items-center justify-center border border-[#F1D4DF] shadow-2xs shrink-0 group-hover:bg-[#E9A9BB] group-hover:text-white transition-colors">
                    #{item.rank}
                  </span>

                  {/* Avatar */}
                  <div className="p-0.5 rounded-full bg-white border border-white ring-2 ring-[#E9A9BB]/40 shadow-2xs shrink-0">
                    <img
                      src={item.character.avatarUrl || item.character.portraitUrl}
                      alt={item.character.name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover"
                    />
                  </div>

                  {/* Full Name & Category */}
                  <div className="min-w-0">
                    <h4 className="font-serif-title font-bold text-xs sm:text-sm text-[#51434A] group-hover:text-[#865B9E] transition-colors truncate">
                      {item.character.fullName || item.character.name}
                    </h4>
                    <p className="text-[11px] text-[#8E7A84] truncate">
                      {item.character.category || 'Persona'} • {item.character.species || item.character.occupation || 'Archive'}
                    </p>
                  </div>
                </div>

                {/* Right: Rating & Hot Score */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
                  {/* Average Rating */}
                  <div>
                    <div className="flex items-center justify-end gap-1 text-amber-500 font-bold text-xs sm:text-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{item.metrics.average_rating.toFixed(1)}</span>
                    </div>
                    <span className="text-[10px] text-[#8E7A84] block">
                      {item.metrics.total_reviews} reviews
                    </span>
                  </div>

                  {/* Hot Score */}
                  <div className="min-w-[70px]">
                    <div className="flex items-center justify-end gap-1 text-[#D88CA3] font-bold text-xs sm:text-sm">
                      <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{Math.round(item.metrics.hot_score)}</span>
                    </div>
                    <span className="text-[10px] text-[#8E7A84] block">Hot Score</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
