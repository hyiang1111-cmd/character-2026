import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CommunityProvider, useCommunity } from './context/CommunityContext';
import { MusicProvider } from './context/MusicContext';
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
import { CharacterTagsFilter, CharacterTagItem } from './components/public/CharacterTagsFilter';
import { WelcomeScreen } from './components/common/WelcomeScreen';
import { MusicPlayerWidget } from './components/common/MusicPlayerWidget';
import { MagicTouch } from './components/common/MagicTouch';
import { AboutSection } from './components/public/AboutSection';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminSetup } from './components/admin/AdminSetup';
import { HallOfFame } from './components/community/HallOfFame';
import { DonatePage } from './components/community/DonatePage';
import { AuthModal } from './components/community/AuthModal';
import { MemberProfileModal } from './components/community/MemberProfileModal';
import { CharacterHotRanking } from './components/public/CharacterHotRanking';
import { CharacterReviewsPage } from './components/community/CharacterReviewsPage';
import {
  recordVerifiedCharacterView,
  recordVerifiedCharacterChat,
  getCharacterTags,
  subscribeToCharacterTags,
  CharacterTagRecord
} from './services/characterRankingStorage';
import {
  getChatOpenCounts,
  recordCharacterChatOpen
} from './services/characterChatOpensStorage';
import { setSharedSupabaseCredentials, getSupabaseClient } from './services/supabase';
import { isValidHttpsUrl } from './services/promptGenerator';
import { Sparkles, Layers, Search, X } from 'lucide-react';

