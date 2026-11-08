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
  getDocFromServer,
  writeBatch
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
 * Validates password strength according to security standards:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!password || password.length < 8) {
    errors.push('Mật khẩu phải có độ dài tối thiểu 8 ký tự');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ cái in hoa (A-Z)');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ cái in thường (a-z)');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 chữ số (0-9)');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (!@#$%^&*...)');
  }
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Parses technical Firestore/Firebase errors into clear, actionable human-readable messages.
 */
export function parseFriendlyErrorMessage(error: unknown): string {
  if (!error) return 'Đã xảy ra lỗi không xác định.';
  const msg = error instanceof Error ? error.message : String(error);

  try {
    if (msg.startsWith('{') && msg.includes('"error"')) {
      const parsed = JSON.parse(msg);
      if (parsed.error) {
        return parseFriendlyErrorMessage(parsed.error);
      }
    }
  } catch {}

  if (
    msg.includes('permission-denied') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('Missing or insufficient permissions')
  ) {
    return 'Từ chối quyền truy cập (Permission Denied): Thao tác bị chặn bởi Firebase Security Rules. Chỉ Quản trị viên đã xác thực mới có quyền quản lý.';
  }

  if (msg.includes('auth/unauthorized-domain')) {
    return 'Tên miền chưa được cấp phép (Unauthorized Domain): Tên miền Vercel hiện tại chưa được thêm vào mục Authorized Domains trong Firebase Console (Authentication > Settings > Authorized Domains).';
  }

  if (msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
    return 'Mật khẩu không chính xác hoặc thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại.';
  }

  if (msg.includes('auth/user-not-found')) {
    return 'Tài khoản không tồn tại. Vui lòng kiểm tra lại email đăng nhập hoặc thực hiện thiết lập Admin lần đầu nếu hệ thống chưa khởi tạo.';
  }

  if (msg.includes('auth/weak-password')) {
    return 'Mật khẩu quá yếu: Vui lòng sử dụng tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.';
  }

  if (msg.includes('auth/invalid-email')) {
    return 'Địa chỉ email không đúng định dạng.';
  }

  if (msg.includes('auth/operation-not-allowed')) {
    return 'Tính năng Email/Mật khẩu chưa được bật trong Firebase Console! Bạn vui lòng vào Firebase Console > Authentication > Sign-in method > Bật (Enable) Email/Password rồi bấm Lưu (Save).';
  }

  if (msg.includes('auth/email-already-in-use')) {
    return 'Email này đã tồn tại trong Firebase Authentication. Bạn có thể nhập một Email Admin khác để tạo tài khoản mới.';
  }

  if (msg.includes('client is offline') || msg.includes('unavailable')) {
    return 'Lỗi kết nối mạng: Không thể kết nối đến máy chủ Google Cloud Firebase. Vui lòng kiểm tra đường truyền.';
  }

  return msg;
}

/**
 * Checks if the system already has an initialized Admin account.
 * Reads the protected /system/admin_status document.
 */
export async function checkSystemAdminStatus(): Promise<{ isInitialized: boolean; adminEmail?: string; adminUid?: string }> {
  try {
    const snap = await getDoc(doc(db, 'system', 'admin_status'));
    if (snap.exists()) {
      const data = snap.data();
      if (data?.isInitialized) {
        return {
          isInitialized: true,
          adminEmail: data.adminEmail,
          adminUid: data.adminUid,
        };
      }
    }
  } catch (e) {
    console.warn('System status check note:', e);
  }
  return { isInitialized: false };
}

/**
 * Sets up the first-time administrator account:
 * 1. Validates password strength (min 8 chars, uppercase, lowercase, number, symbol).
 * 2. Verifies system has not already been initialized in Firestore.
 * 3. Creates the user credentials exclusively using createUserWithEmailAndPassword().
 *    (NEVER calls signInWithEmailAndPassword, does not require an existing password).
 * 4. Atomically creates /system/admin_status (permanent lock) and /admins/{uid}.
 * 5. Permanent lock: Firestore security rules forbid any future update or deletion.
 */
