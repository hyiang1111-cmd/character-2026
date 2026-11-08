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
  BookOpen,
  Tag,
  X,
  FileText,
  Loader2,
  Lock
} from 'lucide-react';
import { Character, CharacterFormData } from '../../types/character';
import { isValidHttpsUrl } from '../../services/promptGenerator';
import { useAuth } from '../../context/AuthContext';
import { parseFriendlyErrorMessage } from '../../services/firebase';

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
  const { currentUser, isAdmin, designatedAdminEmail, loginAsAdmin, isAuthenticating } = useAuth();

  const [formData, setFormData] = useState<CharacterFormData>({
    name: initialCharacter?.name || '',
    nickname: initialCharacter?.nickname || '',
    age: initialCharacter?.age || '',
    gender: initialCharacter?.gender || '',
    species: initialCharacter?.species || '',
    occupation: initialCharacter?.occupation || '',
    category: initialCharacter?.category || (categories.find(c => c !== 'All') || 'Fantasy'),

    // Visuals & Avatar
    avatarUrl: initialCharacter?.avatarUrl || initialCharacter?.portraitUrl || '',
    portraitUrl: initialCharacter?.avatarUrl || initialCharacter?.portraitUrl || '',

    // Profile Details
    personality: initialCharacter?.personality || '',
    appearance: initialCharacter?.appearance || '',
    background: initialCharacter?.background || '',
    relationships: initialCharacter?.relationships || '',
    habitsPreferences: initialCharacter?.habitsPreferences || '',
    strengthsWeaknesses: initialCharacter?.strengthsWeaknesses || '',

    // Roleplay Settings
    scenario: initialCharacter?.scenario || initialCharacter?.roleplayScenario || '',
    greeting: initialCharacter?.greeting || initialCharacter?.initialGreeting || '',
    perspective: initialCharacter?.perspective || 'Second Person (You)',
    speakingStyle: initialCharacter?.speakingStyle || '',
    behavioralRules: initialCharacter?.behavioralRules || '',
    systemPrompt: initialCharacter?.systemPrompt || '',

    // Google AI Studio Links
    chatUrl: initialCharacter?.chatUrl || '',
    viewerLink: initialCharacter?.viewerLink || '',

    // Tags
    tags: Array.isArray(initialCharacter?.tags) ? initialCharacter.tags : [],

    // Status
    status: initialCharacter?.status || 'published',
  });

  const [newTagInput, setNewTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeUrl = (url?: string): string => {
    if (!url || !url.trim()) return '';
    let trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  };

  const isChatUrlValid = !formData.chatUrl || isValidHttpsUrl(normalizeUrl(formData.chatUrl));
  const hasChatUrl = Boolean(formData.chatUrl && formData.chatUrl.trim());
  const isViewerLinkValid = !formData.viewerLink || isValidHttpsUrl(normalizeUrl(formData.viewerLink));
  const hasViewerLink = Boolean(formData.viewerLink && formData.viewerLink.trim());

  const handleFieldChange = (field: keyof CharacterFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
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
        setFormData((prev) => ({
          ...prev,
          avatarUrl: reader.result as string,
          portraitUrl: reader.result as string,
        }));
        onShowToast('success', 'Avatar Loaded', 'Character avatar image updated.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddTag = () => {
    const trimmed = newTagInput.trim();
    if (trimmed && !formData.tags.includes(trimmed)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, trimmed] }));
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tagToRemove),
    }));
  };

  const handleSaveWithStatus = async (status: 'published' | 'draft') => {
    // Prevent duplicate submission while already saving
    if (saving) return;

    setFormError(null);

    // Validation
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      const err = 'Validation Error: Character Name is required.';
      setFormError(err);
      onShowToast('error', 'Validation Error', 'Please enter a character name.');
      return;
    }

    const normalizedChatUrl = normalizeUrl(formData.chatUrl);
    if (normalizedChatUrl && !isValidHttpsUrl(normalizedChatUrl)) {
      const err = 'Invalid Chat URL: Google AI Studio Chat URL must be a valid https:// link.';
      setFormError(err);
      onShowToast('error', 'Invalid Chat URL', 'Please enter a valid https:// Google AI Studio link.');
      return;
    }

    const normalizedViewerLink = normalizeUrl(formData.viewerLink);
    if (normalizedViewerLink && !isValidHttpsUrl(normalizedViewerLink)) {
      const err = 'Invalid Viewer Link: Public Viewer Link must be a valid https:// link.';
      setFormError(err);
      onShowToast('error', 'Invalid Viewer Link', 'Please enter a valid https:// viewer link.');
      return;
    }

    setSaving(true);
    try {
      const payload: CharacterFormData = {
        ...formData,
        name: trimmedName,
        status,
        chatUrl: normalizedChatUrl,
        viewerLink: normalizedViewerLink,
        avatarUrl: formData.avatarUrl || formData.portraitUrl || '',
        portraitUrl: formData.avatarUrl || formData.portraitUrl || '',
        scenario: formData.scenario || formData.roleplayScenario || '',
        roleplayScenario: formData.scenario || formData.roleplayScenario || '',
        greeting: formData.greeting || formData.initialGreeting || '',
        initialGreeting: formData.greeting || formData.initialGreeting || '',
        tags: Array.isArray(formData.tags) ? formData.tags : [],
      };

      await onSave(payload);
      setFormError(null);
    } catch (err: any) {
      const friendly = parseFriendlyErrorMessage(err);
      setFormError(friendly);
      onShowToast('error', 'Save Failed', friendly);
      console.error('Character save failure:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSaveWithStatus('published');
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
    <form onSubmit={handleFormSubmit} className="space-y-8 max-w-4xl mx-auto pb-16 animate-in fade-in">
      {/* Top action header with all 3 working buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#F1D4DF] shadow-xs sticky top-20 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-2 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] transition-colors disabled:opacity-50"
            title="Cancel and return"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="font-serif-title text-2xl font-bold text-[#51434A]">
              {initialCharacter ? `Edit: ${initialCharacter.name}` : 'Add New Character'}
            </h3>
            <p className="text-xs text-[#8E7A84]">
              Fill in character traits and Google AI Studio direct links.
            </p>
          </div>
        </div>

        {/* 3 Prominent Action Buttons: Save Character, Save as Draft, Cancel */}
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs font-semibold text-[#6E5C65] hover:bg-[#FFF5F7] transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleSaveWithStatus('draft')}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFF5F7] border border-[#E9A9BB] text-xs font-bold text-[#51434A] hover:bg-[#FBE6ED] active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-[#D88CA3]" />
            <span>Save as Draft</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to Firestore...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Character</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Persistent Inline Error Banner if saving failed */}
      {formError && (
        <div className="p-4 rounded-2xl bg-[#FFF0F3] border border-[#F2A4B8] flex items-start gap-3 text-xs text-[#7A2E3D] shadow-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#D94C6D] mt-0.5" />
          <div className="flex-1">
            <strong className="block font-semibold mb-0.5">Could not save character to Firestore:</strong>
            <p className="leading-relaxed">{formError}</p>
          </div>
          <button
            type="button"
            onClick={() => setFormError(null)}
            className="p-1 hover:bg-[#FBE6ED] rounded text-[#8E7A84]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Authentication Status Diagnostic Banner */}
      {!currentUser ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Authentication Required:</strong> You are currently unauthenticated. Cloud Firestore security rules mandate logging in as <strong>{designatedAdminEmail}</strong> to create or update characters.
            </span>
          </div>
          <button
            type="button"
            onClick={loginAsAdmin}
            disabled={isAuthenticating}
            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 disabled:opacity-50"
          >
            {isAuthenticating ? 'Signing In...' : 'Sign in as Admin'}
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Firestore Write Access Active: Authenticated as <strong>{currentUser.email}</strong>
            </span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
            Authorized Curator
          </span>
        </div>
      )}

      {/* SECTION 1: BASIC INFORMATION */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <User className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            1. Basic Information
          </h4>
        </div>

        {/* Avatar Image Upload & URL */}
        <div className="flex flex-col sm:flex-row items-start gap-6 p-4 rounded-2xl bg-[#FFF5F7] border border-[#F1D4DF]">
          <div className="w-28 h-28 rounded-2xl overflow-hidden bg-white border border-[#E9A9BB]/60 shrink-0 relative flex items-center justify-center">
            {formData.avatarUrl ? (
              <img
                src={formData.avatarUrl}
                alt="Avatar Preview"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="text-center p-2 text-[#8E7A84]">
                <User className="w-8 h-8 mx-auto text-[#D88CA3] mb-1" />
                <span className="text-[10px] block">No Avatar</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-3 w-full">
            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Avatar Image Upload or Image URL
              </label>
              <input
                type="url"
                value={formData.avatarUrl}
                onChange={(e) => {
                  handleFieldChange('avatarUrl', e.target.value);
                  handleFieldChange('portraitUrl', e.target.value);
                }}
                placeholder="https://example.com/avatar.jpg or upload below"
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E9A9BB] text-xs font-semibold text-[#51434A] hover:bg-[#FBE6ED] transition-colors shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#D88CA3]" />
                <span>Upload Avatar File</span>
              </button>
              {formData.avatarUrl && (
                <button
                  type="button"
                  onClick={() => {
                    handleFieldChange('avatarUrl', '');
                    handleFieldChange('portraitUrl', '');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs text-red-600 hover:bg-red-50 transition-colors"
                >
                  Clear Avatar
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
              placeholder="e.g. Seraphina"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Nickname / Alias
            </label>
            <input
              type="text"
              value={formData.nickname || ''}
              onChange={(e) => handleFieldChange('nickname', e.target.value)}
              placeholder="e.g. Sera, The Rose Astrologer"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Age
            </label>
            <input
              type="text"
              value={formData.age}
              onChange={(e) => handleFieldChange('age', e.target.value)}
              placeholder="e.g. 21 / Appears 20 (Immortal)"
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
              placeholder="e.g. Female / Male / Non-binary"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Species
            </label>
            <input
              type="text"
              value={formData.species || ''}
              onChange={(e) => handleFieldChange('species', e.target.value)}
              placeholder="e.g. High Elf, Human, Kitsune, Android"
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
              placeholder="e.g. Royal Botanist / Astral Archivist"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div className="sm:col-span-2">
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
        </div>

        {/* Tags management */}
        <div className="pt-2">
          <label className="block text-xs font-semibold text-[#51434A] mb-1 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-[#D88CA3]" />
            <span>Character Tags</span>
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#FBE6ED] text-[#51434A] text-xs font-medium border border-[#E9A9BB]/40"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 max-w-sm">
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add a tag and press enter (e.g. tsundere, magic, soft)"
              className="flex-1 px-3 py-1.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-[#E9A9BB] text-xs font-semibold text-[#51434A] hover:bg-[#FBE6ED]"
            >
              Add Tag
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: GOOGLE AI STUDIO CHAT URL */}
      <div className="bg-gradient-to-br from-white via-[#FFF5F7] to-[#FBE6ED]/40 rounded-3xl border-2 border-[#E9A9BB] p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#D88CA3]" />
            <h4 className="font-serif-title text-xl font-bold text-[#51434A]">
              Google AI Studio Chat URL
            </h4>
          </div>
          {hasChatUrl && isChatUrlValid && (
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Valid HTTPS Link
            </span>
          )}
        </div>

        <p className="text-xs text-[#6E5C65] leading-relaxed">
          Paste the exact Google AI Studio conversation URL for this character. When users click <strong>START CHAT</strong>, this conversation will open immediately in a new browser tab.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={formData.chatUrl || ''}
            onChange={(e) => handleFieldChange('chatUrl', e.target.value)}
            placeholder="https://..."
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

        {/* Public Viewer Link (optional) */}
        <div className="pt-3 border-t border-[#F1D4DF]">
          <label className="block text-xs font-semibold text-[#51434A] mb-1 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-[#D88CA3]" />
            <span>Public Read-Only Viewer Link (Optional)</span>
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={formData.viewerLink || ''}
              onChange={(e) => handleFieldChange('viewerLink', e.target.value)}
              placeholder="https://..."
              className="flex-1 px-4 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] font-mono"
            />
            {hasViewerLink && (
              <button
                type="button"
                onClick={handleCopyViewerLink}
                className="px-3 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs font-medium text-[#6E5C65] hover:bg-[#FFF5F7]"
              >
                <Copy className="w-3.5 h-3.5 text-[#D88CA3]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: PERSONALITY & APPEARANCE & STORY */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <BookOpen className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            2. Personality, Appearance & Background Story
          </h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Personality
            </label>
            <textarea
              rows={3}
              value={formData.personality}
              onChange={(e) => handleFieldChange('personality', e.target.value)}
              placeholder="Describe psychological traits, emotional tendencies, quirks, motivations..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Appearance
            </label>
            <textarea
              rows={3}
              value={formData.appearance}
              onChange={(e) => handleFieldChange('appearance', e.target.value)}
              placeholder="Hair, eye color, attire, height, posture, signature jewelry or accessories..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Background / Story
            </label>
            <textarea
              rows={4}
              value={formData.background}
              onChange={(e) => handleFieldChange('background', e.target.value)}
              placeholder="Character origins, upbringing, past trauma, turning points in life, lore..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: ROLEPLAY SETTINGS (SCENARIO & GREETING) */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <MessageSquare className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            3. Scenario & Greeting Message
          </h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Scenario
            </label>
            <textarea
              rows={3}
              value={formData.scenario || formData.roleplayScenario || ''}
              onChange={(e) => {
                handleFieldChange('scenario', e.target.value);
                handleFieldChange('roleplayScenario', e.target.value);
              }}
              placeholder="Setting the scene: where does the roleplay begin? What situation unfolds between the user and character?"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Greeting Message
            </label>
            <textarea
              rows={3}
              value={formData.greeting || formData.initialGreeting || ''}
              onChange={(e) => {
                handleFieldChange('greeting', e.target.value);
                handleFieldChange('initialGreeting', e.target.value);
              }}
              placeholder="*Seraphina softly closes her leather-bound grimoire, looking over at you with curious hazel eyes.* 'Are you lost, wanderer?'"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white italic"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Perspective
              </label>
              <select
                value={formData.perspective}
                onChange={(e) => handleFieldChange('perspective', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
              >
                <option value="Second Person (You)">Second Person (You / Conversational)</option>
                <option value="First Person (I)">First Person (I / In-Character)</option>
                <option value="Third Person (Narrative)">Third Person (Narrative / Novelist)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#51434A] mb-1">
                Speaking Style
              </label>
              <input
                type="text"
                value={formData.speakingStyle || ''}
                onChange={(e) => handleFieldChange('speakingStyle', e.target.value)}
                placeholder="e.g. Polite, slightly archaic, gentle cadence"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Bar with all 3 working buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#F1D4DF]">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-3 rounded-full bg-white border border-[#F1D4DF] text-xs font-semibold text-[#6E5C65] hover:bg-[#FFF5F7] transition-all disabled:opacity-50"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleSaveWithStatus('draft')}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FFF5F7] border border-[#E9A9BB] text-xs font-bold text-[#51434A] hover:bg-[#FBE6ED] active:scale-95 transition-all shadow-xs disabled:opacity-50"
          >
            <FileText className="w-4 h-4 text-[#D88CA3]" />
            <span>Save as Draft</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to Firestore...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Character</span>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
};
