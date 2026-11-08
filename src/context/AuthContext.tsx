import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  checkSystemAdminStatus,
  setupFirstTimeAdmin as apiSetupFirstTimeAdmin,
  loginWithEmailPassword as apiLoginWithEmailPassword,
  loginWithGoogle as apiLoginWithGoogle,
  logoutFirebase,
  checkServerAdminAuthorization,
  parseFriendlyErrorMessage,
  DESIGNATED_ADMIN_EMAIL
} from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  isAdmin: boolean;
  currentUser: { email: string | null; name: string | null; uid: string | null } | null;
  isSystemInitialized: boolean | null;
  adminEmail: string | null;
  designatedAdminEmail: string;
  isAuthenticating: boolean;
  authError: string | null;
  refreshSystemStatus: () => Promise<boolean>;
  setupFirstTimeAdmin: (email: string, pass: string) => Promise<void>;
  loginWithEmailPassword: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsAdmin: () => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  currentUser: null,
  isSystemInitialized: null,
  adminEmail: null,
  designatedAdminEmail: DESIGNATED_ADMIN_EMAIL,
  isAuthenticating: true,
  authError: null,
  refreshSystemStatus: async () => false,
  setupFirstTimeAdmin: async () => {},
  loginWithEmailPassword: async () => {},
  loginWithGoogle: async () => {},
  loginAsAdmin: async () => {},
  logout: async () => {},
  clearAuthError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ email: string | null; name: string | null; uid: string | null } | null>(null);
  const [isSystemInitialized, setIsSystemInitialized] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check system initialization state
  const refreshSystemStatus = async (): Promise<boolean> => {
    try {
      const status = await checkSystemAdminStatus();
      setIsSystemInitialized(status.isInitialized);
      if (status.adminEmail) {
        setAdminEmail(status.adminEmail);
      }
      return status.isInitialized;
    } catch (e) {
      console.warn('Failed to refresh system status:', e);
      return false;
    }
  };

  useEffect(() => {
    refreshSystemStatus();
  }, []);

  // Monitor real Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setIsAuthenticating(true);
      if (user) {
        // Strict database authorization check
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
        }
      } else {
        setIsAdmin(false);
        setCurrentUser(null);
      }
      setIsAuthenticating(false);
    });

    return () => unsubscribe();
  }, []);

  // First-time Admin Setup handler
  const setupFirstTimeAdmin = async (email: string, pass: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const user = await apiSetupFirstTimeAdmin(email, pass);
      setIsAdmin(true);
      setCurrentUser({
        email: user.email,
        name: 'Administrator',
        uid: user.uid,
      });
      setIsSystemInitialized(true);
      setAdminEmail(user.email || email);
    } catch (err: any) {
      const friendly = parseFriendlyErrorMessage(err);
      setAuthError(friendly);
      setIsAdmin(false);
      setCurrentUser(null);
      throw new Error(friendly);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Admin Login with Email & Password
  const loginWithEmailPassword = async (email: string, pass: string) => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const user = await apiLoginWithEmailPassword(email, pass);
      setIsAdmin(true);
      setCurrentUser({
        email: user.email,
        name: 'Administrator',
        uid: user.uid,
      });
    } catch (err: any) {
      const friendly = parseFriendlyErrorMessage(err);
      setAuthError(friendly);
      setIsAdmin(false);
      setCurrentUser(null);
      throw new Error(friendly);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Google Sign-In Fallback
  const loginWithGoogle = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    try {
      const user = await apiLoginWithGoogle();
      setIsAdmin(true);
      setCurrentUser({
        email: user.email,
        name: user.displayName || 'Administrator',
        uid: user.uid,
      });
    } catch (err: any) {
      const friendly = parseFriendlyErrorMessage(err);
      setAuthError(friendly);
      setIsAdmin(false);
      setCurrentUser(null);
      throw new Error(friendly);
    } finally {
      setIsAuthenticating(false);
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
        isSystemInitialized,
        adminEmail,
        designatedAdminEmail: DESIGNATED_ADMIN_EMAIL,
        isAuthenticating,
        authError,
        refreshSystemStatus,
        setupFirstTimeAdmin,
        loginWithEmailPassword,
        loginWithGoogle,
        loginAsAdmin: loginWithGoogle,
        logout,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
