import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';
import {
  MemberProfile,
  isSupabaseConfigured
} from '../services/supabase';
import {
  getCurrentCommunityMember,
  registerCommunityMember,
  loginCommunityMember,
  logoutCommunityMember,
  updateCommunityMemberProfile,
  trackCharacterExplored,
  getUserBadges,
  updateUserActiveTime,
  recordCharacterChatClick,
  getMemberRanksMap,
  ensureAdminMemberProfile
} from '../services/communityStorage';
import { useAuth } from './AuthContext';

interface CommunityContextType {
  member: MemberProfile | null;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  memberRanksMap: Record<string, { activityRank?: number; donationRank?: number }>;
  register: (username: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<MemberProfile>) => Promise<boolean>;
  trackCharacterView: (characterId: string) => Promise<void>;
  recordChatClick: (characterId?: string) => Promise<void>;
  viewMemberProfileId: string | null;
  openMemberProfileModal: (userId: string) => void;
  closeMemberProfileModal: () => void;
  refreshMember: () => Promise<void>;
  refreshRanksMap: () => Promise<void>;
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export const CommunityProvider: React.FC<{
  children: React.ReactNode;
  onShowToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}> = ({ children, onShowToast }) => {
  const { isAdmin, currentUser } = useAuth();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [viewMemberProfileId, setViewMemberProfileId] = useState<string | null>(null);
  const [memberRanksMap, setMemberRanksMap] = useState<Record<string, { activityRank?: number; donationRank?: number }>>({});

  const isSupabaseConnected = isSupabaseConfigured();

  // Load ranks map
  const refreshRanksMap = useCallback(async () => {
    try {
      const ranks = await getMemberRanksMap();
      setMemberRanksMap(ranks);
    } catch (e) {
      console.warn('Failed to load member ranks map:', e);
    }
  }, []);

  // Sync Admin session as Member Profile
  useEffect(() => {
    async function syncAdminMember() {
      if (isAdmin && currentUser) {
        try {
          const adminProf = await ensureAdminMemberProfile(currentUser);
          setMember(adminProf);
          await refreshRanksMap();
        } catch (e) {
          console.warn('Failed to sync admin member profile:', e);
        }
      }
    }
    syncAdminMember();
  }, [isAdmin, currentUser, refreshRanksMap]);

  // Restore session
  const refreshMember = useCallback(async () => {
    try {
      if (isAdmin && currentUser) {
        const adminProf = await ensureAdminMemberProfile(currentUser);
        setMember(adminProf);
      } else {
        const current = await getCurrentCommunityMember();
        setMember(current);
      }
      await refreshRanksMap();
    } catch (e) {
      console.warn('Community session restore error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, currentUser, refreshRanksMap]);

  useEffect(() => {
    refreshMember();
  }, [refreshMember]);

  // Unique session ID for this browser tab instance
  const sessionId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const existing = sessionStorage.getItem('pca_tab_session_id');
      if (existing) return existing;
      const created = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('pca_tab_session_id', created);
      return created;
    }
    return 'sess_default_' + Date.now();
  }, []);

  // Track recent physical user interactions (prevents unattended AFK background farming)
  const lastUserInteractionRef = useRef<number>(Date.now());

  useEffect(() => {
    const handleUserInteraction = () => {
      lastUserInteractionRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true });
    window.addEventListener('click', handleUserInteraction, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
    };
  }, []);

  // Server-Authoritative Active Time Heartbeat Tracker (30-second interval)
  useEffect(() => {
    if (!member?.id) return;

    const interval = setInterval(async () => {
      // 1. Page must be currently visible and focused
      if (document.visibilityState !== 'visible' || !document.hasFocus()) {
        return;
      }

      // 2. User must have interacted within the last 60 seconds (reject AFK/dormant page farming)
      const now = Date.now();
      const idleElapsed = now - lastUserInteractionRef.current;
      if (idleElapsed > 60000) {
        return;
      }

      // 3. Multi-Tab coordination: only the active focused tab sends heartbeat per 25-second window
      const lastTabHeartbeat = Number(localStorage.getItem('pca_tab_heartbeat_timestamp') || 0);
      if (now - lastTabHeartbeat < 25000) {
        return;
      }
      localStorage.setItem('pca_tab_heartbeat_timestamp', String(now));

      // 4. Send heartbeat to server RPC
      try {
        const result = await updateUserActiveTime(member.id, 30, sessionId);
        if (result.newTotal !== undefined) {
          setMember((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              active_time_seconds: result.newTotal!,
            };
          });
        }
        // Periodically refresh global ranks map
        refreshRanksMap();
      } catch (e) {
        console.warn('Active time update error:', e);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [member?.id, sessionId, refreshRanksMap]);

  // Verified Record Chat Click handler (with 30-second per-character anti-spam protection)
  const recordChatClick = useCallback(async (characterId?: string) => {
    if (!member?.id) return;
    try {
      const result = await recordCharacterChatClick(member.id, characterId, sessionId);
      if (result.newTotal !== undefined) {
        setMember((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            character_chats_count: result.newTotal!,
          };
        });
      }
      await refreshRanksMap();
    } catch (e) {
      console.warn('Chat click record error:', e);
    }
  }, [member?.id, sessionId, refreshRanksMap]);

  // Register
  const register = useCallback(async (username: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { profile, error } = await registerCommunityMember(username, email, pass);
      if (error || !profile) {
        setIsLoading(false);
        return { success: false, error: error || 'Đăng ký thất bại' };
      }
      setMember(profile);
      onShowToast('success', 'Đăng ký tài khoản thành công!', `Chào mừng ${profile.username} gia nhập Character Archive!`);
      await refreshRanksMap();
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Lỗi hệ thống khi đăng ký' };
    }
  }, [onShowToast, refreshRanksMap]);

  // Login
  const login = useCallback(async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { profile, error } = await loginCommunityMember(email, pass);
      if (error || !profile) {
        setIsLoading(false);
        return { success: false, error: error || 'Đăng nhập thất bại' };
      }
      setMember(profile);
      onShowToast('success', 'Đăng nhập thành công!', `Rất vui được gặp lại ${profile.username}!`);
      await refreshRanksMap();
      setIsLoading(false);
      return { success: true };
    } catch (err: any) {
      setIsLoading(false);
      return { success: false, error: err?.message || 'Lỗi hệ thống khi đăng nhập' };
    }
  }, [onShowToast, refreshRanksMap]);

