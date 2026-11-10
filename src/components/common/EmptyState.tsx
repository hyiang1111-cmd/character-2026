import React from 'react';
import { Sparkles, Plus, BookOpen } from 'lucide-react';

interface EmptyStateProps {
  isAdmin?: boolean;
  onAddCharacter?: () => void;
  isSearchFiltered?: boolean;
  onClearFilters?: () => void;
  activeTag?: string;
  searchQuery?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isAdmin,
  onAddCharacter,
  isSearchFiltered,
  onClearFilters,
  activeTag,
  searchQuery,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto py-16 px-6 text-center">
      <div className="relative inline-flex items-center justify-center mb-6">
        {/* Decorative soft pastel circular rings */}
        <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-[#F6DCE5] to-[#FBE6ED] flex items-center justify-center shadow-inner border border-[#E9A9BB]/40">
          <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-sm">
            <svg
              className="w-12 h-12 text-[#E9A9BB]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Cute delicate open book with sparkle & heart feather */}
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <circle cx="12" cy="9" r="2" fill="#F6DCE5" />
            </svg>
          </div>
        </div>
        <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white shadow-md border border-[#F1D4DF] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-[#D88CA3]" />
        </div>
      </div>

      <h3 className="text-2xl sm:text-3xl font-serif-title font-medium text-[#51434A] mb-3">
        {isSearchFiltered
          ? activeTag
            ? `Không tìm thấy nhân vật phù hợp với Tag #${activeTag}`
            : 'Không tìm thấy nhân vật phù hợp'
          : 'Chưa có nhân vật nào được lưu trữ.'}
      </h3>

      <p className="text-[#8E7A84] text-sm sm:text-base max-w-md mx-auto leading-relaxed mb-6 font-light">
        {isSearchFiltered
          ? activeTag && searchQuery
            ? `Không có nhân vật nào gắn Tag #${activeTag} đồng thời khớp với từ khóa "${searchQuery}". Hãy thử chọn Tag khác hoặc xóa từ khóa tìm kiếm.`
            : activeTag
            ? `Hiện chưa có nhân vật nào gắn Tag #${activeTag}. Bạn có thể chọn Tag khác hoặc xem tất cả nhân vật.`
            : `Không tìm thấy nhân vật nào khớp với từ khóa "${searchQuery}". Hãy thử tìm với tên, thể loại hoặc thuộc tính khác.`
          : 'Các nhân vật do Quản trị viên khởi tạo và xuất bản sẽ xuất hiện tại đây.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {isSearchFiltered ? (
          <button
            onClick={onClearFilters}
            className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#D88CA3] to-[#865B9E] text-white text-sm font-semibold hover:brightness-105 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Xóa bộ lọc & Xem tất cả nhân vật
          </button>
        ) : isAdmin && onAddCharacter ? (
          <button
            onClick={onAddCharacter}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-sm font-medium hover:shadow-md hover:brightness-105 transition-all shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Create First Character
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F6DCE5]/50 border border-[#E9A9BB]/40 text-xs text-[#6E5C65]">
            <BookOpen className="w-3.5 h-3.5 text-[#D88CA3]" />
            <span>Library is currently awaiting new characters from the archive curator.</span>
          </div>
        )}
      </div>
    </div>
  );
};
