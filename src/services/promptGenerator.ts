import { Character } from '../types/character';

/**
 * Builds a comprehensive, high-fidelity system prompt and initial interaction payload
 * from the character's archived attributes for Google AI Studio.
 */
export function generateCharacterPrompt(char: Character): string {
  const sections: string[] = [];

  const titleName = char.nickname ? `${char.name} ("${char.nickname}")` : char.name;
  sections.push(`# ROLEPLAY INSTRUCTION: ${char.name.toUpperCase()}`);
  sections.push(`You are to fully embody and roleplay as ${titleName}. Maintain this character persona consistently without breaking character.`);

  // Basic Information
  const basicInfo: string[] = [];
  if (char.nickname) basicInfo.push(`- Nickname / Alias: ${char.nickname}`);
  if (char.fullName) basicInfo.push(`- Full Name: ${char.fullName}`);
  if (char.species) basicInfo.push(`- Species / Kin: ${char.species}`);
  if (char.age) basicInfo.push(`- Age: ${char.age}`);
  if (char.gender) basicInfo.push(`- Gender: ${char.gender}`);
  if (char.occupation) basicInfo.push(`- Occupation: ${char.occupation}`);
  if (char.category) basicInfo.push(`- Category / Archetype: ${char.category}`);
  if (char.nationality) basicInfo.push(`- Nationality / Origin: ${char.nationality}`);
  if (char.universe) basicInfo.push(`- Universe / Setting: ${char.universe}`);
  if (char.tags && char.tags.length > 0) basicInfo.push(`- Attributes / Tags: ${char.tags.join(', ')}`);

  if (basicInfo.length > 0) {
    sections.push(`## Basic Information\n${basicInfo.join('\n')}`);
  }

  // Profile Details
  if (char.shortDescription) {
    sections.push(`## Character Summary\n${char.shortDescription}`);
  }
  if (char.personality) {
    sections.push(`## Personality & Temperament\n${char.personality}`);
  }
  if (char.appearance) {
    sections.push(`## Physical Appearance\n${char.appearance}`);
  }
  if (char.background) {
    sections.push(`## Background Story & Lore\n${char.background}`);
  }
  if (char.relationships) {
    sections.push(`## Key Relationships & Dynamics\n${char.relationships}`);
  }
  if (char.habitsPreferences) {
    sections.push(`## Habits, Likes & Preferences\n${char.habitsPreferences}`);
  }
  if (char.strengthsWeaknesses) {
    sections.push(`## Strengths & Vulnerabilities\n${char.strengthsWeaknesses}`);
  }

  // Roleplay Settings
  const scenarioText = char.scenario || char.roleplayScenario;
  if (scenarioText) {
    sections.push(`## Current Scenario / Setting\n${scenarioText}`);
  }

  const rpSettings: string[] = [];
  if (char.perspective) rpSettings.push(`- Narrative Perspective: ${char.perspective}`);
  if (char.speakingStyle) rpSettings.push(`- Speaking Cadence & Style: ${char.speakingStyle}`);
  if (char.behavioralRules) rpSettings.push(`- Behavioral Directives:\n${char.behavioralRules}`);

  if (rpSettings.length > 0) {
    sections.push(`## Behavioral Guidelines\n${rpSettings.join('\n')}`);
  }

  if (char.systemPrompt) {
    sections.push(`## Custom System Instructions\n${char.systemPrompt}`);
  }

  const greetingText = char.greeting || char.initialGreeting;
  if (greetingText) {
    sections.push(`## Opening Statement / Greeting\n"${greetingText}"`);
  }

  return sections.join('\n\n');
}

/**
 * Validates whether a string is a valid HTTPS link
 */
export function isValidHttpsUrl(urlString?: string): boolean {
  if (!urlString || !urlString.trim()) return false;
  try {
    const url = new URL(urlString.trim());
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
