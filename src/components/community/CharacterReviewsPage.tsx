import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Search,
  Sparkles,
  User,
  ChevronRight,
  ExternalLink,
  Award,
  Crown,
  Trophy,
  CheckCircle2
} from 'lucide-react';
import { Character } from '../../types/character';
import { useCommunity } from '../../context/CommunityContext';
import {
  getAllFavoriteCounts,
  getUserFavorites,
  toggleCharacterFavorite,
  computeFavoriteRankingList,
  FavoriteRankedCharacter,
} from '../../services/characterFavoritesStorage';

interface CharacterReviewsPageProps {
  characters: Character[];
  initialCharacterId?: string;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenCharacterDetails?: (character: Character) => void;
}

export const CharacterReviewsPage: React.FC<CharacterReviewsPageProps> = ({
  characters,
  initialCharacterId,
  onOpenAuth,
  onOpenCharacterDetails,
}) => {
  const { member } = useCommunity();

  // Published characters only
  const publishedChars = useMemo(() => characters.filter((c) => c.status === 'published'), [characters]);

  // Selected character state for details preview
  const [selectedCharId, setSelectedCharId] = useState<string>(
    initialCharacterId || (publishedChars[0]?.id || '')
  );
  const [charSearchQuery, setCharSearchQuery] = useState('');

  // Favorites state
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  const [userFavList, setUserFavList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Compute leaderboard
  const favoriteRankings = useMemo(() => {
    return computeFavoriteRankingList(publishedChars, favoriteCounts);
  }, [publishedChars, favoriteCounts]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [counts, userFavs] = await Promise.all([
        getAllFavoriteCounts(),
        getUserFavorites(member?.id),
      ]);
      setFavoriteCounts(counts);
      setUserFavList(userFavs);
    } catch (e) {
      console.error('Failed to load favorites data:', e);
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
  }, [member?.id]);

  const handleToggleFavorite = async (char: Character) => {
    if (!member) {
      onOpenAuth('login');
      return;
    }

    try {
      const res = await toggleCharacterFavorite(char.id, member.id);
      setToastMessage(
        res.isFavorited
          ? `Đã thêm ${char.name} vào danh sách yêu thích ❤️`
          : `Đã bỏ yêu thích ${char.name}`
      );
      setTimeout(() => setToastMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi xảy ra khi thực hiện yêu thích.');
    }
  };

  const isSelectedCharFavorited = selectedChar ? userFavList.includes(selectedChar.id) : false;
  const selectedCharTotalFavs = selectedChar ? (favoriteCounts[selectedChar.id] || 0) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#F1D4DF] shadow-xs text-xs font-semibold text-[#865B9E] mb-3">
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
          <span>Character Favorites Hub</span>
        </div>
        <h1 className="font-serif-title text-4xl sm:text-5xl font-medium text-[#51434A] mb-3">
          Yêu Thích & Bình Chọn Nhân Vật
        </h1>
        <p className="text-sm text-[#6E5C65] font-light">
          Thả tim ❤️ cho những persona bạn yêu thích nhất, theo dõi tổng lượt bình chọn và khám phá thứ hạng các nhân vật nổi bật trong cộng đồng.
        </p>
      </div>

      {toastMessage && (
        <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CHARACTER PICKER & LIST (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#F1D4DF] shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1D4DF]/70">
            <span className="font-serif-title font-semibold text-sm text-[#51434A]">
              Chọn nhân vật ({filteredChars.length})
            </span>
            <span className="text-[11px] text-[#8E7A84]">Tìm kiếm nhanh</span>
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
              const isFav = userFavList.includes(char.id);
              const favCount = favoriteCounts[char.id] || 0;

              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#FAF0F5] to-[#F5EAF7] border-2 border-[#D88CA3] shadow-xs'
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
                      <p className={`font-serif-title font-bold text-xs truncate ${isSelected ? 'text-[#865B9E]' : 'text-[#51434A]'}`}>
                        {char.name}
                      </p>
                      <p className="text-[10px] text-[#8E7A84] truncate">
                        {char.category || 'General'}
                      </p>
                    </div>
                  </div>

                  {/* Heart Favorite Button & Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(char);
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all shrink-0 ${
                      isFav
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-white border-[#F1D4DF] text-[#51434A] hover:text-rose-500'
                    }`}
                    title={isFav ? 'Bỏ yêu thích' : 'Yêu thích nhân vật này'}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFav ? 'fill-rose-500 text-rose-500' : 'text-[#865B9E]'
                      }`}
                    />
                    <span>{favCount}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED CHARACTER & FAVORITES LEADERBOARD (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Selected Character Hero Banner */}
          {selectedChar && (
            <div className="bg-gradient-to-br from-white via-[#FAF5FB] to-[#FFF5F7] rounded-3xl border border-[#F1D4DF] p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-5 border-b border-[#F1D4DF]">
                <div className="flex items-center gap-4">
                  <img
                    src={selectedChar.avatarUrl || selectedChar.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150'}
                    alt={selectedChar.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-md ring-2 ring-[#E9A9BB]/40 shrink-0"
                  />
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D88CA3] block">
                      Chi tiết & Bình chọn
                    </span>
                    <h2 className="font-serif-title text-2xl font-bold text-[#51434A]">
                      {selectedChar.fullName || selectedChar.name}
                    </h2>
                    <p className="text-xs text-[#8E7A84] mt-0.5 line-clamp-1">
                      {selectedChar.occupation || selectedChar.category || 'Persona Archive'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {onOpenCharacterDetails && (
                    <button
                      onClick={() => onOpenCharacterDetails(selectedChar)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-[#F1D4DF] text-xs font-semibold text-[#865B9E] hover:bg-[#FFF5F7] transition-colors cursor-pointer"
                    >
                      <span>Xem hồ sơ</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}

                  {/* Big Favorite Heart Button */}
                  <button
                    onClick={() => handleToggleFavorite(selectedChar)}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border text-xs font-bold transition-all shadow-sm cursor-pointer ${
                      isSelectedCharFavorited
                        ? 'bg-rose-50 border-rose-300 text-rose-600 hover:bg-rose-100'
                        : 'bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white hover:brightness-105 border-transparent'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        isSelectedCharFavorited ? 'fill-rose-500 text-rose-500 scale-110' : 'fill-white text-white'
                      }`}
                    />
                    <span>
                      {isSelectedCharFavorited ? 'Đã yêu thích ❤️' : 'Yêu thích ngay'} ({selectedCharTotalFavs})
                    </span>
                  </button>
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

          {/* COMMUNITY FAVORITES LEADERBOARD */}
          <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1D4DF]">
              <h3 className="font-serif-title font-bold text-base text-[#51434A] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>Bảng Xếp Hạng Yêu Thích Cộng Đồng</span>
              </h3>
              <span className="text-xs text-[#8E7A84]">Xếp theo tổng lượt thả tim ❤️</span>
            </div>

            {favoriteRankings.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8E7A84]">Chưa có dữ liệu xếp hạng.</div>
            ) : (
              <div className="space-y-3">
                {favoriteRankings.slice(0, 10).map((item) => {
                  const isFav = userFavList.includes(item.character.id);

                  return (
                    <div
                      key={item.character.id}
                      onClick={() => setSelectedCharId(item.character.id)}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                        item.rank === 1
                          ? 'bg-gradient-to-r from-[#FFFDF0] to-[#FFF9E6] border-amber-300 shadow-xs'
                          : item.rank === 2
                          ? 'bg-gradient-to-r from-[#F5EEF8] to-[#EAE0F0] border-purple-200'
                          : item.rank === 3
                          ? 'bg-gradient-to-r from-[#FFF5F7] to-[#FCE4EC] border-pink-200'
                          : 'bg-[#FFF5F7]/30 border-[#F1D4DF]/70 hover:bg-[#FFF5F7]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Rank Badge */}
                        <span
                          className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                            item.rank === 1
                              ? 'bg-amber-400 text-white shadow-2xs'
                              : item.rank === 2
                              ? 'bg-purple-400 text-white shadow-2xs'
                              : item.rank === 3
                              ? 'bg-rose-400 text-white shadow-2xs'
                              : 'bg-gray-100 text-[#51434A]'
                          }`}
                        >
                          #{item.rank}
                        </span>

                        <img
                          src={item.character.avatarUrl || item.character.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                          alt={item.character.name}
                          className="w-10 h-10 rounded-full object-cover border border-white shadow-2xs shrink-0"
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

                      {/* Heart Toggle Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(item.character);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-2xs shrink-0 ${
                          isFav
                            ? 'bg-rose-50 border-rose-200 text-rose-600'
                            : 'bg-white border-[#F1D4DF] text-[#51434A] hover:text-rose-500'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            isFav ? 'fill-rose-500 text-rose-500' : 'text-[#865B9E]'
                          }`}
                        />
                        <span>{item.totalFavorites} lượt</span>
                      </button>
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
