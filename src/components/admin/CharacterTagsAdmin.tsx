import React, { useState, useEffect, useMemo } from 'react';
import {
  Tag as TagIcon,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  X,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  ArrowUpDown,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Character } from '../../types/character';
import {
  CharacterTagRecord,
  getCharacterTags,
  saveCharacterTag,
  deleteCharacterTag,
  renameCharacterTag,
  bulkAssignTagToCharacters,
  bulkUnassignTagFromCharacters,
  syncLocalTagsToSupabase,
} from '../../services/characterRankingStorage';
import { saveCharacter } from '../../services/storage';

interface CharacterTagsAdminProps {
  characters: Character[];
  onRefreshData: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

const PRESET_COLORS = [
  '#D88CA3', // Rose Pastel
  '#865B9E', // Lavender Purple
  '#A06CA8', // Orchid
  '#F2994A', // Warm Amber
  '#27AE60', // Mint Emerald
  '#2980B9', // Ocean Blue
  '#9B51E0', // Royal Violet
  '#E74C3C', // Coral Red
  '#34495E', // Slate Dark
  '#FFD700', // Gold
];

const PRESET_ICONS = [
  '✨', '🌸', '🐱', '🐰', '🧸', '🦋', '🎀', '🌙', '🗡️', '🔮', '👑', '🏹', '🛡️', '💎', '☕', '🌹', '🦊', '⚡', '🖤', '🔥'
];

export const CharacterTagsAdmin: React.FC<CharacterTagsAdminProps> = ({
  characters,
  onRefreshData,
  onShowToast,
}) => {
  const [tags, setTags] = useState<CharacterTagRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<CharacterTagRecord | null>(null);
  const [tagName, setTagName] = useState('');
  const [tagDescription, setTagDescription] = useState('');
  const [tagColor, setTagColor] = useState('#D88CA3');
  const [tagIcon, setTagIcon] = useState('✨');
  const [tagSortOrder, setTagSortOrder] = useState(0);
  const [tagIsActive, setTagIsActive] = useState(true);

  // Delete confirmation
  const [tagToDelete, setTagToDelete] = useState<CharacterTagRecord | null>(null);

  // View characters with tag modal
  const [viewingTagCharacters, setViewingTagCharacters] = useState<CharacterTagRecord | null>(null);

  // Bulk Tag Assignment modal
  const [bulkTag, setBulkTag] = useState<CharacterTagRecord | null>(null);
  const [selectedCharIds, setSelectedCharIds] = useState<string[]>([]);
  const [charSearchQuery, setCharSearchQuery] = useState('');
  const [bulkMode, setBulkMode] = useState<'assign' | 'unassign'>('assign');
  const [isSyncing, setIsSyncing] = useState(false);

  // Load tags
  const loadTags = async () => {
    setIsLoading(true);
    try {
      const records = await getCharacterTags();
      setTags(records);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const { count, error } = await syncLocalTagsToSupabase();
      if (error) {
        onShowToast('error', 'Lỗi đồng bộ Supabase', error);
      } else {
        onShowToast('success', 'Đồng bộ Supabase thành công', `Đã đồng bộ ${count} Tag lên cơ sở dữ liệu Supabase.`);
        await loadTags();
        onRefreshData();
      }
    } catch (e: any) {
      onShowToast('error', 'Lỗi đồng bộ', e?.message);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

  // Compute character counts per tag
  const tagUsageMap = useMemo(() => {
    const map = new Map<string, number>();
    characters.forEach((char) => {
      if (Array.isArray(char.tags)) {
        const seenInChar = new Set<string>();
        char.tags.forEach((t) => {
          const key = String(t || '').trim().replace(/^#+/, '').toLowerCase();
          if (key && !seenInChar.has(key)) {
            seenInChar.add(key);
            map.set(key, (map.get(key) || 0) + 1);
          }
        });
      }
    });
    return map;
  }, [characters]);

  // Combined tags: database custom tags + discovered tags from characters not yet in db
  const allMergedTags = useMemo(() => {
    const existingSlugs = new Set(tags.map((t) => t.slug));
    const merged = [...tags];

    // Add any tags used in characters that aren't yet cataloged
    tagUsageMap.forEach((count, slug) => {
      if (!existingSlugs.has(slug)) {
        // Find best casing from characters
        let bestName = slug.charAt(0).toUpperCase() + slug.slice(1);
        for (const char of characters) {
          if (Array.isArray(char.tags)) {
            const match = char.tags.find((t) => t.trim().toLowerCase() === slug);
            if (match && match !== match.toLowerCase()) {
              bestName = match.trim();
              break;
            }
          }
        }
        merged.push({
          id: `tag_auto_${slug}`,
          name: bestName,
          slug,
          description: 'Tự động phát hiện từ nhân vật',
          color: '#865B9E',
          icon: '✨',
          sort_order: 99,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    return merged.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const countA = tagUsageMap.get(a.slug) || 0;
      const countB = tagUsageMap.get(b.slug) || 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [tags, tagUsageMap, characters]);

  // Filtered by search
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return allMergedTags;
    const q = searchQuery.toLowerCase().trim();
    return allMergedTags.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [allMergedTags, searchQuery]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTag(null);
    setTagName('');
    setTagDescription('');
    setTagColor('#D88CA3');
    setTagIcon('✨');
    setTagSortOrder(tags.length);
    setTagIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (tag: CharacterTagRecord) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagDescription(tag.description || '');
    setTagColor(tag.color || '#D88CA3');
    setTagIcon(tag.icon || '✨');
    setTagSortOrder(tag.sort_order || 0);
    setTagIsActive(tag.is_active !== undefined ? tag.is_active : true);
    setIsModalOpen(true);
  };

  // Save Tag
  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tagName.trim();
    if (!cleanName) {
      onShowToast('error', 'Lỗi', 'Tên Tag không được để trống.');
      return;
    }

    const cleanSlug = cleanName.toLowerCase();

    // Check duplicate if creating or renaming
    const isDuplicate = allMergedTags.some(
      (t) => t.slug === cleanSlug && (!editingTag || t.id !== editingTag.id)
    );
    if (isDuplicate) {
      onShowToast('error', 'Tag đã tồn tại', `Tag "${cleanName}" đã có trong hệ thống.`);
      return;
    }

    try {
      if (editingTag) {
        // If name changed, cascade rename to characters
        if (editingTag.name !== cleanName) {
          await renameCharacterTag(editingTag.name, cleanName, editingTag, characters, saveCharacter);
          onShowToast('success', 'Đổi tên Tag thành công', `Đã cập nhật Tag "${cleanName}" trên toàn bộ nhân vật.`);
        } else {
          await saveCharacterTag({
            ...editingTag,
            description: tagDescription,
            color: tagColor,
            icon: tagIcon,
            sort_order: tagSortOrder,
            is_active: tagIsActive,
          });
          onShowToast('success', 'Cập nhật Tag thành công', `Tag "${cleanName}" đã được cập nhật.`);
        }
      } else {
        await saveCharacterTag({
          name: cleanName,
          description: tagDescription,
          color: tagColor,
          icon: tagIcon,
          sort_order: tagSortOrder,
          is_active: tagIsActive,
        });
        onShowToast('success', 'Tạo Tag thành công', `Đã thêm Tag "${cleanName}" vào danh mục.`);
      }

      setIsModalOpen(false);
      await loadTags();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi lưu Tag', err?.message || 'Không thể lưu Tag.');
    }
  };

  // Delete Tag
  const handleConfirmDelete = async () => {
    if (!tagToDelete) return;
    try {
      await deleteCharacterTag(tagToDelete.id, tagToDelete.name, characters, saveCharacter);
      onShowToast(
        'success',
        'Xóa Tag thành công',
        `Đã gỡ Tag "${tagToDelete.name}" khỏi các nhân vật và xóa khỏi hệ thống.`
      );
      setTagToDelete(null);
      await loadTags();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi xóa Tag', err?.message || 'Không thể xóa Tag.');
    }
  };

  // Toggle active status
  const handleToggleActive = async (tag: CharacterTagRecord) => {
    try {
      const updated = { ...tag, is_active: !tag.is_active };
      await saveCharacterTag(updated);
      onShowToast(
        'info',
        updated.is_active ? 'Đã bật Tag' : 'Đã ẩn Tag',
        `Tag "${tag.name}" ${updated.is_active ? 'sẽ xuất hiện ở khu vực lọc công khai.' : 'đã ẩn khỏi khu vực lọc công khai.'}`
      );
      await loadTags();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi cập nhật', err?.message);
    }
  };

  // Open Bulk Assign/Unassign Modal
  const handleOpenBulk = (tag: CharacterTagRecord, mode: 'assign' | 'unassign') => {
    setBulkTag(tag);
    setBulkMode(mode);
    setCharSearchQuery('');

    // Pre-populate selections
    const targetSlug = tag.slug;
    if (mode === 'unassign') {
      const using = characters
        .filter((c) => Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().trim() === targetSlug))
        .map((c) => c.id);
      setSelectedCharIds(using);
    } else {
      setSelectedCharIds([]);
    }
  };

  // Execute Bulk Operation
  const handleExecuteBulk = async () => {
    if (!bulkTag || selectedCharIds.length === 0) {
      onShowToast('error', 'Chưa chọn nhân vật', 'Vui lòng chọn ít nhất 1 nhân vật.');
      return;
    }

    try {
      if (bulkMode === 'assign') {
        await bulkAssignTagToCharacters(bulkTag.name, selectedCharIds, characters, saveCharacter);
        onShowToast(
          'success',
          'Gắn Tag hàng loạt thành công',
          `Đã gắn Tag "${bulkTag.name}" cho ${selectedCharIds.length} nhân vật.`
        );
      } else {
        await bulkUnassignTagFromCharacters(bulkTag.name, selectedCharIds, characters, saveCharacter);
        onShowToast(
          'success',
          'Gỡ Tag hàng loạt thành công',
          `Đã gỡ Tag "${bulkTag.name}" khỏi ${selectedCharIds.length} nhân vật.`
        );
      }
      setBulkTag(null);
      setSelectedCharIds([]);
      await loadTags();
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Lỗi thao tác hàng loạt', err?.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#F1D4DF] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-[#D88CA3]" />
            <h2 className="font-serif-title text-xl font-bold text-[#51434A]">
              Quản lý Character Tags
            </h2>
          </div>
          <p className="text-xs text-[#8E7A84] mt-1 font-light">
            Quản lý nhãn thuộc tính, phân loại, màu sắc hiển thị và gắn/gỡ Tag hàng loạt cho nhân vật.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Tag */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#8E7A84] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm Tag..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] placeholder-[#8E7A84] focus:outline-none focus:border-[#E9A9BB]"
            />
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            title="Đồng bộ toàn bộ Tag lên Supabase để hiển thị đầy đủ trên Production Vercel"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#FAF6FC] border border-[#E8D7F7] text-[#865B9E] hover:bg-[#F3E8FA] text-xs font-semibold shadow-2xs hover:shadow-xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Tag mới</span>
          </button>
        </div>
      </div>

      {/* Tags Grid / Table */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F1D4DF] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#51434A]">
            Danh sách Character Tags ({filteredTags.length})
          </span>
          <span className="text-xs text-[#8E7A84]">
            Đồng bộ tự động với bộ lọc thư viện công khai
          </span>
        </div>

        {filteredTags.length === 0 ? (
          <div className="py-12 text-center text-[#8E7A84]">
            <TagIcon className="w-8 h-8 text-[#D88CA3]/50 mx-auto mb-2" />
            <p className="text-sm">Không tìm thấy Tag nào phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FFF5F7] text-[#51434A] font-semibold border-b border-[#F1D4DF]">
                <tr>
                  <th className="px-5 py-3.5">Tag & Biểu tượng</th>
                  <th className="px-5 py-3.5">Mô tả</th>
                  <th className="px-5 py-3.5 text-center">Nhân vật sử dụng</th>
                  <th className="px-5 py-3.5 text-center">Thứ tự</th>
                  <th className="px-5 py-3.5 text-center">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1D4DF]/60">
                {filteredTags.map((tag) => {
                  const usageCount = tagUsageMap.get(tag.slug) || 0;

                  return (
                    <tr key={tag.id} className="hover:bg-[#FAF5FB]/60 transition-colors">
                      {/* Name & Icon & Color */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-sm shadow-2xs shrink-0"
                            style={{ backgroundColor: `${tag.color || '#D88CA3'}20`, color: tag.color || '#D88CA3' }}
                          >
                            {tag.icon || '✨'}
                          </span>
                          <div>
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white shadow-2xs"
                              style={{ backgroundColor: tag.color || '#D88CA3' }}
                            >
                              #{tag.name}
                            </span>
                            <span className="block text-[10px] text-[#8E7A84] mt-0.5 font-mono">
                              slug: {tag.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-3.5 text-[#6E5C65] max-w-xs truncate">
                        {tag.description || <span className="italic text-gray-400">Chưa có mô tả</span>}
                      </td>

                      {/* Usage Count */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => setViewingTagCharacters(tag)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF0F5] hover:bg-[#F6DCE5] text-[#865B9E] font-bold text-xs transition-colors cursor-pointer"
                          title="Xem danh sách nhân vật có gắn Tag này"
                        >
                          <Users className="w-3.5 h-3.5 text-[#D88CA3]" />
                          <span>{usageCount} nhân vật</span>
                        </button>
                      </td>

                      {/* Sort Order */}
                      <td className="px-5 py-3.5 text-center text-[#51434A] font-medium">
                        {tag.sort_order}
                      </td>

                      {/* Active Status */}
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleActive(tag)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                            tag.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                          title={tag.is_active ? 'Nhấn để ẩn khỏi bộ lọc công khai' : 'Nhấn để hiển thị ở bộ lọc'}
                        >
                          {tag.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                          <span>{tag.is_active ? 'Đang bật' : 'Đã ẩn'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Bulk Assign */}
                          <button
                            onClick={() => handleOpenBulk(tag, 'assign')}
                            className="p-1.5 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] transition-colors"
                            title="Gắn Tag hàng loạt cho nhân vật"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          </button>

                          {/* Bulk Unassign */}
                          <button
                            onClick={() => handleOpenBulk(tag, 'unassign')}
                            className="p-1.5 rounded-xl bg-[#FFF5F7] hover:bg-rose-50 text-[#51434A] transition-colors"
                            title="Gỡ Tag hàng loạt khỏi nhân vật"
                          >
                            <X className="w-3.5 h-3.5 text-amber-600" />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEdit(tag)}
                            className="p-1.5 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] transition-colors"
                            title="Chỉnh sửa Tag (Tên, màu, icon, mô tả)"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#865B9E]" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setTagToDelete(tag)}
                            className="p-1.5 rounded-xl bg-[#FFF5F7] hover:bg-red-50 text-[#8E7A84] hover:text-red-600 transition-colors"
                            title="Xóa Tag khỏi hệ thống"
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

      {/* MODAL 1: CREATE / EDIT TAG */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#F1D4DF] shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-[#FFF5F7] border-b border-[#F1D4DF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-[#D88CA3]" />
                <h3 className="font-serif-title font-bold text-base text-[#51434A]">
                  {editingTag ? `Chỉnh sửa Tag: #${editingTag.name}` : 'Thêm Character Tag mới'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white text-[#8E7A84] hover:text-[#51434A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="p-6 space-y-4">
              {/* Tag Name */}
              <div>
                <label className="block text-xs font-semibold text-[#51434A] mb-1">
                  Tên Tag <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Ví dụ: Tsundere, Ma Thuật, High Elf..."
                  className="w-full px-3.5 py-2 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
                />
                {editingTag && editingTag.name !== tagName.trim() && (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Lưu ý: Đổi tên Tag sẽ tự động cập nhật liên kết ở tất cả nhân vật đang mang Tag này.</span>
                  </p>
                )}
              </div>

              {/* Tag Description */}
              <div>
                <label className="block text-xs font-semibold text-[#51434A] mb-1">
                  Mô tả ngắn (tùy chọn)
                </label>
                <input
                  type="text"
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  placeholder="Mô tả ý nghĩa của tag..."
                  className="w-full px-3.5 py-2 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-[#51434A] mb-1">
                  Màu sắc hiển thị
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-8 h-8 rounded-xl shadow-2xs border-2 border-white shrink-0"
                    style={{ backgroundColor: tagColor }}
                  />
                  <input
                    type="text"
                    value={tagColor}
                    onChange={(e) => setTagColor(e.target.value)}
                    placeholder="#D88CA3"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs font-mono"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTagColor(c)}
                      className={`w-6 h-6 rounded-lg transition-transform ${
                        tagColor === c ? 'scale-110 ring-2 ring-offset-1 ring-[#51434A]' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-xs font-semibold text-[#51434A] mb-1">
                  Biểu tượng Icon
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] flex items-center justify-center text-lg shrink-0">
                    {tagIcon}
                  </span>
                  <input
                    type="text"
                    value={tagIcon}
                    onChange={(e) => setTagIcon(e.target.value)}
                    placeholder="Emoji hoặc ký tự (ví dụ: ✨)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {PRESET_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setTagIcon(ic)}
                      className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${
                        tagIcon === ic ? 'bg-[#E9A9BB] text-white shadow-xs' : 'hover:bg-[#FFF5F7]'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort Order & Active */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#51434A] mb-1">
                    Thứ tự ưu tiên
                  </label>
                  <input
                    type="number"
                    value={tagSortOrder}
                    onChange={(e) => setTagSortOrder(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#51434A] mb-1">
                    Trạng thái
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tagIsActive}
                      onChange={(e) => setTagIsActive(e.target.checked)}
                      className="rounded text-[#E9A9BB] focus:ring-[#E9A9BB]"
                    />
                    <span className="text-xs text-[#51434A] font-medium">Bật hiển thị</span>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-[#F1D4DF] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-[#FFF5F7] text-[#51434A] text-xs font-semibold hover:bg-gray-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-2xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 shadow-sm cursor-pointer"
                >
                  {editingTag ? 'Lưu thay đổi' : 'Thêm Tag mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM DELETE */}
      {tagToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl border border-[#F1D4DF] shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif-title font-bold text-lg text-[#51434A]">
                Xác nhận xóa Tag #{tagToDelete.name}?
              </h3>
              <p className="text-xs text-[#8E7A84] mt-2 leading-relaxed">
                Thao tác này sẽ gỡ nhãn <strong>#{tagToDelete.name}</strong> khỏi {tagUsageMap.get(tagToDelete.slug) || 0} nhân vật đang sử dụng. 
                <br /><strong className="text-emerald-700">Dữ liệu các nhân vật sẽ được giữ nguyên hoàn toàn.</strong>
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTagToDelete(null)}
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

      {/* MODAL 3: VIEW CHARACTERS OF TAG */}
      {viewingTagCharacters && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-[#F1D4DF] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#FFF5F7] border-b border-[#F1D4DF] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-[#D88CA3]" />
                <h3 className="font-serif-title font-bold text-base text-[#51434A]">
                  Nhân vật có Tag: #{viewingTagCharacters.name}
                </h3>
              </div>
              <button
                onClick={() => setViewingTagCharacters(null)}
                className="p-1.5 rounded-xl hover:bg-white text-[#8E7A84] hover:text-[#51434A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {characters.filter(
                (c) => Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().trim() === viewingTagCharacters.slug)
              ).length === 0 ? (
                <div className="text-center py-8 text-xs text-[#8E7A84]">
                  Hiện chưa có nhân vật nào được gắn Tag này.
                </div>
              ) : (
                characters
                  .filter(
                    (c) => Array.isArray(c.tags) && c.tags.some((t) => t.toLowerCase().trim() === viewingTagCharacters.slug)
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[#FFF5F7]/80 border border-[#F1D4DF]/80 hover:bg-[#FFF5F7] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={c.avatarUrl || c.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100'}
                          alt={c.name}
                          className="w-10 h-10 rounded-full object-cover border border-white shadow-2xs shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-serif-title font-semibold text-xs text-[#51434A] truncate">
                            {c.name}
                          </p>
                          <p className="text-[10px] text-[#8E7A84] truncate">
                            {c.category || 'General'} • {c.gender || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium shrink-0">
                        {c.status}
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="p-4 border-t border-[#F1D4DF] bg-[#FFF5F7] flex justify-end">
              <button
                type="button"
                onClick={() => setViewingTagCharacters(null)}
                className="px-4 py-2 rounded-2xl bg-white border border-[#F1D4DF] text-[#51434A] text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: BULK ASSIGN / UNASSIGN TAG */}
      {bulkTag && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-[#F1D4DF] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#FFF5F7] border-b border-[#F1D4DF] flex items-center justify-between">
              <div>
                <h3 className="font-serif-title font-bold text-base text-[#51434A]">
                  {bulkMode === 'assign' ? 'Gắn Tag hàng loạt' : 'Gỡ Tag hàng loạt'}: #{bulkTag.name}
                </h3>
                <p className="text-[11px] text-[#8E7A84] mt-0.5">
                  {bulkMode === 'assign'
                    ? 'Chọn các nhân vật bạn muốn gắn thêm Tag này.'
                    : 'Chọn các nhân vật bạn muốn gỡ bỏ Tag này.'}
                </p>
              </div>
              <button
                onClick={() => setBulkTag(null)}
                className="p-1.5 rounded-xl hover:bg-white text-[#8E7A84] hover:text-[#51434A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter in bulk modal */}
            <div className="p-4 border-b border-[#F1D4DF]/80 flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-[#8E7A84] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={charSearchQuery}
                  onChange={(e) => setCharSearchQuery(e.target.value)}
                  placeholder="Tìm nhân vật..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allFilteredIds = characters
                      .filter((c) => !charSearchQuery || c.name.toLowerCase().includes(charSearchQuery.toLowerCase()))
                      .map((c) => c.id);
                    setSelectedCharIds(allFilteredIds);
                  }}
                  className="text-[11px] text-[#865B9E] hover:underline font-medium cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedCharIds([])}
                  className="text-[11px] text-gray-500 hover:underline font-medium cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            {/* List of Characters with Checkboxes */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {characters
                .filter((c) => !charSearchQuery || c.name.toLowerCase().includes(charSearchQuery.toLowerCase()))
                .map((char) => {
                  const isChecked = selectedCharIds.includes(char.id);
                  const hasTagAlready =
                    Array.isArray(char.tags) && char.tags.some((t) => t.toLowerCase().trim() === bulkTag.slug);

                  return (
                    <label
                      key={char.id}
                      className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#FAF0F5] border-[#D88CA3]'
                          : 'bg-white border-[#F1D4DF]/70 hover:bg-[#FFF5F7]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCharIds((prev) => [...prev, char.id]);
                            } else {
                              setSelectedCharIds((prev) => prev.filter((id) => id !== char.id));
                            }
                          }}
                          className="rounded text-[#E9A9BB] focus:ring-[#E9A9BB]"
                        />
                        <img
                          src={char.avatarUrl || char.portraitUrl || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100'}
                          alt={char.name}
                          className="w-8 h-8 rounded-full object-cover border border-white shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="font-semibold text-xs text-[#51434A] block truncate">
                            {char.name}
                          </span>
                          <span className="text-[10px] text-[#8E7A84] block truncate">
                            {char.category}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {hasTagAlready ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đã có tag
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Chưa có tag</span>
                        )}
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="p-4 border-t border-[#F1D4DF] bg-[#FFF5F7] flex items-center justify-between">
              <span className="text-xs text-[#51434A] font-medium">
                Đã chọn: <strong>{selectedCharIds.length}</strong> nhân vật
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkTag(null)}
                  className="px-4 py-2 rounded-2xl bg-white border border-[#F1D4DF] text-[#51434A] text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBulk}
                  className={`px-5 py-2 rounded-2xl text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer ${
                    bulkMode === 'assign'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-105'
                      : 'bg-gradient-to-r from-amber-500 to-rose-600 hover:brightness-105'
                  }`}
                >
                  {bulkMode === 'assign' ? 'Xác nhận gắn Tag' : 'Xác nhận gỡ Tag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
