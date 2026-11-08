import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  User,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const DESIGNATED_ADMIN_EMAIL = 'giangbjyx2026@gmail.com';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID from config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Initialize Authentication
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Auth persistence warning:', err);
});

// Test Firestore Connection as specified in skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Structured Firestore error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Signs in using Firebase Google Authentication popup.
 * Server and Firebase security rules mandate verified email matching the authorized administrator.
 */
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Logs out the current user session from Firebase Authentication.
 */
export async function logoutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Checks server/database administrator authorization.
 * A user is an authorized administrator only if:
 * 1. User is authenticated with Firebase.
 * 2. User's email is verified and matches DESIGNATED_ADMIN_EMAIL.
 * 3. Or exists in the protected /admins/{uid} collection.
 */
export async function checkServerAdminAuthorization(user: User | null): Promise<boolean> {
  if (!user || !user.email) return false;

  const email = user.email.toLowerCase();
  const designated = DESIGNATED_ADMIN_EMAIL.toLowerCase();

  if (email === designated && user.emailVerified) {
    return true;
  }

  try {
    const adminDocRef = doc(db, 'admins', user.uid);
    const snap = await getDoc(adminDocRef);
    if (snap.exists()) {
      return true;
    }
  } catch (e) {
    console.warn('Admin check note:', e);
  }

  return false;
}
