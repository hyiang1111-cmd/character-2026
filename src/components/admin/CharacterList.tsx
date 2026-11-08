import React, { useState } from 'react';
import {
  Edit,
  Trash2,
  Eye,
  MessageSquare,
  ExternalLink,
  Copy,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Search,
  Filter,
  Check,
  User,
  Plus,
  Files,
  Tag
} from 'lucide-react';
import { Character } from '../../types/character';
import { isValidHttpsUrl } from '../../services/promptGenerator';

interface CharacterListProps {
  characters: Character[];
  onAddNew: () => void;
  onEdit: (character: Character) => void;
  onDuplicate: (character: Character) => void;
  onDelete: (id: string, name: string) => void;
  onTogglePublish: (character: Character) => void;
  onPreview: (character: Character) => void;
  categories: string[];
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const CharacterList: React.FC<CharacterListProps> = ({
  characters,
  onAddNew,
  onEdit,
  onDuplicate,
  onDelete,
  onTogglePublish,
  onPreview,
  categories,
  onShowToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState('All');

  // Filtered characters
  const filtered = characters.filter((char) => {
    // Status
    if (statusFilter === 'published' && char.status !== 'published') return false;
    if (statusFilter === 'draft' && char.status !== 'draft') return false;

    // Category
    if (categoryFilter !== 'All' && char.category !== categoryFilter) return false;

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = char.name.toLowerCase().includes(q);
      const matchNick = (char.nickname || '').toLowerCase().includes(q);
      const matchSpecies = (char.species || '').toLowerCase().includes(q);
      const matchOcc = (char.occupation || '').toLowerCase().includes(q);
      const matchPersonality = (char.personality || '').toLowerCase().includes(q);
      const matchTags = (char.tags || []).some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchNick && !matchSpecies && !matchOcc && !matchPersonality && !matchTags) {
        return false;
      }
    }

    return true;
  });

  const handleCopyViewerLink = async (link?: string) => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      onShowToast('success', 'Viewer Link Copied', 'Public conversation URL copied to clipboard.');
    } catch {
      onShowToast('error', 'Failed to copy link');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#D88CA3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, nickname, species, tags, or personality..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex bg-[#FFF5F7] p-1 rounded-xl border border-[#F1D4DF] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'all' ? 'bg-white text-[#51434A] shadow-xs font-semibold' : 'text-[#8E7A84]'
              }`}
            >
              All ({characters.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'published' ? 'bg-white text-emerald-800 shadow-xs font-semibold' : 'text-[#8E7A84]'
              }`}
            >
              Published ({characters.filter((c) => c.status === 'published').length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                statusFilter === 'draft' ? 'bg-white text-amber-800 shadow-xs font-semibold' : 'text-[#8E7A84]'
              }`}
            >
              Drafts ({characters.filter((c) => c.status === 'draft').length})
            </button>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Characters List or Empty State */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#F1D4DF] p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-[#FFF5F7] border border-[#E9A9BB]/40 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-[#D88CA3]" />
          </div>
          <h3 className="font-serif-title text-xl font-bold text-[#51434A] mb-1">
            {characters.length === 0 ? 'No characters archived yet' : 'No matching characters found'}
          </h3>
          <p className="text-xs text-[#8E7A84] max-w-xs mx-auto mb-6">
            {characters.length === 0
              ? 'Your archive currently starts with zero characters. Click "Add New Character" to create your very first persona.'
              : 'Try clearing your search query or status filter to see other archived records.'}
          </p>
          {characters.length === 0 && (
            <button
              onClick={onAddNew}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Character</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((char) => {
            const avatar = char.avatarUrl || char.portraitUrl;
            const hasChatUrl = Boolean(char.chatUrl && isValidHttpsUrl(char.chatUrl));
            const hasViewerLink = Boolean(char.viewerLink && isValidHttpsUrl(char.viewerLink));

            return (
              <div
                key={char.id}
                className="bg-white rounded-2xl border border-[#F1D4DF] hover:border-[#E9A9BB] p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Character preview & info */}
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#FBE6ED] border border-[#F1D4DF] shrink-0 relative flex items-center justify-center">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt={char.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <span className="font-serif-title font-bold text-lg text-[#D88CA3]">
                        {char.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-serif-title text-xl font-bold text-[#51434A] truncate">
                        {char.name}
                      </h4>
                      {char.nickname && (
                        <span className="text-xs text-[#8E7A84] italic">"{char.nickname}"</span>
                      )}
                      {char.category && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FFF5F7] border border-[#F1D4DF] text-[10px] font-semibold text-[#51434A]">
                          {char.category}
                        </span>
                      )}
                      <button
                        onClick={() => onTogglePublish(char)}
                        title="Click to toggle publish status"
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide transition-colors ${
                          char.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                        }`}
                      >
                        {char.status === 'published' ? '● Published' : '○ Draft'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8E7A84]">
                      {char.species && <span>Species: <strong className="text-[#51434A] font-medium">{char.species}</strong></span>}
                      {char.age && <span>Age: <strong className="text-[#51434A] font-medium">{char.age}</strong></span>}
                      {char.gender && <span>Gender: <strong className="text-[#51434A] font-medium">{char.gender}</strong></span>}
                      {char.occupation && <span>Occupation: <strong className="text-[#51434A] font-medium">{char.occupation}</strong></span>}
                    </div>

                    {/* Tags */}
                    {char.tags && char.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {char.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-md bg-[#FFF5F7] border border-[#F1D4DF] text-[10px] text-[#8E7A84]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Links status badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {hasChatUrl ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>Google AI Studio Chat Link Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>No Chat Link (Button Disabled in Public)</span>
                        </span>
                      )}

                      {hasViewerLink && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#51434A] bg-[#FBE6ED] px-2 py-0.5 rounded-md border border-[#E9A9BB]">
                          <Eye className="w-3 h-3 text-[#D88CA3]" />
                          <span>VIEWER ACCESS ENABLED</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions toolbar */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#F1D4DF]">
                  {/* Test Chat Link if available */}
                  {hasChatUrl && (
                    <button
                      onClick={() => window.open(char.chatUrl, '_blank', 'noopener,noreferrer')}
                      className="p-2 rounded-xl bg-white border border-[#E9A9BB] hover:bg-[#FFF5F7] text-[#51434A] transition-colors"
                      title="Test Google AI Studio conversation link"
                    >
                      <MessageSquare className="w-4 h-4 text-[#D88CA3]" />
                    </button>
                  )}

                  {/* Preview Button */}
                  <button
                    onClick={() => onPreview(char)}
                    className="p-2 rounded-xl bg-white border border-[#F1D4DF] hover:bg-[#FFF5F7] text-[#6E5C65] hover:text-[#51434A] transition-colors"
                    title="Preview public profile"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Duplicate Button */}
                  <button
                    onClick={() => onDuplicate(char)}
                    className="p-2 rounded-xl bg-white border border-[#F1D4DF] hover:bg-[#FBE6ED] text-[#6E5C65] hover:text-[#51434A] transition-colors"
                    title="Duplicate character as draft"
                  >
                    <Files className="w-4 h-4 text-[#D88CA3]" />
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => onEdit(char)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FFF5F7] border border-[#E9A9BB] text-xs font-semibold text-[#51434A] hover:bg-[#FBE6ED] transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#D88CA3]" />
                    <span>Edit</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => onDelete(char.id, char.name)}
                    className="p-2 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-300 transition-colors"
                    title="Delete character"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
