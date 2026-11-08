import {
  getSupabaseClient,
  isSupabaseConfigured,
  MemberProfile,
  Badge,
  UserBadge,
  LoungeMessage,
  DonationClaim,
  DonationConfig,
  VipTierConfig,
  DEFAULT_VIP_TIERS,
  SYSTEM_BADGES
} from './supabase';

// Local Fallback Storage Keys
const STORAGE_PROFILES = 'pca_community_profiles';
const STORAGE_CURRENT_USER_ID = 'pca_community_current_user_id';
const STORAGE_MESSAGES = 'pca_community_messages';
const STORAGE_USER_BADGES = 'pca_community_user_badges';
const STORAGE_DONATIONS = 'pca_community_donations';
const STORAGE_DONATION_CONFIG = 'pca_community_donation_config';
const STORAGE_VIP_TIERS_CONFIG = 'pca_community_vip_tiers_config';
const STORAGE_EXPLORED_SET = 'pca_community_explored_set';

function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage quota exceeded:', e);
  }
}

// Default Donation Config
export const DEFAULT_DONATION_CONFIG: DonationConfig = {
  bank_name: 'MB Bank (Ngân hàng Quân Đội)',
  account_number: '0388998899',
  account_holder: 'CHARACTER ARCHIVE ADMIN',
  qr_code_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
  transfer_note_prefix: 'ARCHIVE VIP',
};

// ==========================================
// VIP TIERS CONFIGURATION & AUTOMATIC EVALUATION
// ==========================================

export async function getVipTiersConfig(): Promise<VipTierConfig[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client.from('vip_tier_config').select('*').order('minAmount', { ascending: true });
    if (data && data.length > 0) {
      return data as VipTierConfig[];
    }
  }
  return getLocal<VipTierConfig[]>(STORAGE_VIP_TIERS_CONFIG, DEFAULT_VIP_TIERS);
}

export function evaluateMemberVipTier(
  totalDonated: number,
  tiersConfig: VipTierConfig[]
): VipTierConfig | null {
  if (!totalDonated || totalDonated <= 0) return null;

  const sorted = [...tiersConfig].sort((a, b) => b.minAmount - a.minAmount);

  for (const tier of sorted) {
    if (tier.maxAmount > 0) {
      if (totalDonated >= tier.minAmount && totalDonated <= tier.maxAmount) {
        return tier;
      }
    } else {
      if (totalDonated >= tier.minAmount) {
        return tier;
      }
    }
  }

  return null;
}

export async function saveVipTiersConfig(tiers: VipTierConfig[]): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.from('vip_tier_config').upsert(tiers);
  }
  setLocal(STORAGE_VIP_TIERS_CONFIG, tiers);
  await recalculateAllMemberVipTiers(tiers);
}

export async function recalculateAllMemberVipTiers(tiersConfig?: VipTierConfig[]): Promise<void> {
  const activeTiers = tiersConfig || (await getVipTiersConfig());
  const allMembers = await getAllMemberProfiles();
  const allClaims = await getDonationClaims();

  for (const member of allMembers) {
    if (member.is_manual_vip) continue;

    const userApprovedTotal = allClaims
      .filter((d) => d.user_id === member.id && d.status === 'approved')
      .reduce((sum, d) => sum + Number(d.amount), 0);

    const matchingTier = evaluateMemberVipTier(userApprovedTotal, activeTiers);
    const newVipTierId = matchingTier ? matchingTier.id : 'none';
    const convertedXu = Math.floor(userApprovedTotal / 1000);

    if (member.vip_tier !== newVipTierId || member.total_donated !== userApprovedTotal) {
      const client = getSupabaseClient();
      if (client) {
        await client
          .from('profiles')
          .update({
            total_donated: userApprovedTotal,
            donation_xu: convertedXu,
            vip_tier: newVipTierId,
          })
          .eq('id', member.id);
      } else {
        const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
        const pIdx = profiles.findIndex((p) => p.id === member.id);
        if (pIdx !== -1) {
          profiles[pIdx].total_donated = userApprovedTotal;
          profiles[pIdx].donation_xu = convertedXu;
          profiles[pIdx].vip_tier = newVipTierId;
          setLocal(STORAGE_PROFILES, profiles);
        }
      }

      if (matchingTier && matchingTier.badgeId) {
        await grantUserBadge(member.id, matchingTier.badgeId);
      }
    }
  }
}

