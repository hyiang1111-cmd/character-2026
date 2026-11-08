import React, { useState, useRef } from 'react';
import {
  Save,
  ArrowLeft,
  Upload,
  Link,
  MessageSquare,
  Eye,
  AlertCircle,
  CheckCircle,
  Copy,
  ExternalLink,
  Trash2,
  Sparkles,
  User,
  ShieldCheck,
  BookOpen
} from 'lucide-react';
import { Character, CharacterFormData } from '../../types/character';
import { isValidHttpsUrl } from '../../services/promptGenerator';

interface CharacterFormProps {
  initialCharacter?: Character | null;
  onSave: (data: CharacterFormData) => Promise<void>;
  onCancel: () => void;
  categories: string[];
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const CharacterForm: React.FC<CharacterFormProps> = ({
  initialCharacter,
  onSave,
  onCancel,
  categories,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<CharacterFormData>({
    name: initialCharacter?.name || '',
    fullName: initialCharacter?.fullName || '',
    age: initialCharacter?.age || '',
    gender: initialCharacter?.gender || '',
    nationality: initialCharacter?.nationality || '',
    occupation: initialCharacter?.occupation || '',
    universe: initialCharacter?.universe || '',
    category: initialCharacter?.category || (categories[1] || 'Fantasy'),
    portraitUrl: initialCharacter?.portraitUrl || '',

    // Profile
    shortDescription: initialCharacter?.shortDescription || '',
    appearance: initialCharacter?.appearance || '',
    personality: initialCharacter?.personality || '',
    background: initialCharacter?.background || '',
    relationships: initialCharacter?.relationships || '',
    habitsPreferences: initialCharacter?.habitsPreferences || '',
    strengthsWeaknesses: initialCharacter?.strengthsWeaknesses || '',

    // Roleplay
    roleplayScenario: initialCharacter?.roleplayScenario || '',
    initialGreeting: initialCharacter?.initialGreeting || '',
    perspective: initialCharacter?.perspective || 'Second Person (You)',
    speakingStyle: initialCharacter?.speakingStyle || '',
    behavioralRules: initialCharacter?.behavioralRules || '',
    systemPrompt: initialCharacter?.systemPrompt || '',

    // AI Studio Links
    chatUrl: initialCharacter?.chatUrl || '',
    viewerLink: initialCharacter?.viewerLink || '',

    status: initialCharacter?.status || 'published',
  });

  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isChatUrlValid = !formData.chatUrl || isValidHttpsUrl(formData.chatUrl);
  const hasChatUrl = Boolean(formData.chatUrl && formData.chatUrl.trim());
  const isViewerLinkValid = !formData.viewerLink || isValidHttpsUrl(formData.viewerLink);
  const hasViewerLink = Boolean(formData.viewerLink && formData.viewerLink.trim());

  const handleFieldChange = (field: keyof CharacterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('error', 'Invalid File Type', 'Please upload a PNG, JPG, or WEBP image.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onShowToast('error', 'File Too Large', 'Please upload an image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleFieldChange('portraitUrl', reader.result);
        onShowToast('success', 'Portrait Loaded', 'Character portrait updated.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      onShowToast('error', 'Validation Error', 'Character Name is required.');
      return;
    }

    if (formData.chatUrl && !isValidHttpsUrl(formData.chatUrl)) {
      onShowToast('error', 'Invalid Chat URL', 'Google AI Studio Chat URL must be a valid https:// link.');
      return;
    }

    if (formData.viewerLink && !isValidHttpsUrl(formData.viewerLink)) {
      onShowToast('error', 'Invalid Viewer Link', 'Public Viewer Link must be a valid https:// link.');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
    } catch (err: any) {
      onShowToast('error', 'Save Failed', err?.message || 'Could not save character record.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyViewerLink = async () => {
    if (!formData.viewerLink) return;
    try {
      await navigator.clipboard.writeText(formData.viewerLink);
      onShowToast('success', 'Copied to Clipboard', 'Public viewer link copied.');
    } catch {
      onShowToast('error', 'Failed to copy');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-12 animate-in fade-in">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#F1D4DF] shadow-xs sticky top-20 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-serif-title text-2xl font-bold text-[#51434A]">
              {initialCharacter ? `Edit: ${initialCharacter.name}` : 'Archive New Character'}
            </h3>
            <p className="text-xs text-[#8E7A84]">
              Complete all basic traits, lore, and Google AI Studio direct links.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {/* Status selector */}
          <select
            value={formData.status}
            onChange={(e) => handleFieldChange('status', e.target.value as 'published' | 'draft')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors ${
              formData.status === 'published'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}
          >
            <option value="published">Status: Published (Visible)</option>
            <option value="draft">Status: Draft (Private)</option>
          </select>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Character'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: GOOGLE AI STUDIO DIRECT LINKS & PUBLIC VIEWER ACCESS (FEATURE HIGHLIGHT) */}
      <div className="bg-gradient-to-br from-white via-[#FFF5F7] to-[#FBE6ED]/40 rounded-3xl border-2 border-[#E9A9BB] p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F1D4DF]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E9A9BB] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-serif-title text-xl font-bold text-[#51434A]">
                Google AI Studio Direct Links & Public Viewer
              </h4>
              <p className="text-xs text-[#8E7A84]">
                Configure direct one-click conversation launch and public read-only viewer access.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Direct Chat URL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#51434A] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#D88CA3]" />
                <span>Google AI Studio Chat URL</span>
              </label>
              {hasChatUrl && isChatUrlValid && (
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Valid HTTPS Link
                </span>
              )}
            </div>

            <p className="text-xs text-[#6E5C65]">
              Paste the exact URL of an existing Google AI Studio conversation (e.g., <code>https://aistudio.google.com/...</code>). When visitors click <strong>START CHAT</strong>, they will be taken straight to this specific conversation.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={formData.chatUrl}
                onChange={(e) => handleFieldChange('chatUrl', e.target.value)}
                placeholder="https://aistudio.google.com/..."
                className={`flex-1 px-4 py-2.5 rounded-xl bg-white border text-xs text-[#51434A] focus:outline-none transition-all font-mono ${
                  formData.chatUrl && !isChatUrlValid
                    ? 'border-red-400 bg-red-50/40'
                    : 'border-[#F1D4DF] focus:border-[#E9A9BB]'
                }`}
              />

              {hasChatUrl && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(formData.chatUrl, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E9A9BB] hover:bg-[#FBE6ED] text-xs font-semibold text-[#51434A] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D88CA3]" />
                    <span>Test Link</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFieldChange('chatUrl', '')}
                    className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                    title="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {!hasChatUrl ? (
              <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  <strong>Warning:</strong> No chat URL is currently saved. The "START CHAT" button on the character card will be disabled and display "Chat link not available".
                </span>
              </div>
            ) : !isChatUrlValid ? (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Please enter a valid HTTPS URL starting with https://</span>
              </div>
            ) : null}
          </div>

          {/* Public Viewer Link */}
          <div className="space-y-2 pt-4 border-t border-[#F1D4DF]/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#51434A] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#D88CA3]" />
                <span>Public Viewer Link (Read-Only Access)</span>
              </label>

              {hasViewerLink && isViewerLinkValid && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#E9A9BB] text-white text-[10px] font-bold tracking-wide shadow-xs">
                  VIEWER ACCESS ENABLED
                </span>
              )}
            </div>

            <p className="text-xs text-[#6E5C65]">
              Paste a publicly accessible Google AI Studio conversation URL generated via Google's sharing menu. Visitors can click <strong>VIEW CHAT</strong> to view the shared conversation in read-only mode without modifying your original workspace.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={formData.viewerLink}
                onChange={(e) => handleFieldChange('viewerLink', e.target.value)}
                placeholder="https://aistudio.google.com/..."
                className={`flex-1 px-4 py-2.5 rounded-xl bg-white border text-xs text-[#51434A] focus:outline-none transition-all font-mono ${
                  formData.viewerLink && !isViewerLinkValid
                    ? 'border-red-400 bg-red-50/40'
                    : 'border-[#F1D4DF] focus:border-[#E9A9BB]'
                }`}
              />

              {hasViewerLink && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.open(formData.viewerLink, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#E9A9BB] hover:bg-[#FBE6ED] text-xs font-semibold text-[#51434A] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#D88CA3]" />
                    <span>Preview Viewer</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyViewerLink}
                    className="p-2.5 rounded-xl bg-white border border-[#F1D4DF] text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7] transition-colors"
                    title="Copy viewer link"
                  >
                    <Copy className="w-4 h-4 text-[#D88CA3]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFieldChange('viewerLink', '')}
                    className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors"
                    title="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: BASIC INFORMATION */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <User className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            Basic Information
          </h4>
        </div>

        {/* Portrait preview & upload / URL */}
        <div className="flex flex-col sm:flex-row items-start gap-6 p-4 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF]">
          <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white border border-[#E9A9BB]/60 shrink-0 relative flex items-center justify-center">
            {formData.portraitUrl ? (
              <img
                src={formData.portraitUrl}
                alt="Portrait Preview"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="text-center p-2 text-[#8E7A84]">
                <User className="w-8 h-8 mx-auto text-[#D88CA3] mb-1" />
                <span className="text-[10px] block">No Portrait</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 w-full">
            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Character Portrait URL
              </label>
              <input
                type="url"
                value={formData.portraitUrl}
                onChange={(e) => handleFieldChange('portraitUrl', e.target.value)}
                placeholder="https://example.com/portrait.jpg or upload below"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E9A9BB] text-xs font-semibold text-[#51434A] hover:bg-[#FBE6ED] transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#D88CA3]" />
                <span>Upload Image File</span>
              </button>
              {formData.portraitUrl && (
                <button
                  type="button"
                  onClick={() => handleFieldChange('portraitUrl', '')}
                  className="px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  Clear Image
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Character Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g. Aurelia"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
              placeholder="e.g. Aurelia Celestia Vance"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            >
              {categories.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Age
            </label>
            <input
              type="text"
              value={formData.age}
              onChange={(e) => handleFieldChange('age', e.target.value)}
              placeholder="e.g. 21 / 240 (Fae)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Gender
            </label>
            <input
              type="text"
              value={formData.gender}
              onChange={(e) => handleFieldChange('gender', e.target.value)}
              placeholder="e.g. Female / Non-binary"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Nationality / Origin
            </label>
            <input
              type="text"
              value={formData.nationality}
              onChange={(e) => handleFieldChange('nationality', e.target.value)}
              placeholder="e.g. Valyria / Neo-Kyoto"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Occupation
            </label>
            <input
              type="text"
              value={formData.occupation}
              onChange={(e) => handleFieldChange('occupation', e.target.value)}
              placeholder="e.g. Royal Botanist / Hacker"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Universe / Fandom
            </label>
            <input
              type="text"
              value={formData.universe}
              onChange={(e) => handleFieldChange('universe', e.target.value)}
              placeholder="e.g. Original Fantasy World / Cyberpunk 2099"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 3: CHARACTER PROFILE */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <BookOpen className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            Character Profile & Psychological Lore
          </h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Short Description / Summary (Public Card Teaser)
            </label>
            <textarea
              rows={2}
              value={formData.shortDescription}
              onChange={(e) => handleFieldChange('shortDescription', e.target.value)}
              placeholder="A quiet herbalist with silver hair and an uncanny ability to hear echoes of the forest."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Physical Appearance
            </label>
            <textarea
              rows={3}
              value={formData.appearance}
              onChange={(e) => handleFieldChange('appearance', e.target.value)}
              placeholder="Height, eye color, clothing style, distinctive markings, accessories, expression..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Personality & Disposition
            </label>
            <textarea
              rows={3}
              value={formData.personality}
              onChange={(e) => handleFieldChange('personality', e.target.value)}
              placeholder="Core personality traits, emotional responses, social demeanour, inner motivations..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Background Story
            </label>
            <textarea
              rows={4}
              value={formData.background}
              onChange={(e) => handleFieldChange('background', e.target.value)}
              placeholder="Origin, upbringing, pivotal life events, family lineage, current situation..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Relationships & Social Dynamics
            </label>
            <textarea
              rows={2}
              value={formData.relationships}
              onChange={(e) => handleFieldChange('relationships', e.target.value)}
              placeholder="Allies, rivals, romantic interests, family members, or trust boundaries..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Habits and Preferences
              </label>
              <textarea
                rows={3}
                value={formData.habitsPreferences}
                onChange={(e) => handleFieldChange('habitsPreferences', e.target.value)}
                placeholder="Idiosyncrasies, tea choices, reading habits, dislikes..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Strengths and Weaknesses
              </label>
              <textarea
                rows={3}
                value={formData.strengthsWeaknesses}
                onChange={(e) => handleFieldChange('strengthsWeaknesses', e.target.value)}
                placeholder="Skills, magic prowess, fatal flaws, blind spots, emotional triggers..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: ROLEPLAY SETTINGS */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <MessageSquare className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            Roleplay Directives & Behavioral Guidelines
          </h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Initial Greeting Message
            </label>
            <textarea
              rows={2}
              value={formData.initialGreeting}
              onChange={(e) => handleFieldChange('initialGreeting', e.target.value)}
              placeholder="e.g. *She pauses mid-step, looking up from her parchment with guarded eyes.* 'You shouldn't be wandering this high into the observatory...'"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white italic"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Roleplay Scenario
            </label>
            <textarea
              rows={3}
              value={formData.roleplayScenario}
              onChange={(e) => handleFieldChange('roleplayScenario', e.target.value)}
              placeholder="Setting the scene: A stormy evening in the palace apothecary, finding her secret research chamber..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Character Perspective
              </label>
              <select
                value={formData.perspective}
                onChange={(e) => handleFieldChange('perspective', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
              >
                <option value="Second Person (You)">Second Person (You / Conversational)</option>
                <option value="First Person (I)">First Person (I / In-Character)</option>
                <option value="Third Person (Narrative)">Third Person (Narrative / Novelist)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Speaking Style & Cadence
              </label>
              <input
                type="text"
                value={formData.speakingStyle}
                onChange={(e) => handleFieldChange('speakingStyle', e.target.value)}
                placeholder="e.g. Soft-spoken, measured, archaic terminology, avoids slang"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Behavioral Rules & Guardrails
            </label>
            <textarea
              rows={3}
              value={formData.behavioralRules}
              onChange={(e) => handleFieldChange('behavioralRules', e.target.value)}
              placeholder="- Never break character under any circumstance.&#10;- Remain slightly skeptical of newcomers until trust is earned.&#10;- Speak poetically when referencing constellations."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Full System Prompt (Advanced LLM Directives)
            </label>
            <textarea
              rows={5}
              value={formData.systemPrompt}
              onChange={(e) => handleFieldChange('systemPrompt', e.target.value)}
              placeholder="Custom system instructions for Google AI Studio or other LLMs to accompany this persona..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] font-mono focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="flex items-center justify-between gap-4 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-full bg-white border border-[#F1D4DF] text-xs font-semibold text-[#6E5C65] hover:bg-[#FFF5F7] transition-all"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-sm font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Character'}</span>
        </button>
      </div>
    </form>
  );
};
