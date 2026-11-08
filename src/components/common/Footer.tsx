import React from 'react';
import { Sparkles, Heart, Shield } from 'lucide-react';
import { SiteContent } from '../../types/site';

interface FooterProps {
  siteContent: SiteContent;
  onNavigate: (view: 'home' | 'library' | 'about' | 'admin') => void;
  onOpenLogin: () => void;
  isAdmin: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  siteContent,
  onNavigate,
  onOpenLogin,
  isAdmin,
}) => {
  return (
    <footer className="mt-auto border-t border-[#F1D4DF] bg-white/60 backdrop-blur-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          {/* Logo & Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Sparkles className="w-4 h-4 text-[#E9A9BB]" />
              <span className="font-serif-title font-bold text-lg tracking-wider text-[#51434A]">
                {siteContent.logoText || 'PINK CHARACTER ARCHIVE'}
              </span>
            </div>
            <p className="text-xs text-[#8E7A84] max-w-sm leading-relaxed">
              {siteContent.footerText ||
                'A delicate haven for curated characters and immersive stories.'}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#6E5C65] font-medium">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-[#D88CA3] transition-colors"
            >
              {siteContent.navHome || 'Home'}
            </button>
            <button
              onClick={() => onNavigate('library')}
              className="hover:text-[#D88CA3] transition-colors"
            >
              {siteContent.navLibrary || 'Library'}
            </button>
            <button
              onClick={() => onNavigate('about')}
              className="hover:text-[#D88CA3] transition-colors"
            >
              {siteContent.navAbout || 'About'}
            </button>
            {isAdmin ? (
              <button
                onClick={() => onNavigate('admin')}
                className="hover:text-[#D88CA3] transition-colors text-[#51434A] font-semibold"
              >
                Admin Dashboard
              </button>
            ) : (
              <button
                onClick={onOpenLogin}
                className="hover:text-[#D88CA3] transition-colors flex items-center gap-1"
              >
                <Shield className="w-3 h-3 text-[#D88CA3]" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Divider & Copyright */}
        <div className="mt-8 pt-6 border-t border-[#F1D4DF]/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#8E7A84]">
          <p>{siteContent.footerCopyright || '© 2026 Pink Character Archive. All rights reserved.'}</p>
          <p className="flex items-center gap-1">
            <span>Crafted with</span>
            <Heart className="w-3 h-3 text-[#E9A9BB] fill-[#E9A9BB]" />
            <span>for imaginative roleplay</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