// ==========================================
// LEADERBOARDS (HALL OF FAME) HELPERS
// ==========================================

export interface MemberLeaderboardEntry extends MemberProfile {
  activityRank?: number;
  donationRank?: number;
}

export async function getActivityLeaderboard(limitCount: number = 20): Promise<MemberLeaderboardEntry[]> {
  const allProfiles = await getAllMemberProfiles();

  // Primary Sort: active_time_seconds descending
  // Tie-breaker Sort: character_chats_count descending
  const sorted = [...allProfiles].sort((a, b) => {
    const timeA = Number(a.active_time_seconds) || 0;
    const timeB = Number(b.active_time_seconds) || 0;
    if (timeB !== timeA) return timeB - timeA;

    const chatsA = Number(a.character_chats_count) || 0;
    const chatsB = Number(b.character_chats_count) || 0;
    return chatsB - chatsA;
  });

  // Attach activity rank (Top 20 only)
  return sorted.slice(0, limitCount).map((p, index) => ({
    ...p,
    activityRank: index + 1,
  }));
}

export async function getDonationLeaderboard(): Promise<MemberLeaderboardEntry[]> {
  const allProfiles = await getAllMemberProfiles();

  // Sort by donation_xu (or total_donated) descending
  const sorted = [...allProfiles]
    .map((p) => ({
      ...p,
      donation_xu: p.donation_xu || Math.floor((p.total_donated || 0) / 1000),
    }))
    .filter((p) => p.donation_xu > 0)
    .sort((a, b) => b.donation_xu - a.donation_xu);

  // Attach donation rank (Unlimited list)
  return sorted.map((p, index) => ({
    ...p,
    donationRank: index + 1,
  }));
}

export async function getMemberRanksMap(): Promise<Record<string, { activityRank?: number; donationRank?: number }>> {
  const [actBoard, donBoard] = await Promise.all([
    getActivityLeaderboard(20),
    getDonationLeaderboard(),
  ]);

  const ranksMap: Record<string, { activityRank?: number; donationRank?: number }> = {};

  actBoard.forEach((entry) => {
    if (!ranksMap[entry.id]) ranksMap[entry.id] = {};
    ranksMap[entry.id].activityRank = entry.activityRank;
  });

  donBoard.forEach((entry) => {
    if (!ranksMap[entry.id]) ranksMap[entry.id] = {};
    ranksMap[entry.id].donationRank = entry.donationRank;
  });

  return ranksMap;
}

export async function updateUserActiveTime(userId: string, addedSeconds: number): Promise<void> {
  if (!userId || addedSeconds <= 0) return;

  const client = getSupabaseClient();
  if (client) {
    const { data: current } = await client
      .from('profiles')
      .select('active_time_seconds')
      .eq('id', userId)
      .single();

    const newTotal = (current?.active_time_seconds || 0) + addedSeconds;
    await client.from('profiles').update({ active_time_seconds: newTotal }).eq('id', userId);
  } else {
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    const idx = profiles.findIndex((p) => p.id === userId);
    if (idx !== -1) {
      profiles[idx].active_time_seconds = (profiles[idx].active_time_seconds || 0) + addedSeconds;
      setLocal(STORAGE_PROFILES, profiles);
    }
  }
}

export async function recordCharacterChatClick(userId: string): Promise<void> {
  if (!userId) return;

  const client = getSupabaseClient();
  if (client) {
    const { data: current } = await client
      .from('profiles')
      .select('character_chats_count')
      .eq('id', userId)
      .single();

    const newTotal = (current?.character_chats_count || 0) + 1;
    await client.from('profiles').update({ character_chats_count: newTotal }).eq('id', userId);
  } else {
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    const idx = profiles.findIndex((p) => p.id === userId);
    if (idx !== -1) {
      profiles[idx].character_chats_count = (profiles[idx].character_chats_count || 0) + 1;
      setLocal(STORAGE_PROFILES, profiles);
    }
  }
}

// Format seconds into human readable duration string (e.g., "25 giờ 30 phút")
export function formatActiveTime(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '0 phút';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  return `${minutes} phút`;
}

// ==========================================
// AUTHENTICATION & PROFILES
// ==========================================