  // Logout
  const logout = useCallback(async () => {
    await logoutCommunityMember();
    setMember(null);
    onShowToast('info', 'Đã đăng xuất', 'Bạn đã đăng xuất khỏi hệ thống thành viên.');
  }, [onShowToast]);

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<MemberProfile>) => {
    if (!member) return false;
    try {
      const updated = await updateCommunityMemberProfile(member.id, updates);
      setMember(updated);
      onShowToast('success', 'Cập nhật thành công', 'Hồ sơ cá nhân của bạn đã được cập nhật.');
      return true;
    } catch (e: any) {
      onShowToast('error', 'Lỗi cập nhật', e?.message);
      return false;
    }
  }, [member, onShowToast]);

  // Track unique character view
  const trackCharacterView = useCallback(async (characterId: string) => {
    if (!member || !characterId) return;
    try {
      const newlyEarnedBadges = await trackCharacterExplored(member, characterId);
      if (newlyEarnedBadges.length > 0) {
        newlyEarnedBadges.forEach((badgeName) => {
          onShowToast(
            'success',
            '🎉 Nhận danh hiệu mới!',
            `Chúc mừng ${member.username} đã đạt danh hiệu "${badgeName}"!`
          );
        });
      }
      // Refresh current member state to reflect updated exploration count
      await refreshMember();
    } catch (e) {
      console.warn('Track character view note:', e);
    }
  }, [member, refreshMember, onShowToast]);

  const openMemberProfileModal = useCallback((userId: string) => {
    setViewMemberProfileId(userId);
  }, []);

  const closeMemberProfileModal = useCallback(() => {
    setViewMemberProfileId(null);
  }, []);

  return (
    <CommunityContext.Provider
      value={{
        member,
        isLoading,
        isSupabaseConnected,
        memberRanksMap,
        register,
        login,
        logout,
        updateProfile,
        trackCharacterView,
        recordChatClick,
        viewMemberProfileId,
        openMemberProfileModal,
        closeMemberProfileModal,
        refreshMember,
        refreshRanksMap,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = (): CommunityContextType => {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
};
