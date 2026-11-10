import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown,
  Search,
  ExternalLink,
  Trophy,
  MessageSquare,
  Sparkles,
  Award
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  getCuratedRanking,
  subscribeToCuratedRanking,
  computeCuratedRankingList,
  CuratedRanking,
  CuratedRankedCharacter
} from '../../services/curatedRankingStorage';

interface CharacterReviewsPageProps {
  characters: Character[];
  initialCharacterId?: string;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenCharacterDetails?: (character: Character) => void;
  onStartChat?: (character: Character) => void;
}

export const CharacterReviewsPage: React.FC<CharacterReviewsPageProps> = ({
  characters,
  initialCharacterId,
  onOpenAuth,
  onOpenCharacterDetails,
  onStartChat,
}) => {
  // Published characters only
  const publishedChars = useMemo(() => characters.filter((c) => c.status === 'published'), [characters]);

  // Selected character state for details preview
  const [selectedCharId, setSelectedCharId] = useState<string>(
    initialCharacterId || (publishedChars[0]?.id || '')
  );
  const [charSearchQuery, setCharSearchQuery] = useState('');

  // Curated ranking state
  const [curatedRanking, setCuratedRanking] = useState<CuratedRanking>({ top1_id: null, top2_id: null, top3_id: null });
  const [isLoading, setIsLoading] = useState(false);

  // Selected character object
  const selectedChar = useMemo(
    () => publishedChars.find((c) => c.id === selectedCharId) || publishedChars[0],
    [publishedChars, selectedCharId]
  );

  // Filtered character list for picker
  const filteredChars = useMemo(() => {
    if (!charSearchQuery.trim()) return publishedChars;
    const q = charSearchQuery.toLowerCase().trim();
    return publishedChars.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.nickname && c.nickname.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q)) ||
        (Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().includes(q)))
    );
  }, [publishedChars, charSearchQuery]);

  // Compute curated leaderboard list
  const rankings = useMemo(() => {
    return computeCuratedRankingList(publishedChars, curatedRanking);
  }, [publishedChars, curatedRanking]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getCuratedRanking();
      setCuratedRanking(data);
    } catch (e) {
      console.error('Failed to load curated ranking data:', e);
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

    const handleCuratedUpdated = () => {
      loadData();
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

  const getRankBadge = (rank: number | null) => {
    if (rank === 1) return { label: 'TOP 1', color: 'bg-amber-400 text-white shadow-2xs' };
    if (rank === 2) return { label: 'TOP 2', color: 'bg-[#9C9C9C] text-white shadow-2xs' };
    if (rank === 3) return { label: 'TOP 3', color: 'bg-[#C58047] text-white shadow-2xs' };
    return null;
  };

  const selectedCharRank = rankings.find(r => r.character.id === selectedChar?.id)?.rank || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-amber-200 shadow-xs text-xs font-semibold text-amber-800 mb-3">
          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
          <span>Bảng Xếp Hạng Nhân Vật Nổi Bật 👑</span>
        </div>
        <h1 className="font-serif-title text-4xl sm:text-5xl font-medium text-[#51434A] mb-3">
          TOP 3 Nhân Vật Đề Xuất
        </h1>
        <p className="text-sm text-[#6E5C65] font-light">
          Bảng xếp hạng được tuyển chọn dành riêng cho các nhân vật xuất sắc nhất trong hệ thống Character Archive.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CHARACTER PICKER & LIST (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#F1D4DF] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1D4DF]/70">
            <span className="font-serif-title font-semibold text-sm text-[#51434A]">
              Danh sách nhân vật ({filteredChars.length})
            </span>
            <span className="text-[11px] text-[#8E7A84]">Tìm kiếm</span>
          </div>

          {/* Search Character Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={charSearchQuery}
              onChange={(e) => setCharSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, tag, thể loại..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] placeholder-[#8E7A84] focus:outline-none focus:border-[#E9A9BB]"
            />
          </div>

          {/* Characters Scroll List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredChars.map((char) => {
              const isSelected = selectedChar?.id === char.id;
              const rank = rankings.find(r => r.character.id === char.id)?.rank || null;
              const badge = getRankBadge(rank);

              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-amber-50 to-pink-50 border-2 border-amber-300 shadow-xs'
                      : 'bg-white hover:bg-[#FFF5F7] border border-[#F1D4DF]/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={char.avatarUrl || char.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100'}
                      alt={char.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-2xs shrink-0"
                    />
                    <div className="min-w-0">
                      <p className={`font-serif-title font-bold text-xs truncate ${isSelected ? 'text-amber-900' : 'text-[#51434A]'}`}>
                        {char.name}
                      </p>
                      <p className="text-[10px] text-[#8E7A84] truncate">
                        {char.category || 'General'}
                      </p>
                    </div>
                  </div>

                  {badge ? (
                    <div className={`px-2.5 py-1 rounded-full text-[11px] font-black shrink-0 ${badge.color}`}>
                      {badge.label}
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 rounded-full bg-gray-50 border border-gray-100">
                      Member
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED CHARACTER & TOP 3 LEADERBOARD (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Selected Character Hero Banner */}
          {selectedChar && (
            <div className="bg-gradient-to-br from-white via-amber-50/20 to-[#FFF5F7] rounded-3xl border border-[#F1D4DF] p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-5 border-b border-[#F1D4DF]">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedChar.avatarUrl || selectedChar.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150'}
                    alt={selectedChar.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-amber-300 shrink-0"
                  />
                  <div>
                    {selectedCharRank ? (
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1 mb-0.5">
                        <Crown className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        Xếp Hạng TOP {selectedCharRank}
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E7A84] block mb-0.5">
                        Hồ sơ nhân vật
                      </span>
                    )}
                    <h2 className="font-serif-title text-2xl font-bold text-[#51434A]">
                      {selectedChar.fullName || selectedChar.name}
                    </h2>
                    <p className="text-xs text-[#8E7A84] mt-0.5 line-clamp-1">
                      {selectedChar.occupation || selectedChar.category || 'Persona Archive'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {onOpenCharacterDetails && (
                    <button
                      onClick={() => onOpenCharacterDetails(selectedChar)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#F1D4DF] text-xs font-semibold text-[#865B9E] hover:bg-[#FFF5F7] transition-colors cursor-pointer"
                    >
                      <span>Xem hồ sơ</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {onStartChat && (
                    <button
                      onClick={() => onStartChat(selectedChar)}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:brightness-105 transition-all shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Chat ngay</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Character Summary lore */}
              <div className="pt-4 text-xs text-[#51434A] leading-relaxed">
                <p className="line-clamp-3 italic text-[#6E5C65]">
                  "{selectedChar.shortDescription || selectedChar.personality || selectedChar.background || 'Nhân vật tuyệt vời được lưu trữ trong Pink Character Archive.'}"
                </p>
              </div>
            </div>
          )}

          {/* CURATED TOP 3 LEADERBOARD */}
          <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1D4DF]">
              <h3 className="font-serif-title font-bold text-base text-[#51434A] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Bảng Xếp Hạng TOP 3 Nhân Vật Đề Xuất</span>
              </h3>
              <span className="text-xs text-[#8E7A84]">Tuyển chọn bởi Ban Quản Trị</span>
            </div>

            {rankings.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8E7A84]">Chưa chọn nhân vật cho Top 3.</div>
            ) : (
              <div className="space-y-3">
                {rankings.map((item) => {
                  const badge = getRankBadge(item.rank);

                  return (
                    <div
                      key={item.character.id}
                      onClick={() => setSelectedCharId(item.character.id)}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                        item.rank === 1
                          ? 'bg-gradient-to-r from-[#FFFDF0] to-[#FFF9E6] border-amber-300 shadow-xs'
                          : item.rank === 2
                          ? 'bg-gradient-to-r from-[#F5F5F7] to-[#EAEAEA] border-gray-300'
                          : 'bg-gradient-to-r from-[#FFF5F0] to-[#FCEBE4] border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <span className={`w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${badge?.color}`}>
                          #{item.rank}
                        </span>

                        <img
                          src={item.character.avatarUrl || item.character.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                          alt={item.character.name}
                          className="w-11 h-11 rounded-full object-cover border border-white shadow-2xs shrink-0"
                        />

                        <div className="min-w-0">
                          <h4 className="font-serif-title font-bold text-xs sm:text-sm text-[#51434A] truncate">
                            {item.character.fullName || item.character.name}
                          </h4>
                          <p className="text-[10px] text-[#8E7A84] truncate">
                            {item.character.category || 'General'}
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-[#F1D4DF] text-[#51434A] text-xs font-bold shadow-2xs shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Featured</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

