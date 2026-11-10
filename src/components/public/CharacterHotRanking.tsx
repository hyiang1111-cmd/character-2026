import React, { useState, useEffect } from 'react';
import {
  Flame,
  Crown,
  Heart,
  MessageSquare,
  Sparkles,
  Trophy,
  Award,
  TrendingUp
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  getAllFavoriteCounts,
  getUserFavorites,
  toggleCharacterFavorite,
  computeFavoriteRankingList,
  FavoriteRankedCharacter,
} from '../../services/characterFavoritesStorage';
import { useCommunity } from '../../context/CommunityContext';

interface CharacterHotRankingProps {
  characters: Character[];
  onOpenDetails: (character: Character) => void;
  onOpenAuth?: (mode?: 'login' | 'register') => void;
}

export const CharacterHotRanking: React.FC<CharacterHotRankingProps> = ({
  characters,
  onOpenDetails,
  onOpenAuth,
}) => {
  const { member } = useCommunity();
  const [rankedList, setRankedList] = useState<FavoriteRankedCharacter[]>([]);
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  const [userFavList, setUserFavList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Published characters only
  const publishedChars = characters.filter((c) => c.status === 'published');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [counts, userFavs] = await Promise.all([
        getAllFavoriteCounts(),
        getUserFavorites(member?.id),
      ]);
      setFavoriteCounts(counts);
      setUserFavList(userFavs);

      const topList = computeFavoriteRankingList(publishedChars, counts);
      setRankedList(topList);
    } catch (e) {
      console.error('Failed to load favorite ranking:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleFavoritesUpdated = () => {
      loadData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pca_favorites_updated', handleFavoritesUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pca_favorites_updated', handleFavoritesUpdated);
      }
    };
  }, [characters, member?.id]);

  const handleToggleFav = async (char: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!member) {
      onOpenAuth?.('login');
      return;
    }
    try {
      await toggleCharacterFavorite(char.id, member.id);
    } catch (err: any) {
      alert(err?.message || 'Không thể cập nhật yêu thích.');
    }
  };

  if (publishedChars.length === 0 || rankedList.length === 0) {
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
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-96 bg-gradient-to-r from-[#F6DCE5]/40 via-[#F3E5F5]/50 to-[#E8D7F7]/40 blur-3xl -z-10 rounded-full pointer-events-none" />

      {/* Section Header */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 border border-[#E9A9BB]/60 text-xs font-bold text-[#865B9E] mb-3 shadow-2xs">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500 animate-pulse" />
          <span>BẢNG XẾP HẠNG NHÂN VẬT ĐƯỢC YÊU THÍCH NHẤT</span>
        </div>

        <h2 className="font-serif-title text-3xl sm:text-4xl md:text-5xl font-bold text-[#51434A] tracking-tight">
          Most Loved Characters
        </h2>

        <p className="text-xs sm:text-sm text-[#6E5C65] font-light mt-2 max-w-lg mx-auto leading-relaxed">
          Vinh danh những persona nhận được nhiều lượt yêu thích ❤️ nhất từ cộng đồng người dùng Character Archive.
        </p>
      </div>

      {/* PODIUM TRIANGLE: TOP 1 CENTER, TOP 2 LEFT, TOP 3 RIGHT */}
      {top1 && (
        <div className="max-w-4xl mx-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* TOP 2 (Left on Desktop) */}
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

                {/* Avatar */}
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

                {/* Favorite Heart Button & Count */}
                <div className="w-full mt-3 pt-3 border-t border-white/60 flex items-center justify-between text-xs px-2">
                  <span className="text-[11px] text-[#8E7A84] font-medium">Lượt yêu thích:</span>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFav(top2.character, e)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all shadow-2xs ${
                      userFavList.includes(top2.character.id)
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-white border-white text-[#493B55] hover:text-rose-500'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        userFavList.includes(top2.character.id)
                          ? 'fill-rose-500 text-rose-500'
                          : 'text-[#865B9E]'
                      }`}
                    />
                    <span>{top2.totalFavorites}</span>
                  </button>
                </div>
              </div>
            ) : <div className="hidden md:block order-1" />}

            {/* TOP 1 (Center on Desktop, Crown & Gold Accent) */}
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

              {/* Avatar */}
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

              {/* Favorite Heart Button & Count */}
              <div className="w-full mt-4 pt-3.5 border-t border-amber-200/60 flex items-center justify-between text-xs px-2">
                <span className="text-xs text-[#8E7A84] font-bold">Yêu thích nhất:</span>
                <button
                  type="button"
                  onClick={(e) => handleToggleFav(top1.character, e)}
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all shadow-sm ${
                    userFavList.includes(top1.character.id)
                      ? 'bg-rose-50 border-rose-300 text-rose-600'
                      : 'bg-white border-amber-300 text-amber-800 hover:text-rose-500'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      userFavList.includes(top1.character.id)
                        ? 'fill-rose-500 text-rose-500 scale-110'
                        : 'text-amber-500'
                    }`}
                  />
                  <span className="text-sm">{top1.totalFavorites} ❤️</span>
                </button>
              </div>
            </div>

            {/* TOP 3 (Right on Desktop) */}
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

                {/* Avatar */}
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

                {/* Favorite Heart Button & Count */}
                <div className="w-full mt-3 pt-3 border-t border-white/60 flex items-center justify-between text-xs px-2">
                  <span className="text-[11px] text-[#8E7A84] font-medium">Lượt yêu thích:</span>
                  <button
                    type="button"
                    onClick={(e) => handleToggleFav(top3.character, e)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all shadow-2xs ${
                      userFavList.includes(top3.character.id)
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-white border-white text-[#493B55] hover:text-rose-500'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        userFavList.includes(top3.character.id)
                          ? 'fill-rose-500 text-rose-500'
                          : 'text-[#D88CA3]'
                      }`}
                    />
                    <span>{top3.totalFavorites}</span>
                  </button>
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
                  <span className="w-7 sm:w-8 h-7 sm:h-8 rounded-xl bg-[#FFF5F7] text-[#865B9E] font-black text-xs sm:text-sm flex items-center justify-center border border-[#F1D4DF] shadow-2xs shrink-0 group-hover:bg-[#E9A9BB] group-hover:text-white transition-colors">
                    #{item.rank}
                  </span>

                  <div className="p-0.5 rounded-full bg-white border border-white ring-2 ring-[#E9A9BB]/40 shadow-2xs shrink-0">
                    <img
                      src={item.character.avatarUrl || item.character.portraitUrl}
                      alt={item.character.name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <h4 className="font-serif-title font-bold text-xs sm:text-sm text-[#51434A] group-hover:text-[#865B9E] transition-colors truncate">
                      {item.character.fullName || item.character.name}
                    </h4>
                    <p className="text-[11px] text-[#8E7A84] truncate">
                      {item.character.category || 'Persona'} • {item.character.species || item.character.occupation || 'Archive'}
                    </p>
                  </div>
                </div>

                {/* Right: Favorite Button & Total Favorites */}
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleToggleFav(item.character, e)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all shadow-2xs ${
                      userFavList.includes(item.character.id)
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-white border-[#F1D4DF] text-[#51434A] hover:border-rose-200 hover:text-rose-500'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        userFavList.includes(item.character.id)
                          ? 'fill-rose-500 text-rose-500'
                          : 'text-[#865B9E]'
                      }`}
                    />
                    <span>{item.totalFavorites}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