function AppContent() {
  const { isAdmin } = useAuth();
  const { trackCharacterView, recordChatClick, viewMemberProfileId, closeMemberProfileModal } = useCommunity();

  // Hash-based routing to keep navigation strictly within the current origin
  const getInitialView = (): AppView => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '').trim() as AppView;
      if (['home', 'library', 'about', 'hall', 'donate', 'reviews', 'admin', 'admin-login', 'admin-setup'].includes(hash)) {
        return hash;
      }
    }
    return 'home';
  };

  // State
  const [characters, setCharacters] = useState<Character[]>([]);
  const [siteContent, setSiteContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [customTags, setCustomTags] = useState<CharacterTagRecord[]>([]);
  const [currentView, setCurrentView] = useState<AppView>(getInitialView);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedCharacterModal, setSelectedCharacterModal] = useState<Character | null>(null);
  const [selectedScenarioModal, setSelectedScenarioModal] = useState<Character | null>(null);
  const [reviewTargetCharacterId, setReviewTargetCharacterId] = useState<string | undefined>(undefined);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash.includes('admin')) return false;
      return sessionStorage.getItem('pca_welcome_entered') !== 'true';
    }
    return false;
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Chat open counts state
  const [chatOpenCounts, setChatOpenCounts] = useState<Record<string, number>>({});
  const { member } = useCommunity();

  const loadChatOpens = async () => {
    try {
      const counts = await getChatOpenCounts();
      setChatOpenCounts(counts);
    } catch (e) {
      console.warn('Failed to load chat opens in App:', e);
    }
  };

  useEffect(() => {
    loadChatOpens();

    const handleChatOpensUpdated = () => {
      loadChatOpens();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('pca_chat_opens_updated', handleChatOpensUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pca_chat_opens_updated', handleChatOpensUpdated);
      }
    };
  }, []);

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
        if (['home', 'library', 'about', 'hall', 'donate', 'reviews', 'admin', 'admin-login', 'admin-setup'].includes(hash)) {
          setCurrentView(hash);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Load site content, characters, and tags sequentially to ensure Supabase credentials initialize first
  const refreshData = async () => {
    try {
      // 1. Load site settings first to get central Supabase URL/Key if present
      const fetchedSite = await getSiteContent();
      setSiteContent(fetchedSite);

      if (fetchedSite?.supabaseUrl || fetchedSite?.supabaseAnonKey) {
        setSharedSupabaseCredentials(fetchedSite.supabaseUrl, fetchedSite.supabaseAnonKey);
      }

      // 2. Load characters and tags with Supabase fully initialized
      const [fetchedChars, fetchedTags] = await Promise.all([
        getCharacters(isAdmin),
        getCharacterTags(),
      ]);
      setCharacters(fetchedChars);
      setCustomTags(fetchedTags);
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

  // Realtime Character Tags synchronization across Admin and Public views
  useEffect(() => {
    let activeChannel: any = null;

    // Realtime Cloud Firestore subscription for all users and guests worldwide
    const unsubscribeFirestoreTags = subscribeToCharacterTags((latestTags) => {
      setCustomTags(latestTags);
    });

    const handleTagsUpdated = async () => {
      try {
        const latestTags = await getCharacterTags();
        setCustomTags(latestTags);
      } catch (e) {
        console.warn('Failed to reload character tags:', e);
      }
    };

    const subscribeToTagsChannel = () => {
      const client = getSupabaseClient();
      if (client) {
        try {
          if (activeChannel) {
            client.removeChannel(activeChannel);
            activeChannel = null;
          }

          activeChannel = client
            .channel('realtime:public_tags_live')
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'character_tags' },
              () => {
                handleTagsUpdated();
              }
            )
            .subscribe();
        } catch (err) {
          console.warn('Realtime tag channel warning:', err);
        }
      }
    };

    window.addEventListener('pca_tags_updated', handleTagsUpdated);
    window.addEventListener('storage', handleTagsUpdated);
    window.addEventListener('pca_supabase_credentials_changed', () => {
      subscribeToTagsChannel();
      handleTagsUpdated();
    });

    subscribeToTagsChannel();

    return () => {
      unsubscribeFirestoreTags();
      window.removeEventListener('pca_tags_updated', handleTagsUpdated);
      window.removeEventListener('storage', handleTagsUpdated);
      window.removeEventListener('pca_supabase_credentials_changed', subscribeToTagsChannel);
      const client = getSupabaseClient();
      if (client && activeChannel) {
        client.removeChannel(activeChannel);
      }
    };
  }, []);

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

  // Open character modal & track character view
  const handleOpenCharacterDetails = (char: Character) => {
    setSelectedCharacterModal(char);
    trackCharacterView(char.id);
    recordVerifiedCharacterView(char.id);
  };

  // Direct Google AI Studio Chat action
  const handleStartChat = async (character: Character) => {
    recordChatClick(character.id);
    recordVerifiedCharacterChat(character.id);

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
  const publishedCharacters = useMemo(
    () => characters.filter((c) => c.status === 'published'),
    [characters]
  );

  // Aggregated dynamic character tags:
  const aggregatedTags: CharacterTagItem[] = useMemo(() => {
    const map = new Map<string, { label: string; count: number; color?: string; icon?: string; sortOrder?: number; isActive?: boolean }>();

    // 1. First add ALL active tags defined in Admin Tag Management (including count = 0)
    customTags.forEach((ct) => {
      const cleanName = String(ct.name || '').trim().replace(/^#+/, '');
      if (!cleanName) return;
      const key = cleanName.toLowerCase();
      map.set(key, {
        label: cleanName,
        count: 0,
        color: ct.color,
        icon: ct.icon,
        sortOrder: ct.sort_order,
        isActive: ct.is_active,
      });
    });

    // 2. Count published characters using each tag
    publishedCharacters.forEach((char) => {
      if (!Array.isArray(char.tags)) return;
      const seenKeysInChar = new Set<string>();

      char.tags.forEach((rawTag) => {
        const clean = String(rawTag || '').trim().replace(/^#+/, '').trim();
        if (!clean) return;
        const key = clean.toLowerCase();
        if (seenKeysInChar.has(key)) return;
        seenKeysInChar.add(key);

        const existing = map.get(key);
        if (!existing) {
          const displayLabel =
            clean === clean.toLowerCase()
              ? clean.charAt(0).toUpperCase() + clean.slice(1)
              : clean;
          map.set(key, { label: displayLabel, count: 1, isActive: true });
        } else {
          existing.count += 1;
          if (clean !== clean.toLowerCase() && existing.label === existing.label.toLowerCase()) {
            existing.label = clean;
          }
        }
      });
    });

    // 3. Keep ALL tags where isActive is true
    return Array.from(map.entries())
      .filter(([_, data]) => data.isActive !== false)
      .map(([key, data]) => ({
        key,
        label: data.label,
        count: data.count,
        color: data.color,
        icon: data.icon,
        sortOrder: data.sortOrder,
      }))
      .sort((a, b) => {
        if (a.sortOrder !== undefined && b.sortOrder !== undefined && a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }
        if (a.sortOrder !== undefined && b.sortOrder === undefined) return -1;
        if (a.sortOrder === undefined && b.sortOrder !== undefined) return 1;
        return b.count - a.count || a.label.localeCompare(b.label);
      });
  }, [publishedCharacters, customTags]);

  // Gracefully deselect tag if it is no longer available in the character archive
  useEffect(() => {
    if (selectedTag) {
      const exists = aggregatedTags.some((t) => t.key === selectedTag.toLowerCase());
      if (!exists) {
        setSelectedTag('');
      }
    }
  }, [aggregatedTags, selectedTag]);

  // Tag click handler: toggles active tag or selects a new one
  const handleSelectTag = (tagKey: string) => {
    const normalized = tagKey.toLowerCase().trim().replace(/^#+/, '');
    if (selectedTag.toLowerCase() === normalized) {
      setSelectedTag('');
    } else {
      setSelectedTag(normalized);
    }
  };

  // Filter characters using combined AND logic
  const filteredCharacters = useMemo(() => {
    return publishedCharacters.filter((char) => {
      if (selectedTag) {
        const targetTag = selectedTag.toLowerCase().trim();
        const hasTag =
          Array.isArray(char.tags) &&
          char.tags.some((t) => {
            const clean = String(t || '').trim().replace(/^#+/, '').toLowerCase();
            return clean === targetTag;
          });
        if (!hasTag) return false;
      }

      if (selectedCategory && selectedCategory !== 'All' && char.category !== selectedCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (char.name || '').toLowerCase().includes(q);
        const matchFullName = (char.fullName || '').toLowerCase().includes(q);
        const matchNickname = (char.nickname || '').toLowerCase().includes(q);
        const matchSpecies = (char.species || '').toLowerCase().includes(q);
        const matchUniverse = (char.universe || '').toLowerCase().includes(q);
        const matchDesc = (char.shortDescription || char.background || '').toLowerCase().includes(q);
        const matchPersonality = (char.personality || '').toLowerCase().includes(q);
        const matchOccupation = (char.occupation || '').toLowerCase().includes(q);
        const matchTags =
          Array.isArray(char.tags) &&
          char.tags.some((t) => String(t || '').toLowerCase().includes(q));

        if (
          !matchName &&
          !matchFullName &&
          !matchNickname &&
          !matchSpecies &&
          !matchUniverse &&
          !matchDesc &&
          !matchPersonality &&
          !matchOccupation &&
          !matchTags
        ) {
          return false;
        }
      }

      return true;
    });
  }, [publishedCharacters, selectedTag, selectedCategory, searchQuery]);

  // Handle First-time Admin Setup view
  if (currentView === 'admin-setup') {
    if (isAdmin) {
      return (
        <>
          <AdminDashboard
            characters={characters}
            siteContent={siteContent}
            onRefreshData={refreshData}
            onPreviewCharacter={(char) => handleOpenCharacterDetails(char)}
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
            onSelectTag={handleSelectTag}
          />
          <ScenarioModal
            character={selectedScenarioModal}
            isOpen={Boolean(selectedScenarioModal)}
            onClose={() => setSelectedScenarioModal(null)}
            onStartChat={handleStartChat}
            onShowToast={showToast}
          />
          <MusicPlayerWidget />
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
          onOpenAuthModal={(mode) => {
            setAuthModalMode(mode || 'login');
            setIsAuthModalOpen(true);
          }}
        />
        <div className="flex-1 flex items-center justify-center p-4">
          <AdminSetup
            onSuccess={() => {
              showToast('success', 'Thiết lập Admin hoàn tất', 'Tài khoản Quản trị viên tối cao đã được khởi tạo.');
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
        <MusicPlayerWidget />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    );
  }

  // Handle dedicated Admin Login view
  if (currentView === 'admin-login') {
    if (isAdmin) {
      return (
        <>
          <AdminDashboard
            characters={characters}
            siteContent={siteContent}
            onRefreshData={refreshData}
            onPreviewCharacter={(char) => handleOpenCharacterDetails(char)}
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
            onSelectTag={handleSelectTag}
          />
          <ScenarioModal
            character={selectedScenarioModal}
            isOpen={Boolean(selectedScenarioModal)}
            onClose={() => setSelectedScenarioModal(null)}
            onStartChat={handleStartChat}
            onShowToast={showToast}
          />
          <MusicPlayerWidget />
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
          onOpenAuthModal={(mode) => {
            setAuthModalMode(mode || 'login');
            setIsAuthModalOpen(true);
          }}
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
        <MusicPlayerWidget />
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
            onOpenAuthModal={(mode) => {
              setAuthModalMode(mode || 'login');
              setIsAuthModalOpen(true);
            }}
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
          onPreviewCharacter={(char) => handleOpenCharacterDetails(char)}
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
          onSelectTag={handleSelectTag}
        />
        <ScenarioModal
          character={selectedScenarioModal}
          isOpen={Boolean(selectedScenarioModal)}
          onClose={() => setSelectedScenarioModal(null)}
          onStartChat={handleStartChat}
          onShowToast={showToast}
        />
        <MusicPlayerWidget />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF5F7] flex flex-col text-[#51434A]">
      {showWelcome && (
        <WelcomeScreen
          siteName={siteContent.siteName || 'Pink Character Archive'}
          onEnter={() => setShowWelcome(false)}
        />
      )}

      {/* Global Header */}
      <Header
        siteContent={siteContent}
        currentView={currentView}
        onNavigate={navigateView}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
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
              tags={aggregatedTags}
              selectedTag={selectedTag}
              onSelectTag={handleSelectTag}
            />

            {/* Character Hot Ranking section: Podium + Top 4-10 */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
              <CharacterHotRanking
                characters={publishedCharacters}
                onOpenDetails={handleOpenCharacterDetails}
                onStartChat={handleStartChat}
              />
            </div>

            {/* Character Grid or Empty State */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
              {filteredCharacters.length === 0 ? (
                <EmptyState
                  isAdmin={isAdmin}
                  onAddCharacter={() => navigateView('admin')}
                  isSearchFiltered={Boolean(searchQuery || selectedCategory || selectedTag)}
                  activeTag={selectedTag ? (aggregatedTags.find((t) => t.key === selectedTag.toLowerCase())?.label || selectedTag) : undefined}
                  searchQuery={searchQuery}
                  onClearFilters={() => {
                    setSearchQuery('');
                    setSelectedCategory('');
                    setSelectedTag('');
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
                      Hiển thị {filteredCharacters.length} / {publishedCharacters.length} nhân vật
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredCharacters.map((char) => (
                      <CharacterCard
                        key={char.id}
                        character={char}
                        onOpenDetails={handleOpenCharacterDetails}
                        onOpenScenario={(c) => setSelectedScenarioModal(c)}
                        onStartChat={handleStartChat}
                        onViewChat={handleViewChat}
                        onSelectTag={handleSelectTag}
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

            {/* Search and Character Tags Filter in Library */}
            <div className="max-w-2xl mx-auto mb-12 space-y-4">
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-[#D88CA3] absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm nhân vật theo tên, tag, vũ trụ, tính cách..."
                  className="w-full pl-12 pr-10 py-3.5 bg-white rounded-full border border-[#E9A9BB]/60 text-sm text-[#51434A] placeholder-[#8E7A84]/70 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#E9A9BB]/40 focus:border-[#E9A9BB] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 p-1 rounded-full text-[#8E7A84] hover:text-[#51434A] hover:bg-[#FFF5F7] transition-all"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dynamic Character Tags Filter directly below search bar */}
              <CharacterTagsFilter
                tags={aggregatedTags}
                selectedTag={selectedTag}
                onSelectTag={handleSelectTag}
                totalCount={publishedCharacters.length}
              />
            </div>

            {/* Library Grid or Empty */}
            {filteredCharacters.length === 0 ? (
              <EmptyState
                isAdmin={isAdmin}
                onAddCharacter={() => navigateView('admin')}
                isSearchFiltered={Boolean(searchQuery || selectedCategory || selectedTag)}
                activeTag={selectedTag ? (aggregatedTags.find((t) => t.key === selectedTag.toLowerCase())?.label || selectedTag) : undefined}
                searchQuery={searchQuery}
                onClearFilters={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSelectedTag('');
                }}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-[#F1D4DF]">
                  <span className="text-xs font-medium text-[#774D8E]">
                    {selectedTag ? (
                      <>
                        Đang lọc theo Tag: <strong className="font-semibold text-[#51434A]">#{aggregatedTags.find((t) => t.key === selectedTag.toLowerCase())?.label || selectedTag}</strong> ({filteredCharacters.length} nhân vật)
                      </>
                    ) : (
                      <>Tất cả nhân vật ({filteredCharacters.length})</>
                    )}
                  </span>
                  <span className="text-xs text-[#8E7A84]">
                    Hiển thị {filteredCharacters.length} / {publishedCharacters.length} nhân vật
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCharacters.map((char) => (
                    <CharacterCard
                      key={char.id}
                      character={char}
                      onOpenDetails={handleOpenCharacterDetails}
                      onOpenScenario={(c) => setSelectedScenarioModal(c)}
                      onStartChat={handleStartChat}
                      onViewChat={handleViewChat}
                      onSelectTag={handleSelectTag}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'hall' && (
          <HallOfFame
            onOpenAuth={(mode) => {
              setAuthModalMode(mode || 'login');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {currentView === 'donate' && (
          <DonatePage
            onOpenAuth={(mode) => {
              setAuthModalMode(mode || 'login');
              setIsAuthModalOpen(true);
            }}
            onShowToast={showToast}
          />
        )}

        {currentView === 'reviews' && (
          <CharacterReviewsPage
            characters={publishedCharacters}
            initialCharacterId={reviewTargetCharacterId}
            onOpenAuth={(mode) => {
              setAuthModalMode(mode || 'login');
              setIsAuthModalOpen(true);
            }}
            onOpenCharacterDetails={handleOpenCharacterDetails}
            onStartChat={handleStartChat}
          />
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
        onSelectTag={handleSelectTag}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onShowToast={showToast}
      />

      <MemberProfileModal
        userId={viewMemberProfileId}
        onClose={closeMemberProfileModal}
        onShowToast={showToast}
      />

      {/* Global Floating Music Player */}
      <MusicPlayerWidget />

      {/* Global Magic Touch Sparkle Effect */}
      <MagicTouch />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const handleShowToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  return (
    <AuthProvider>
      <CommunityProvider onShowToast={handleShowToast}>
        <MusicProvider>
          <AppContent />
        </MusicProvider>
      </CommunityProvider>
    </AuthProvider>
  );
}
