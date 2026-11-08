import React from 'react';
import { Sparkles, BookOpen, Feather, MessageSquare, ShieldCheck, Heart } from 'lucide-react';
import { SiteContent } from '../../types/site';

interface AboutSectionProps {
  siteContent: SiteContent;
  onExploreLibrary: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  siteContent,
  onExploreLibrary,
}) => {
  return (
    <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#F1D4DF] text-xs font-semibold text-[#8E7A84] mb-4">
          <Sparkles className="w-3.5 h-3.5 text-[#D88CA3]" />
          <span>Curator Editorial Notes</span>
        </div>
        <h2 className="font-serif-title text-3xl sm:text-5xl font-medium text-[#51434A] tracking-tight mb-4 leading-tight">
          {siteContent.aboutTitle || 'An Editorial Haven for Storytellers'}
        </h2>
        <p className="text-sm sm:text-base text-[#6E5C65] font-light leading-relaxed">
          {siteContent.aboutTagline ||
            'Curated personalities, roleplay archetypes, and delicate character notes.'}
        </p>
      </div>

      {/* Main Story Box */}
      <div className="bg-white rounded-3xl border border-[#F1D4DF] p-6 sm:p-10 shadow-sm mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#FBE6ED] to-transparent rounded-bl-full pointer-events-none opacity-60" />
        <div className="relative z-10 max-w-3xl mx-auto space-y-4 text-sm sm:text-base text-[#51434A] leading-relaxed font-light">
          <p className="first-letter:text-4xl first-letter:font-serif-title first-letter:font-bold first-letter:text-[#D88CA3] first-letter:mr-2 first-letter:float-left">
            {siteContent.aboutStory ||
              'Pink Character Archive is a thoughtfully designed sanctuary for original characters, roleplay scenarios, and creative writing prompts. Every persona archived here is crafted with nuanced psychological depths, distinct conversational cadences, and direct connections to Google AI Studio conversational workspaces.'}
          </p>
        </div>
      </div>

      {/* 3 Pillars / Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/80 p-6 rounded-2xl border border-[#F1D4DF] shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#FFF5F7] border border-[#E9A9BB]/40 flex items-center justify-center text-[#D88CA3] mb-4">
            <Feather className="w-5 h-5" />
          </div>
          <h3 className="font-serif-title text-xl font-semibold text-[#51434A] mb-2">
            Archival Fidelity
          </h3>
          <p className="text-xs text-[#6E5C65] leading-relaxed font-light">
            Every character profile holds structured lore: backstories, habits, interpersonal dynamics, and distinct speaking voices.
          </p>
        </div>

        <div className="bg-white/80 p-6 rounded-2xl border border-[#F1D4DF] shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#FFF5F7] border border-[#E9A9BB]/40 flex items-center justify-center text-[#D88CA3] mb-4">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="font-serif-title text-xl font-semibold text-[#51434A] mb-2">
            Direct Google AI Studio Links
          </h3>
          <p className="text-xs text-[#6E5C65] leading-relaxed font-light">
            Seamlessly hop into dedicated Google AI Studio conversations with a single tap, or share read-only sessions with public viewers.
          </p>
        </div>

        <div className="bg-white/80 p-6 rounded-2xl border border-[#F1D4DF] shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-[#FFF5F7] border border-[#E9A9BB]/40 flex items-center justify-center text-[#D88CA3] mb-4">
            <Heart className="w-5 h-5" />
          </div>
          <h3 className="font-serif-title text-xl font-semibold text-[#51434A] mb-2">
            Pastel Aesthetic
          </h3>
          <p className="text-xs text-[#6E5C65] leading-relaxed font-light">
            Built with soft blush palettes, warm espresso typefaces, and minimalist editorial elegance across mobile and desktop.
          </p>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onExploreLibrary}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-[#E9A9BB] to-[#D88CA3] text-white text-sm font-semibold tracking-wide hover:shadow-md hover:brightness-105 active:scale-95 transition-all shadow-xs"
        >
          <BookOpen className="w-4 h-4" />
          <span>Explore Character Archive</span>
        </button>
      </div>
    </section>
  );
};