export async function registerCommunityMember(
  username: string,
  email: string,
  pass: string
): Promise<{ profile: MemberProfile; error?: string }> {
  const cleanUsername = username.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanUsername || cleanUsername.length < 3) {
    return { profile: null as any, error: 'Tên người dùng (Username) phải từ 3 ký tự trở lên.' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return { profile: null as any, error: 'Username chỉ được dùng chữ cái, chữ số, gạch dưới (_) hoặc gạch nối (-).' };
  }
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { profile: null as any, error: 'Địa chỉ Gmail không hợp lệ.' };
  }
  if (pass.length < 6) {
    return { profile: null as any, error: 'Mật khẩu phải chứa ít nhất 6 ký tự.' };
  }

  const client = getSupabaseClient();

  if (client) {
    const { data: existingUser } = await client
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      return { profile: null as any, error: `Tên người dùng "${cleanUsername}" đã được đăng ký. Vui lòng chọn tên khác.` };
    }

    const { data: authData, error: authErr } = await client.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: { username: cleanUsername },
      },
    });

    if (authErr || !authData.user) {
      return { profile: null as any, error: authErr?.message || 'Đăng ký tài khoản thất bại.' };
    }

    const newProfile: MemberProfile = {
      id: authData.user.id,
      username: cleanUsername,
      email: cleanEmail,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      bio: 'Chào mừng bạn đến với Character Archive Lounge!',
      is_admin: false,
      is_banned: false,
      vip_tier: 'none',
      is_manual_vip: false,
      total_donated: 0,
      messages_count: 0,
      characters_explored_count: 0,
      active_time_seconds: 0,
      character_chats_count: 0,
      donation_xu: 0,
      active_badge_ids: ['newcomer'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await client.from('profiles').insert([newProfile]);
    await grantUserBadge(newProfile.id, 'newcomer');

    return { profile: newProfile };
  } else {
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    const usernameTaken = profiles.some((p) => p.username.toLowerCase() === cleanUsername.toLowerCase());
    if (usernameTaken) {
      return { profile: null as any, error: `Tên người dùng "${cleanUsername}" đã được sử dụng.` };
    }

    const emailTaken = profiles.some((p) => p.email.toLowerCase() === cleanEmail);
    if (emailTaken) {
      return { profile: null as any, error: `Email "${cleanEmail}" đã được đăng ký cho tài khoản khác.` };
    }

    const newId = 'user_' + Math.random().toString(36).substring(2, 10);
    const newProfile: MemberProfile = {
      id: newId,
      username: cleanUsername,
      email: cleanEmail,
      avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      bio: 'Chào mừng bạn đến với Character Archive Lounge!',
      is_admin: false,
      is_banned: false,
      vip_tier: 'none',
      is_manual_vip: false,
      total_donated: 0,
      messages_count: 0,
      characters_explored_count: 0,
      active_time_seconds: 0,
      character_chats_count: 0,
      donation_xu: 0,
      active_badge_ids: ['newcomer'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    profiles.push(newProfile);
    setLocal(STORAGE_PROFILES, profiles);
    setLocal(STORAGE_CURRENT_USER_ID, newId);

    const userBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
    userBadges.push({
      id: 'ub_' + Math.random().toString(36).substring(2, 10),
      user_id: newId,
      badge_id: 'newcomer',
      granted_at: new Date().toISOString(),
    });
    setLocal(STORAGE_USER_BADGES, userBadges);

    return { profile: newProfile };
  }
}

export async function loginCommunityMember(
  email: string,
  pass: string
): Promise<{ profile: MemberProfile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const client = getSupabaseClient();

  if (client) {
    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (authErr || !authData.user) {
      return { profile: null as any, error: 'Email hoặc mật khẩu không chính xác.' };
    }

    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profile?.is_banned) {
      await client.auth.signOut();
      return { profile: null as any, error: 'Tài khoản của bạn đã bị khóa do vi phạm quy định cộng đồng.' };
    }

    return { profile: profile as MemberProfile };
  } else {
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    const match = profiles.find((p) => p.email.toLowerCase() === cleanEmail);
    if (!match) {
      return { profile: null as any, error: 'Tài khoản Gmail chưa được đăng ký.' };
    }
    if (match.is_banned) {
      return { profile: null as any, error: 'Tài khoản của bạn đã bị khóa.' };
    }
    setLocal(STORAGE_CURRENT_USER_ID, match.id);
    return { profile: match };
  }
}

export async function getCurrentCommunityMember(): Promise<MemberProfile | null> {
  const client = getSupabaseClient();

  if (client) {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session?.user) return null;

    const { data: profile } = await client
      .from('profiles')
      .select('*')
      .eq('id', sessionData.session.user.id)
      .maybeSingle();

    return profile as MemberProfile | null;
  } else {
    const currentId = getLocal<string | null>(STORAGE_CURRENT_USER_ID, null);
    if (!currentId) return null;
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    return profiles.find((p) => p.id === currentId) || null;
  }
}

