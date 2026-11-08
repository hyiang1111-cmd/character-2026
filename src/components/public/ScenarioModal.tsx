import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Sparkles,
  ScrollText,
  Compass,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { Character } from '../../types/character';
import { isValidHttpsUrl } from '../../services/promptGenerator';

interface ScenarioModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (character: Character) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ScenarioModal: React.FC<ScenarioModalProps> = ({
  character,
  isOpen,
  onClose,
  onStartChat,
  onShowToast,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !character) return null;

  const avatar = character.avatarUrl || character.portraitUrl;
  const hasValidChatUrl = Boolean(character.chatUrl && isValidHttpsUrl(character.chatUrl));

  const scenarioText = character.scenario || character.roleplayScenario || '';
  const greetingText = character.greeting || character.initialGreeting || '';

  const handleCopyScenario = async () => {
    try {
      const compiled = [
        `=== KỊCH BẢN ROLEPLAY: ${character.name.toUpperCase()} ===`,
        character.nickname ? `Biệt danh: "${character.nickname}"` : '',
        character.category ? `Thể loại / Category: ${character.category}` : '',
        character.species ? `Chủng tộc / Species: ${character.species}` : '',
        '',
        '--- CÂU CHÀO BAN ĐẦU (GREETING) ---',
        greetingText || '(Chưa cập nhật)',
        '',
        '--- BỐI CẢNH & KỊCH BẢN (SCENARIO) ---',
        scenarioText || '(Chưa cập nhật)',
        '',
        character.speakingStyle ? `--- PHONG CÁCH NÓI CHUYỆN ---\n${character.speakingStyle}\n` : '',
        character.behavioralRules ? `--- QUY TẮC ỨNG XỬ ---\n${character.behavioralRules}\n` : '',
        character.perspective ? `--- GÓC NHÌN: ${character.perspective} ---\n` : '',
      ]
        .filter(Boolean)
        .join('\n');

      await navigator.clipboard.writeText(compiled);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onShowToast(
        'success',
        'Đã sao chép kịch bản!',
        `Kịch bản roleplay của ${character.name} đã được lưu vào clipboard.`
      );
    } catch (e) {
      onShowToast('error', 'Không thể sao chép kịch bản');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-[#493B55]/50 backdrop-blur-sm animate-in fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Card */}
      <div
        style={{
          borderTop: '2px solid #FFFFFF',
          borderBottom: '2px solid #FFFFFF',
        }}
        className="relative w-full max-w-3xl bg-[#FAF6FC] rounded-3xl border-x border-[#E8D7F7] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
      >
        {/* Header Bar */}
        <div className="px-5 sm:px-6 py-4 bg-[#E8D7F7]/95 border-b border-white flex items-center justify-between sticky top-0 z-20 backdrop-blur-xs">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar with double white border */}
            <div className="relative p-0.5 rounded-full bg-white/70 shadow-2xs border border-white ring-2 ring-white ring-offset-1 ring-offset-[#E8D7F7] shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt={character.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#E5D4F5] flex items-center justify-center text-[#493B55] font-bold text-sm">
                  {character.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif-title font-bold text-lg sm:text-xl text-[#493B55] truncate">
                  {character.name}
                </h3>
                {character.category && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/90 text-[#493B55] text-[10px] font-semibold border border-white shadow-2xs">
                    {character.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#55445F]/80 truncate">
                {character.nickname ? `"${character.nickname}" • ` : ''}Kịch bản Roleplay & Bối cảnh
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white text-[#55445F] hover:text-[#493B55] transition-colors shadow-2xs ml-2 shrink-0"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-[#493B55]">
          {/* Section 1: Greeting message */}
          {greetingText ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#E8D7F7]/60 to-[#E5D4F5]/40 border-2 border-white shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#6D4785] uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4 text-[#865B9E]" />
                <span>Câu chào mở đầu (Opening Greeting)</span>
              </div>
              <p className="text-sm sm:text-base text-[#493B55] italic leading-relaxed whitespace-pre-wrap font-medium">
                "{greetingText}"
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/60 border border-white text-xs text-[#55445F]/70 italic">
              Chưa thiết lập câu chào mở đầu cho nhân vật này.
            </div>
          )}

          {/* Section 2: Full Scenario */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E8D7F7] shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#FAF6FC] pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#6D4785] uppercase tracking-wider">
                <BookOpen className="w-4 h-4 text-[#865B9E]" />
                <span>Bối cảnh & Cốt truyện Roleplay (Scenario)</span>
              </div>
              <button
                onClick={handleCopyScenario}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF6FC] hover:bg-[#E8D7F7] text-[#493B55] text-xs font-semibold border border-[#E8D7F7] transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#865B9E]" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>

            {scenarioText ? (
              <div className="text-xs sm:text-sm text-[#493B55] leading-relaxed whitespace-pre-wrap font-light font-sans max-h-96 overflow-y-auto pr-1">
                {scenarioText}
              </div>
            ) : (
              <p className="text-xs text-[#55445F]/70 italic py-2">
                Chưa có kịch bản chi tiết được cập nhật cho nhân vật này.
              </p>
            )}
          </div>

          {/* Section 3: Directives, Speaking style & Behavioral rules */}
          {(character.speakingStyle || character.behavioralRules || character.perspective) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {character.perspective && (
                <div className="p-4 rounded-2xl bg-white border border-[#E8D7F7] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D4785] uppercase tracking-wider mb-1">
                    <Compass className="w-3.5 h-3.5 text-[#865B9E]" />
                    <span>Góc nhìn (Perspective)</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#493B55] font-medium">
                    {character.perspective}
                  </p>
                </div>
              )}

              {character.speakingStyle && (
                <div className="p-4 rounded-2xl bg-white border border-[#E8D7F7] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D4785] uppercase tracking-wider mb-1">
                    <MessageCircle className="w-3.5 h-3.5 text-[#865B9E]" />
                    <span>Phong cách nói chuyện</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#493B55] font-medium leading-relaxed whitespace-pre-wrap">
                    {character.speakingStyle}
                  </p>
                </div>
              )}

              {character.behavioralRules && (
                <div className="sm:col-span-2 p-4 rounded-2xl bg-white border border-[#E8D7F7] shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D4785] uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#865B9E]" />
                    <span>Quy tắc ứng xử & Giới hạn</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#493B55] font-light leading-relaxed whitespace-pre-wrap">
                    {character.behavioralRules}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section 4: Full System Prompt preview if available */}
          {character.systemPrompt && (
            <div className="p-4 rounded-2xl bg-white border border-[#E8D7F7] shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D4785] uppercase tracking-wider mb-2">
                <ScrollText className="w-4 h-4 text-[#865B9E]" />
                <span>System Prompt hoàn chỉnh</span>
              </div>
              <pre className="text-xs text-[#493B55] bg-[#FAF6FC] p-3 rounded-xl border border-[#E8D7F7] overflow-x-auto whitespace-pre-wrap font-mono">
                {character.systemPrompt}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 sm:px-6 py-4 bg-white/95 border-t border-[#E8D7F7] flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#E8D7F7] text-xs font-medium text-[#55445F] hover:bg-[#FAF6FC] transition-all"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyScenario}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FAF6FC] hover:bg-[#E8D7F7] border border-[#E8D7F7] text-xs font-semibold text-[#493B55] transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã sao chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#865B9E]" />
                  <span>Sao chép kịch bản</span>
                </>
              )}
            </button>

            <button
              onClick={() => onStartChat(character)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#865B9E] hover:bg-[#774D8E] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat với nhân vật</span>
              {hasValidChatUrl && <ExternalLink className="w-3 h-3 opacity-80" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
