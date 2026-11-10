import React, { useState, useEffect, useMemo } from 'react';
import {
  Star,
  Search,
  MessageSquare,
  Sparkles,
  Send,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  User,
  Clock,
  Filter,
  Layers,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { Character } from '../../types/character';
import { useCommunity } from '../../context/CommunityContext';
import {
  CharacterReview,
  CharacterMetrics,
  getCharacterReviews,
  submitOrUpdateReview,
  deleteReview,
  getCharacterMetrics,
  getAllCharacterMetrics,
} from '../../services/characterRankingStorage';

interface CharacterReviewsPageProps {
  characters: Character[];
  initialCharacterId?: string;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onOpenCharacterDetails?: (character: Character) => void;
}

const STAR_LABELS: Record<number, string> = {
  1: 'Không hài lòng',
  2: 'Chưa tốt',
  3: 'Bình thường',
  4: 'Tốt',
  5: 'Rất tốt',
};

export const CharacterReviewsPage: React.FC<CharacterReviewsPageProps> = ({
  characters,
  initialCharacterId,
  onOpenAuth,
  onOpenCharacterDetails,
}) => {
  const { member } = useCommunity();

  // Published characters only for reviews
  const publishedChars = useMemo(() => characters.filter((c) => c.status === 'published'), [characters]);

  // Selected character state
  const [selectedCharId, setSelectedCharId] = useState<string>(
    initialCharacterId || (publishedChars[0]?.id || '')
  );
  const [charSearchQuery, setCharSearchQuery] = useState('');

  // Reviews & Metrics state
  const [reviews, setReviews] = useState<CharacterReview[]>([]);
  const [metrics, setMetrics] = useState<CharacterMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // All metrics map for character list preview
  const [allMetrics, setAllMetrics] = useState<Record<string, CharacterMetrics>>({});

  // Active user's form state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Active tab: 'selected_char' | 'recent_all'
  const [viewTab, setViewTab] = useState<'selected_char' | 'recent_all'>('selected_char');
  const [allRecentReviews, setAllRecentReviews] = useState<CharacterReview[]>([]);

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

  // Load reviews & metrics for selected character
  const loadData = async (charId: string) => {
    if (!charId) return;
    setIsLoading(true);
    try {
      const [revs, mtr] = await Promise.all([
        getCharacterReviews(charId, false),
        getCharacterMetrics(charId),
      ]);
      setReviews(revs);
      setMetrics(mtr);

      // Pre-fill user review if already exists
      if (member) {
        const myReview = revs.find((r) => r.user_id === member.id);
        if (myReview) {
          setRating(myReview.rating);
          setFeedback(myReview.feedback);
        } else {
          setRating(5);
          setFeedback('');
        }
      }
    } catch (e) {
      console.error('Failed to load reviews:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Load recent reviews across all characters
  const loadAllRecent = async () => {
    try {
      const all = await getCharacterReviews(undefined, false);
      setAllRecentReviews(all.slice(0, 30));
    } catch {
      // Fallback
    }
  };

  // Load all metrics for character list badges
  const loadAllMetrics = async () => {
    try {
      const map = await getAllCharacterMetrics();
      setAllMetrics(map);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadAllMetrics();
    loadAllRecent();
  }, []);

  useEffect(() => {
    if (selectedChar?.id) {
      loadData(selectedChar.id);
    }
  }, [selectedChar?.id, member?.id]);

  // User existing review
  const userExistingReview = useMemo(() => {
    if (!member) return null;
    return reviews.find((r) => r.user_id === member.id) || null;
  }, [reviews, member]);

  // Submit review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) {
      onOpenAuth('login');
      return;
    }

    if (!selectedChar) return;

    if (!feedback.trim()) {
      alert('Vui lòng viết đôi lời nhận xét về nhân vật này.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitOrUpdateReview({
        character_id: selectedChar.id,
        user_id: member.id,
        username: member.username,
        avatar_url: member.avatar_url || '',
        rating,
        feedback,
      });

      setSuccessToast(userExistingReview ? 'Cập nhật đánh giá thành công!' : 'Gửi đánh giá thành công!');
      setTimeout(() => setSuccessToast(null), 3500);

      await loadData(selectedChar.id);
      await loadAllMetrics();
      await loadAllRecent();
    } catch (err: any) {
      alert('Lỗi khi gửi đánh giá: ' + (err?.message || 'Vui lòng thử lại sau.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete own review
  const handleDeleteMyReview = async () => {
    if (!userExistingReview || !selectedChar) return;
    if (!confirm('Bạn có chắc chắn muốn xóa bài đánh giá của mình không?')) return;

    try {
      await deleteReview(userExistingReview.id, selectedChar.id);
      setFeedback('');
      setRating(5);
      setSuccessToast('Đã xóa đánh giá của bạn.');
      setTimeout(() => setSuccessToast(null), 3500);

      await loadData(selectedChar.id);
      await loadAllMetrics();
      await loadAllRecent();
    } catch (err: any) {
      alert('Lỗi xóa đánh giá: ' + err?.message);
    }
  };

  const activeStarDisplay = hoverRating || rating;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      {/* Header Banner */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#F1D4DF] shadow-xs text-xs font-semibold text-[#865B9E] mb-3">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Character Reviews & Ratings</span>
        </div>
        <h1 className="font-serif-title text-4xl sm:text-5xl font-medium text-[#51434A] mb-3">
          Đánh Giá & Nhận Xét Nhân Vật
        </h1>
        <p className="text-sm text-[#6E5C65] font-light">
          Khám phá cảm nhận chân thực từ cộng đồng, chấm điểm sao và chia sẻ trải nghiệm trò chuyện cùng các persona yêu thích.
        </p>

        {/* Tab switch */}
        <div className="inline-flex p-1 rounded-2xl bg-white border border-[#F1D4DF] shadow-xs mt-6">
          <button
            onClick={() => setViewTab('selected_char')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              viewTab === 'selected_char'
                ? 'bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A]'
            }`}
          >
            Đánh giá theo nhân vật
          </button>
          <button
            onClick={() => setViewTab('recent_all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              viewTab === 'recent_all'
                ? 'bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A]'
            }`}
          >
            Tất cả nhận xét mới nhất ({allRecentReviews.length})
          </button>
        </div>
      </div>

      {successToast && (
        <div className="max-w-md mx-auto mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {viewTab === 'selected_char' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: CHARACTER PICKER (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#F1D4DF] shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1D4DF]/70">
              <span className="font-serif-title font-semibold text-sm text-[#51434A]">
                1. Chọn nhân vật ({filteredChars.length})
              </span>
              <span className="text-[11px] text-[#8E7A84]">Tìm nhanh</span>
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
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredChars.map((char) => {
                const isSelected = selectedChar?.id === char.id;
                const charMetric = allMetrics[char.id];
                const avg = charMetric?.average_rating ? charMetric.average_rating.toFixed(1) : '0.0';
                const totalRevs = charMetric?.total_reviews || 0;

                return (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharId(char.id)}
                    className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl transition-all text-left cursor-pointer ${
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

                    {/* Star & Reviews Badge */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-amber-500 font-bold text-xs justify-end">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{avg}</span>
                      </div>
                      <span className="text-[10px] text-[#8E7A84] block">
                        {totalRevs} đánh giá
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: REVIEWS & FORM (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Selected Character Banner & Summary Stats */}
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
                        Đang đánh giá
                      </span>
                      <h2 className="font-serif-title text-2xl font-bold text-[#51434A]">
                        {selectedChar.fullName || selectedChar.name}
                      </h2>
                      <p className="text-xs text-[#8E7A84] mt-0.5 line-clamp-1">
                        {selectedChar.occupation || selectedChar.category || 'Persona Archive'}
                      </p>
                    </div>
                  </div>

                  {onOpenCharacterDetails && (
                    <button
                      onClick={() => onOpenCharacterDetails(selectedChar)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#F1D4DF] text-xs font-semibold text-[#865B9E] hover:bg-[#FFF5F7] transition-colors cursor-pointer"
                    >
                      <span>Xem hồ sơ</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Score Histogram Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5">
                  {/* Big Average Score */}
                  <div className="text-center sm:text-left flex flex-col justify-center border-b sm:border-b-0 sm:border-r border-[#F1D4DF] pb-4 sm:pb-0 pr-4">
                    <span className="text-xs text-[#8E7A84] font-medium block">Điểm trung bình</span>
                    <div className="flex items-baseline justify-center sm:justify-start gap-1 mt-1">
                      <span className="text-4xl font-serif-title font-bold text-[#51434A]">
                        {metrics?.average_rating ? metrics.average_rating.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-base text-[#8E7A84] font-light">/ 5.0</span>
                    </div>

                    <div className="flex items-center justify-center sm:justify-start gap-1 mt-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => {
                        const filled = (metrics?.average_rating || 0) >= s;
                        return (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                          />
                        );
                      })}
                    </div>

                    <span className="text-[11px] text-[#8E7A84] mt-1.5 block">
                      Dựa trên <strong>{metrics?.total_reviews || 0}</strong> lượt đánh giá
                    </span>
                  </div>

                  {/* Distribution bars */}
                  <div className="sm:col-span-2 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      let count = 0;
                      if (metrics) {
                        if (star === 5) count = metrics.star_5_count;
                        else if (star === 4) count = metrics.star_4_count;
                        else if (star === 3) count = metrics.star_3_count;
                        else if (star === 2) count = metrics.star_2_count;
                        else if (star === 1) count = metrics.star_1_count;
                      }
                      const total = metrics?.total_reviews || 1;
                      const percent = metrics?.total_reviews ? Math.round((count / total) * 100) : 0;

                      return (
                        <div key={star} className="flex items-center gap-2 text-xs">
                          <span className="w-8 text-[11px] font-semibold text-[#51434A] flex items-center justify-end gap-0.5">
                            {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="w-10 text-[10px] text-[#8E7A84] text-right">{count} lượt</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* REVIEW FORM SECTION */}
            <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#F1D4DF]">
                <h3 className="font-serif-title font-bold text-base text-[#51434A] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#D88CA3]" />
                  <span>
                    {userExistingReview ? 'Chỉnh sửa đánh giá của bạn' : 'Gửi đánh giá của bạn'}
                  </span>
                </h3>

                {userExistingReview && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                    Đã đánh giá trước đó
                  </span>
                )}
              </div>

              {!member ? (
                <div className="py-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#FFF5F7] text-[#D88CA3] flex items-center justify-center mx-auto">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[#51434A]">
                      Đăng nhập để đánh giá nhân vật
                    </h4>
                    <p className="text-xs text-[#8E7A84] mt-1 max-w-sm mx-auto">
                      Chỉ thành viên cộng đồng mới có quyền gửi nhận xét và chấm sao để đảm bảo độ tin cậy.
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenAuth('login')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 shadow-sm cursor-pointer"
                  >
                    <span>Đăng nhập hoặc Đăng ký</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4 pt-4">
                  {/* Star Rating Widget */}
                  <div>
                    <label className="block text-xs font-semibold text-[#51434A] mb-2">
                      2. Chấm điểm sao:
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((starValue) => {
                          const isFilled = activeStarDisplay >= starValue;
                          return (
                            <button
                              key={starValue}
                              type="button"
                              onClick={() => setRating(starValue)}
                              onMouseEnter={() => setHoverRating(starValue)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                              title={`${starValue} sao: ${STAR_LABELS[starValue]}`}
                            >
                              <Star
                                className={`w-8 h-8 ${
                                  isFilled
                                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)]'
                                    : 'text-gray-200'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>

                      {/* Text Label for selected star */}
                      <div className="px-3 py-1 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF]">
                        <span className="text-xs font-bold text-[#865B9E]">
                          {rating} / 5 sao: {STAR_LABELS[rating]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Textarea */}
                  <div>
                    <label className="block text-xs font-semibold text-[#51434A] mb-1">
                      3. Viết cảm nhận & nhận xét:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Chia sẻ tính cách, khả năng nhập vai, lời thoại ấn tượng hoặc cảm xúc của bạn khi trò chuyện cùng nhân vật này..."
                      className="w-full px-4 py-3 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] placeholder-[#8E7A84] focus:outline-none focus:border-[#E9A9BB] focus:bg-white transition-all"
                    />
                    <div className="flex items-center justify-between text-[11px] text-[#8E7A84] mt-1">
                      <span>Người đánh giá: <strong>{member.username}</strong></span>
                      <span>{feedback.length} ký tự</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-2">
                    {userExistingReview ? (
                      <button
                        type="button"
                        onClick={handleDeleteMyReview}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa đánh giá của tôi</span>
                      </button>
                    ) : <div />}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Đang gửi...' : userExistingReview ? 'Cập nhật nhận xét' : 'Gửi đánh giá'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* REVIEWS LIST */}
            <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F1D4DF]">
                <h3 className="font-serif-title font-semibold text-sm text-[#51434A]">
                  Nhận xét từ thành viên ({reviews.length})
                </h3>
                <span className="text-xs text-[#8E7A84]">Mới nhất xếp đầu</span>
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-xs text-[#8E7A84]">Đang tải đánh giá...</div>
              ) : reviews.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Star className="w-8 h-8 text-amber-300 mx-auto opacity-60" />
                  <p className="text-xs text-[#8E7A84]">
                    Chưa có nhận xét nào cho nhân vật này. Hãy là người đầu tiên để lại đánh giá!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((rev) => {
                    const isMyOwn = member && member.id === rev.user_id;

                    return (
                      <div
                        key={rev.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isMyOwn ? 'bg-[#FAF0F5]/80 border-[#D88CA3]' : 'bg-[#FFF5F7]/40 border-[#F1D4DF]/80'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={rev.avatar_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                              alt={rev.username}
                              className="w-9 h-9 rounded-full object-cover border border-white shadow-2xs shrink-0"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-xs text-[#51434A]">
                                  {rev.username}
                                </span>
                                {isMyOwn && (
                                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#E9A9BB] text-white font-bold">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#8E7A84] flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(rev.created_at).toLocaleDateString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Stars */}
                          <div className="flex items-center gap-0.5 text-amber-400 shrink-0">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Feedback text */}
                        <p className="text-xs text-[#51434A] mt-2.5 leading-relaxed font-normal whitespace-pre-line pl-12">
                          {rev.feedback}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: RECENT REVIEWS ACROSS ALL CHARACTERS */
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1D4DF]">
            <span className="font-serif-title font-semibold text-sm text-[#51434A]">
              Tất cả nhận xét mới nhất trong cộng đồng
            </span>
            <span className="text-xs text-[#8E7A84]">{allRecentReviews.length} nhận xét</span>
          </div>

          {allRecentReviews.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8E7A84]">
              Chưa có nhận xét nào trong hệ thống.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allRecentReviews.map((rev) => {
                const char = publishedChars.find((c) => c.id === rev.character_id);

                return (
                  <div
                    key={rev.id}
                    className="p-4 rounded-3xl bg-white border border-[#F1D4DF] shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Character header */}
                      <div
                        onClick={() => {
                          setSelectedCharId(rev.character_id);
                          setViewTab('selected_char');
                        }}
                        className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-[#F1D4DF]/60 cursor-pointer group"
                      >
                        <img
                          src={char?.avatarUrl || char?.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                          alt={char?.name || 'Character'}
                          className="w-7 h-7 rounded-full object-cover border border-white"
                        />
                        <span className="font-serif-title font-bold text-xs text-[#51434A] group-hover:text-[#865B9E] transition-colors truncate">
                          {char?.name || 'Nhân vật'}
                        </span>
                      </div>

                      {/* User & Rating */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <img
                            src={rev.avatar_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                            alt={rev.username}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <span className="font-semibold text-xs text-[#51434A]">{rev.username}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-400' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Feedback */}
                      <p className="text-xs text-[#6E5C65] mt-2 line-clamp-3 leading-relaxed">
                        {rev.feedback}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#F1D4DF]/60 flex items-center justify-between text-[10px] text-[#8E7A84]">
                      <span>{new Date(rev.created_at).toLocaleDateString('vi-VN')}</span>
                      <button
                        onClick={() => {
                          setSelectedCharId(rev.character_id);
                          setViewTab('selected_char');
                        }}
                        className="text-[#865B9E] hover:underline font-semibold"
                      >
                        Xem chi tiết & đánh giá
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