export async function logoutCommunityMember(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.auth.signOut();
  }
  setLocal(STORAGE_CURRENT_USER_ID, null);
}

export async function updateCommunityMemberProfile(
  userId: string,
  updates: Partial<MemberProfile>
): Promise<MemberProfile> {
  const client = getSupabaseClient();

  if (client) {
    const { data, error } = await client
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as MemberProfile;
  } else {
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    const idx = profiles.findIndex((p) => p.id === userId);
    if (idx !== -1) {
      profiles[idx] = {
        ...profiles[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      setLocal(STORAGE_PROFILES, profiles);
      return profiles[idx];
    }
    throw new Error('User profile not found.');
  }
}

export async function getMemberProfileById(userId: string): Promise<MemberProfile | null> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
    return data as MemberProfile | null;
  } else {
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    return profiles.find((p) => p.id === userId) || null;
  }
}

export async function getAllMemberProfiles(): Promise<MemberProfile[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client.from('profiles').select('*').order('created_at', { ascending: false });
    return (data || []) as MemberProfile[];
  } else {
    return getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
  }
}

// ==========================================
// THE LOUNGE MESSAGES & REALTIME CHAT
// ==========================================

export async function getLoungeMessages(limitCount: number = 50): Promise<LoungeMessage[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client
      .from('lounge_messages')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
      .limit(limitCount);

    return (data || []) as LoungeMessage[];
  } else {
    const messages = getLocal<LoungeMessage[]>(STORAGE_MESSAGES, []);
    return messages.filter((m) => !m.is_deleted);
  }
}

const userLastMessageTimes: Record<string, number> = {};

export async function sendLoungeMessage(
  user: MemberProfile,
  content: string,
  replyTo?: { id: string; username: string; content: string }
): Promise<{ message: LoungeMessage; newBadgesEarned: string[]; error?: string }> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    return { message: null as any, newBadgesEarned: [], error: 'Nội dung tin nhắn không được để trống.' };
  }
  if (cleanContent.length > 500) {
    return { message: null as any, newBadgesEarned: [], error: 'Tin nhắn quá dài (tối đa 500 ký tự).' };
  }

  const now = Date.now();
  const lastTime = userLastMessageTimes[user.id] || 0;
  if (now - lastTime < 1500) {
    return { message: null as any, newBadgesEarned: [], error: 'Vui lòng chờ giây lát trước khi gửi tin nhắn tiếp theo.' };
  }
  userLastMessageTimes[user.id] = now;

  const client = getSupabaseClient();
  const newMsgId = 'msg_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();

  const msgPayload: LoungeMessage = {
    id: newMsgId,
    user_id: user.id,
    username: user.username,
    avatar_url: user.avatar_url,
    vip_tier: user.vip_tier || 'none',
    content: cleanContent,
    reply_to_id: replyTo?.id || null,
    reply_to_username: replyTo?.username || null,
    reply_to_content: replyTo?.content || null,
    likes_count: 0,
    liked_by_users: [],
    is_deleted: false,
    created_at: new Date().toISOString(),
  };

  let createdMessage = msgPayload;

  if (client) {
    const { data, error } = await client
      .from('lounge_messages')
      .insert([msgPayload])
      .select()
      .single();

    if (error) {
      return { message: null as any, newBadgesEarned: [], error: error.message };
    }
    createdMessage = data as LoungeMessage;

    const updatedCount = (user.messages_count || 0) + 1;
    await client.from('profiles').update({ messages_count: updatedCount }).eq('id', user.id);
    user.messages_count = updatedCount;
  } else {
    const messages = getLocal<LoungeMessage[]>(STORAGE_MESSAGES, []);
    messages.push(msgPayload);
    setLocal(STORAGE_MESSAGES, messages);

    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    const pIdx = profiles.findIndex((p) => p.id === user.id);
    if (pIdx !== -1) {
      profiles[pIdx].messages_count = (profiles[pIdx].messages_count || 0) + 1;
      user.messages_count = profiles[pIdx].messages_count;
      setLocal(STORAGE_PROFILES, profiles);
    }
  }

  const newBadgesEarned = await checkAndGrantAutoBadges(user);
  return { message: createdMessage, newBadgesEarned };
}

