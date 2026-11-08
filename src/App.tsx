import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Character } from './types/character';
import { SiteContent, DEFAULT_SITE_CONTENT } from './types/site';
import {
  getCharacters,
  getSiteContent,
  subscribeToCharacters
} from './services/storage';
import { Header, AppView } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { EmptyState } from './components/common/EmptyState';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { Hero } from './components/public/Hero';
import { CharacterCard } from './components/public/CharacterCard';
import { CharacterModal } from './components/public/CharacterModal';
import { ScenarioModal } from './components/public/ScenarioModal';
import { AboutSection } from './components/public/AboutSection';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminSetup } from './components/admin/AdminSetup';
import { isValidHttpsUrl } from './services/promptGenerator';
import { Sparkles, BookOpen, Layers } from 'lucide-react';

function AppContent() {
  const { isAdmin } = useAuth();

  // Hash-based routing to keep navigation strictly within the current origin
  const getInitialView = (): AppView => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '').trim() as AppView;
      if (['home', 'library', 'about', 'admin', 'admin-login', 'admin-setup'].includes(hash)) {
        return hash;
      }
    }
    return 'home';
  };

  // State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCharacterModal, setSelectedCharacterModal] = useState<Character | null>(null);
  const [selectedScenarioModal, setSelectedScenarioModal] = useState<Character | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const navigateView = (view: AppView) => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = `#${view}`;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      if (typeof window !== 'undefined' && window.location.hash) {
        const hash = window.location.hash.replace('#', '').trim() as AppView;
        if (['home', 'library', 'about', 'admin', 'admin-login', 'admin-setup'].includes(hash)) {
          setCurrentView(hash);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load site content and subscribe to characters
  const refreshData = async () => {
    try {
      const [fetchedChars, fetchedSite] = await Promise.all([
        getCharacters(isAdmin),
        getSiteContent(),
      ]);
      setCharacters(fetchedChars);
      setSiteContent(fetchedSite);
    } catch (err) {
      console.error('Failed to load archive data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = subscribeToCharacters((latestChars) => {
      setCharacters(latestChars);
    }, isAdmin);
    return () => unsubscribe();
  }, [isAdmin]);

  // Toast helper
  const showToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Direct Google AI Studio Chat action
  const handleStartChat = (character: Character) => {
    if (character.chatUrl && isValidHttpsUrl(character.chatUrl)) {
      window.open(character.chatUrl, '_blank', 'noopener,noreferrer');
      showToast(
        'success',
        `Mở trò chuyện: ${character.name}`,
        'Kết nối trực tiếp tới Google AI Studio.'
      );
    } else {
      showToast(
        'info',
        'Thông báo',
        'Nhân vật chưa có liên kết trò chuyện'
      );
    }
  };

  // Public Viewer Link action
  const handleViewChat = (character: Character) => {
    if (character.viewerLink && isValidHttpsUrl(character.viewerLink)) {
      window.open(character.viewerLink, '_blank', 'noopener,noreferrer');
      showToast(
        'info',
        `Opening Public Viewer: ${character.name}`,
        'Loading shared read-only conversation session.'
      );
    } else {
      showToast('error', 'Viewer Link Unavailable', 'No public viewer link configured.');
    }
  };

  // Filter published characters for public visitors
  const publishedCharacters = characters.filter((c) => c.status === 'published');

  const filteredCharacters = publishedCharacters.filter((char) => {
    // Category filter
    if (selectedCategory && selectedCategory !== 'All' && char.category !== selectedCategory) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = char.name.toLowerCase().includes(q);
      const matchFullName = (char.fullName || '').toLowerCase().includes(q);
      const matchUniverse = (char.universe || '').toLowerCase().includes(q);
      const matchDesc = (char.shortDescription || '').toLowerCase().includes(q);
      const matchPersonality = (char.personality || '').toLowerCase().includes(q);
      if (!matchName && !matchFullName && !matchUniverse && !matchDesc && !matchPersonality) {
        return false;
      }
    }
    return true;
  });

  // Handle First-time Admin Setup view
  if (currentView === 'admin-setup') {
    if (isAdmin) {
      return (
        <>
          <AdminDashboard
            characters={characters}
            siteContent={siteContent}
            onRefreshData={refreshData}
            onPreviewCharacter={(char) => setSelectedCharacterModal(char)}
            onReturnToSite={() => navigateView('home')}
            onShowToast={showToast}
          />
          <CharacterModal
            character={selectedCharacterModal}
            isOpen={Boolean(selectedCharacterModal)}
            onClose={() => setSelectedCharacterModal(null)}
            onStartChat={handleStartChat}
            onViewChat={handleViewChat}
            onShowToast={showToast}
          />
          <ScenarioModal
            character={selectedScenarioModal}
            isOpen={Boolean(selectedScenarioModal)}
            onClose={() => setSelectedScenarioModal(null)}
            onStartChat={handleStartChat}
            onShowToast={showToast}
          />
          <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </>
      );
    }

    return (
      <div className="min-h-screen bg-[#FFF5F7] flex flex-col">
        <Header
          siteContent={siteContent}
          currentView={currentView}
          onNavigate={navigateView}
          onOpenLogin={() => setIsLoginOpen(true)}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <AdminSetup
            onSuccess={() => {
              showToast('success', 'Thiết lập Admin hoàn tất', 'Tài khoản Quản trị viên tối cao đã được khởi tạo và chức năng thiết lập được khóa vĩnh viễn.');
              navigateView('admin');
            }}
            onGoToLogin={() => navigateView('admin-login')}
            onBackToSite={() => navigateView('library')}
          />
        </div>
        <Footer
          siteContent={siteContent}
          onNavigate={navigateView}
          onOpenLogin={() => setIsLoginOpen(true)}
          isAdmin={isAdmin}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Handle dedicated Admin Login view
  if (currentView === 'admin-login') {
    if (isAdmin) {
      // Auto-transition authenticated admin to the dashboard
      return (
        <>
          <AdminDashboard
            characters={characters}
            siteContent={siteContent}
            onRefreshData={refreshData}
            onPreviewCharacter={(char) => setSelectedCharacterModal(char)}
            onReturnToSite={() => navigateView('home')}
            onShowToast={showToast}
          />
          <CharacterModal
            character={selectedCharacterModal}
            isOpen={Boolean(selectedCharacterModal)}
            onClose={() => setSelectedCharacterModal(null)}
            onStartChat={handleStartChat}
            onViewChat={handleViewChat}
            onShowToast={showToast}
          />
          <ScenarioModal
            character={selectedScenarioModal}
            isOpen={Boolean(selectedScenarioModal)}
            onClose={() => setSelectedScenarioModal(null)}
            onStartChat={handleStartChat}
            onShowToast={showToast}
          />
          <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </>
      );
    }

    return (
      <div className="min-h-screen bg-[#FFF5F7] flex flex-col">
        <Header
          siteContent={siteContent}
          currentView={currentView}
          onNavigate={navigateView}
          onOpenLogin={() => setIsLoginOpen(true)}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <AdminLogin
            isPageMode={true}
            onSuccess={() => {
              showToast('success', 'Admin Authenticated', 'Chào mừng Quản trị viên đến với Curator Dashboard.');
              navigateView('admin');
            }}
            onGoToSetup={() => navigateView('admin-setup')}
            onBackToSite={() => navigateView('library')}
          />
        </div>
        <Footer
          siteContent={siteContent}
          onNavigate={navigateView}
          onOpenLogin={() => setIsLoginOpen(true)}
          isAdmin={isAdmin}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Handle Admin view protection
  if (currentView === 'admin') {
    if (!isAdmin) {
      return (
        <div className="min-h-screen bg-[#FFF5F7] flex flex-col">
          <Header
            siteContent={siteContent}
            currentView={currentView}
            onNavigate={navigateView}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="max-w-md bg-white p-8 rounded-3xl border border-[#F1D4DF] shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF5F7] border border-[#E9A9BB] flex items-center justify-center mx-auto text-[#D88CA3]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="font-serif-title text-2xl font-bold text-[#51434A]">
                Curator Portal Access
              </h2>
              <p className="text-xs text-[#8E7A84] leading-relaxed">
                This dashboard is restricted to authorized administrators. Public visitors have full read-only access to explore all published characters without signing in.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => navigateView('admin-login')}
                  className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  Sign In to Admin
                </button>
                <button
                  onClick={() => navigateView('library')}
                  className="w-full py-2 rounded-full bg-white border border-[#F1D4DF] text-xs font-medium text-[#6E5C65] hover:bg-[#FFF5F7] transition-all"
                >
                  Return to Character Library
                </button>
              </div>
            </div>
          </div>
          <AdminLogin
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onSuccess={() => {
              showToast('success', 'Admin Authenticated', 'Welcome to the Curator Dashboard.');
              navigateView('admin');
            }}
          />
          <Footer
            siteContent={siteContent}
            onNavigate={navigateView}
            onOpenLogin={() => setIsLoginOpen(true)}
            isAdmin={isAdmin}
          />
        </div>
      );
    }

    return (
      <>
        <AdminDashboard
          characters={characters}
          siteContent={siteContent}
          onRefreshData={refreshData}
          onPreviewCharacter={(char) => setSelectedCharacterModal(char)}
          onReturnToSite={() => navigateView('home')}
          onShowToast={showToast}
        />
        <CharacterModal
          character={selectedCharacterModal}
          isOpen={Boolean(selectedCharacterModal)}
          onClose={() => setSelectedCharacterModal(null)}
          onStartChat={handleStartChat}
          onViewChat={handleViewChat}
          onShowToast={showToast}
        />
        <ScenarioModal
          character={selectedScenarioModal}
          isOpen={Boolean(selectedScenarioModal)}
          onClose={() => setSelectedScenarioModal(null)}
          onStartChat={handleStartChat}
          onShowToast={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F7] flex flex-col text-[#51434A]">
      {/* Global Header */}
      <Header
        siteContent={siteContent}
        currentView={currentView}
        onNavigate={navigateView}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* Main Body per View */}
      <main className="flex-1">
        {currentView === 'home' && (
          <div>
            {/* Hero Section */}
            <Hero
              siteContent={siteContent}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              characterCount={publishedCharacters.length}
            />

            {/* Character Grid or Empty State */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
              {filteredCharacters.length === 0 ? (
                <EmptyState
                  isAdmin={isAdmin}
                  onAddCharacter={() => navigateView('admin')}
                  isSearchFiltered={Boolean(searchQuery || selectedCategory)}
                  onClearFilters={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                  }}
                />
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-[#F1D4DF]">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#D88CA3]" />
                      <span className="font-serif-title font-semibold text-xl text-[#51434A]">
                        Featured Personas
                      </span>
                    </div>
                    <span className="text-xs text-[#8E7A84]">
                      Showing {filteredCharacters.length} of {publishedCharacters.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCharacters.map((char) => (
                      <CharacterCard
                        key={char.id}
                        character={char}
                        onOpenDetails={(c) => setSelectedCharacterModal(c)}
                        onOpenScenario={(c) => setSelectedScenarioModal(c)}
                        onStartChat={handleStartChat}
                        onViewChat={handleViewChat}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* About Preview Section */}
            <AboutSection
              siteContent={siteContent}
              onExploreLibrary={() => {
                navigateView('library');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </div>
        )}

        {currentView === 'library' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#8E7A84] block mb-2">
                Curated Collection
              </span>
              <h1 className="font-serif-title text-4xl sm:text-5xl font-medium text-[#51434A] mb-3">
                Character Archive
              </h1>
              <p className="text-sm text-[#6E5C65] font-light">
                Browse all archived roleplay personas, prompt templates, and AI Studio environments.
              </p>
            </div>

            {/* Search and filters in Library */}
            <div className="max-w-2xl mx-auto mb-12 space-y-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search characters by name, universe, or traits..."
                className="w-full px-5 py-3 rounded-full bg-white border border-[#E9A9BB]/60 text-sm text-[#51434A] placeholder-[#8E7A84]/70 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#E9A9BB]/40"
              />

              <div className="flex flex-wrap items-center justify-center gap-2">
                {(siteContent.categories || ['All']).map((cat) => {
                  const isSelected =
                    selectedCategory === cat || (cat === 'All' && selectedCategory === '');
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === 'All' ? '' : cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-[#E9A9BB] text-white shadow-xs font-semibold'
                          : 'bg-white border border-[#F1D4DF] text-[#6E5C65] hover:bg-[#FFF5F7]'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Library Grid or Empty */}
            {filteredCharacters.length === 0 ? (
              <EmptyState
                isAdmin={isAdmin}
                onAddCharacter={() => navigateView('admin')}
                isSearchFiltered={Boolean(searchQuery || selectedCategory)}
                onClearFilters={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCharacters.map((char) => (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    onOpenDetails={(c) => setSelectedCharacterModal(c)}
                    onOpenScenario={(c) => setSelectedScenarioModal(c)}
                    onStartChat={handleStartChat}
                    onViewChat={handleViewChat}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'about' && (
          <AboutSection
            siteContent={siteContent}
            onExploreLibrary={() => {
              navigateView('library');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Global Footer */}
      <Footer
        siteContent={siteContent}
        onNavigate={navigateView}
        onOpenLogin={() => setIsLoginOpen(true)}
        isAdmin={isAdmin}
      />

      {/* Modals & Popups */}
      <CharacterModal
        character={selectedCharacterModal}
        isOpen={Boolean(selectedCharacterModal)}
        onClose={() => setSelectedCharacterModal(null)}
        onStartChat={handleStartChat}
        onViewChat={handleViewChat}
        onShowToast={showToast}
      />

      <ScenarioModal
        character={selectedScenarioModal}
        isOpen={Boolean(selectedScenarioModal)}
        onClose={() => setSelectedScenarioModal(null)}
        onStartChat={handleStartChat}
        onShowToast={showToast}
      />

      <AdminLogin
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          showToast('success', 'Admin Authenticated', 'Curator Dashboard is now unlocked.');
          navigateView('admin');
        }}
        onGoToSetup={() => {
          setIsLoginOpen(false);
          navigateView('admin-setup');
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
