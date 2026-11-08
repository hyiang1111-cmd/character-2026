import { Character } from '../types/character';
import { SiteContent, DEFAULT_SITE_CONTENT } from '../types/site';
import { MusicTrack, MusicSettings, DEFAULT_MUSIC_SETTINGS } from '../types/music';
import {
  db,
  auth,
  storage,
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
  orderBy,
  writeBatch
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

const CHARACTERS_PATH = 'characters';
const SETTINGS_PATH = 'settings';
const MUSIC_TRACKS_PATH = 'music_tracks';

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

// ==========================================
// BACKGROUND MUSIC MANAGEMENT (ADMIN & PUBLIC)
// ==========================================

const MUSIC_SETTINGS_DOC = `${SETTINGS_PATH}/music_settings`;

/**
 * Loads current background music settings from Firestore.
 */
export async function getMusicSettings(): Promise<MusicSettings> {
  try {
    const snap = await getDoc(doc(db, SETTINGS_PATH, 'music_settings'));
    if (snap.exists()) {
      return {
        ...DEFAULT_MUSIC_SETTINGS,
        ...(snap.data() as Partial<MusicSettings>),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, MUSIC_SETTINGS_DOC);
  }
  return DEFAULT_MUSIC_SETTINGS;
}

/**
 * Saves background music settings to Firestore.
 * Requires verified administrator permissions.
 */
export async function saveMusicSettings(settings: Partial<MusicSettings>): Promise<void> {
  const isAuthorized = await checkServerAdminAuthorization(auth.currentUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can update music settings.');
  }

  const updated: MusicSettings = {
    ...DEFAULT_MUSIC_SETTINGS,
    ...settings,
    updatedAt: Date.now(),
  };

  try {
    await setDoc(doc(db, SETTINGS_PATH, 'music_settings'), updated);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, MUSIC_SETTINGS_DOC);
  }
}

/**
 * Real-time subscription to background music settings.
 */
export function subscribeToMusicSettings(callback: (settings: MusicSettings) => void): () => void {
  return onSnapshot(
    doc(db, SETTINGS_PATH, 'music_settings'),
    (snap) => {
      if (snap.exists()) {
        callback({
          ...DEFAULT_MUSIC_SETTINGS,
          ...(snap.data() as Partial<MusicSettings>),
        });
      } else {
        callback(DEFAULT_MUSIC_SETTINGS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, MUSIC_SETTINGS_DOC);
    }
  );
}

/**
 * Fetches all uploaded music tracks from Firestore.
 */
export async function getMusicTracks(): Promise<MusicTrack[]> {
  try {
    const q = query(collection(db, MUSIC_TRACKS_PATH), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const tracks: MusicTrack[] = [];
    snap.forEach((d) => {
      tracks.push({
        id: d.id,
        ...(d.data() as Omit<MusicTrack, 'id'>),
      });
    });
    return tracks;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, MUSIC_TRACKS_PATH);
    return [];
  }
}

/**
 * Saves a music track metadata entry in Firestore.
 */
export async function saveMusicTrack(track: MusicTrack): Promise<void> {
  const isAuthorized = await checkServerAdminAuthorization(auth.currentUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can manage music tracks.');
  }

  const docPath = `${MUSIC_TRACKS_PATH}/${track.id}`;
  try {
    await setDoc(doc(db, MUSIC_TRACKS_PATH, track.id), track);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, docPath);
  }
}

/**
 * Sets a specific track as the active background music for the website.
 */
export async function setActiveMusicTrack(track: MusicTrack): Promise<void> {
  const isAuthorized = await checkServerAdminAuthorization(auth.currentUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can set active music.');
  }

  try {
    // 1. Fetch all tracks and update their isActive status
    const allTracks = await getMusicTracks();
    const batch = writeBatch(db);

    allTracks.forEach((t) => {
      const isTarget = t.id === track.id;
      if (t.isActive !== isTarget) {
        batch.update(doc(db, MUSIC_TRACKS_PATH, t.id), { isActive: isTarget });
      }
    });

    // 2. Update global settings document
    batch.set(
      doc(db, SETTINGS_PATH, 'music_settings'),
      {
        enabled: true,
        activeTrackId: track.id,
        activeTrackUrl: track.url,
        activeTrackTitle: track.title,
        updatedAt: Date.now(),
      },
      { merge: true }
    );

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, MUSIC_SETTINGS_DOC);
  }
}

/**
 * Deletes a music track from Firestore and optionally Firebase Storage.
 */
export async function deleteMusicTrack(trackId: string, storagePath?: string): Promise<void> {
  const isAuthorized = await checkServerAdminAuthorization(auth.currentUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can delete music tracks.');
  }

  try {
    // Delete file from Firebase Storage if path provided
    if (storage && storagePath) {
      try {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      } catch (storageErr) {
        console.warn('Could not delete file from Cloud Storage:', storageErr);
      }
    }

    // Delete Firestore document
    await deleteDoc(doc(db, MUSIC_TRACKS_PATH, trackId));

    // If active track was deleted, reset settings active track
    const settings = await getMusicSettings();
    if (settings.activeTrackId === trackId) {
      await saveMusicSettings({
        ...settings,
        activeTrackId: null,
        activeTrackUrl: '/audio/background-music.mp3',
        activeTrackTitle: 'Default Archive Melody',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${MUSIC_TRACKS_PATH}/${trackId}`);
  }
}

/**
 * Subscribes to real-time updates for music tracks.
 */
export function subscribeToMusicTracks(callback: (tracks: MusicTrack[]) => void): () => void {
  const q = query(collection(db, MUSIC_TRACKS_PATH), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const tracks: MusicTrack[] = [];
      snap.forEach((d) => {
        tracks.push({
          id: d.id,
          ...(d.data() as Omit<MusicTrack, 'id'>),
        });
      });
      callback(tracks);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, MUSIC_TRACKS_PATH);
    }
  );
}

/**
 * Uploads an audio file to Firebase Storage.
 * Validates maximum file size (up to 25MB) and audio MIME types.
 */
export async function uploadMusicFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; storagePath: string }> {
  const isAuthorized = await checkServerAdminAuthorization(auth.currentUser);
  if (!isAuthorized) {
    throw new Error('Unauthorized: Only verified administrators can upload music.');
  }

  // 25MB limit
  const MAX_SIZE = 25 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`Dung lượng file (${(file.size / (1024 * 1024)).toFixed(1)} MB) vượt quá giới hạn tối đa cho phép là 25 MB.`);
  }

  if (!storage) {
    throw new Error('Firebase Storage chưa được khởi tạo. Bạn có thể sử dụng link âm thanh trực tiếp.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `music/${Date.now()}_${safeName}`;
  const fileRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(fileRef, file, {
    contentType: file.type || 'audio/mpeg',
  });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) {
          onProgress(Math.round(progress));
        }
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        reject(
          new Error(
            `Lỗi khi tải file lên máy chủ lưu trữ: ${error.message || 'Vui lòng kiểm tra quyền truy cập Storage'}`
          )
        );
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url: downloadUrl, storagePath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