export async function setupFirstTimeAdmin(email: string, pass: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();

  // Validate strength
  const strength = validatePasswordStrength(pass);
  if (!strength.isValid) {
    throw new Error(strength.errors.join('. '));
  }

  // Pre-check system status directly in database
  const currentStatus = await checkSystemAdminStatus();
  if (currentStatus.isInitialized) {
    throw new Error('Hệ thống đã có Quản trị viên. Chức năng thiết lập lần đầu đã bị khóa vĩnh viễn vì lý do bảo mật.');
  }

  // Create new user credentials exclusively via createUserWithEmailAndPassword()
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const user = cred.user;

  // Atomically initialize system status and admin record in Firestore
  // Note: Passwords are NEVER saved in Firestore, only user metadata (UID, email, timestamp)
  const batch = writeBatch(db);
  const adminStatusRef = doc(db, 'system', 'admin_status');
  const adminRecordRef = doc(db, 'admins', user.uid);

  batch.set(adminStatusRef, {
    isInitialized: true,
    adminUid: user.uid,
    adminEmail: cleanEmail,
    initializedAt: Date.now(),
  });

  batch.set(adminRecordRef, {
    email: cleanEmail,
    role: 'admin',
    addedAt: Date.now(),
  });

  await batch.commit();

  return user;
}

/**
 * Signs in using Firebase Email and Password.
 * Stays strictly within the current origin on Vercel without navigating away.
 * Verifies that the signed-in user is an authorized administrator.
 */
export async function loginWithEmailPassword(email: string, pass: string): Promise<User> {
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  const cleanEmail = email.trim().toLowerCase();
  const result = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const user = result.user;

  // Strict server & database verification
  const isAuthorized = await checkServerAdminAuthorization(user);
  if (!isAuthorized) {
    await fbSignOut(auth);
    throw new Error('Truy cập bị từ chối: Tài khoản này không có quyền Quản trị viên.');
  }

  return user;
}

/**
 * Signs in using Firebase Google Authentication popup (optional fallback).
 * Stays strictly within the current origin without navigating away.
 */
export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const isAuthorized = await checkServerAdminAuthorization(user);
  if (!isAuthorized) {
    await fbSignOut(auth);
    throw new Error('Truy cập bị từ chối: Tài khoản Google này không có quyền Quản trị viên.');
  }

  return user;
}

/**
 * Sends a password reset email to the administrator.
 */
export async function sendAdminPasswordReset(email: string): Promise<void> {
  const { sendPasswordResetEmail } = await import('firebase/auth');
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Logs out the current user session from Firebase Authentication.
 */
export async function logoutFirebase(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Checks server/database administrator authorization.
 * Evaluates against /system/admin_status, /admins/{uid}, and designated email.
 */
export async function checkServerAdminAuthorization(user: User | null): Promise<boolean> {
  if (!user || !user.uid) return false;

  try {
    // 1. Verify against /system/admin_status
    const statusSnap = await getDoc(doc(db, 'system', 'admin_status'));
    if (statusSnap.exists()) {
      const data = statusSnap.data();
      if (data?.isInitialized && data?.adminUid === user.uid) {
        return true;
      }
    }

    // 2. Verify against /admins/{uid}
    const adminDocRef = doc(db, 'admins', user.uid);
    const snap = await getDoc(adminDocRef);
    if (snap.exists() && snap.data()?.role === 'admin') {
      return true;
    }

    // 3. Fallback: designated admin email
    if (user.email && user.email.toLowerCase().trim() === DESIGNATED_ADMIN_EMAIL.toLowerCase()) {
      return true;
    }
  } catch (e) {
    console.warn('Admin authorization verification note:', e);
  }

  return false;
}
