export interface Character {
  id: string;

  // Required core fields
  name: string; // Character Name
  nickname?: string; // Nickname
  age: string; // Age
  gender: string; // Gender
  species?: string; // Species (e.g. Human, Elf, Android, Kitsune, Demon, Vampire)
  occupation: string; // Occupation
  category: string; // Category / Archetype

  // Character Profile
  personality: string; // Personality
  appearance: string; // Appearance
  background: string; // Background / Story
  relationships?: string;
  habitsPreferences?: string;
  strengthsWeaknesses?: string;

  // Roleplay Settings
  scenario: string; // Scenario / Current Lore
  greeting: string; // Greeting Message
  perspective?: string;
  speakingStyle?: string;
  behavioralRules?: string;
  systemPrompt?: string;

  // Visuals & Links
  avatarUrl: string; // Avatar Image (Upload or URL)
  chatUrl?: string; // Google AI Studio Chat URL
  viewerLink?: string; // Public Viewer Link
  tags: string[]; // Tags list

  // Legacy compatibility aliases
  fullName?: string;
  nationality?: string;
  universe?: string;
  shortDescription?: string;
  portraitUrl?: string;
  roleplayScenario?: string;
  initialGreeting?: string;

  // Status & Timestamps
  status: 'published' | 'draft';
  createdAt: number;
  updatedAt: number;
}

export type CharacterFormData = Omit<Character, 'id' | 'createdAt' | 'updatedAt'>;
