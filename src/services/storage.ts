import { Character } from '../types/character';
import { SiteContent, DEFAULT_SITE_CONTENT } from '../types/site';
import {
  db,
  auth,
  handleFirestoreError,
  OperationType,
  checkServerAdminAuthorization
} from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';

const CHARACTERS_PATH = 'characters';
const SETTINGS_PATH = 'settings';

/**
 * Loads characters from Cloud Firestore.
 * - Public visitors receive ONLY published characters.
 * - Authenticated administrators receive all characters (published & drafts).
 * Initial database is completely EMPTY (zero characters).
 */
export async function getCharacters(forAdmin: boolean = false): Promise<Character[]> {
  try {
    let q;
    if (forAdmin) {
      q = query(collection(db, CHARACTERS_PATH), orderBy('createdAt', 'desc'));
    } else {
      q = query(
        collection(db, CHARACTERS_PATH),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const chars: Character[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as any;
      chars.push(normalizeCharacterData(docSnap.id, data));
    });
    return chars;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CHARACTERS_PATH);
    return [];
  }
}

/**
 * Normalizes document data to satisfy Character interface with legacy and new fields
 */
function normalizeCharacterData(id: string, data: any): Character {
  return {
    id,
    name: data.name || '',
    nickname: data.nickname || '',
    age: data.age || '',
    gender: data.gender || '',
    species: data.species || '',
    occupation: data.occupation || '',
    category: data.category || 'General',
    personality: data.personality || '',
    appearance: data.appearance || '',
    background: data.background || '',
    relationships: data.relationships || '',
    habitsPreferences: data.habitsPreferences || '',
    strengthsWeaknesses: data.strengthsWeaknesses || '',
    scenario: data.scenario || data.roleplayScenario || '',
    greeting: data.greeting || data.initialGreeting || '',
    perspective: data.perspective || 'Second Person (You)',
    speakingStyle: data.speakingStyle || '',
    behavioralRules: data.behavioralRules || '',
    systemPrompt: data.systemPrompt || '',
    avatarUrl: data.avatarUrl || data.portraitUrl || '',
    portraitUrl: data.avatarUrl || data.portraitUrl || '',
    chatUrl: data.chatUrl || '',
    viewerLink: data.viewerLink || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    fullName: data.fullName || '',
    nationality: data.nationality || '',
    universe: data.universe || '',
    shortDescription: data.shortDescription || '',
    roleplayScenario: data.scenario || data.roleplayScenario || '',
    initialGreeting: data.greeting || data.initialGreeting || '',
    status: data.status === 'draft' ? 'draft' : 'published',
    createdAt: Number(data.createdAt) || Date.now(),
    updatedAt: Number(data.updatedAt) || Date.now(),
  };
}

/**
 * Sanitizes and normalizes character data to prevent undefined values
 * which crash Firestore setDoc operations.
 */
export function sanitizeCharacterForFirestore(data: Partial<Character>): Character {
  const now = Date.now();
  const id = String(data.id || 'char_' + Math.random().toString(36).substring(2, 10) + '_' + now).trim();
  const name = String(data.name || '').trim();
  const status: 'published' | 'draft' = data.status === 'draft' ? 'draft' : 'published';

  const avatar = String(data.avatarUrl || data.portraitUrl || '').trim();
  const scenario = String(data.scenario || data.roleplayScenario || '').trim();
  const greeting = String(data.greeting || data.initialGreeting || '').trim();

  return {
    id,
    name,
    nickname: String(data.nickname || '').trim(),
    age: String(data.age || '').trim(),
    gender: String(data.gender || '').trim(),
    species: String(data.species || '').trim(),
    occupation: String(data.occupation || '').trim(),
    category: String(data.category || 'General').trim(),
    personality: String(data.personality || '').trim(),
    appearance: String(data.appearance || '').trim(),
    background: String(data.background || '').trim(),
    relationships: String(data.relationships || '').trim(),
    habitsPreferences: String(data.habitsPreferences || '').trim(),
    strengthsWeaknesses: String(data.strengthsWeaknesses || '').trim(),
    scenario,
    roleplayScenario: scenario,
    greeting,
    initialGreeting: greeting,
    perspective: String(data.perspective || 'Second Person (You)').trim(),
    speakingStyle: String(data.speakingStyle || '').trim(),
    behavioralRules: String(data.behavioralRules || '').trim(),
    systemPrompt: String(data.systemPrompt || '').trim(),
    avatarUrl: avatar,
    portraitUrl: avatar,
    chatUrl: String(data.chatUrl || '').trim(),
    viewerLink: String(data.viewerLink || '').trim(),
    tags: Array.isArray(data.tags)
      ? data.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
    fullName: String(data.fullName || data.name || '').trim(),
    nationality: String(data.nationality || '').trim(),
    universe: String(data.universe || '').trim(),
    shortDescription: String(data.shortDescription || '').trim(),
    status,
    createdAt: Number(data.createdAt) || now,
    updatedAt: now,
  };
}

