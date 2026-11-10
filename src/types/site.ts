export interface SiteContent {
  siteName: string;
  logoText: string;
  homeTitle: string;
  homeSubtitle: string;
  aboutTitle: string;
  aboutStory: string;
  aboutTagline: string;
  footerText: string;
  footerCopyright: string;
  navHome: string;
  navLibrary: string;
  navAbout: string;
  categories: string[];
  supabaseUrl?: string;
  supabaseAnonKey?: string;
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  siteName: 'PINK CHARACTER ARCHIVE',
  logoText: 'PINK CHARACTER ARCHIVE',
  homeTitle: 'Find Your Character.',
  homeSubtitle: 'A little world filled with stories waiting to be discovered.',
  aboutTitle: 'An Editorial Haven for Storytellers',
  aboutTagline: 'Curated personalities, roleplay archetypes, and delicate character notes.',
  aboutStory:
    'Pink Character Archive is a thoughtfully designed sanctuary for original characters, roleplay scenarios, and creative writing prompts. Every persona archived here is crafted with nuanced psychological depths, distinct conversational cadences, and direct connections to Google AI Studio conversational workspaces.',
  footerText: 'A delicate haven for curated characters and immersive stories.',
  footerCopyright: '© 2026 Pink Character Archive. All rights reserved.',
  navHome: 'Home',
  navLibrary: 'Library',
  navAbout: 'About',
  categories: [
    'All',
    'Fantasy',
    'Romance',
    'Sci-Fi',
    'Slice of Life',
    'Mystery',
    'Historical',
    'Anime / Manga',
    'Supernatural',
  ],
};
