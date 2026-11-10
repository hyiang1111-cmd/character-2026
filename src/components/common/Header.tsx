import React, { useState } from 'react';
import {
  Sparkles,
  Shield,
  UserCheck,
  Menu,
  X,
  ShieldCheck,
  Lock,
  MessageSquare,
  Crown,
  Flame,
  User,
  LogOut,
  Trophy,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCommunity } from '../../context/CommunityContext';
import { SiteContent } from '../../types/site';

export type AppView = 'home' | 'library' | 'about' | 'hall' | 'donate' | 'reviews' | 'admin' | 'admin-login' | 'admin-setup';

interface HeaderProps {
  siteContent: SiteContent;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenLogin: () => void;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
}

export const Header: React.FC<HeaderProps> = ({
  siteContent,
  currentView,
  onNavigate,
  onOpenLogin,
  onOpenAuthModal,
}) => {
  const { isAdmin, isSystemInitialized } = useAuth();
  const { member, logout, openMemberProfileModal } = useCommunity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const isVIP = member?.vip_tier && member.vip_tier !== 'none';

  return (
    <header className="sticky top-0 z-40 bg-[#FFF5F7]/95 backdrop-blur-md border-b border-[#F1D4DF]/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 group text-left transition-transform active:scale-98 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#E9A9BB] to-[#F6DCE5] flex items-center justify-center shadow-xs group-hover:rotate-12 transition-transform duration-300">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif-title text-xl sm:text-2xl font-bold tracking-wider text-[#51434A] leading-none group-hover:text-[#D88CA3] transition-colors">
              {siteContent.logoText || 'PINK CHARACTER ARCHIVE'}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8E7A84] font-medium mt-1">
              Curated Roleplay Archive
            </span>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-white/80 px-3 py-1.5 rounded-full border border-[#F1D4DF] shadow-xs">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              currentView === 'home'
                ? 'bg-[#E9A9BB] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7]'
            }`}
          >
            {siteContent.navHome || 'Trang chủ'}
          </button>

          <button
            onClick={() => handleNavClick('library')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              currentView === 'library'
                ? 'bg-[#E9A9BB] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7]'
            }`}
          >
            {siteContent.navLibrary || 'Thư viện'}
          </button>

          <button
            onClick={() => handleNavClick('reviews')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'reviews'
                ? 'bg-[#D88CA3] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7]'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            <span>Hot Chat 🔥</span>
          </button>

          <button
            onClick={() => handleNavClick('hall')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'hall'
                ? 'bg-[#865B9E] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            <span>Hall of Fame</span>
          </button>

          <button
            onClick={() => handleNavClick('donate')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'donate'
                ? 'bg-[#FFD700] text-white shadow-xs font-bold'
                : 'text-[#B8860B] hover:bg-[#FFFDF5]'
            }`}
          >
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span>Ủng hộ VIP</span>
          </button>

          <button
            onClick={() => handleNavClick('about')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              currentView === 'about'
                ? 'bg-[#E9A9BB] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7]'
            }`}
          >
            {siteContent.navAbout || 'Giới thiệu'}
          </button>
        </nav>

        {/* Right side: Member Account Pill & Admin Link */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Member Profile or Login Button */}
          {member ? (
            <div className="flex items-center gap-2 bg-white/90 px-3 py-1 rounded-full border border-[#E8D7F7] shadow-2xs">
              <button
                onClick={() => openMemberProfileModal(member.id)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div
                  className={`w-7 h-7 rounded-xl overflow-hidden border ${
                    isVIP ? 'border-[#FFD700] ring-1 ring-[#FFD700]/50' : 'border-white'
                  }`}
                >
                  <img
                    src={member.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`}
                    alt={member.username}
                    className="w-full h-full object-cover"
                  />
                </div>

                <span
                  className={`text-xs font-bold ${
                    isVIP ? 'text-[#B8860B] font-extrabold' : 'text-[#51434A]'
                  }`}
                >
                  @{member.username}
                </span>
              </button>

              <button
                onClick={logout}
                className="p-1 text-[#8E7A84] hover:text-rose-600 transition-colors cursor-pointer ml-1"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#865B9E] text-white text-xs font-bold shadow-2xs hover:bg-[#774D8E] cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Đăng nhập / Đăng ký</span>
            </button>
          )}

          {/* Admin Dashboard entry button */}
          {isAdmin ? (
            <button
              onClick={() => handleNavClick('admin')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-[#E9A9BB] text-white border-[#E9A9BB]'
                  : 'bg-white border-[#E9A9BB] text-[#51434A] hover:bg-[#FBE6ED]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#D88CA3]" />
              <span className="hidden xl:inline">Admin Portal</span>
            </button>
          ) : isSystemInitialized === false ? (
            <button
              onClick={() => handleNavClick('admin-setup')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#F2A4B8] bg-[#FFF0F3] text-[#D94C6D] text-xs font-semibold shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D94C6D]" />
              <span>Thiết lập Admin</span>
            </button>
          ) : (
            <button
              onClick={() => handleNavClick('admin-login')}
              className="p-2 rounded-full bg-white/90 border border-[#F1D4DF] text-[#6E5C65] hover:text-[#51434A] cursor-pointer"
              title="Admin Login"
            >
              <Lock className="w-3.5 h-3.5 text-[#D88CA3]" />
            </button>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <div className="flex lg:hidden items-center gap-2">
          {member ? (
            <button
              onClick={() => openMemberProfileModal(member.id)}
              className="p-1 rounded-full border border-[#FFD700]"
            >
              <img
                src={member.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`}
                alt={member.username}
                className="w-7 h-7 rounded-full object-cover"
              />
            </button>
          ) : (
            <button
              onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
              className="px-3 py-1 rounded-full bg-[#865B9E] text-white text-[11px] font-bold"
            >
              Đăng nhập
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white border border-[#F1D4DF] text-[#51434A] active:scale-95 transition-all"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-lg border-b border-[#F1D4DF] px-4 py-4 space-y-2 animate-in slide-in-from-top-2">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentView === 'home' ? 'bg-[#FBE6ED] text-[#51434A] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            {siteContent.navHome || 'Trang chủ'}
          </button>

          <button
            onClick={() => handleNavClick('library')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentView === 'library' ? 'bg-[#FBE6ED] text-[#51434A] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            {siteContent.navLibrary || 'Thư viện'}
          </button>

          <button
            onClick={() => handleNavClick('reviews')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
              currentView === 'reviews' ? 'bg-[#FBE6ED] text-[#51434A] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            <span>Nhân vật Hot Chat 🔥</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-400" />
          </button>

          <button
            onClick={() => handleNavClick('hall')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
              currentView === 'hall' ? 'bg-[#E8D7F7] text-[#493B55] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            <span>Hall of Fame (Bảng Vinh Danh)</span>
            <Trophy className="w-4 h-4 text-amber-500" />
          </button>

          <button
            onClick={() => handleNavClick('donate')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
              currentView === 'donate' ? 'bg-[#FFFDF5] text-[#B8860B] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            <span>Ủng hộ VIP (Donate)</span>
            <Crown className="w-4 h-4 text-[#FFD700] fill-current" />
          </button>

          <button
            onClick={() => handleNavClick('about')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentView === 'about' ? 'bg-[#FBE6ED] text-[#51434A] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            {siteContent.navAbout || 'Giới thiệu'}
          </button>

          <div className="pt-2 border-t border-[#F1D4DF]/60 flex flex-col gap-2">
            {isAdmin ? (
              <button
                onClick={() => handleNavClick('admin')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F6DCE5] text-[#51434A] text-sm font-medium"
              >
                <UserCheck className="w-4 h-4 text-[#D88CA3]" />
                <span>Admin Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => handleNavClick('admin-login')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#F1D4DF] text-[#6E5C65] text-sm font-medium"
              >
                <Lock className="w-4 h-4 text-[#D88CA3]" />
                <span>Đăng nhập Admin</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
