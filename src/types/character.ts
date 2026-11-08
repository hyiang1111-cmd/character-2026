export interface Character {
  id: string;
  name: string;
  fullName: string;
  age: string;
  gender: string;
  nationality: string;
  occupation: string;
  universe: string;
  category: string;
  portraitUrl: string;

  // Character Profile
  shortDescription: string;
  appearance: string;
  personality: string;
  background: string;
  relationships: string;
  habitsPreferences: string;
  strengthsWeaknesses: string;

  // Roleplay Settings
  roleplayScenario: string;
  initialGreeting: string;
  perspective: string; // e.g., 'Second Person (You)', 'First Person (I)', 'Third Person'
  speakingStyle: string;
  behavioralRules: string;
  systemPrompt: string;

  // Google AI Studio Links
  chatUrl?: string; // Direct conversation URL (e.g. https://aistudio.google.com/...)
  viewerLink?: string; // Public read-only viewer link

  // Metadata
  status: 'published' | 'draft';
  createdAt: number;
  updatedAt: number;
}

export type CharacterFormData = Omit<Character, 'id' | 'createdAt' | 'updatedAt'>;
