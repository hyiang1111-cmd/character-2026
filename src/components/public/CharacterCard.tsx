import React from 'react';
import { ExternalLink, MessageSquare, User, BookOpen, Flame } from 'lucide-react';
import { Character } from '../../types/character';
import { isValidHttpsUrl } from '../../services/promptGenerator';

interface CharacterCardProps {
  character: Character;
  onOpenDetails: (character: Character) => void;
  onOpenScenario: (character: Character) => void;
  onStartChat: (character: Character) => void;
  onViewChat?: (character: Character) => void;
  onSelectTag?: (tag: string) => void;
  totalChats?: number;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onOpenDetails,
  onOpenScenario,
  onStartChat,
  onSelectTag,
  totalChats = 0,
}) => {
  const avatar = character.avatarUrl || character.portraitUrl;
  const hasValidChatUrl = Boolean(character.chatUrl && isValidHttpsUrl(character.chatUrl));

  // Short summary or backstory text
  const summaryText =
    character.shortDescription ||
    character.background ||
    character.personality ||
    character.scenario ||
    'Nhân vật được lưu trữ trong Pink Character Archive.';

  return (
    <article
      style={{
        backgroundColor: '#E8D7F7',
        borderTop: '2px solid #FFFFFF',
        borderBottom: '2px solid #FFFFFF',
      }}
      className="group relative rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_rgba(73,59,85,0.06)] hover:shadow-[0_8px_30px_rgba(73,59,85,0.12)] transition-all duration-300 flex flex-col justify-between overflow-hidden"
    >
      {/* Top Section: Avatar Left + Content Right */}
      <div>
        <div className="flex items-start gap-3.5 sm:gap-4">
          {/* Avatar on Left with complete circle & double white ring */}
          <div
            onClick={() => onOpenDetails(character)}
            className="cursor-pointer shrink-0 relative group/avatar"
            title={`Xem chi tiết ${character.name}`}
          >
            <div className="p-0.5 sm:p-1 rounded-full bg-white/75 border-2 border-white ring-2 ring-white ring-offset-2 ring-offset-[#E8D7F7] shadow-xs transition-transform duration-300 group-hover/avatar:scale-105">
              <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-full overflow-hidden bg-[#FAF6FC] flex items-center justify-center">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={character.name}
                    className="w-full h-full object-cover rounded-full"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-[#E8D7F7] to-[#E5D4F5] flex items-center justify-center">
                    <span className="font-serif-title text-2xl font-bold text-[#493B55]">
                      {character.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content on Right: 1. Name & Chat Opens Badge, 2. Nickname, 3. Tags */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1.5">
              {/* 1. Tên nhân vật */}
              <h3
                onClick={() => onOpenDetails(character)}
                className="font-serif-title text-lg sm:text-xl font-bold text-[#493B55] hover:text-[#774D8E] transition-colors cursor-pointer truncate leading-tight flex-1"
                title={character.name}
              >
                {character.name}
              </h3>

              {/* Flame 🔥 Chat Opens Count Badge */}
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-700 shadow-2xs shrink-0"
                title={`Tổng lượt mở cuộc trò chuyện: ${totalChats}`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
                <span className="text-xs font-bold font-mono tabular-nums">{totalChats}</span>
              </div>
            </div>

            {/* 2. Nickname: hiển thị dưới tên nhân vật */}
            {character.nickname ? (
              <p className="text-xs text-[#55445F]/85 italic truncate mt-0.5 font-serif">
                "{character.nickname}"
              </p>
            ) : character.species ? (
              <p className="text-xs text-[#55445F]/75 truncate mt-0.5">
                {character.species}
              </p>
            ) : null}

            {/* 3. Tags / Nhãn */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {character.tags && character.tags.length > 0 ? (
                character.tags.slice(0, 3).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTag?.(tag);
                    }}
                    className={`inline-block px-2.5 py-0.5 rounded-full bg-white/90 text-[#493B55] text-[10px] font-medium border border-white shadow-2xs truncate max-w-[110px] ${
                      onSelectTag
                        ? 'hover:bg-[#FFF0F5] hover:text-[#774D8E] hover:border-[#F1D4DF] cursor-pointer transition-colors'
                        : ''
                    }`}
                    title={onSelectTag ? `Lọc nhân vật theo #${tag}` : `#${tag}`}
                  >
                    #{tag}
                  </button>
                ))
              ) : null}

              {character.category && (
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#E5D4F5] text-[#493B55] text-[10px] font-semibold border border-white shadow-2xs">
                  {character.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 4. Mô tả / Cốt truyện tóm tắt */}
        <div className="mt-3.5">
          <p className="text-xs text-[#493B55] leading-relaxed line-clamp-3 sm:line-clamp-4 font-normal">
            {summaryText}
          </p>
        </div>
      </div>

      {/* 5. 3 Nút chức năng ở mỗi thẻ */}
      <div className="mt-4 pt-3 border-t border-white/70 flex flex-col gap-2">
        {/* Nút 1: Chat với nhân vật */}
        <button
          onClick={() => onStartChat(character)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/90 hover:bg-white text-[#493B55] text-xs font-bold border border-white shadow-2xs hover:shadow-xs active:scale-[0.99] transition-all cursor-pointer"
          title={
            hasValidChatUrl
              ? 'Mở trò chuyện Google AI Studio'
              : 'Chưa có liên kết trò chuyện Google AI Studio'
          }
        >
          <MessageSquare className="w-3.5 h-3.5 text-[#865B9E]" />
          <span>Chat với nhân vật</span>
          {hasValidChatUrl && <ExternalLink className="w-3 h-3 text-[#865B9E]/80" />}
        </button>

        {/* Nút 2: Thông tin nhân vật & Nút 3: Kịch bản */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenDetails(character)}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/75 hover:bg-white text-[#493B55] text-xs font-semibold border border-white/90 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
            title="Xem toàn bộ hồ sơ nhân vật"
          >
            <User className="w-3.5 h-3.5 text-[#865B9E] shrink-0" />
            <span className="truncate">Thông tin</span>
          </button>

          <button
            onClick={() => onOpenScenario(character)}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-[#E5D4F5]/90 hover:bg-[#E5D4F5] text-[#493B55] text-xs font-semibold border border-white/90 shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
            title="Xem kịch bản roleplay và lời chào mở đầu"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#865B9E] shrink-0" />
            <span className="truncate">Kịch bản</span>
          </button>
        </div>
      </div>
    </article>
  );
};
