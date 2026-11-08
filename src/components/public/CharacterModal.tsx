import React, { useState } from 'react';
import {
  X,
  MessageSquare,
  Eye,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  User,
  ShieldAlert,
  Info,
  BookOpen,
  ScrollText,
  Share2
} from 'lucide-react';
import { Character } from '../../types/character';
import { generateCharacterPrompt, isValidHttpsUrl } from '../../services/promptGenerator';

interface CharacterModalProps {
  character: Character | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (character: Character) => void;
  onViewChat: (character: Character) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  character,
  isOpen,
  onClose,
  onStartChat,
  onViewChat,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'roleplay' | 'prompt'>('profile');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !character) return null;

  const hasValidChatUrl = Boolean(character.chatUrl && isValidHttpsUrl(character.chatUrl));
  const hasValidViewerLink = Boolean(character.viewerLink && isValidHttpsUrl(character.viewerLink));

  const handleCopyPrompt = async () => {
    try {
      const prompt = generateCharacterPrompt(character);
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      onShowToast(
        'success',
        'Character Prompt Copied!',
        'Ready to paste into your Google AI Studio or LLM chat workspace.'
      );
    } catch (e) {
      onShowToast('error', 'Failed to copy prompt to clipboard');
    }
  };

  const handleCopyPromptAndLaunchStudio = async () => {
    await handleCopyPrompt();
    window.open('https://aistudio.google.com/', '_blank', 'noopener,noreferrer');
    onShowToast(
      'info',
      'Google AI Studio Launched',
      'Paste the copied prompt into System Instructions or initial message.'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-[#51434A]/40 backdrop-blur-sm animate-in fade-in">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-3xl bg-[#FFF5F7] rounded-3xl border border-[#F1D4DF] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-white/90 border-b border-[#F1D4DF] flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="font-serif-title font-semibold text-xl text-[#51434A]">
              {character.name}
            </span>
            {character.category && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FBE6ED] text-[#51434A] text-[10px] font-semibold border border-[#E9A9BB]/40">
                {character.category}
              </span>
            )}
            {hasValidViewerLink && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#E9A9BB] text-white text-[10px] font-bold">
                VIEWER ACCESS ENABLED
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#8E7A84] hover:text-[#51434A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Hero Portrait & Summary card */}
          <div className="flex flex-col sm:flex-row gap-6 bg-white p-5 rounded-2xl border border-[#F1D4DF] shadow-xs">
            {/* Portrait */}
            <div className="w-full sm:w-44 h-56 sm:h-56 shrink-0 rounded-2xl overflow-hidden bg-[#FBE6ED] border border-[#F1D4DF] relative">
              {character.portraitUrl ? (
                <img
                  src={character.portraitUrl}
                  alt={character.name}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-xs mb-2">
                    <span className="font-serif-title text-2xl font-bold text-[#D88CA3]">
                      {character.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-[#8E7A84]">Archived Persona</span>
                </div>
              )}
            </div>

            {/* Basic Info & Summary */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h2 className="font-serif-title text-3xl font-bold text-[#51434A] mb-1">
                  {character.name}
                </h2>
                {character.fullName && (
                  <p className="text-xs text-[#8E7A84] mb-3">Full Identity: {character.fullName}</p>
                )}

                {/* Badges matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mb-4">
                  {character.age && (
                    <div className="p-2 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF]">
                      <span className="text-[10px] text-[#8E7A84] block font-medium">AGE</span>
                      <span className="font-semibold text-[#51434A]">{character.age}</span>
                    </div>
                  )}
                  {character.gender && (
                    <div className="p-2 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF]">
                      <span className="text-[10px] text-[#8E7A84] block font-medium">GENDER</span>
                      <span className="font-semibold text-[#51434A]">{character.gender}</span>
                    </div>
                  )}
                  {character.nationality && (
                    <div className="p-2 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF]">
                      <span className="text-[10px] text-[#8E7A84] block font-medium">ORIGIN</span>
                      <span className="font-semibold text-[#51434A]">{character.nationality}</span>
                    </div>
                  )}
                  {character.occupation && (
                    <div className="p-2 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF]">
                      <span className="text-[10px] text-[#8E7A84] block font-medium">OCCUPATION</span>
                      <span className="font-semibold text-[#51434A]">{character.occupation}</span>
                    </div>
                  )}
                  {character.universe && (
                    <div className="p-2 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] col-span-2">
                      <span className="text-[10px] text-[#8E7A84] block font-medium">UNIVERSE / FANDOM</span>
                      <span className="font-semibold text-[#51434A]">{character.universe}</span>
                    </div>
                  )}
                </div>

                {character.shortDescription && (
                  <p className="text-xs sm:text-sm text-[#6E5C65] leading-relaxed italic border-l-2 border-[#E9A9BB] pl-3 py-0.5">
                    "{character.shortDescription}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Bar inside modal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-[#F1D4DF]">
            {/* Start Chat Button */}
            {hasValidChatUrl ? (
              <button
                onClick={() => onStartChat(character)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-sm font-bold tracking-wide hover:brightness-105 active:scale-98 transition-all shadow-sm"
              >
                <MessageSquare className="w-4 h-4" />
                <span>START CHAT (GOOGLE AI STUDIO)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            ) : (
              <div
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#F6DCE5]/40 border border-[#F1D4DF] text-[#8E7A84] text-xs font-medium cursor-not-allowed"
                title="Google AI Studio Chat URL not yet provided by administrator"
              >
                <ShieldAlert className="w-4 h-4 text-[#D88CA3]" />
                <span>Chat link not available</span>
              </div>
            )}

            {/* View Chat / Public Viewer Button */}
            {hasValidViewerLink ? (
              <button
                onClick={() => onViewChat(character)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#E9A9BB] text-[#51434A] text-sm font-bold hover:bg-[#FBE6ED] active:scale-98 transition-all shadow-xs"
              >
                <Eye className="w-4 h-4 text-[#D88CA3]" />
                <span>VIEW CHAT (PUBLIC ACCESS)</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </button>
            ) : (
              <button
                onClick={handleCopyPromptAndLaunchStudio}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white border border-[#F1D4DF] text-[#6E5C65] text-xs font-semibold hover:border-[#E9A9BB] hover:text-[#51434A] transition-all"
              >
                <Copy className="w-4 h-4 text-[#D88CA3]" />
                <span>Copy Prompt & Open AI Studio</span>
              </button>
            )}
          </div>

          {/* Navigation Tabs for detailed lore */}
          <div className="flex border-b border-[#F1D4DF] gap-4 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'border-[#E9A9BB] text-[#51434A]'
                  : 'border-transparent text-[#8E7A84] hover:text-[#51434A]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Full Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('roleplay')}
              className={`pb-3 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'roleplay'
                  ? 'border-[#E9A9BB] text-[#51434A]'
                  : 'border-transparent text-[#8E7A84] hover:text-[#51434A]'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Roleplay Directives</span>
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`pb-3 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'prompt'
                  ? 'border-[#E9A9BB] text-[#51434A]'
                  : 'border-transparent text-[#8E7A84] hover:text-[#51434A]'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Export System Prompt</span>
            </button>
          </div>

          {/* Tab 1: Profile Lore */}
          {activeTab === 'profile' && (
            <div className="space-y-4 text-xs sm:text-sm">
              {character.personality && (
                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                  <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                    Personality & Temperament
                  </h4>
                  <p className="text-[#51434A] leading-relaxed whitespace-pre-line font-light">
                    {character.personality}
                  </p>
                </div>
              )}

              {character.appearance && (
                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                  <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                    Physical Appearance
                  </h4>
                  <p className="text-[#51434A] leading-relaxed whitespace-pre-line font-light">
                    {character.appearance}
                  </p>
                </div>
              )}

              {character.background && (
                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                  <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                    Background Story
                  </h4>
                  <p className="text-[#51434A] leading-relaxed whitespace-pre-line font-light">
                    {character.background}
                  </p>
                </div>
              )}

              {character.relationships && (
                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                  <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                    Key Relationships
                  </h4>
                  <p className="text-[#51434A] leading-relaxed whitespace-pre-line font-light">
                    {character.relationships}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {character.habitsPreferences && (
                  <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                    <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                      Habits & Preferences
                    </h4>
                    <p className="text-[#51434A] leading-relaxed whitespace-pre-line font-light">
                      {character.habitsPreferences}
                    </p>
                  </div>
                )}
                {character.strengthsWeaknesses && (
                  <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                    <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                      Strengths & Weaknesses
                    </h4>
                    <p className="text-[#51434A] leading-relaxed whitespace-pre-line font-light">
                      {character.strengthsWeaknesses}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Roleplay Directives */}
          {activeTab === 'roleplay' && (
            <div className="space-y-4 text-xs sm:text-sm">
              {character.initialGreeting && (
                <div className="bg-white p-4 rounded-2xl border border-[#E9A9BB]/60 bg-gradient-to-r from-white to-[#FBE6ED]/40">
                  <h4 className="font-semibold text-xs text-[#D88CA3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Initial Greeting Message</span>
                  </h4>
                  <p className="text-[#51434A] font-medium italic text-sm leading-relaxed">
                    "{character.initialGreeting}"
                  </p>
                </div>
              )}

              {character.roleplayScenario && (
                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                  <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                    Current Scenario / Setting
                  </h4>
                  <p className="text-[#51434A] leading-relaxed whitespace-pre-line font-light">
                    {character.roleplayScenario}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {character.perspective && (
                  <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                    <span className="text-[10px] text-[#8E7A84] block font-semibold uppercase">Perspective</span>
                    <span className="text-sm font-medium text-[#51434A]">{character.perspective}</span>
                  </div>
                )}
                {character.speakingStyle && (
                  <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                    <span className="text-[10px] text-[#8E7A84] block font-semibold uppercase">Speaking Style</span>
                    <span className="text-sm font-medium text-[#51434A]">{character.speakingStyle}</span>
                  </div>
                )}
              </div>

              {character.behavioralRules && (
                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                  <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                    Behavioral Rules & Boundaries
                  </h4>
                  <p className="text-[#51434A] leading-relaxed whitespace-pre-line font-light">
                    {character.behavioralRules}
                  </p>
                </div>
              )}

              {character.systemPrompt && (
                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF]">
                  <h4 className="font-semibold text-xs text-[#8E7A84] uppercase tracking-wider mb-2">
                    Full System Prompt
                  </h4>
                  <pre className="text-xs text-[#51434A] font-mono bg-[#FFF5F7] p-3 rounded-xl border border-[#F1D4DF] overflow-x-auto whitespace-pre-wrap">
                    {character.systemPrompt}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Export Prompt */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-[#F1D4DF]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-[#D88CA3]" />
                    <span className="text-xs font-semibold text-[#51434A] uppercase tracking-wider">
                      Compiled Character Prompt
                    </span>
                  </div>
                  <button
                    onClick={handleCopyPrompt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFF5F7] border border-[#E9A9BB] text-xs font-medium text-[#51434A] hover:bg-[#FBE6ED] transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-700 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#D88CA3]" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={generateCharacterPrompt(character)}
                  rows={10}
                  className="w-full text-xs font-mono p-3 bg-[#FFF5F7] rounded-xl border border-[#F1D4DF] text-[#51434A] focus:outline-none"
                />
              </div>

              <div className="p-4 rounded-2xl bg-[#FBE6ED]/60 border border-[#E9A9BB]/50 text-xs text-[#6E5C65] space-y-2">
                <div className="flex items-center gap-2 font-semibold text-[#51434A]">
                  <Info className="w-4 h-4 text-[#D88CA3]" />
                  <span>How to use with Google AI Studio</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pl-1">
                  <li>Click <strong>Copy Prompt</strong> above or copy with the button below.</li>
                  <li>Open <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#D88CA3] underline font-medium">Google AI Studio</a> in a new tab.</li>
                  <li>Click <strong>New Chat Prompt</strong>.</li>
                  <li>Paste this prompt into the <strong>System Instructions</strong> pane, or directly as your first message.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Sticky Footer */}
        <div className="px-6 py-4 bg-white/95 border-t border-[#F1D4DF] flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white border border-[#F1D4DF] text-[#6E5C65] hover:text-[#51434A] text-xs font-medium hover:bg-[#FFF5F7] transition-all"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPrompt}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFF5F7] border border-[#E9A9BB] text-xs font-medium text-[#51434A] hover:bg-[#FBE6ED] transition-all"
            >
              <Copy className="w-3.5 h-3.5 text-[#D88CA3]" />
              <span>Copy Prompt</span>
            </button>
            {hasValidChatUrl && (
              <button
                onClick={() => onStartChat(character)}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>START CHAT</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
