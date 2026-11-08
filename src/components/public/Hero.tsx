import React from 'react';
import { Search, Sparkles, X } from 'lucide-react';
import { SiteContent } from '../../types/site';

interface HeroProps {
  siteContent: SiteContent;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  characterCount: number;
}

export const Hero: React.FC<HeroProps> = ({
  siteContent,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  characterCount,
}) => {
  const categories = siteContent.categories || [
    'All',
    'Fantasy',
    'Romance',
    'Sci-Fi',
    'Slice of Life',
    'Mystery',
    'Historical',
  ];

  return (
    <section className="relative overflow-hidden pt-12 pb-10 sm:pt-20 sm:pb-16 text-center">
      {/* Background ambient decorative pastel circles */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-gradient-to-b from-[#FBE6ED]/60 via-[#F6DCE5]/30 to-transparent blur-3xl -z-10 pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Subtle pill badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/80 border border-[#F1D4DF] shadow-xs text-xs font-medium text-[#8E7A84] mb-5 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-3.5 h-3.5 text-[#D88CA3]" />
          <span>Pink Character Archive • {characterCount} {characterCount === 1 ? 'Archived Persona' : 'Archived Personas'}</span>
        </div>

        {/* Hero title & subtitle */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif-title font-medium text-[#51434A] tracking-tight mb-4 leading-tight">
          {siteContent.homeTitle || 'Find Your Character.'}
        </h1>
        <p className="text-base sm:text-lg text-[#6E5C65] font-light max-w-xl mx-auto mb-8 leading-relaxed">
          {siteContent.homeSubtitle ||
            'A little world filled with stories waiting to be discovered.'}
        </p>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative mb-6">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-[#D88CA3] absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by character name, universe, tags or story..."
              className="w-full pl-12 pr-10 py-3.5 bg-white rounded-full border border-[#E9A9BB]/60 text-sm text-[#51434A] placeholder-[#8E7A84]/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E9A9BB]/40 focus:border-[#E9A9BB] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3.5 p-1 rounded-full text-[#8E7A84] hover:text-[#51434A] hover:bg-[#FFF5F7] transition-all"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto pt-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat || (cat === 'All' && selectedCategory === '');
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat === 'All' ? '' : cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-[#E9A9BB] text-white shadow-xs font-semibold scale-105'
                    : 'bg-white/80 border border-[#F1D4DF] text-[#6E5C65] hover:border-[#E9A9BB] hover:bg-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
