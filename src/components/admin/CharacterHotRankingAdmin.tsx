import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Star,
  Settings,
  Eye,
  EyeOff,
  Sliders,
  History,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Save,
  RotateCcw,
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  RankingSettings,
  RankingHistoryItem,
  CharacterMetrics,
  getRankingSettings,
  saveRankingSettings,
  getRankingHistory,
  getAllCharacterMetrics,
  toggleCharacterRankingVisibility,
  recalculateCharacterMetrics,
  DEFAULT_RANKING_SETTINGS,
} from '../../services/characterRankingStorage';

interface CharacterHotRankingAdminProps {
  characters: Character[];
  onRefreshData: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const CharacterHotRankingAdmin: React.FC<CharacterHotRankingAdminProps> = ({
  characters,
  onRefreshData,
  onShowToast,
}) => {
  const [settings, setSettings] = useState<RankingSettings>(DEFAULT_RANKING_SETTINGS);
  const [metricsMap, setMetricsMap] = useState<Record<string, CharacterMetrics>>({});
  const [history, setHistory] = useState<RankingHistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form weights state
  const [weightRating, setWeightRating] = useState<number>(40);
  const [weightReviews, setWeightReviews] = useState<number>(30);
  const [weightViews, setWeightViews] = useState<number>(15);
  const [weightChats, setWeightChats] = useState<number>(15);
  const [minReviews, setMinReviews] = useState<number>(3);
  const [cooldownSec, setCooldownSec] = useState<number>(300);
  const [isRankingEnabled, setIsRankingEnabled] = useState<boolean>(true);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [currentSettings, currentMetrics, currentHistory] = await Promise.all([
        getRankingSettings(),
        getAllCharacterMetrics(),
        getRankingHistory(),
      ]);
      setSettings(currentSettings);
      setMetricsMap(currentMetrics);
      setHistory(currentHistory);

      setWeightRating(currentSettings.weight_rating);
      setWeightReviews(currentSettings.weight_reviews);
      setWeightViews(currentSettings.weight_views);
      setWeightChats(currentSettings.weight_chats);
      setMinReviews(currentSettings.min_reviews_for_boost);
      setCooldownSec(currentSettings.anti_spam_cooldown_seconds);
      setIsRankingEnabled(currentSettings.is_ranking_enabled);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [characters]);

  // Total weight calculation
  const totalWeight = weightRating + weightReviews + weightViews + weightChats;

