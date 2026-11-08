import React, { useState } from 'react';
import { Save, RotateCcw, Check, Sparkles, Layout, Globe, BookOpen } from 'lucide-react';
import { SiteContent, DEFAULT_SITE_CONTENT } from '../../types/site';
import { saveSiteContent } from '../../services/storage';

interface ContentEditorProps {
  initialContent: SiteContent;
  onSaveSuccess: (updated: SiteContent) => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  initialContent,
  onSaveSuccess,
  onShowToast,
}) => {
  const [formData, setFormData] = useState<SiteContent>({ ...initialContent });
  const [categoriesText, setCategoriesText] = useState<string>(
    (initialContent.categories || []).join(', ')
  );
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof SiteContent, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const categories = categoriesText
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const updated: SiteContent = {
        ...formData,
        categories: categories.length > 0 ? categories : DEFAULT_SITE_CONTENT.categories,
      };

      await saveSiteContent(updated);
      onSaveSuccess(updated);
      onShowToast('success', 'Website Content Saved', 'Public site has been updated with your edits.');
    } catch (err: any) {
      onShowToast('error', 'Failed to save content', err?.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all website editorial copy and labels back to original defaults?')) {
      setFormData(DEFAULT_SITE_CONTENT);
      setCategoriesText(DEFAULT_SITE_CONTENT.categories.join(', '));
      onShowToast('info', 'Reset to Defaults', 'Click "Save Website Content" to commit.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* Title & Save Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-[#F1D4DF] shadow-xs">
        <div>
          <h3 className="font-serif-title text-2xl font-bold text-[#51434A]">
            Website Content & Editorial Editor
          </h3>
          <p className="text-xs text-[#8E7A84]">
            Customize headers, titles, about lore, categories, and footer text across the entire archive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs font-semibold text-[#6E5C65] hover:bg-[#FFF5F7] transition-all"
          >
            Reset Defaults
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Content'}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Brand & Navigation */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <Globe className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            Branding & Navigation
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Website Name
            </label>
            <input
              type="text"
              value={formData.siteName}
              onChange={(e) => handleChange('siteName', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Logo Header Text
            </label>
            <input
              type="text"
              value={formData.logoText}
              onChange={(e) => handleChange('logoText', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Home Nav Label
            </label>
            <input
              type="text"
              value={formData.navHome}
              onChange={(e) => handleChange('navHome', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Library Nav Label
            </label>
            <input
              type="text"
              value={formData.navLibrary}
              onChange={(e) => handleChange('navLibrary', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              About Nav Label
            </label>
            <input
              type="text"
              value={formData.navAbout}
              onChange={(e) => handleChange('navAbout', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Homepage Hero */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <Layout className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            Homepage Hero Section
          </h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Homepage Title (Headline)
            </label>
            <input
              type="text"
              value={formData.homeTitle}
              onChange={(e) => handleChange('homeTitle', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-sm text-[#51434A] font-serif-title font-medium focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Homepage Subtitle (Description)
            </label>
            <textarea
              rows={2}
              value={formData.homeSubtitle}
              onChange={(e) => handleChange('homeSubtitle', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Category Filters (Comma-separated)
            </label>
            <input
              type="text"
              value={categoriesText}
              onChange={(e) => setCategoriesText(e.target.value)}
              placeholder="All, Fantasy, Romance, Sci-Fi, Slice of Life, Mystery"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
            <p className="text-[11px] text-[#8E7A84] mt-1">
              Separate categories with commas. First item should typically be 'All'.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: About Page Lore */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <BookOpen className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            About Page Lore & Mission
          </h4>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              About Section Heading
            </label>
            <input
              type="text"
              value={formData.aboutTitle}
              onChange={(e) => handleChange('aboutTitle', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-sm text-[#51434A] font-serif-title focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              About Tagline
            </label>
            <input
              type="text"
              value={formData.aboutTagline}
              onChange={(e) => handleChange('aboutTagline', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Editorial Narrative / Story
            </label>
            <textarea
              rows={5}
              value={formData.aboutStory}
              onChange={(e) => handleChange('aboutStory', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Footer */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#F1D4DF]">
          <Sparkles className="w-4 h-4 text-[#D88CA3]" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-[#51434A]">
            Footer Copy & Copyright
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Footer Description
            </label>
            <input
              type="text"
              value={formData.footerText}
              onChange={(e) => handleChange('footerText', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#51434A] mb-1">
              Copyright Notice
            </label>
            <input
              type="text"
              value={formData.footerCopyright}
              onChange={(e) => handleChange('footerCopyright', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF5F7] border border-[#F1D4DF] text-xs text-[#51434A] focus:outline-none focus:border-[#E9A9BB] focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Bottom Save Action */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-sm font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Website Content'}</span>
        </button>
      </div>
    </form>
  );
};
