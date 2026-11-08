import React, { useState } from 'react';
import { Sparkles, Shield, UserCheck, Menu, X, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SiteContent } from '../../types/site';

export type AppView = 'home' | 'library' | 'about' | 'admin' | 'admin-login' | 'admin-setup';

interface HeaderProps {
  siteContent: SiteContent;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  siteContent,
  currentView,
  onNavigate,
  onOpenLogin,
}) => {
  const { isAdmin, isSystemInitialized } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view: AppView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FFF5F7]/95 backdrop-blur-md border-b border-[#F1D4DF]/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2.5 group text-left transition-transform active:scale-98"
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
        <nav className="hidden md:flex items-center gap-1.5 bg-white/70 px-3 py-1.5 rounded-full border border-[#F1D4DF] shadow-xs">
          <button
            onClick={() => handleNavClick('home')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              currentView === 'home'
                ? 'bg-[#E9A9BB] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7]'
            }`}
          >
            {siteContent.navHome || 'Home'}
          </button>
          <button
            onClick={() => handleNavClick('library')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              currentView === 'library'
                ? 'bg-[#E9A9BB] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7]'
            }`}
          >
            {siteContent.navLibrary || 'Library'}
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              currentView === 'about'
                ? 'bg-[#E9A9BB] text-white shadow-xs'
                : 'text-[#6E5C65] hover:text-[#51434A] hover:bg-[#FFF5F7]'
            }`}
          >
            {siteContent.navAbout || 'About'}
          </button>
        </nav>

        {/* Right side: Security badge & Dedicated Admin Entry */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Security status badge */}
          <div
            title="Database protected by Firebase Security Rules. Public visitors receive read-only permissions."
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/80 border border-[#F1D4DF] text-[11px] text-[#8E7A84]"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-medium hidden lg:inline">
              {isAdmin ? 'Admin Mode (Authorized)' : 'Public Visitor (Read-Only)'}
            </span>
          </div>

          {isAdmin ? (
            <button
              onClick={() => handleNavClick('admin')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-xs ${
                currentView === 'admin'
                  ? 'bg-[#E9A9BB] text-white border-[#E9A9BB]'
                  : 'bg-white border-[#E9A9BB] text-[#51434A] hover:bg-[#FBE6ED]'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-[#D88CA3]" />
              <span>Admin Dashboard</span>
            </button>
          ) : isSystemInitialized === false ? (
            <button
              onClick={() => handleNavClick('admin-setup')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all shadow-xs ${
                currentView === 'admin-setup'
                  ? 'bg-[#E9A9BB] text-white border-[#E9A9BB]'
                  : 'bg-[#FFF0F3] border-[#F2A4B8] text-[#D94C6D] hover:bg-[#FBE6ED]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D94C6D]" />
              <span>Thiết lập Admin</span>
            </button>
          ) : (
            <button
              onClick={() => handleNavClick('admin-login')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all shadow-xs ${
                currentView === 'admin-login'
                  ? 'bg-[#E9A9BB] text-white border-[#E9A9BB]'
                  : 'bg-white/90 border-[#F1D4DF] text-[#6E5C65] hover:text-[#51434A] hover:border-[#E9A9BB]'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-[#D88CA3]" />
              <span>Admin Login</span>
            </button>
          )}
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          {isAdmin ? (
            <button
              onClick={() => handleNavClick('admin')}
              className="p-2 rounded-full bg-white border border-[#E9A9BB] text-[#51434A] text-xs"
              title="Admin Dashboard"
            >
              <UserCheck className="w-4 h-4 text-[#D88CA3]" />
            </button>
          ) : isSystemInitialized === false ? (
            <button
              onClick={() => handleNavClick('admin-setup')}
              className="p-2 rounded-full bg-[#FFF0F3] border border-[#F2A4B8] text-[#D94C6D] text-xs"
              title="Thiết lập Admin"
            >
              <Sparkles className="w-4 h-4 text-[#D94C6D]" />
            </button>
          ) : (
            <button
              onClick={() => handleNavClick('admin-login')}
              className="p-2 rounded-full bg-white border border-[#F1D4DF] text-[#6E5C65] text-xs"
              title="Admin Login"
            >
              <Lock className="w-4 h-4 text-[#D88CA3]" />
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
        <div className="md:hidden bg-white/95 backdrop-blur-lg border-b border-[#F1D4DF] px-4 py-4 space-y-2 animate-in slide-in-from-top-2">
          <button
            onClick={() => handleNavClick('home')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentView === 'home' ? 'bg-[#FBE6ED] text-[#51434A] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            {siteContent.navHome || 'Home'}
          </button>
          <button
            onClick={() => handleNavClick('library')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentView === 'library' ? 'bg-[#FBE6ED] text-[#51434A] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            {siteContent.navLibrary || 'Library'}
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              currentView === 'about' ? 'bg-[#FBE6ED] text-[#51434A] font-semibold' : 'text-[#6E5C65]'
            }`}
          >
            {siteContent.navAbout || 'About'}
          </button>
          <div className="pt-2 border-t border-[#F1D4DF]/60 flex flex-col gap-2">
            <button
              onClick={() => {
                if (isAdmin) {
                  handleNavClick('admin');
                } else if (isSystemInitialized === false) {
                  handleNavClick('admin-setup');
                } else {
                  handleNavClick('admin-login');
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#F6DCE5] text-[#51434A] text-sm font-medium"
            >
              {isAdmin ? (
                <UserCheck className="w-4 h-4 text-[#D88CA3]" />
              ) : isSystemInitialized === false ? (
                <Sparkles className="w-4 h-4 text-[#D94C6D]" />
              ) : (
                <Lock className="w-4 h-4 text-[#D88CA3]" />
              )}
              <span>
                {isAdmin
                  ? 'Admin Dashboard'
                  : isSystemInitialized === false
                  ? 'Thiết lập Admin Lần Đầu'
                  : 'Đăng nhập Quản trị viên'}
              </span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
