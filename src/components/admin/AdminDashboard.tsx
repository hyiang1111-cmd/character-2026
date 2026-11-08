import React, { useState } from 'react';
import {
  Plus,
  Users,
  Settings,
  Database,
  LogOut,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Eye,
  CheckCircle,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { Character, CharacterFormData } from '../../types/character';
import { SiteContent } from '../../types/site';
import { CharacterList } from './CharacterList';
import { CharacterForm } from './CharacterForm';
import { ContentEditor } from './ContentEditor';
import { FirebaseSetupGuide } from './FirebaseSetupGuide';
import { useAuth } from '../../context/AuthContext';
import { saveCharacter, deleteCharacter } from '../../services/storage';

interface AdminDashboardProps {
  characters: Character[];
  siteContent: SiteContent;
  onRefreshData: () => void;
  onPreviewCharacter: (character: Character) => void;
  onReturnToSite: () => void;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  characters,
  siteContent,
  onRefreshData,
  onPreviewCharacter,
  onReturnToSite,
  onShowToast,
}) => {
  const { logout, currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'characters' | 'content' | 'firebase'>('characters');
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [characterToDelete, setCharacterToDelete] = useState<{ id: string; name: string } | null>(null);

  // Statistics
  const totalCount = characters.length;
  const publishedCount = characters.filter((c) => c.status === 'published').length;
  const draftCount = characters.filter((c) => c.status === 'draft').length;
  const withChatUrlCount = characters.filter((c) => c.chatUrl && c.chatUrl.trim()).length;
  const withViewerLinkCount = characters.filter((c) => c.viewerLink && c.viewerLink.trim()).length;

  const handleStartCreate = () => {
    setEditingCharacter(null);
    setIsCreatingNew(true);
  };

  const handleStartEdit = (char: Character) => {
    setEditingCharacter(char);
    setIsCreatingNew(true);
  };

  const handleCancelForm = () => {
    setEditingCharacter(null);
    setIsCreatingNew(false);
  };

  const handleSaveCharacter = async (formData: CharacterFormData) => {
    const now = Date.now();
    let charToSave: Character;

    if (editingCharacter) {
      charToSave = {
        ...editingCharacter,
        ...formData,
        updatedAt: now,
      };
    } else {
      charToSave = {
        ...formData,
        id: 'char_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now(),
        createdAt: now,
        updatedAt: now,
      };
    }

    await saveCharacter(charToSave);
    setIsCreatingNew(false);
    setEditingCharacter(null);
    onRefreshData();
    onShowToast(
      'success',
      editingCharacter ? 'Character Updated' : 'Character Archived',
      `"${charToSave.name}" was successfully saved.`
    );
  };

  const handleTogglePublish = async (char: Character) => {
    const nextStatus = char.status === 'published' ? 'draft' : 'published';
    const updated: Character = {
      ...char,
      status: nextStatus,
      updatedAt: Date.now(),
    };
    await saveCharacter(updated);
    onRefreshData();
    onShowToast(
      'info',
      nextStatus === 'published' ? 'Character Published' : 'Moved to Drafts',
      `"${char.name}" is now ${nextStatus}.`
    );
  };

  const confirmDeleteCharacter = async () => {
    if (!characterToDelete) return;
    try {
      await deleteCharacter(characterToDelete.id);
      onShowToast('success', 'Character Deleted', `"${characterToDelete.name}" was removed.`);
      setCharacterToDelete(null);
      onRefreshData();
    } catch (err: any) {
      onShowToast('error', 'Delete Failed', err?.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF5F7] pb-16">
      {/* Admin Top Header */}
      <div className="bg-white border-b border-[#F1D4DF] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onReturnToSite}
              className="p-2 rounded-xl bg-[#FFF5F7] hover:bg-[#FBE6ED] text-[#51434A] transition-colors"
              title="Return to Public Archive"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif-title font-bold text-lg sm:text-xl text-[#51434A]">
                  Admin Dashboard
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#FBE6ED] text-[#51434A] text-[10px] font-bold border border-[#E9A9BB]/50">
                  Curator Suite
                </span>
              </div>
              <p className="text-[11px] text-[#8E7A84]">
                Signed in as: <span className="font-semibold text-[#51434A]">{currentUser?.email || 'Administrator'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Storage status */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Firestore Rules Secured</span>
            </div>

            {/* ALWAYS CLEARLY VISIBLE ADD NEW CHARACTER BUTTON */}
            {!isCreatingNew && (
              <button
                onClick={handleStartCreate}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs sm:text-sm font-bold hover:brightness-105 active:scale-95 transition-all shadow-sm ring-2 ring-[#E9A9BB]/30"
              >
                <Plus className="w-4 h-4" />
                <span>ADD NEW CHARACTER</span>
              </button>
            )}

            <button
              onClick={logout}
              className="p-2 rounded-xl bg-[#FFF5F7] hover:bg-red-50 hover:text-red-600 text-[#8E7A84] border border-[#F1D4DF] transition-colors"
              title="Sign Out of Admin"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        {!isCreatingNew && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 text-xs font-semibold overflow-x-auto border-t border-[#F1D4DF]/60">
            <button
              onClick={() => setActiveTab('characters')}
              className={`py-3 px-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'characters'
                  ? 'border-[#E9A9BB] text-[#51434A]'
                  : 'border-transparent text-[#8E7A84] hover:text-[#51434A]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Characters ({totalCount})</span>
            </button>

            <button
              onClick={() => setActiveTab('content')}
              className={`py-3 px-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'content'
                  ? 'border-[#E9A9BB] text-[#51434A]'
                  : 'border-transparent text-[#8E7A84] hover:text-[#51434A]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Website Content Editor</span>
            </button>

            <button
              onClick={() => setActiveTab('firebase')}
              className={`py-3 px-1 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'firebase'
                  ? 'border-[#E9A9BB] text-[#51434A]'
                  : 'border-transparent text-[#8E7A84] hover:text-[#51434A]'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Security & Firestore Rules</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* If in edit/creation form */}
        {isCreatingNew ? (
          <CharacterForm
            initialCharacter={editingCharacter}
            onSave={handleSaveCharacter}
            onCancel={handleCancelForm}
            categories={siteContent.categories || []}
            onShowToast={onShowToast}
          />
        ) : (
          <>
            {/* Quick Stat Tiles */}
            {activeTab === 'characters' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF] shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8E7A84] tracking-wider block">
                    Total Characters
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-serif-title text-2xl sm:text-3xl font-bold text-[#51434A]">
                      {totalCount}
                    </span>
                    <Users className="w-5 h-5 text-[#E9A9BB]" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF] shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8E7A84] tracking-wider block">
                    Published (Public)
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-serif-title text-2xl sm:text-3xl font-bold text-emerald-700">
                      {publishedCount}
                    </span>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF] shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8E7A84] tracking-wider block">
                    AI Studio Chat Links
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-serif-title text-2xl sm:text-3xl font-bold text-[#51434A]">
                      {withChatUrlCount}
                    </span>
                    <MessageSquare className="w-5 h-5 text-[#D88CA3]" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-[#F1D4DF] shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-[#8E7A84] tracking-wider block">
                    Public Viewer Enabled
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-serif-title text-2xl sm:text-3xl font-bold text-[#51434A]">
                      {withViewerLinkCount}
                    </span>
                    <Eye className="w-5 h-5 text-[#E9A9BB]" />
                  </div>
                </div>
              </div>
            )}

            {/* Tab Views */}
            {activeTab === 'characters' && (
              <CharacterList
                characters={characters}
                onAddNew={handleStartCreate}
                onEdit={handleStartEdit}
                onDelete={(id, name) => setCharacterToDelete({ id, name })}
                onTogglePublish={handleTogglePublish}
                onPreview={onPreviewCharacter}
                categories={siteContent.categories || []}
                onShowToast={onShowToast}
              />
            )}

            {activeTab === 'content' && (
              <ContentEditor
                initialContent={siteContent}
                onSaveSuccess={() => {
                  onRefreshData();
                }}
                onShowToast={onShowToast}
              />
            )}

            {activeTab === 'firebase' && (
              <FirebaseSetupGuide
                onShowToast={onShowToast}
                onRefreshStorage={onRefreshData}
              />
            )}
          </>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {characterToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#51434A]/50 backdrop-blur-xs animate-in fade-in">
          <div className="fixed inset-0" onClick={() => setCharacterToDelete(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-3xl border border-[#F1D4DF] shadow-2xl p-6 z-10 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-serif-title text-xl font-bold text-[#51434A] mb-2">
              Confirm Character Deletion
            </h3>
            <p className="text-xs text-[#6E5C65] leading-relaxed mb-6">
              Are you sure you want to permanently delete <strong>"{characterToDelete.name}"</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCharacterToDelete(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#F1D4DF] text-xs font-semibold text-[#6E5C65] hover:bg-[#FFF5F7]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCharacter}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