export async function toggleLikeLoungeMessage(
  messageId: string,
  userId: string
): Promise<{ likes_count: number; liked: boolean }> {
  const client = getSupabaseClient();

  if (client) {
    const { data: msg } = await client.from('lounge_messages').select('*').eq('id', messageId).single();
    if (!msg) return { likes_count: 0, liked: false };

    const likedBy: string[] = Array.isArray(msg.liked_by_users) ? msg.liked_by_users : [];
    const isLiked = likedBy.includes(userId);
    const updatedLikedBy = isLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
    const newLikesCount = updatedLikedBy.length;

    await client
      .from('lounge_messages')
      .update({ likes_count: newLikesCount, liked_by_users: updatedLikedBy })
      .eq('id', messageId);

    return { likes_count: newLikesCount, liked: !isLiked };
  } else {
    const messages = getLocal<LoungeMessage[]>(STORAGE_MESSAGES, []);
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      const likedBy = messages[idx].liked_by_users || [];
      const isLiked = likedBy.includes(userId);
      const updatedLikedBy = isLiked ? likedBy.filter((id) => id !== userId) : [...likedBy, userId];
      messages[idx].liked_by_users = updatedLikedBy;
      messages[idx].likes_count = updatedLikedBy.length;
      setLocal(STORAGE_MESSAGES, messages);
      return { likes_count: updatedLikedBy.length, liked: !isLiked };
    }
    return { likes_count: 0, liked: false };
  }
}

export async function deleteLoungeMessage(messageId: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.from('lounge_messages').update({ is_deleted: true }).eq('id', messageId);
  } else {
    const messages = getLocal<LoungeMessage[]>(STORAGE_MESSAGES, []);
    const idx = messages.findIndex((m) => m.id === messageId);
    if (idx !== -1) {
      messages[idx].is_deleted = true;
      setLocal(STORAGE_MESSAGES, messages);
    }
  }
}

export function subscribeToLoungeMessages(callback: (messages: LoungeMessage[]) => void): () => void {
  const client = getSupabaseClient();

  if (client) {
    getLoungeMessages(100).then(callback);

    const channel = client
      .channel('public:lounge_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lounge_messages' },
        async () => {
          const fresh = await getLoungeMessages(100);
          callback(fresh);
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  } else {
    const fetchLocal = () => callback(getLocal<LoungeMessage[]>(STORAGE_MESSAGES, []).filter((m) => !m.is_deleted));
    fetchLocal();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_MESSAGES) {
        fetchLocal();
      }
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(fetchLocal, 2500);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }
}

// ==========================================
// CHARACTER EXPLORATION TRACKER
// ==========================================

export async function trackCharacterExplored(
  user: MemberProfile,
  characterId: string
): Promise<string[]> {
  if (!user || !characterId) return [];

  const key = `${user.id}_${characterId}`;
  const exploredSet = getLocal<Record<string, boolean>>(STORAGE_EXPLORED_SET, {});

  if (exploredSet[key]) return [];
  exploredSet[key] = true;
  setLocal(STORAGE_EXPLORED_SET, exploredSet);

  const newCount = (user.characters_explored_count || 0) + 1;
  user.characters_explored_count = newCount;

  const client = getSupabaseClient();
  if (client) {
    await client.from('profiles').update({ characters_explored_count: newCount }).eq('id', user.id);
  } else {
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    const idx = profiles.findIndex((p) => p.id === user.id);
    if (idx !== -1) {
      profiles[idx].characters_explored_count = newCount;
      setLocal(STORAGE_PROFILES, profiles);
    }
  }

  return await checkAndGrantAutoBadges(user);
}