/**
 * Saves or updates a character in Firestore.
 * Requires authorized administrator access verified on the server via security rules.
 */
export async function saveCharacter(character: Character): Promise<Character> {
  if (!character.name || !character.name.trim()) {
    throw new Error('Validation Error: Character Name is required.');
  }

  // Verify authentication before attempting Firestore operation
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser) {
    throw new Error(
      'Authentication Required: You are not currently signed in. Please click Admin Login to sign in as the authorized administrator before saving characters.'
    );
  }

  const isAuthorized = await checkServerAdminAuthorization(currentAuthUser);
  if (!isAuthorized) {
    throw new Error(
      `Access Denied: Account (${currentAuthUser.email || 'unknown'}) is not authorized. Only the designated administrator account is permitted to create or update characters.`
    );
  }

  const payload = sanitizeCharacterForFirestore(character);
  const docPath = `${CHARACTERS_PATH}/${payload.id}`;

  try {
    const charRef = doc(db, CHARACTERS_PATH, payload.id);
    await setDoc(charRef, payload);
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
    throw error;
  }
}

/**
 * Duplicates an existing character as a new Draft record
 */
export async function duplicateCharacter(original: Character): Promise<Character> {
  const currentAuthUser = auth.currentUser;
  if (!currentAuthUser) {
    throw new Error('Authentication Required: Please sign in as administrator to duplicate characters.');
  }

  const isAuthorized = await checkServerAdminAuthorization(currentAuthUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can duplicate characters.');
  }

  const now = Date.now();
  const newId = 'char_' + Math.random().toString(36).substring(2, 10) + '_' + now;
  const duplicate: Character = sanitizeCharacterForFirestore({
    ...original,
    id: newId,
    name: `${original.name} (Copy)`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  });

  await saveCharacter(duplicate);
  return duplicate;
}

/**
 * Deletes a character in Firestore.
 * Requires authorized administrator access verified on the server via security rules.
 */
export async function deleteCharacter(id: string): Promise<void> {
  const isAuthorized = await checkServerAdminAuthorization(auth.currentUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can delete characters.');
  }

  const docPath = `${CHARACTERS_PATH}/${id}`;
  try {
    const charRef = doc(db, CHARACTERS_PATH, id);
    await deleteDoc(charRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Loads customized website editorial content from Firestore.
 * Fallback to DEFAULT_SITE_CONTENT if uninitialized.
 */
export async function getSiteContent(): Promise<SiteContent> {
  const docPath = `${SETTINGS_PATH}/site`;
  try {
    const siteDoc = await getDoc(doc(db, SETTINGS_PATH, 'site'));
    if (siteDoc.exists()) {
      return { ...DEFAULT_SITE_CONTENT, ...siteDoc.data() } as SiteContent;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
  return DEFAULT_SITE_CONTENT;
}

/**
 * Saves customized website content to Firestore.
 * Requires administrator permissions verified on the server.
 */
export async function saveSiteContent(content: SiteContent): Promise<void> {
  const isAuthorized = await checkServerAdminAuthorization(auth.currentUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can edit website settings.');
  }

  const docPath = `${SETTINGS_PATH}/site`;
  try {
    await setDoc(doc(db, SETTINGS_PATH, 'site'), content);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Real-time subscription to characters.
 * - Public visitors only stream published characters.
 * - Verified administrators stream all characters.
 */
export function subscribeToCharacters(
  callback: (characters: Character[]) => void,
  forAdmin: boolean = false
): () => void {
  let q;
  if (forAdmin) {
    q = query(collection(db, CHARACTERS_PATH), orderBy('createdAt', 'desc'));
  } else {
    q = query(
      collection(db, CHARACTERS_PATH),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const chars: Character[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as any;
        chars.push(normalizeCharacterData(docSnap.id, data));
      });
      callback(chars);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CHARACTERS_PATH);
    }
  );

  return unsubscribe;
}
