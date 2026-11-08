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
      chars.push({ id: docSnap.id, ...(docSnap.data() as Omit<Character, 'id'>) });
    });
    return chars;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, CHARACTERS_PATH);
    return [];
  }
}

/**
 * Saves or updates a character in Firestore.
 * Requires authorized administrator access verified on the server via security rules.
 */
export async function saveCharacter(character: Character): Promise<void> {
  const isAuthorized = await checkServerAdminAuthorization(auth.currentUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can create or update characters.');
  }

  const docPath = `${CHARACTERS_PATH}/${character.id}`;
  try {
    const charRef = doc(db, CHARACTERS_PATH, character.id);
    await setDoc(charRef, character);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
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
        chars.push({ id: docSnap.id, ...(docSnap.data() as Omit<Character, 'id'>) });
      });
      callback(chars);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, CHARACTERS_PATH);
    }
  );

  return unsubscribe;
}
