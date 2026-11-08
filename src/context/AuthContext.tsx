import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  loginWithGoogle,
  loginWithEmailPassword,
  createAdminAccount,
  sendAdminPasswordReset,
  logoutFirebase,
  checkServerAdminAuthorization,
  DESIGNATED_ADMIN_EMAIL
} from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  isAdmin: boolean;
  currentUser: { email: string | null; name: string | null; uid: string | null } | null;
  designatedAdminEmail: string;
  isAuthenticating: boolean;
  authError: string | null;
  loginAsAdmin: () => Promise<void>;
  loginWithPassword: (password: string) => Promise<void>;
  setupAdminPassword: (password: string) => Promise<void>;
  resetAdminPassword: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  currentUser: null,
  designatedAdminEmail: DESIGNATED_ADMIN_EMAIL,
  isAuthenticating: false,
  authError: null,
  loginAsAdmin: async () => {},
  loginWithPassword: async () => {},
  setupAdminPassword: async () => {},
  resetAdminPassword: async () => {},
  logout: async () => {},
  clearAuthError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ email: string | null; name: string | null; uid: string | null } | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Monitor real Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setIsAuthenticating(true);
      if (user) {
        // Strict server & database verification
        const authorized = await checkServerAdminAuthorization(user);
        if (authorized) {
          setIsAdmin(true);
          setCurrentUser({
            email: user.email,
            name: user.displayName || user.email?.split('@')[0] || 'Administrator',
            uid: user.uid,
          });
          setAuthError(null);
        } else {
          // If signed in with an unauthorized user account, immediately deny admin privileges
          setIsAdmin(false);
          setCurrentUser(null);
          await logoutFirebase();
          setAuthError(
            `Access Denied: Account (${user.email}) is not an authorized administrator. Only ${DESIGNATED_ADMIN_EMAIL} is granted administrator rights.`
          );
        }
      } else {
        setIsAdmin(false);
        setCurrentUser(null);
      }
      setIsAuthenticating(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsAdmin = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const user = await loginWithGoogle();
      const authorized = await checkServerAdminAuthorization(user);

      if (!authorized) {
        setIsAdmin(false);
        setCurrentUser(null);
        await logoutFirebase();
        throw new Error(
          `Access Denied: Account ${user.email} is not authorized. Only the designated administrator (${DESIGNATED_ADMIN_EMAIL}) has curator access.`
        );
      }

      setIsAdmin(true);
      setCurrentUser({
        email: user.email,
        name: user.displayName || 'Administrator',
        uid: user.uid,
      });
    } catch (err: any) {
      const message = err?.message || 'Authentication failed. Please verify administrator credentials.';
      setAuthError(message);
      setIsAdmin(false);
      setCurrentUser(null);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loginWithPassword = async (password: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const user = await loginWithEmailPassword(DESIGNATED_ADMIN_EMAIL, password);
      const authorized = await checkServerAdminAuthorization(user);

      if (!authorized) {
        setIsAdmin(false);
        setCurrentUser(null);
        await logoutFirebase();
        throw new Error(`Access Denied: Account ${user.email} is not authorized.`);
      }

      setIsAdmin(true);
      setCurrentUser({
        email: user.email,
        name: 'Administrator',
        uid: user.uid,
      });
    } catch (err: any) {
      const message = err?.message || 'Authentication failed. Please check password.';
      setAuthError(message);
      setIsAdmin(false);
      setCurrentUser(null);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const setupAdminPassword = async (password: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const user = await createAdminAccount(DESIGNATED_ADMIN_EMAIL, password);
      setIsAdmin(true);
      setCurrentUser({
        email: user.email,
        name: 'Administrator',
        uid: user.uid,
      });
    } catch (err: any) {
      const message = err?.message || 'Failed to setup admin account.';
      setAuthError(message);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const resetAdminPassword = async () => {
    try {
      await sendAdminPasswordReset(DESIGNATED_ADMIN_EMAIL);
    } catch (err: any) {
      throw err;
    }
  };

  const logout = async () => {
    setIsAuthenticating(true);
    try {
      await logoutFirebase();
      setIsAdmin(false);
      setCurrentUser(null);
      setAuthError(null);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        isAdmin,
        currentUser,
        designatedAdminEmail: DESIGNATED_ADMIN_EMAIL,
        isAuthenticating,
        authError,
        loginAsAdmin,
        loginWithPassword,
        setupAdminPassword,
        resetAdminPassword,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
