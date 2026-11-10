import React, { useState, useEffect, useMemo } from 'react';
import {
  Heart,
  Search,
  Trophy,
  User,
  Sparkles,
  TrendingUp,
  BarChart2
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  getAllFavoriteCounts,
  computeFavoriteRankingList,
  FavoriteRankedCharacter
} from '../../services/characterFavoritesStorage';

interface CharacterReviewsAdminProps {
  characters: Character[];
  onRefreshData: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const CharacterReviewsAdmin: React.FC<CharacterReviewsAdminProps> = ({
  characters,
  onRefreshData,
  onShowToast,
}) => {
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const counts = await getAllFavoriteCounts();
      setFavoriteCounts(counts);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [characters]);

  const rankings = useMemo(() => {
    return computeFavoriteRankingList(characters, favoriteCounts);
  }, [characters, favoriteCounts]);

  const totalFavoriteVotes = useMemo(() => {
    return Object.values(favoriteCounts).reduce((sum, count) => sum + count, 0);
  }, [favoriteCounts]);

  const filteredRankings = useMemo(() => {
    if (!searchQuery.trim()) return rankings;
    const q = searchQuery.toLowerCase().trim();
    return rankings.filter(
      (r) =>
        r.character.name.toLowerCase().includes(q) ||
        (r.character.fullName && r.character.fullName.toLowerCase().includes(q)) ||
        (r.character.category && r.character.category.toLowerCase().includes(q))
    );
  }, [rankings, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-3xl border border-[#F1D4DF] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-[#F1D4DF]">
          <div>
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
              <h2 className="font-serif-title text-xl font-bold text-[#51434A]">
                Quản lý & Thống kê Lượt Yêu Thích Nhân Vật
              </h2>
            </div>
            <p className="text-xs text-[#8E7A84] mt-1 font-light">
              Theo dõi số lượt bình chọn tim ❤️ công khai từ cộng đồng người dùng và bảng xếp hạng yêu thích thực tế.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-bold text-[#865B9E] px-3.5 py-1.5 rounded-full bg-[#FAF0F5] border border-[#F1D4DF] flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-rose-500" />
              <span>Tổng: {totalFavoriteVotes} lượt tim ❤️</span>
            </span>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[#8E7A84] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên nhân vật, danh mục..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] placeholder-[#8E7A84] focus:outline-none focus:border-[#E9A9BB]"
          />
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1D4DF] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#51434A]">
            Bảng Xếp Hạng Yêu Thích ({filteredRankings.length} nhân vật)
          </span>
          <span className="text-xs text-[#8E7A84]">
            Số liệu đồng bộ trực tiếp từ Supabase
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#8E7A84]">Đang tải dữ liệu yêu thích...</div>
        ) : filteredRankings.length === 0 ? (
          <div className="py-12 text-center text-[#8E7A84] space-y-2">
            <Heart className="w-8 h-8 text-rose-300 mx-auto opacity-60" />
            <p className="text-sm">Không tìm thấy nhân vật nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF5F7] text-[#51434A] font-semibold border-b border-[#F1D4DF]">
                <tr>
                  <th className="px-5 py-3.5 text-center">Thứ hạng</th>
                  <th className="px-5 py-3.5">Nhân vật</th>
                  <th className="px-5 py-3.5">Danh mục / Thể loại</th>
                  <th className="px-5 py-3.5 text-right">Lượt yêu thích ❤️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1D4DF]/60">
                {filteredRankings.map((item) => (
                  <tr key={item.character.id} className="hover:bg-[#FAF5FB]/60 transition-colors">
                    {/* Rank */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl font-black text-xs ${
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
                    </td>

                    {/* Character */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.character.avatarUrl || item.character.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                          alt={item.character.name}
                          className="w-9 h-9 rounded-full object-cover border border-white shadow-2xs shrink-0"
                        />
                        <div>
                          <span className="font-semibold text-[#51434A] block">
                            {item.character.fullName || item.character.name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono block">
                            ID: {item.character.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-[#6E5C65]">
                      {item.character.category || 'Persona Archive'}
                    </td>

                    {/* Total Favorites */}
                    <td className="px-5 py-3.5 text-right font-bold text-rose-600 text-sm">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        <span>{item.totalFavorites} lượt tim</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
