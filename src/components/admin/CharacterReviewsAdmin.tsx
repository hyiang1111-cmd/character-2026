import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Star,
  Search,
  Trash2,
  Eye,
  EyeOff,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  CharacterReview,
  getCharacterReviews,
  deleteReview,
  setReviewHiddenStatus,
} from '../../services/characterRankingStorage';

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
  const [reviews, setReviews] = useState<CharacterReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStar, setFilterStar] = useState<number | 'all'>('all');
  const [filterCharId, setFilterCharId] = useState<string | 'all'>('all');
  const [reviewToDelete, setReviewToDelete] = useState<CharacterReview | null>(null);

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const all = await getCharacterReviews(undefined, true); // Include hidden
      setReviews(all);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((rev) => {
      // Filter star
      if (filterStar !== 'all' && rev.rating !== filterStar) return false;

      // Filter character
      if (filterCharId !== 'all' && rev.character_id !== filterCharId) return false;

      // Search keyword
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const char = characters.find((c) => c.id === rev.character_id);
        const matchChar = char?.name.toLowerCase().includes(q) || false;
        const matchUser = rev.username.toLowerCase().includes(q);
        const matchText = rev.feedback.toLowerCase().includes(q);
        if (!matchChar && !matchUser && !matchText) return false;
      }

      return true;
    });
  }, [reviews, filterStar, filterCharId, searchQuery, characters]);

  // Toggle review hidden status
  const handleToggleHide = async (rev: CharacterReview) => {
    try {
      await setReviewHiddenStatus(rev.id, rev.character_id, !rev.is_hidden);
      onShowToast(
        'info',
        rev.is_hidden ? 'Đã hiển thị nhận xét' : 'Đã ẩn nhận xét',
        `Nhận xét của ${rev.username} ${rev.is_hidden ? 'đã được mở lại cho cộng đồng.' : 'đã được ẩn khỏi công chúng.'}`
      );
      await loadReviews();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi thao tác', err?.message);
    }
  };

  // Confirm delete review
  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    try {
      await deleteReview(reviewToDelete.id, reviewToDelete.character_id);
      onShowToast('success', 'Đã xóa nhận xét', `Đã xóa vĩnh viễn nhận xét của ${reviewToDelete.username}.`);
      setReviewToDelete(null);
      await loadReviews();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi xóa nhận xét', err?.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Controls */}
      <div className="bg-white p-5 rounded-3xl border border-[#F1D4DF] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-[#F1D4DF]">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#D88CA3]" />
              <h2 className="font-serif-title text-xl font-bold text-[#51434A]">
                Quản lý Đánh giá & Feedback Nhân vật
              </h2>
            </div>
            <p className="text-xs text-[#8E7A84] mt-1 font-light">
              Kiểm duyệt phản hồi từ cộng đồng, ẩn các nhận xét không phù hợp và đảm bảo tính minh bạch.
            </p>
          </div>

          <div className="text-right shrink-0">
            <span className="text-xs font-semibold text-[#865B9E] px-3 py-1 rounded-full bg-[#FAF0F5] border border-[#F1D4DF]">
              Tổng: {reviews.length} đánh giá
            </span>
          </div>
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8E7A84] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo username, nội dung, nhân vật..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] placeholder-[#8E7A84] focus:outline-none focus:border-[#E9A9BB]"
            />
          </div>

          {/* Star Filter */}
          <div>
            <select
              value={filterStar}
              onChange={(e) => setFilterStar(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none"
            >
              <option value="all">Lọc theo số sao: Tất cả</option>
              <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
              <option value="4">⭐⭐⭐⭐ (4 sao)</option>
              <option value="3">⭐⭐⭐ (3 sao)</option>
              <option value="2">⭐⭐ (2 sao)</option>
              <option value="1">⭐ (1 sao)</option>
            </select>
          </div>

          {/* Character Filter */}
          <div>
            <select
              value={filterCharId}
              onChange={(e) => setFilterCharId(e.target.value)}
              className="w-full px-3 py-2 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none"
            >
              <option value="all">Lọc theo nhân vật: Tất cả ({characters.length})</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1D4DF] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#51434A]">
            Danh sách Đánh giá ({filteredReviews.length})
          </span>
          <span className="text-xs text-[#8E7A84]">
            Chỉ xem & kiểm duyệt nội dung, không sửa điểm sao của thành viên
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#8E7A84]">Đang tải đánh giá...</div>
        ) : filteredReviews.length === 0 ? (
          <div className="py-12 text-center text-[#8E7A84] space-y-2">
            <MessageSquare className="w-8 h-8 text-[#D88CA3]/50 mx-auto" />
            <p className="text-sm">Không tìm thấy đánh giá nào phù hợp với bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF5F7] text-[#51434A] font-semibold border-b border-[#F1D4DF]">
                <tr>
                  <th className="px-5 py-3.5">Người đánh giá</th>
                  <th className="px-5 py-3.5">Nhân vật</th>
                  <th className="px-5 py-3.5 text-center">Số sao</th>
                  <th className="px-5 py-3.5">Nội dung feedback</th>
                  <th className="px-5 py-3.5 text-center">Thời gian</th>
                  <th className="px-5 py-3.5 text-center">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1D4DF]/60">
                {filteredReviews.map((rev) => {
                  const char = characters.find((c) => c.id === rev.character_id);

                  return (
                    <tr
                      key={rev.id}
                      className={`hover:bg-[#FAF5FB]/60 transition-colors ${
                        rev.is_hidden ? 'bg-gray-50/70 opacity-70' : ''
                      }`}
                    >
                      {/* User */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={rev.avatar_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                            alt={rev.username}
                            className="w-8 h-8 rounded-full object-cover border border-white shadow-2xs"
                          />
                          <div>
                            <span className="font-semibold text-[#51434A] block truncate max-w-[120px]">
                              {rev.username}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block">
                              ID: {rev.user_id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Character */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <img
                            src={char?.avatarUrl || char?.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                            alt={char?.name || 'Char'}
                            className="w-7 h-7 rounded-full object-cover border border-white"
                          />
                          <span className="font-semibold text-[#51434A] truncate max-w-[140px]">
                            {char?.name || 'Nhân vật đã xóa'}
                          </span>
                        </div>
                      </td>

                      {/* Rating Stars */}
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{rev.rating} ★</span>
                        </span>
                      </td>

                      {/* Feedback Text */}
                      <td className="px-5 py-3.5 text-[#51434A] max-w-xs">
                        <p className="line-clamp-2 text-xs leading-relaxed">{rev.feedback}</p>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-3.5 text-center text-[#8E7A84] text-[11px] whitespace-nowrap">
                        {new Date(rev.created_at).toLocaleDateString('vi-VN')}
                      </td>

                      {/* Visibility Status */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {rev.is_hidden ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[10px]">
                            <EyeOff className="w-2.5 h-2.5" />
                            <span>Đã ẩn</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                            <Eye className="w-2.5 h-2.5" />
                            <span>Hiển thị</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Hide */}
                          <button
                            onClick={() => handleToggleHide(rev)}
                            className="p-1.5 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] transition-colors"
                            title={rev.is_hidden ? 'Mở lại hiển thị nhận xét' : 'Ẩn nhận xét khỏi cộng đồng'}
                          >
                            {rev.is_hidden ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-amber-600" />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setReviewToDelete(rev)}
                            className="p-1.5 rounded-xl bg-[#FFF5F7] hover:bg-red-50 text-[#8E7A84] hover:text-red-600 transition-colors"
                            title="Xóa nhận xét vi phạm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRM DELETE MODAL */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-[#F1D4DF] shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-lg text-[#51434A]">
                Xóa nhận xét này?
              </h3>
              <p className="text-xs text-[#8E7A84] mt-2 leading-relaxed">
                Bạn có chắc chắn muốn xóa đánh giá của <strong>{reviewToDelete.username}</strong>?
                Điểm đánh giá trung bình của nhân vật sẽ được tính toán lại ngay sau khi xóa.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                className="px-4 py-2 rounded-2xl bg-gray-100 hover:bg-gray-200 text-[#51434A] text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