export async function checkAndGrantAutoBadges(user: MemberProfile): Promise<string[]> {
  const userBadges = await getUserBadges(user.id);
  const ownedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));
  const newlyEarnedBadgeNames: string[] = [];

  const msgCount = user.messages_count || 0;
  const expCount = user.characters_explored_count || 0;

  const autoMilestones: Array<{ badgeId: string; check: () => boolean }> = [
    { badgeId: 'little_explorer', check: () => expCount >= 1 },
    { badgeId: 'curious_soul', check: () => expCount >= 10 },
    { badgeId: 'wanderer', check: () => expCount >= 30 },
    { badgeId: 'character_hunter', check: () => expCount >= 50 },
    { badgeId: 'archive_lover', check: () => expCount >= 100 },

    { badgeId: 'talkative', check: () => msgCount >= 50 },
    { badgeId: 'social_butterfly', check: () => msgCount >= 100 },
    { badgeId: 'storyteller_auto', check: () => msgCount >= 300 },
    { badgeId: 'community_star', check: () => msgCount >= 1000 },
  ];

  for (const m of autoMilestones) {
    if (!ownedBadgeIds.has(m.badgeId) && m.check()) {
      await grantUserBadge(user.id, m.badgeId);
      const bObj = SYSTEM_BADGES.find((b) => b.id === m.badgeId);
      if (bObj) {
        newlyEarnedBadgeNames.push(bObj.name);
      }
    }
  }

  return newlyEarnedBadgeNames;
}

// ==========================================
// BADGE MANAGEMENT & MANUAL ASSIGNMENTS
// ==========================================

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client
      .from('user_badges')
      .select('*, badge:badges(*)')
      .eq('user_id', userId);

    return (data || []) as UserBadge[];
  } else {
    const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
    const userOwned = uBadges.filter((ub) => ub.user_id === userId);
    return userOwned.map((ub) => {
      const bObj = SYSTEM_BADGES.find((b) => b.id === ub.badge_id);
      return { ...ub, badge: bObj };
    });
  }
}

export async function grantUserBadge(
  userId: string,
  badgeId: string,
  adminId?: string,
  notes?: string
): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client
      .from('user_badges')
      .insert([{ user_id: userId, badge_id: badgeId, granted_by: adminId || null, notes: notes || '' }])
      .select();
  } else {
    const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
    if (!uBadges.some((ub) => ub.user_id === userId && ub.badge_id === badgeId)) {
      uBadges.push({
        id: 'ub_' + Math.random().toString(36).substring(2, 10),
        user_id: userId,
        badge_id: badgeId,
        granted_at: new Date().toISOString(),
        granted_by: adminId,
        notes: notes || '',
      });
      setLocal(STORAGE_USER_BADGES, uBadges);
    }
  }
}

export async function revokeUserBadge(userId: string, badgeId: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.from('user_badges').delete().eq('user_id', userId).eq('badge_id', badgeId);
  } else {
    const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
    const filtered = uBadges.filter((ub) => !(ub.user_id === userId && ub.badge_id === badgeId));
    setLocal(STORAGE_USER_BADGES, filtered);
  }
}

// ==========================================
// MANUAL VIP ASSIGNMENT & REVOKING
// ==========================================

export async function grantManualVip(
  userId: string,
  vipTierId: string,
  reason?: string
): Promise<void> {
  await updateCommunityMemberProfile(userId, {
    vip_tier: vipTierId,
    is_manual_vip: true,
    manual_vip_reason: reason || 'Trao VIP thủ công bởi Admin',
  } as any);

  const tiers = await getVipTiersConfig();
  const match = tiers.find((t) => t.id === vipTierId);
  if (match && match.badgeId) {
    await grantUserBadge(userId, match.badgeId, undefined, reason);
  }
}

export async function revokeManualVip(userId: string): Promise<void> {
  await updateCommunityMemberProfile(userId, {
    is_manual_vip: false,
    manual_vip_reason: '',
  } as any);

  const tiers = await getVipTiersConfig();
  const allClaims = await getDonationClaims();
  const userApprovedTotal = allClaims
    .filter((d) => d.user_id === userId && d.status === 'approved')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const match = evaluateMemberVipTier(userApprovedTotal, tiers);
  const nextTierId = match ? match.id : 'none';

  await updateCommunityMemberProfile(userId, {
    vip_tier: nextTierId,
    total_donated: userApprovedTotal,
    donation_xu: Math.floor(userApprovedTotal / 1000),
  });
}

