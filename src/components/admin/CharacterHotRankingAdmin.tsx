import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown,
  Sparkles,
  Award,
  Trash2,
  ArrowRightLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  RotateCcw
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  getCuratedRanking,
  saveCuratedRanking,
  assignCharacterToPosition,
  CuratedRanking,
  DEFAULT_CURATED_RANKING
} from '../../services/curatedRankingStorage';

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
  const [ranking, setRanking] = useState<CuratedRanking>(DEFAULT_CURATED_RANKING);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Published characters only
  const publishedChars = useMemo(
    () => characters.filter((c) => c.status === 'published'),
    [characters]
  );

  const loadRanking = async () => {
    setIsLoading(true);
    try {
      const data = await getCuratedRanking();
      setRanking(data);
    } catch (e) {
      console.warn('Failed to load curated ranking in Admin:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRanking();
  }, [characters]);

  // Selected character objects
  const top1Char = publishedChars.find((c) => c.id === ranking.top1_id) || null;
  const top2Char = publishedChars.find((c) => c.id === ranking.top2_id) || null;
  const top3Char = publishedChars.find((c) => c.id === ranking.top3_id) || null;

  // Filter character list for manual assignment table
  const filteredChars = useMemo(() => {
    if (!searchQuery.trim()) return publishedChars;
    const q = searchQuery.toLowerCase().trim();
    return publishedChars.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
    );
  }, [publishedChars, searchQuery]);

  // Handle position select change
  const handleSelectPosition = (pos: 1 | 2 | 3, newCharId: string) => {
    const next = assignCharacterToPosition(ranking, newCharId || null, pos);
    setRanking(next);
  };

  // Clear single position
  const handleClearPosition = (pos: 1 | 2 | 3) => {
    const next = assignCharacterToPosition(ranking, null, pos);
    setRanking(next);
  };

  // Swap positions
  const handleSwapPositions = (posA: 1 | 2 | 3, posB: 1 | 2 | 3) => {
    const idA = posA === 1 ? ranking.top1_id : posA === 2 ? ranking.top2_id : ranking.top3_id;
    const idB = posB === 1 ? ranking.top1_id : posB === 2 ? ranking.top2_id : ranking.top3_id;

    const next: CuratedRanking = { ...ranking };

    if (posA === 1) next.top1_id = idB;
    if (posA === 2) next.top2_id = idB;
    if (posA === 3) next.top3_id = idB;

    if (posB === 1) next.top1_id = idA;
    if (posB === 2) next.top2_id = idA;
    if (posB === 3) next.top3_id = idA;

    setRanking(next);
  };

  // Save changes to Supabase
  const handleSaveRanking = async () => {
    setIsSaving(true);
    try {
      const saved = await saveCuratedRanking(ranking);
      setRanking(saved);
      onShowToast(
        'success',
        'Cập nhật BXH thành công',
        'Bảng xếp hạng Top 3 đã được lưu vào Supabase và đồng bộ tới toàn bộ người dùng.'
      );
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi lưu BXH', err?.message || 'Không thể lưu bảng xếp hạng.');
    } finally {
      setIsSaving(false);
    }
  };

  // Clear entire ranking
  const handleClearAll = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ nhân vật khỏi BXH Top 3 không?')) {
      setRanking({ top1_id: null, top2_id: null, top3_id: null });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-3xl border border-[#F1D4DF] shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
            <h2 className="font-serif-title text-xl font-bold text-[#51434A]">
              Quản Lý Bảng Xếp Hạng Nhân Vật
            </h2>
          </div>
          <p className="text-xs text-[#8E7A84] mt-1 font-light">
            Admin trực tiếp lựa chọn và chỉ định nhân vật giữ vị trí Top 1, Top 2, Top 3 hiển thị trên trang chủ.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FFF5F7] hover:bg-red-50 text-red-600 hover:border-red-200 text-xs font-semibold border border-[#F1D4DF] transition-colors cursor-pointer"
            title="Xóa tất cả các vị trí trong Top 3"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa BXH</span>
          </button>

          <button
            onClick={handleSaveRanking}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Bảng Xếp Hạng'}</span>
          </button>
        </div>
      </div>

      {/* TOP 3 CURATION ASSIGNMENT CONTROL CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* TOP 2 ASSIGNMENT CARD */}
        <div className="bg-white rounded-3xl border-2 border-[#D8C7E2] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1D4DF]">
              <span className="px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-black flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>TOP 2 (Á QUÂN 1)</span>
              </span>
              {top2Char && (
                <button
                  type="button"
                  onClick={() => handleClearPosition(2)}
                  className="text-[11px] text-rose-500 hover:underline font-medium cursor-pointer"
                >
                  Xóa khỏi Top 2
                </button>
              )}
            </div>

            {/* Character Selector */}
            <select
              value={ranking.top2_id || ''}
              onChange={(e) => handleSelectPosition(2, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs font-bold text-[#51434A] focus:outline-none focus:border-[#E9A9BB] cursor-pointer"
            >
              <option value="">-- [ Để trống Top 2 ] --</option>
              {publishedChars.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name} {char.id === ranking.top1_id ? '(Đang giữ Top 1)' : char.id === ranking.top3_id ? '(Đang giữ Top 3)' : ''}
                </option>
              ))}
            </select>

            {/* Selected Character Preview */}
            {top2Char ? (
              <div className="p-3.5 rounded-2xl bg-[#FAF5FB] border border-[#F1D4DF] flex items-center gap-3">
                <img
                  src={top2Char.avatarUrl || top2Char.portraitUrl}
                  alt={top2Char.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif-title font-bold text-xs text-[#51434A] truncate">
                    {top2Char.fullName || top2Char.name}
                  </p>
                  <p className="text-[10px] text-[#8E7A84] truncate">
                    {top2Char.category}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#FFF5F7]/60 border border-dashed border-[#F1D4DF] text-center text-xs text-[#8E7A84] italic">
                Chưa chọn nhân vật cho vị trí Top 2.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#F1D4DF] flex items-center justify-between text-[11px] text-[#8E7A84]">
            <span>Hoán đổi vị trí:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSwapPositions(2, 1)}
                className="px-2.5 py-1 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] font-semibold border border-[#F1D4DF] cursor-pointer"
              >
                ↔ Top 1
              </button>
              <button
                type="button"
                onClick={() => handleSwapPositions(2, 3)}
                className="px-2.5 py-1 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] font-semibold border border-[#F1D4DF] cursor-pointer"
              >
                ↔ Top 3
              </button>
            </div>
          </div>
        </div>

        {/* TOP 1 ASSIGNMENT CARD (HERO GOLD STYLING) */}
        <div className="bg-gradient-to-b from-[#FFFDF0] via-[#FFF9E6] to-[#FFEFC2] rounded-3xl border-2 border-[#FFD700] p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-amber-200">
              <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-black shadow-2xs flex items-center gap-1.5">
                <Crown className="w-4 h-4 fill-white" />
                <span>QUÁN QUÂN • TOP 1</span>
              </span>
              {top1Char && (
                <button
                  type="button"
                  onClick={() => handleClearPosition(1)}
                  className="text-[11px] text-amber-800 hover:underline font-bold cursor-pointer"
                >
                  Xóa khỏi Top 1
                </button>
              )}
            </div>

            {/* Character Selector */}
            <select
              value={ranking.top1_id || ''}
              onChange={(e) => handleSelectPosition(1, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-white border border-amber-300 text-xs font-bold text-amber-900 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
            >
              <option value="">-- [ Để trống Top 1 ] --</option>
              {publishedChars.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name} {char.id === ranking.top2_id ? '(Đang giữ Top 2)' : char.id === ranking.top3_id ? '(Đang giữ Top 3)' : ''}
                </option>
              ))}
            </select>

            {/* Selected Character Preview */}
            {top1Char ? (
              <div className="p-4 rounded-2xl bg-white border border-amber-300 flex items-center gap-3.5 shadow-2xs">
                <img
                  src={top1Char.avatarUrl || top1Char.portraitUrl}
                  alt={top1Char.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 shadow-xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif-title font-bold text-sm text-amber-900 truncate">
                    {top1Char.fullName || top1Char.name}
                  </p>
                  <p className="text-xs text-amber-700 truncate font-medium mt-0.5">
                    {top1Char.category} • {top1Char.occupation || 'Top Persona'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/70 border border-dashed border-amber-300 text-center text-xs text-amber-800 italic">
                Chưa chọn nhân vật Quán Quân Top 1.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px] text-amber-800">
            <span className="font-semibold">Hoán đổi vị trí:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSwapPositions(1, 2)}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 cursor-pointer shadow-2xs"
              >
                ↔ Top 2
              </button>
              <button
                type="button"
                onClick={() => handleSwapPositions(1, 3)}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 cursor-pointer shadow-2xs"
              >
                ↔ Top 3
              </button>
            </div>
          </div>
        </div>

        {/* TOP 3 ASSIGNMENT CARD */}
        <div className="bg-white rounded-3xl border-2 border-[#F1C0CE] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#F1D4DF]">
              <span className="px-3 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black flex items-center gap-1">
                <Award className="w-3.5 h-3.5" />
                <span>TOP 3 (Á QUÂN 2)</span>
              </span>
              {top3Char && (
                <button
                  type="button"
                  onClick={() => handleClearPosition(3)}
                  className="text-[11px] text-rose-500 hover:underline font-medium cursor-pointer"
                >
                  Xóa khỏi Top 3
                </button>
              )}
            </div>

            {/* Character Selector */}
            <select
              value={ranking.top3_id || ''}
              onChange={(e) => handleSelectPosition(3, e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs font-bold text-[#51434A] focus:outline-none focus:border-[#E9A9BB] cursor-pointer"
            >
              <option value="">-- [ Để trống Top 3 ] --</option>
              {publishedChars.map((char) => (
                <option key={char.id} value={char.id}>
                  {char.name} {char.id === ranking.top1_id ? '(Đang giữ Top 1)' : char.id === ranking.top2_id ? '(Đang giữ Top 2)' : ''}
                </option>
              ))}
            </select>

            {/* Selected Character Preview */}
            {top3Char ? (
              <div className="p-3.5 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] flex items-center gap-3">
                <img
                  src={top3Char.avatarUrl || top3Char.portraitUrl}
                  alt={top3Char.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-serif-title font-bold text-xs text-[#51434A] truncate">
                    {top3Char.fullName || top3Char.name}
                  </p>
                  <p className="text-[10px] text-[#8E7A84] truncate">
                    {top3Char.category}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#FFF5F7]/60 border border-dashed border-[#F1D4DF] text-center text-xs text-[#8E7A84] italic">
                Chưa chọn nhân vật cho vị trí Top 3.
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-[#F1D4DF] flex items-center justify-between text-[11px] text-[#8E7A84]">
            <span>Hoán đổi vị trí:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSwapPositions(3, 1)}
                className="px-2.5 py-1 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] font-semibold border border-[#F1D4DF] cursor-pointer"
              >
                ↔ Top 1
              </button>
              <button
                type="button"
                onClick={() => handleSwapPositions(3, 2)}
                className="px-2.5 py-1 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] font-semibold border border-[#F1D4DF] cursor-pointer"
              >
                ↔ Top 2
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* QUICK CHARACTER PICKER TABLE */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1D4DF] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif-title font-bold text-sm text-[#51434A]">
              Danh sách Nhân vật Hiện có ({filteredChars.length})
            </h3>
            <p className="text-[11px] text-[#8E7A84] mt-0.5">
              Bấm nhanh nút gán Top 1, Top 2, Top 3 tương ứng trên bất kỳ nhân vật nào bên dưới.
            </p>
          </div>

          {/* Search Character Bar */}
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 text-[#8E7A84] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm nhân vật..."
              className="w-full pl-9 pr-3 py-1.5 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FFF5F7] text-[#51434A] font-semibold border-b border-[#F1D4DF]">
              <tr>
                <th className="px-5 py-3.5">Nhân vật</th>
                <th className="px-5 py-3.5">Danh mục</th>
                <th className="px-5 py-3.5 text-center">Trạng thái BXH</th>
                <th className="px-5 py-3.5 text-right">Gán vị trí BXH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1D4DF]/60">
              {filteredChars.map((char) => {
                const isTop1 = ranking.top1_id === char.id;
                const isTop2 = ranking.top2_id === char.id;
                const isTop3 = ranking.top3_id === char.id;
                const isRanked = isTop1 || isTop2 || isTop3;

                return (
                  <tr
                    key={char.id}
                    className={`hover:bg-[#FAF5FB]/60 transition-colors ${
                      isTop1
                        ? 'bg-amber-50/50'
                        : isTop2
                        ? 'bg-indigo-50/40'
                        : isTop3
                        ? 'bg-rose-50/40'
                        : ''
                    }`}
                  >
                    {/* Character */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={char.avatarUrl || char.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=80'}
                          alt={char.name}
                          className="w-9 h-9 rounded-full object-cover border border-white shadow-2xs shrink-0"
                        />
                        <div>
                          <span className="font-semibold text-[#51434A] block">
                            {char.fullName || char.name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono block">
                            {char.nickname ? `"${char.nickname}"` : `ID: ${char.id}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-3.5 text-[#6E5C65]">
                      {char.category || 'General'}
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5 text-center">
                      {isTop1 ? (
                        <span className="px-3 py-1 rounded-full bg-amber-400 text-white font-extrabold text-[11px] shadow-2xs">
                          👑 TOP 1
                        </span>
                      ) : isTop2 ? (
                        <span className="px-3 py-1 rounded-full bg-indigo-500 text-white font-extrabold text-[11px] shadow-2xs">
                          🥈 TOP 2
                        </span>
                      ) : isTop3 ? (
                        <span className="px-3 py-1 rounded-full bg-rose-500 text-white font-extrabold text-[11px] shadow-2xs">
                          🥉 TOP 3
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#8E7A84] italic">Chưa xếp hạng</span>
                      )}
                    </td>

                    {/* Quick Assignment Buttons */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSelectPosition(1, char.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isTop1
                              ? 'bg-amber-400 text-white shadow-2xs'
                              : 'bg-[#FFF5F7] hover:bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          Top 1 👑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectPosition(2, char.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isTop2
                              ? 'bg-indigo-500 text-white shadow-2xs'
                              : 'bg-[#FFF5F7] hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          Top 2 🥈
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectPosition(3, char.id)}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isTop3
                              ? 'bg-rose-500 text-white shadow-2xs'
                              : 'bg-[#FFF5F7] hover:bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          Top 3 🥉
                        </button>
                      </div>
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
