import React from 'react';
import { ExternalLink, Eye, MessageSquare, Sparkles, User, AlertCircle, Copy, Check, Tag } from 'lucide-react';
import { Character } from '../../types/character';
import { isValidHttpsUrl } from '../../services/promptGenerator';

interface CharacterCardProps {
  character: Character;
  onOpenDetails: (character: Character) => void;
  onStartChat: (character: Character) => void;
  onViewChat: (character: Character) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onOpenDetails,
  onStartChat,
  onViewChat,
}) => {
  const avatar = character.avatarUrl || character.portraitUrl;
  const hasValidChatUrl = Boolean(character.chatUrl && isValidHttpsUrl(character.chatUrl));
  const hasValidViewerLink = Boolean(character.viewerLink && isValidHttpsUrl(character.viewerLink));

  return (
    <article className="group bg-white rounded-3xl border border-[#F1D4DF] hover:border-[#E9A9BB] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden">
      {/* Portrait area */}
      <div
        className="relative aspect-[4/3] sm:aspect-square overflow-hidden bg-[#FBE6ED]/50 cursor-pointer"
        onClick={() => onOpenDetails(character)}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={character.name}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-tr from-[#F6DCE5]/60 to-[#FBE6ED]/30">
            <div className="w-16 h-16 rounded-full bg-white/80 border border-[#E9A9BB]/40 flex items-center justify-center mb-2 shadow-xs group-hover:scale-110 transition-transform">
              <span className="font-serif-title text-2xl font-bold text-[#D88CA3]">
                {character.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-[#8E7A84] font-medium tracking-wide">Archived Persona</span>
          </div>
        )}

        {/* Badges on top */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
          {character.category && (
            <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[10px] font-semibold text-[#51434A] shadow-xs border border-[#F1D4DF]">
              {character.category}
            </span>
          )}
          {hasValidViewerLink && (
            <span className="px-2.5 py-1 rounded-full bg-[#E9A9BB]/90 text-white backdrop-blur-xs text-[10px] font-bold shadow-xs">
              Viewer Access
            </span>
          )}
        </div>

        {character.species && (
          <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-black/45 backdrop-blur-xs text-white text-[10px] font-medium truncate max-w-full">
              {character.species}
            </span>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header & Nickname */}
          <div className="mb-2">
            <div className="flex items-baseline gap-2">
              <h3
                onClick={() => onOpenDetails(character)}
                className="font-serif-title text-2xl font-semibold text-[#51434A] group-hover:text-[#D88CA3] transition-colors cursor-pointer truncate"
                title={character.name}
              >
                {character.name}
              </h3>
            </div>
            {character.nickname && (
              <p className="text-xs text-[#8E7A84] italic truncate">"{character.nickname}"</p>
            )}
          </div>

          {/* Quick traits */}
          <div className="flex flex-wrap gap-1.5 text-[11px] text-[#6E5C65] mb-3">
            {character.age && (
              <span className="px-2 py-0.5 rounded-md bg-[#FFF5F7] border border-[#F1D4DF]">
                {character.age}
              </span>
            )}
            {character.gender && (
              <span className="px-2 py-0.5 rounded-md bg-[#FFF5F7] border border-[#F1D4DF]">
                {character.gender}
              </span>
            )}
            {character.occupation && (
              <span className="px-2 py-0.5 rounded-md bg-[#FFF5F7] border border-[#F1D4DF] truncate max-w-[140px]">
                {character.occupation}
              </span>
            )}
          </div>

          {/* Short summary or personality preview */}
          <p className="text-xs text-[#6E5C65] line-clamp-2 leading-relaxed mb-3 font-light">
            {character.personality || character.background || character.scenario || 'No personality description recorded.'}
          </p>

          {/* Tags */}
          {character.tags && character.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {character.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded-md bg-[#FBE6ED]/60 text-[10px] text-[#8E7A84]"
                >
                  #{t}
                </span>
              ))}
              {character.tags.length > 3 && (
                <span className="text-[10px] text-[#8E7A84] self-center">
                  +{character.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#F1D4DF]/70 flex flex-col gap-2">
          {/* Primary Action: START CHAT */}
          {hasValidChatUrl ? (
            <button
              onClick={() => onStartChat(character)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold tracking-wide hover:brightness-105 active:scale-98 transition-all shadow-xs"
              title="Open saved Google AI Studio conversation in a new tab"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>START CHAT</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </button>
          ) : (
            <button
              disabled
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#F6DCE5]/40 border border-[#F1D4DF] text-[#8E7A84] text-xs font-medium cursor-not-allowed"
              title="Administrator has not saved a direct Google AI Studio chat link for this character"
            >
              <AlertCircle className="w-3.5 h-3.5 text-[#D88CA3]" />
              <span>Chat link not available</span>
            </button>
          )}

          {/* Secondary Actions: VIEW CHAT & DETAILS */}
          <div className="flex items-center gap-2">
            {hasValidViewerLink && (
              <button
                onClick={() => onViewChat(character)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E9A9BB] text-[#51434A] text-xs font-medium hover:bg-[#FBE6ED] transition-all shadow-xs"
                title="Open public read-only viewer link"
              >
                <Eye className="w-3.5 h-3.5 text-[#D88CA3]" />
                <span>VIEW CHAT</span>
              </button>
            )}

            <button
              onClick={() => onOpenDetails(character)}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#F1D4DF] text-[#6E5C65] text-xs font-medium hover:text-[#51434A] hover:border-[#E9A9BB] hover:bg-[#FFF5F7] transition-all ${
                hasValidViewerLink ? 'flex-1' : 'w-full'
              }`}
            >
              <span>View Profile</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