// ==========================================
// MANUAL DONATIONS & VIP SUPPORTER SYSTEM
// ==========================================

export async function getDonationConfig(): Promise<DonationConfig> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client.from('donation_config').select('*').single();
    if (data) return data as DonationConfig;
  }
  return getLocal<DonationConfig>(STORAGE_DONATION_CONFIG, DEFAULT_DONATION_CONFIG);
}

export async function saveDonationConfig(config: DonationConfig): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.from('donation_config').upsert([{ id: 1, ...config, updated_at: new Date().toISOString() }]);
  } else {
    setLocal(STORAGE_DONATION_CONFIG, config);
  }
}

export async function submitDonationClaim(
  user: MemberProfile,
  amount: number,
  transactionCode: string,
  transferTime: string,
  notes: string
): Promise<DonationClaim> {
  const claimPayload: DonationClaim = {
    id: 'don_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now(),
    user_id: user.id,
    username: user.username,
    amount,
    transaction_code: transactionCode.trim(),
    transfer_time: transferTime.trim() || new Date().toLocaleString('vi-VN'),
    notes: notes.trim(),
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client.from('donations').insert([claimPayload]).select().single();
    if (error) throw error;
    return data as DonationClaim;
  } else {
    const donations = getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
    donations.push(claimPayload);
    setLocal(STORAGE_DONATIONS, donations);
    return claimPayload;
  }
}

export async function getDonationClaims(): Promise<DonationClaim[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client.from('donations').select('*').order('created_at', { ascending: false });
    return (data || []) as DonationClaim[];
  } else {
    return getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
  }
}

export async function approveDonationClaim(
  claimId: string,
  adminId: string
): Promise<{ success: boolean; newVipTier: string }> {
  const client = getSupabaseClient();
  let claim: DonationClaim | null = null;

  if (client) {
    const { data } = await client.from('donations').select('*').eq('id', claimId).single();
    claim = data as DonationClaim;
  } else {
    const donations = getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
    claim = donations.find((d) => d.id === claimId) || null;
  }

  if (!claim) throw new Error('Không tìm thấy yêu cầu ủng hộ.');
  if (claim.status === 'approved') throw new Error('Yêu cầu ủng hộ này đã được xác nhận trước đó.');

  if (client) {
    await client
      .from('donations')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', claimId);
  } else {
    const donations = getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
    const idx = donations.findIndex((d) => d.id === claimId);
    if (idx !== -1) {
      donations[idx].status = 'approved';
      donations[idx].approved_by = adminId;
      donations[idx].approved_at = new Date().toISOString();
      setLocal(STORAGE_DONATIONS, donations);
    }
  }

  const member = await getMemberProfileById(claim.user_id);
  if (!member) throw new Error('Không tìm thấy tài khoản người gửi.');

  const allClaims = await getDonationClaims();
  const userApprovedTotal = allClaims
    .filter((d) => d.user_id === claim!.user_id && d.status === 'approved')
    .reduce((sum, d) => sum + Number(d.amount), 0);

  const tiers = await getVipTiersConfig();
  const matchingTier = evaluateMemberVipTier(userApprovedTotal, tiers);
  const newVipTierId = matchingTier ? matchingTier.id : 'none';
  const convertedXu = Math.floor(userApprovedTotal / 1000);

  await updateCommunityMemberProfile(claim.user_id, {
    total_donated: userApprovedTotal,
    donation_xu: convertedXu,
    vip_tier: newVipTierId,
  });

  if (matchingTier && matchingTier.badgeId) {
    await grantUserBadge(claim.user_id, matchingTier.badgeId, adminId);
  }

  return { success: true, newVipTier: newVipTierId };
}

export async function rejectDonationClaim(
  claimId: string,
  reason: string
): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client
      .from('donations')
      .update({
        status: 'rejected',
        rejection_reason: reason.trim(),
      })
      .eq('id', claimId);
  } else {
    const donations = getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
    const idx = donations.findIndex((d) => d.id === claimId);
    if (idx !== -1) {
      donations[idx].status = 'rejected';
      donations[idx].rejection_reason = reason.trim();
      setLocal(STORAGE_DONATIONS, donations);
    }
  }
}
