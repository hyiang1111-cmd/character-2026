import React from 'react';
import { Tag as TagIcon, X, Sparkles } from 'lucide-react';

export interface CharacterTagItem {
  key: string; // Lowercase normalized key for exact matching (e.g. 'magic', 'male')
  label: string; // Canonical display text with proper casing (e.g. 'Magic', 'Male')
  count: number; // Number of published characters with this tag
  color?: string; // Optional custom color configured in Admin
  icon?: string; // Optional custom emoji icon configured in Admin
}

interface CharacterTagsFilterProps {
  tags: CharacterTagItem[];
  selectedTag: string; // normalized key of selected tag, or '' for all
  onSelectTag: (tagKey: string) => void;
  totalCount: number;
  className?: string;
}

export const CharacterTagsFilter: React.FC<CharacterTagsFilterProps> = ({
  tags,
  selectedTag,
  onSelectTag,
  totalCount,
  className = '',
}) => {
  // If there are no tags used by any characters, render a minimal 'Tất cả' pill
  const isAllActive = !selectedTag;

  const handleTagClick = (tagKey: string) => {
    // If clicking the currently active tag, toggle off (deselect)
    if (selectedTag === tagKey) {
      onSelectTag('');
    } else {
      onSelectTag(tagKey);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Scrollable / wrap container */}
      <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto px-2">
        {/* 'Tất cả' (All) Pill */}
        <button
          type="button"
          onClick={() => onSelectTag('')}
          className={`group inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer shadow-2xs select-none ${
            isAllActive
              ? 'bg-gradient-to-r from-[#D88CA3] via-[#C582B0] to-[#9E6DA4] text-white font-semibold shadow-[0_2px_10px_rgba(216,140,163,0.35)] scale-105 ring-2 ring-white/80'
              : 'bg-white/90 hover:bg-[#FAF5FB] text-[#6E5C65] hover:text-[#51434A] border border-[#F1D4DF] hover:border-[#D88CA3]/60'
          }`}
          title="Xem tất cả nhân vật"
        >
          <Sparkles className={`w-3.5 h-3.5 ${isAllActive ? 'text-white' : 'text-[#D88CA3]'}`} />
          <span>Tất cả</span>
          <span
            className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              isAllActive
                ? 'bg-white/25 text-white'
                : 'bg-[#FBE6ED] text-[#9E6DA4] group-hover:bg-[#F6DCE5]'
            }`}
          >
            {totalCount}
          </span>
        </button>

        {/* Dynamic Character Tags */}
        {tags.map((tag) => {
          const isSelected = selectedTag === tag.key;

          return (
            <button
              key={tag.key}
              type="button"
              onClick={() => handleTagClick(tag.key)}
              style={isSelected && tag.color ? { backgroundColor: tag.color } : {}}
              className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all duration-200 cursor-pointer shadow-2xs select-none ${
                isSelected
                  ? 'bg-gradient-to-r from-[#865B9E] via-[#A06CA8] to-[#D88CA3] text-white font-semibold shadow-[0_3px_12px_rgba(134,91,158,0.35)] scale-105 ring-2 ring-white/90'
                  : 'bg-white/90 hover:bg-[#FAF4FC] text-[#55445F] hover:text-[#3B2C42] border border-[#E8D7F7] hover:border-[#C4A8D9]'
              }`}
              title={isSelected ? `Bỏ lọc tag #${tag.label}` : `Lọc theo tag #${tag.label}`}
            >
              {tag.icon ? (
                <span className="text-xs shrink-0">{tag.icon}</span>
              ) : (
                <TagIcon
                  className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#A06CA8]/80'}`}
                />
              )}
              <span className="font-medium">#{tag.label}</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold transition-colors ${
                  isSelected
                    ? 'bg-white/30 text-white'
                    : 'bg-[#F2E5F7] text-[#774D8E] group-hover:bg-[#EBD4F2]'
                }`}
              >
                {tag.count}
              </span>
              {isSelected && (
                <X className="w-3 h-3 ml-0.5 text-white/90 hover:text-white" />
              )}
            </button>
          );
        })}
      </div>

      {/* Helper text if a tag is active */}
      {selectedTag && (
        <div className="flex items-center justify-center gap-2 mt-3 animate-in fade-in slide-in-from-top-1 text-xs text-[#774D8E]">
          <span className="font-light">
            Đang lọc: <strong className="font-semibold text-[#51434A]">#{tags.find((t) => t.key === selectedTag)?.label || selectedTag}</strong>
          </span>
          <span className="text-gray-300">•</span>
          <button
            type="button"
            onClick={() => onSelectTag('')}
            className="text-xs text-[#D88CA3] hover:text-[#B56782] underline font-medium cursor-pointer"
          >
            Hủy lọc Tag
          </button>
        </div>
      )}
    </div>
  );
};