  // Ranked characters list with current metrics
  const rankedCharacters = useMemo(() => {
    const list = characters.map((c) => {
      const metrics = metricsMap[c.id] || {
        character_id: c.id,
        total_reviews: 0,
        total_stars: 0,
        average_rating: 0,
        star_1_count: 0,
        star_2_count: 0,
        star_3_count: 0,
        star_4_count: 0,
        star_5_count: 0,
        views_count: 0,
        chats_count: 0,
        hot_score: 0,
        is_hidden_from_ranking: false,
        last_calculated_at: new Date().toISOString(),
      };
      return { character: c, metrics };
    });

    list.sort((a, b) => {
      if (b.metrics.hot_score !== a.metrics.hot_score) {
        return b.metrics.hot_score - a.metrics.hot_score;
      }
      return b.metrics.average_rating - a.metrics.average_rating;
    });

    return list;
  }, [characters, metricsMap]);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalWeight <= 0) {
      onShowToast('error', 'Lỗi trọng số', 'Tổng trọng số phải lớn hơn 0.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await saveRankingSettings(
        {
          is_ranking_enabled: isRankingEnabled,
          weight_rating: weightRating,
          weight_reviews: weightReviews,
          weight_views: weightViews,
          weight_chats: weightChats,
          min_reviews_for_boost: minReviews,
          anti_spam_cooldown_seconds: cooldownSec,
        },
        characters
      );
      setSettings(updated);
      onShowToast(
        'success',
        'Lưu cấu hình thành công',
        'Đã cập nhật trọng số và tính toán lại điểm Hot Score cho tất cả nhân vật.'
      );
      await loadAll();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi lưu cấu hình', err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle character hidden in ranking
  const handleToggleHideCharacter = async (charId: string, charName: string, isHidden: boolean) => {
    try {
      await toggleCharacterRankingVisibility(charId, isHidden);
      onShowToast(
        'info',
        isHidden ? 'Đã ẩn nhân vật khỏi BXH' : 'Đã hiển thị nhân vật trên BXH',
        `"${charName}" ${isHidden ? 'sẽ không xuất hiện trong bảng xếp hạng công khai.' : 'đã được bật lại trong bảng xếp hạng.'}`
      );
      await loadAll();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi thao tác', err?.message);
    }
  };

  // Recalculate all scores
  const handleRecalculateAll = async () => {
    setIsSaving(true);
    try {
      for (const char of characters) {
        await recalculateCharacterMetrics(char.id);
      }
      onShowToast('success', 'Tính toán hoàn tất', 'Đã làm mới dữ liệu và điểm Hot Score cho toàn bộ nhân vật.');
      await loadAll();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi làm mới', err?.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-3xl border border-[#F1D4DF] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h2 className="font-serif-title text-xl font-bold text-[#51434A]">
              Character Ranking Settings (Cấu hình BXH Hot)
            </h2>
          </div>
          <p className="text-xs text-[#8E7A84] mt-1 font-light">
            Điều chỉnh trọng số công thức tính điểm Hot Score, bật/tắt BXH và ẩn nhân vật khỏi danh sách công khai.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRecalculateAll}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#865B9E] text-xs font-semibold border border-[#F1D4DF] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tính lại toàn bộ Hot Score</span>
          </button>
        </div>
      </div>

      {/* FORMULA & WEIGHTS CONFIGURATION CARD */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#F1D4DF]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#D88CA3]" />
            <h3 className="font-serif-title font-bold text-base text-[#51434A]">
              Trọng số công thức tính điểm Hot Score
            </h3>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRankingEnabled}
              onChange={(e) => setIsRankingEnabled(e.target.checked)}
              className="rounded text-[#E9A9BB] focus:ring-[#E9A9BB]"
            />
            <span className="text-xs font-bold text-[#51434A]">Bật Bảng xếp hạng Hot trên trang chủ</span>
          </label>
        </div>

        {/* Mathematical Explanation Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FAF0F5] to-[#F5EAF7] border border-[#F1D4DF] text-xs text-[#51434A] space-y-2">
          <div className="flex items-center gap-2 font-bold text-[#865B9E]">
            <HelpCircle className="w-4 h-4" />
            <span>Công thức tính điểm Bayesian Hot Score:</span>
          </div>
          <p className="text-[11px] text-[#6E5C65] leading-relaxed">
            Điểm Hot Score kết hợp điểm sao trung bình (có làm mịn Bayesian để tránh 1 lượt 5 sao vượt 50 lượt 4.8 sao), số lượng đánh giá, lượt xem hồ sơ hợp lệ và lượt click trò chuyện AI. Mỗi chỉ số được nhân với phần trăm trọng số do Admin thiết lập bên dưới.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Weight: Average Rating */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#51434A] flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Điểm sao (Rating)</span>
                </span>
                <span className="font-mono font-bold text-[#865B9E]">{weightRating}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weightRating}
                onChange={(e) => setWeightRating(Number(e.target.value))}
                className="w-full accent-[#865B9E]"
              />
              <p className="text-[10px] text-[#8E7A84]">Trọng số ảnh hưởng của điểm sao trung bình.</p>
            </div>

            {/* Weight: Review Count */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#51434A] flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-[#D88CA3]" />
                  <span>Lượt đánh giá</span>
                </span>
                <span className="font-mono font-bold text-[#865B9E]">{weightReviews}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weightReviews}
                onChange={(e) => setWeightReviews(Number(e.target.value))}
                className="w-full accent-[#865B9E]"
              />
              <p className="text-[10px] text-[#8E7A84]">Trọng số độ uy tín dựa trên số lượng thành viên nhận xét.</p>
            </div>

            {/* Weight: Profile Views */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#51434A] flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-[#2980B9]" />
                  <span>Lượt xem hồ sơ</span>
                </span>
                <span className="font-mono font-bold text-[#865B9E]">{weightViews}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weightViews}
                onChange={(e) => setWeightViews(Number(e.target.value))}
                className="w-full accent-[#865B9E]"
              />
              <p className="text-[10px] text-[#8E7A84]">Trọng số mức độ quan tâm xem thông tin nhân vật.</p>
            </div>

            {/* Weight: Chat Clicks */}
            <div className="p-4 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#51434A] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lượt chat AI Studio</span>
                </span>
                <span className="font-mono font-bold text-[#865B9E]">{weightChats}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weightChats}
                onChange={(e) => setWeightChats(Number(e.target.value))}
                className="w-full accent-[#865B9E]"
              />
              <p className="text-[10px] text-[#8E7A84]">Trọng số tương tác mở trò chuyện thực tế.</p>
            </div>
          </div>

          {/* Additional Tuning Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Số lượt đánh giá tối thiểu để kích hoạt điểm thưởng (min_reviews_for_boost)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={minReviews}
                onChange={(e) => setMinReviews(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs"
              />
              <span className="text-[10px] text-[#8E7A84]">Mặc định: 3 lượt đánh giá.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Thời gian chống spam (Cooldown giữa các lượt xem/chat tính điểm)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  max="3600"
                  value={cooldownSec}
                  onChange={(e) => setCooldownSec(Number(e.target.value))}
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs"
                />
                <span className="text-xs text-[#8E7A84]">giây ({Math.round(cooldownSec / 60)} phút)</span>
              </div>
              <span className="text-[10px] text-[#8E7A84]">Ngăn chặn hành vi F5 tải lại liên tục để tăng điểm giả mạo.</span>
            </div>
          </div>

          {/* Form Action */}
          <div className="flex items-center justify-between pt-4 border-t border-[#F1D4DF]">
            <div className="text-xs text-[#51434A]">
              Tổng trọng số hiện tại: <strong className={totalWeight === 100 ? 'text-emerald-700' : 'text-amber-700'}>{totalWeight}%</strong>
              {totalWeight !== 100 && (
                <span className="text-[10px] text-gray-500 ml-2">(Hệ thống tự động chuẩn hóa về 100%)</span>
              )}
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu cấu hình trọng số'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* CHARACTER RANKING TABLE */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1D4DF] flex items-center justify-between">
          <div>
            <h3 className="font-serif-title font-semibold text-sm text-[#51434A]">
              Danh sách Nhân vật & Thứ hạng Hot Score ({rankedCharacters.length})
            </h3>
            <p className="text-[11px] text-[#8E7A84] mt-0.5">
              Admin có thể bật/tắt hiển thị của từng nhân vật trên bảng xếp hạng mà không làm mất dữ liệu.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FFF5F7] text-[#51434A] font-semibold border-b border-[#F1D4DF]">
              <tr>
                <th className="px-5 py-3.5 text-center">Hạng</th>
                <th className="px-5 py-3.5">Nhân vật</th>
                <th className="px-5 py-3.5 text-center">Điểm sao</th>
                <th className="px-5 py-3.5 text-center">Lượt đánh giá</th>
                <th className="px-5 py-3.5 text-center">Lượt xem</th>
                <th className="px-5 py-3.5 text-center">Lượt chat</th>
                <th className="px-5 py-3.5 text-center">Hot Score 🔥</th>
                <th className="px-5 py-3.5 text-center">Hiển thị trên BXH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1D4DF]/60">
              {rankedCharacters.map((item, index) => {
                const rankNum = index + 1;
                const isHidden = item.metrics.is_hidden_from_ranking;

                return (
                  <tr
                    key={item.character.id}
                    className={`hover:bg-[#FAF5FB]/60 transition-colors ${
                      isHidden ? 'bg-gray-50/60 opacity-60' : ''
                    }`}
                  >
                    {/* Rank */}
                    <td className="px-5 py-3.5 text-center font-bold">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-black shadow-2xs ${
                          rankNum === 1
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : rankNum === 2
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : rankNum === 3
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-gray-50 text-gray-600'
                        }`}
                      >
                        #{rankNum}
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
                        <div className="min-w-0">
                          <p className="font-serif-title font-bold text-xs text-[#51434A] truncate max-w-[150px]">
                            {item.character.name}
                          </p>
                          <p className="text-[10px] text-[#8E7A84] truncate">
                            {item.character.category}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Star Rating */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400" />
                        <span>{item.metrics.average_rating.toFixed(1)}</span>
                      </span>
                    </td>

                    {/* Total Reviews */}
                    <td className="px-5 py-3.5 text-center text-[#51434A] font-medium">
                      {item.metrics.total_reviews}
                    </td>

                    {/* Views Count */}
                    <td className="px-5 py-3.5 text-center text-[#8E7A84]">
                      {item.metrics.views_count}
                    </td>

                    {/* Chats Count */}
                    <td className="px-5 py-3.5 text-center text-[#8E7A84]">
                      {item.metrics.chats_count}
                    </td>

                    {/* Hot Score */}
                    <td className="px-5 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-xs">
                        <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span>{Math.round(item.metrics.hot_score)}</span>
                      </span>
                    </td>

                    {/* Visibility Toggle */}
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleHideCharacter(item.character.id, item.character.name, !isHidden)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          !isHidden
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                        title={!isHidden ? 'Nhấn để ẩn khỏi bảng xếp hạng công khai' : 'Nhấn để mở lại trên BXH'}
                      >
                        {!isHidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{!isHidden ? 'Đang hiển thị' : 'Đã ẩn khỏi BXH'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
