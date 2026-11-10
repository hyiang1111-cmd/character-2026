import {
  getSupabaseClient,
  isSupabaseConfigured,
  MemberProfile,
  Badge,
  UserBadge,
  LoungeMessage,
  DonationClaim,
  DonationConfig,
  BankAccount,
  DonatePageContent,
  SuggestedDonateAmount,
  QrCodeImage,
  BadgeAuditLog,
  VipTierConfig,
  DEFAULT_VIP_TIERS,
  SYSTEM_BADGES,
  PresetAvatar,
  DEFAULT_PRESET_AVATARS,
  DEFAULT_BANK_ACCOUNTS,
  DEFAULT_DONATE_PAGE_CONTENT,
  DEFAULT_SUGGESTED_AMOUNTS
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
const STORAGE_AVATAR_CATALOG = 'pca_community_avatar_catalog';
const STORAGE_CUSTOM_BADGES = 'pca_community_custom_badges';
const STORAGE_BADGE_AUDIT_LOGS = 'pca_community_badge_audit_logs';

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

// Default Donation Config with full multi-bank and custom page copy
export const DEFAULT_DONATION_CONFIG: DonationConfig = {
  bank_name: 'MB Bank (Ngân hàng Quân Đội)',
  account_number: '0388998899',
  account_holder: 'CHARACTER ARCHIVE ADMIN',
  qr_code_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
  transfer_note_prefix: 'ARCHIVE VIP',
  accounts: DEFAULT_BANK_ACCOUNTS,
  page_content: DEFAULT_DONATE_PAGE_CONTENT,
  suggested_amounts: DEFAULT_SUGGESTED_AMOUNTS,
  min_amount: 10000,
  allow_custom_amount: true,
  xu_conversion_rate: 1000,
  qr_images: [
    {
      id: 'qr_default_1',
      title: 'Mã QR MB Bank Chính Thức',
      url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
      description: 'Mã VietQR chuyển khoản nhanh 24/7 qua mọi ứng dụng ngân hàng.',
      bank_account_id: 'bank_mb_default',
      uploaded_at: new Date().toISOString(),
    },
  ],
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
// LEADERBOARDS (HALL OF FAME) HELPERS
// ==========================================

export interface MemberLeaderboardEntry extends MemberProfile {
  activityRank?: number;
  donationRank?: number;
}

export const PUBLIC_LEADERBOARD_COLUMNS =
  'id, username, avatar_url, bio, vip_tier, is_admin, active_time_seconds, character_chats_count, characters_explored_count, messages_count, total_donated, donation_xu, active_badge_ids, created_at, is_online, last_heartbeat_at';

export async function getPublicLeaderboardProfiles(): Promise<MemberProfile[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Try querying the dedicated public leaderboard view first (no sensitive columns, anon SELECT granted)
      const { data: viewData, error: viewError } = await client
        .from('public_leaderboard_view')
        .select(PUBLIC_LEADERBOARD_COLUMNS)
        .order('active_time_seconds', { ascending: false })
        .order('character_chats_count', { ascending: false });

      if (!viewError && Array.isArray(viewData)) {
        return viewData as MemberProfile[];
      }

      // 2. Fallback to profiles table selecting strictly safe public columns (never query email)
      const { data, error } = await client
        .from('profiles')
        .select(
          'id, username, avatar_url, bio, vip_tier, is_admin, active_time_seconds, character_chats_count, characters_explored_count, messages_count, total_donated, donation_xu, active_badge_ids, created_at'
        )
        .eq('is_banned', false)
        .order('active_time_seconds', { ascending: false })
        .order('character_chats_count', { ascending: false });

      if (error) {
        throw new Error(error.message || 'Lỗi truy vấn dữ liệu bảng xếp hạng từ Supabase.');
      }

      return (data || []) as MemberProfile[];
    } catch (err: any) {
      console.error('Error fetching Supabase public leaderboard profiles:', err);
      throw err;
    }
  } else {
    // If Supabase is not yet configured, return active local profiles
    const local = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    return local.filter((p) => !p.is_banned);
  }
}

export async function getActivityLeaderboard(limitCount: number = 100): Promise<MemberLeaderboardEntry[]> {
  const allProfiles = await getPublicLeaderboardProfiles();

  // All valid members are eligible.
  // Primary Sort: accumulated active_time_seconds descending
  // Tie-breaker 1 Sort: character_chats_count descending
  // Tie-breaker 2 Sort: account created_at ascending (who joined earliest)
  const sorted = [...allProfiles].sort((a, b) => {
    const timeA = Number(a.active_time_seconds) || 0;
    const timeB = Number(b.active_time_seconds) || 0;
    if (timeB !== timeA) return timeB - timeA;

    const chatsA = Number(a.character_chats_count) || 0;
    const chatsB = Number(b.character_chats_count) || 0;
    if (chatsB !== chatsA) return chatsB - chatsA;

    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateA - dateB;
  });

  // Attach dynamic activity rank
  return sorted.slice(0, limitCount).map((p, index) => ({
    ...p,
    activityRank: index + 1,
  }));
}

export async function getDonationLeaderboard(): Promise<MemberLeaderboardEntry[]> {
  const allProfiles = await getPublicLeaderboardProfiles();

  // Sort by donation_xu (or total_donated) descending, only for members with approved donation XU > 0
  const sorted = [...allProfiles]
    .map((p) => ({
      ...p,
      donation_xu: p.donation_xu || Math.floor((Number(p.total_donated) || 0) / 1000),
    }))
    .filter((p) => (p.donation_xu || 0) > 0 || (Number(p.total_donated) || 0) > 0)
    .sort((a, b) => {
      const xuA = Number(a.donation_xu) || Math.floor((Number(a.total_donated) || 0) / 1000);
      const xuB = Number(b.donation_xu) || Math.floor((Number(b.total_donated) || 0) / 1000);
      if (xuB !== xuA) return xuB - xuA;
      return (Number(b.total_donated) || 0) - (Number(a.total_donated) || 0);
    });

  // Attach dynamic donation rank
  return sorted.map((p, index) => ({
    ...p,
    donationRank: index + 1,
  }));
}

export async function getMemberRanksMap(): Promise<Record<string, { activityRank?: number; donationRank?: number }>> {
  const [actBoard, donBoard] = await Promise.all([
    getActivityLeaderboard(200),
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

export async function updateUserActiveTime(
  userId: string,
  addedSeconds: number,
  sessionId?: string
): Promise<{ success: boolean; newTotal?: number }> {
  if (!userId || addedSeconds <= 0) return { success: false };

  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Prefer server-authoritative RPC function (enforces rate-limiting, anti-multi-tab, and anti-spam)
      const { data, error } = await client.rpc('record_activity_heartbeat', {
        p_user_id: userId,
        p_session_id: sessionId || 'sess_default',
        p_seconds: addedSeconds,
      });

      if (!error && data && data.success) {
        return { success: true, newTotal: data.active_time_seconds };
      }

      if (data && data.reason === 'rate_limited') {
        // Multi-tab or multi-device rate limited (heartbeat already received in last 25s)
        return { success: false, newTotal: data.active_time_seconds };
      }

      // Fallback: direct update if RPC is not yet created in Supabase SQL editor
      const { data: current } = await client
        .from('profiles')
        .select('active_time_seconds')
        .eq('id', userId)
        .single();

      const newTotal = (current?.active_time_seconds || 0) + addedSeconds;
      await client.from('profiles').update({ active_time_seconds: newTotal }).eq('id', userId);
      return { success: true, newTotal };
    } catch (err) {
      console.warn('Supabase active time update error:', err);
    }
  }

  // Local fallback if Supabase not configured
  const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
  const idx = profiles.findIndex((p) => p.id === userId);
  if (idx !== -1) {
    profiles[idx].active_time_seconds = (profiles[idx].active_time_seconds || 0) + addedSeconds;
    setLocal(STORAGE_PROFILES, profiles);
    return { success: true, newTotal: profiles[idx].active_time_seconds };
  }
  return { success: false };
}

export async function recordCharacterChatClick(
  userId: string,
  characterId?: string,
  sessionId?: string
): Promise<{ success: boolean; newTotal?: number }> {
  if (!userId) return { success: false };

  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Prefer server-authoritative RPC function (enforces 30s per-character cooldown)
      const { data, error } = await client.rpc('record_character_chat_interaction', {
        p_user_id: userId,
        p_character_id: characterId || 'general',
        p_session_id: sessionId || 'sess_default',
      });

      if (!error && data && data.success) {
        return { success: true, newTotal: data.character_chats_count };
      }

      if (data && data.reason === 'spam_cooldown') {
        return { success: false, newTotal: data.character_chats_count };
      }

      // Fallback: direct update if RPC is not yet in Supabase
      const { data: current } = await client
        .from('profiles')
        .select('character_chats_count')
        .eq('id', userId)
        .single();

      const newTotal = (current?.character_chats_count || 0) + 1;
      await client.from('profiles').update({ character_chats_count: newTotal }).eq('id', userId);
      return { success: true, newTotal };
    } catch (err) {
      console.warn('Supabase chat interaction update error:', err);
    }
  }

  // Local fallback
  const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
  const idx = profiles.findIndex((p) => p.id === userId);
  if (idx !== -1) {
    profiles[idx].character_chats_count = (profiles[idx].character_chats_count || 0) + 1;
    setLocal(STORAGE_PROFILES, profiles);
    return { success: true, newTotal: profiles[idx].character_chats_count };
  }
  return { success: false };
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

    const defaultAvatar = await getDefaultAvatarUrl();

    const newProfile: MemberProfile = {
      id: authData.user.id,
      username: cleanUsername,
      email: cleanEmail,
      avatar_url: defaultAvatar,
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

    const defaultAvatar = await getDefaultAvatarUrl();
    const newId = 'user_' + Math.random().toString(36).substring(2, 10);
    const newProfile: MemberProfile = {
      id: newId,
      username: cleanUsername,
      email: cleanEmail,
      avatar_url: defaultAvatar,
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

export async function ensureAdminMemberProfile(adminUser: {
  email: string | null;
  name: string | null;
  uid: string | null;
}): Promise<MemberProfile> {
  const adminId = adminUser.uid || 'admin_user';
  const adminEmail = (adminUser.email || 'admin@archive.com').toLowerCase().trim();
  const adminUsername = (adminUser.name || adminEmail.split('@')[0] || 'Admin').trim();

  const client = getSupabaseClient();
  const defaultAvatar = await getDefaultAvatarUrl();

  if (client) {
    // 1. Check if profile exists by ID
    const { data: existingProfile } = await client
      .from('profiles')
      .select('*')
      .eq('id', adminId)
      .maybeSingle();

    if (existingProfile) {
      if (!existingProfile.is_admin) {
        await client.from('profiles').update({ is_admin: true }).eq('id', adminId);
        existingProfile.is_admin = true;
      }
      return existingProfile as MemberProfile;
    }

    // 2. Check if profile exists by Email
    const { data: emailProfile } = await client
      .from('profiles')
      .select('*')
      .ilike('email', adminEmail)
      .maybeSingle();

    if (emailProfile) {
      if (!emailProfile.is_admin) {
        await client.from('profiles').update({ is_admin: true }).eq('id', emailProfile.id);
        emailProfile.is_admin = true;
      }
      return emailProfile as MemberProfile;
    }

    // 3. Create new Admin Member Profile
    const newAdminProfile: MemberProfile = {
      id: adminId,
      username: adminUsername,
      email: adminEmail,
      avatar_url: defaultAvatar,
      bio: 'Quản trị viên tối cao Character Archive',
      is_admin: true,
      is_banned: false,
      vip_tier: 'none',
      is_manual_vip: false,
      total_donated: 0,
      messages_count: 0,
      characters_explored_count: 0,
      active_time_seconds: 0,
      character_chats_count: 0,
      donation_xu: 0,
      active_badge_ids: ['founder', 'newcomer'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await client.from('profiles').insert([newAdminProfile]);
    await grantUserBadge(adminId, 'founder');
    await grantUserBadge(adminId, 'newcomer');

    return newAdminProfile;
  } else {
    const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
    let profile = profiles.find((p) => p.id === adminId || p.email.toLowerCase() === adminEmail);

    if (profile) {
      profile.is_admin = true;
      setLocal(STORAGE_PROFILES, profiles);
      setLocal(STORAGE_CURRENT_USER_ID, profile.id);
      return profile;
    }

    const newAdminProfile: MemberProfile = {
      id: adminId,
      username: adminUsername,
      email: adminEmail,
      avatar_url: defaultAvatar,
      bio: 'Quản trị viên tối cao Character Archive',
      is_admin: true,
      is_banned: false,
      vip_tier: 'none',
      is_manual_vip: false,
      total_donated: 0,
      messages_count: 0,
      characters_explored_count: 0,
      active_time_seconds: 0,
      character_chats_count: 0,
      donation_xu: 0,
      active_badge_ids: ['founder', 'newcomer'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    profiles.push(newAdminProfile);
    setLocal(STORAGE_PROFILES, profiles);
    setLocal(STORAGE_CURRENT_USER_ID, adminId);

    await grantUserBadge(adminId, 'founder');
    await grantUserBadge(adminId, 'newcomer');

    return newAdminProfile;
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
    try {
      const { data, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!error && data) {
        return data as MemberProfile;
      }
      // If select('*') restricted by RLS (e.g. guest reading someone else's profile), fallback to public columns
      const { data: pubData, error: pubError } = await client
        .from('profiles')
        .select(PUBLIC_LEADERBOARD_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      if (!pubError && pubData) {
        return pubData as MemberProfile;
      }
    } catch (e) {
      console.warn('Supabase profile fetch error:', e);
    }
  }

  const profiles = getLocal<MemberProfile[]>(STORAGE_PROFILES, []);
  return profiles.find((p) => p.id === userId) || null;
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
// ASSET IMAGE UPLOADER (QR CODES & BADGES)
// ==========================================

export async function uploadAssetImage(file: File, folder: string = 'qr_codes'): Promise<string> {
  const client = getSupabaseClient();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
  const cleanName = `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  // 1. Try Supabase Storage first if client is connected
  if (client) {
    try {
      const { data, error } = await client.storage
        .from('community_assets')
        .upload(`${folder}/${cleanName}`, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = client.storage
          .from('community_assets')
          .getPublicUrl(`${folder}/${cleanName}`);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Supabase storage upload fallback to canvas base64:', err);
    }
  }

  // 2. Resilient Fallback: compress image via in-memory Canvas and return clean Base64 data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800; // max dimension keeps size crisp yet lightweight (~100-250KB)
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const isTransparent = file.type.includes('png') || file.type.includes('webp');
        const mime = isTransparent ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, isTransparent ? undefined : 0.88);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// ==========================================
// BADGE REPOSITORY & AUDIT LOGS
// ==========================================

export async function getAllBadges(): Promise<Badge[]> {
  const client = getSupabaseClient();
  let custom: Badge[] = [];

  if (client) {
    try {
      const { data } = await client.from('custom_badges').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        custom = data as Badge[];
      }
    } catch (e) {
      custom = getLocal<Badge[]>(STORAGE_CUSTOM_BADGES, []);
    }
  } else {
    custom = getLocal<Badge[]>(STORAGE_CUSTOM_BADGES, []);
  }

  // Combine system badges + custom badges (deduplicating by id)
  const combinedMap = new Map<string, Badge>();
  SYSTEM_BADGES.forEach((b) => combinedMap.set(b.id, b));
  custom.forEach((b) => combinedMap.set(b.id, b));

  return Array.from(combinedMap.values());
}

export async function createCustomBadge(
  badge: Partial<Badge> & { name: string; icon: string; color: string; category: string },
  createdBy?: string
): Promise<Badge> {
  const newBadge: Badge = {
    id: badge.id || 'badge_' + Math.random().toString(36).substring(2, 8) + '_' + Date.now(),
    name: badge.name,
    description: badge.description || '',
    icon: badge.icon,
    image_url: badge.image_url,
    color: badge.color,
    border_style: badge.border_style || 'solid',
    glow_color: badge.glow_color,
    animation_effect: badge.animation_effect || 'none',
    category: badge.category,
    rarity: badge.rarity || 'rare',
    condition_type: badge.condition_type || 'admin_grant',
    condition_value: badge.condition_value || 1,
    is_enabled: badge.is_enabled !== false,
    expires_at: badge.expires_at || null,
    created_at: new Date().toISOString(),
    created_by: createdBy || badge.created_by,
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('custom_badges').insert([newBadge]);
    } catch (e) {
      console.warn('Supabase custom_badges insert error:', e);
    }
  }

  const custom = getLocal<Badge[]>(STORAGE_CUSTOM_BADGES, []);
  custom.unshift(newBadge);
  setLocal(STORAGE_CUSTOM_BADGES, custom);

  return newBadge;
}

export async function updateBadge(id: string, updates: Partial<Badge>): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('custom_badges').update(updates).eq('id', id);
    } catch (e) {
      console.warn('Supabase custom_badges update warning:', e);
    }
  }

  const custom = getLocal<Badge[]>(STORAGE_CUSTOM_BADGES, []);
  const idx = custom.findIndex((b) => b.id === id);
  if (idx !== -1) {
    custom[idx] = { ...custom[idx], ...updates };
    setLocal(STORAGE_CUSTOM_BADGES, custom);
  }
}

export async function deleteCustomBadge(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('custom_badges').delete().eq('id', id);
      await client.from('user_badges').delete().eq('badge_id', id);
    } catch (e) {
      console.warn('Supabase custom_badges delete warning:', e);
    }
  }

  const custom = getLocal<Badge[]>(STORAGE_CUSTOM_BADGES, []);
  setLocal(STORAGE_CUSTOM_BADGES, custom.filter((b) => b.id !== id));

  // Also clean up from user_badges
  const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
  setLocal(STORAGE_USER_BADGES, uBadges.filter((ub) => ub.badge_id !== id));
}

export async function getBadgeAuditLogs(): Promise<BadgeAuditLog[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('badge_audit_logs').select('*').order('timestamp', { ascending: false });
      if (data) return data as BadgeAuditLog[];
    } catch (e) {
      // fallback
    }
  }
  return getLocal<BadgeAuditLog[]>(STORAGE_BADGE_AUDIT_LOGS, []);
}

export async function addBadgeAuditLog(log: Omit<BadgeAuditLog, 'id' | 'timestamp'>): Promise<void> {
  const newLog: BadgeAuditLog = {
    ...log,
    id: 'log_' + Math.random().toString(36).substring(2, 10),
    timestamp: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('badge_audit_logs').insert([newLog]);
    } catch (e) {
      // fallback
    }
  }

  const logs = getLocal<BadgeAuditLog[]>(STORAGE_BADGE_AUDIT_LOGS, []);
  logs.unshift(newLog);
  setLocal(STORAGE_BADGE_AUDIT_LOGS, logs.slice(0, 200));
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  const allBadges = await getAllBadges();
  const now = new Date();

  const client = getSupabaseClient();
  let userOwned: UserBadge[] = [];

  if (client) {
    try {
      const { data } = await client
        .from('user_badges')
        .select('*')
        .eq('user_id', userId);

      userOwned = (data || []) as UserBadge[];
    } catch (e) {
      const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
      userOwned = uBadges.filter((ub) => ub.user_id === userId);
    }
  } else {
    const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
    userOwned = uBadges.filter((ub) => ub.user_id === userId);
  }

  // Filter out expired badges & attach full badge object
  const active = userOwned.filter((ub) => !ub.expires_at || new Date(ub.expires_at) > now);

  return active.map((ub) => {
    const bObj = allBadges.find((b) => b.id === ub.badge_id);
    return { ...ub, badge: bObj };
  });
}

export async function grantUserBadge(
  userId: string,
  badgeId: string,
  adminId?: string,
  notes?: string,
  expiresAt?: string | null,
  grantType: 'automatic' | 'admin_awarded' = 'admin_awarded',
  adminName: string = 'Admin',
  badgeName?: string,
  username?: string
): Promise<void> {
  const client = getSupabaseClient();
  const payload: UserBadge = {
    id: 'ub_' + Math.random().toString(36).substring(2, 10),
    user_id: userId,
    badge_id: badgeId,
    granted_at: new Date().toISOString(),
    granted_by: adminId,
    grant_type: grantType,
    expires_at: expiresAt || null,
    notes: notes || '',
  };

  if (client) {
    try {
      // Delete old entry for this badge if exists so we can update clean
      await client.from('user_badges').delete().eq('user_id', userId).eq('badge_id', badgeId);
      await client.from('user_badges').insert([payload]);
    } catch (e) {
      console.warn('Supabase user_badges insert warning:', e);
    }
  }

  const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
  const filtered = uBadges.filter((ub) => !(ub.user_id === userId && ub.badge_id === badgeId));
  filtered.push(payload);
  setLocal(STORAGE_USER_BADGES, filtered);

  // Write Audit Log if granted by Admin
  if (adminId) {
    await addBadgeAuditLog({
      action: 'grant',
      admin_id: adminId,
      admin_name: adminName,
      user_id: userId,
      username: username || 'Thành viên',
      badge_id: badgeId,
      badge_name: badgeName || badgeId,
      reason: notes || (grantType === 'admin_awarded' ? 'Admin trao danh hiệu' : 'Tự động mở khóa'),
      expires_at: expiresAt || null,
    });
  }
}

export async function revokeUserBadge(
  userId: string,
  badgeId: string,
  adminId?: string,
  reason?: string,
  adminName: string = 'Admin',
  badgeName?: string,
  username?: string
): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('user_badges').delete().eq('user_id', userId).eq('badge_id', badgeId);
    } catch (e) {
      console.warn('Supabase user_badges delete warning:', e);
    }
  }

  const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
  const filtered = uBadges.filter((ub) => !(ub.user_id === userId && ub.badge_id === badgeId));
  setLocal(STORAGE_USER_BADGES, filtered);

  if (adminId) {
    await addBadgeAuditLog({
      action: 'revoke',
      admin_id: adminId,
      admin_name: adminName,
      user_id: userId,
      username: username || 'Thành viên',
      badge_id: badgeId,
      badge_name: badgeName || badgeId,
      reason: reason || 'Admin gỡ danh hiệu',
    });
  }
}

export async function updateUserBadgeExpiry(
  userId: string,
  badgeId: string,
  expiresAt: string | null,
  adminId?: string,
  adminName: string = 'Admin'
): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('user_badges').update({ expires_at: expiresAt }).eq('user_id', userId).eq('badge_id', badgeId);
    } catch (e) {
      // fallback
    }
  }

  const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
  const idx = uBadges.findIndex((ub) => ub.user_id === userId && ub.badge_id === badgeId);
  if (idx !== -1) {
    uBadges[idx].expires_at = expiresAt;
    setLocal(STORAGE_USER_BADGES, uBadges);
  }

  if (adminId) {
    await addBadgeAuditLog({
      action: 'update_expiry',
      admin_id: adminId,
      admin_name: adminName,
      user_id: userId,
      username: 'Thành viên',
      badge_id: badgeId,
      badge_name: badgeId,
      reason: `Cập nhật hạn dùng: ${expiresAt ? new Date(expiresAt).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}`,
      expires_at: expiresAt,
    });
  }
}

export async function getMembersWithBadge(badgeId: string): Promise<MemberProfile[]> {
  const allMembers = await getAllMemberProfiles();
  const client = getSupabaseClient();
  let userBadges: UserBadge[] = [];

  if (client) {
    try {
      const { data } = await client.from('user_badges').select('*').eq('badge_id', badgeId);
      userBadges = (data || []) as UserBadge[];
    } catch (e) {
      const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
      userBadges = uBadges.filter((ub) => ub.badge_id === badgeId);
    }
  } else {
    const uBadges = getLocal<UserBadge[]>(STORAGE_USER_BADGES, []);
    userBadges = uBadges.filter((ub) => ub.badge_id === badgeId);
  }

  const userIds = new Set(userBadges.map((ub) => ub.user_id));
  return allMembers.filter((m) => userIds.has(m.id));
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
    await grantUserBadge(userId, match.badgeId, undefined, reason, null, 'admin_awarded');
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

  const config = await getDonationConfig();
  const match = evaluateMemberVipTier(userApprovedTotal, tiers);
  const nextTierId = match ? match.id : 'none';

  await updateCommunityMemberProfile(userId, {
    vip_tier: nextTierId,
    total_donated: userApprovedTotal,
    donation_xu: Math.floor(userApprovedTotal / (config.xu_conversion_rate || 1000)),
  });
}

// ==========================================
// MANUAL DONATIONS & VIP SUPPORTER SYSTEM
// ==========================================

export async function getDonationConfig(): Promise<DonationConfig> {
  const client = getSupabaseClient();
  let baseConfig: DonationConfig = DEFAULT_DONATION_CONFIG;

  if (client) {
    try {
      const { data } = await client.from('donation_config').select('*').single();
      if (data) {
        baseConfig = { ...DEFAULT_DONATION_CONFIG, ...data };
      }
    } catch (e) {
      baseConfig = getLocal<DonationConfig>(STORAGE_DONATION_CONFIG, DEFAULT_DONATION_CONFIG);
    }
  } else {
    baseConfig = getLocal<DonationConfig>(STORAGE_DONATION_CONFIG, DEFAULT_DONATION_CONFIG);
  }

  // Ensure accounts array is always present & non-empty
  if (!baseConfig.accounts || baseConfig.accounts.length === 0) {
    baseConfig.accounts = [
      {
        id: 'bank_mb_default',
        bank_name: baseConfig.bank_name || DEFAULT_DONATION_CONFIG.bank_name,
        account_number: baseConfig.account_number || DEFAULT_DONATION_CONFIG.account_number,
        account_holder: baseConfig.account_holder || DEFAULT_DONATION_CONFIG.account_holder,
        default_transfer_note: baseConfig.transfer_note_prefix || DEFAULT_DONATION_CONFIG.transfer_note_prefix,
        qr_code_url: baseConfig.qr_code_url || DEFAULT_DONATION_CONFIG.qr_code_url,
        is_default: true,
        is_enabled: true,
        order: 1,
      },
    ];
  }

  if (!baseConfig.page_content) {
    baseConfig.page_content = DEFAULT_DONATE_PAGE_CONTENT;
  }

  if (!baseConfig.suggested_amounts || baseConfig.suggested_amounts.length === 0) {
    baseConfig.suggested_amounts = DEFAULT_SUGGESTED_AMOUNTS;
  }

  if (!baseConfig.xu_conversion_rate) {
    baseConfig.xu_conversion_rate = 1000;
  }

  if (!baseConfig.qr_images) {
    baseConfig.qr_images = DEFAULT_DONATION_CONFIG.qr_images || [];
  }

  return baseConfig;
}

export async function saveDonationConfig(config: DonationConfig): Promise<void> {
  // Sync top-level fields with default bank account for backward compatibility
  const defaultAcc = config.accounts?.find((a) => a.is_default && a.is_enabled) || config.accounts?.[0];
  const payload: DonationConfig = {
    ...config,
    bank_name: defaultAcc?.bank_name || config.bank_name,
    account_number: defaultAcc?.account_number || config.account_number,
    account_holder: defaultAcc?.account_holder || config.account_holder,
    qr_code_url: defaultAcc?.qr_code_url || config.qr_code_url,
    transfer_note_prefix: defaultAcc?.default_transfer_note || config.transfer_note_prefix || 'ARCHIVE VIP',
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('donation_config').upsert([{ id: 1, ...payload, updated_at: new Date().toISOString() }]);
    } catch (e) {
      console.warn('Supabase donation_config upsert warning:', e);
    }
  }
  setLocal(STORAGE_DONATION_CONFIG, payload);
}

export async function submitDonationClaim(
  user: MemberProfile,
  amount: number,
  transactionCode: string,
  transferTime: string,
  notes: string,
  receiptUrl?: string,
  bankAccountId?: string
): Promise<DonationClaim> {
  const claimPayload: DonationClaim = {
    id: 'don_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now(),
    user_id: user.id,
    username: user.username,
    amount,
    transaction_code: transactionCode.trim(),
    transfer_time: transferTime.trim() || new Date().toLocaleString('vi-VN'),
    notes: notes.trim(),
    receipt_url: receiptUrl?.trim() || undefined,
    bank_account_id: bankAccountId || undefined,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('donations').insert([claimPayload]).select().single();
      if (!error && data) return data as DonationClaim;
    } catch (e) {
      console.warn('Supabase donations insert error:', e);
    }
  }

  const donations = getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
  donations.push(claimPayload);
  setLocal(STORAGE_DONATIONS, donations);
  return claimPayload;
}

export async function getDonationClaims(): Promise<DonationClaim[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data } = await client.from('donations').select('*').order('created_at', { ascending: false });
      if (data) return data as DonationClaim[];
    } catch (e) {
      // fallback
    }
  }
  return getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
}

export async function approveDonationClaim(
  claimId: string,
  adminId: string
): Promise<{ success: boolean; newVipTier: string }> {
  const client = getSupabaseClient();
  let claim: DonationClaim | null = null;

  if (client) {
    try {
      const { data } = await client.from('donations').select('*').eq('id', claimId).single();
      claim = data as DonationClaim;
    } catch (e) {
      // fallback
    }
  }

  if (!claim) {
    const donations = getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
    claim = donations.find((d) => d.id === claimId) || null;
  }

  if (!claim) throw new Error('Không tìm thấy yêu cầu ủng hộ.');
  if (claim.status === 'approved') throw new Error('Yêu cầu ủng hộ này đã được xác nhận trước đó.');

  if (client) {
    try {
      await client
        .from('donations')
        .update({
          status: 'approved',
          approved_by: adminId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', claimId);
    } catch (e) {
      // fallback
    }
  }

  const donations = getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
  const idx = donations.findIndex((d) => d.id === claimId);
  if (idx !== -1) {
    donations[idx].status = 'approved';
    donations[idx].approved_by = adminId;
    donations[idx].approved_at = new Date().toISOString();
    setLocal(STORAGE_DONATIONS, donations);
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

  const config = await getDonationConfig();
  const conversionRate = config.xu_conversion_rate || 1000;
  const convertedXu = Math.floor(userApprovedTotal / conversionRate);

  await updateCommunityMemberProfile(claim.user_id, {
    total_donated: userApprovedTotal,
    donation_xu: convertedXu,
    vip_tier: newVipTierId,
  });

  if (matchingTier && matchingTier.badgeId) {
    await grantUserBadge(claim.user_id, matchingTier.badgeId, adminId, 'VIP Supporter tự động', null, 'automatic');
  }

  return { success: true, newVipTier: newVipTierId };
}

export async function updateDonationClaimInternalNotes(
  claimId: string,
  internalNotes: string
): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('donations').update({ internal_notes: internalNotes }).eq('id', claimId);
    } catch (e) {
      // fallback
    }
  }

  const donations = getLocal<DonationClaim[]>(STORAGE_DONATIONS, []);
  const idx = donations.findIndex((d) => d.id === claimId);
  if (idx !== -1) {
    donations[idx].internal_notes = internalNotes;
    setLocal(STORAGE_DONATIONS, donations);
  }
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

// ==========================================
// PRESET AVATAR CATALOG MANAGEMENT
// ==========================================

export async function getAvatarCatalog(): Promise<PresetAvatar[]> {
  const client = getSupabaseClient();
  if (client) {
    const { data } = await client.from('preset_avatars').select('*').order('id', { ascending: true });
    if (data && data.length > 0) {
      return data as PresetAvatar[];
    }
  }
  return getLocal<PresetAvatar[]>(STORAGE_AVATAR_CATALOG, DEFAULT_PRESET_AVATARS);
}

export async function saveAvatarCatalog(catalog: PresetAvatar[]): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await client.from('preset_avatars').upsert(catalog);
  }
  setLocal(STORAGE_AVATAR_CATALOG, catalog);
}

export async function addPresetAvatar(avatar: Omit<PresetAvatar, 'id'>): Promise<PresetAvatar> {
  const newAvatar: PresetAvatar = {
    ...avatar,
    id: 'av_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now(),
  };

  const catalog = await getAvatarCatalog();
  if (newAvatar.is_default) {
    catalog.forEach((a) => (a.is_default = false));
  }
  catalog.push(newAvatar);

  const client = getSupabaseClient();
  if (client) {
    await client.from('preset_avatars').insert([newAvatar]);
  }
  setLocal(STORAGE_AVATAR_CATALOG, catalog);
  return newAvatar;
}

export async function deletePresetAvatar(avatarId: string): Promise<void> {
  const catalog = await getAvatarCatalog();
  const filtered = catalog.filter((a) => a.id !== avatarId);

  const client = getSupabaseClient();
  if (client) {
    await client.from('preset_avatars').delete().eq('id', avatarId);
  }
  setLocal(STORAGE_AVATAR_CATALOG, filtered);
}

export async function setDefaultAvatar(avatarId: string): Promise<void> {
  const catalog = await getAvatarCatalog();
  catalog.forEach((a) => {
    a.is_default = a.id === avatarId;
  });

  const client = getSupabaseClient();
  if (client) {
    await client.from('preset_avatars').update({ is_default: false }).neq('id', avatarId);
    await client.from('preset_avatars').update({ is_default: true }).eq('id', avatarId);
  }
  setLocal(STORAGE_AVATAR_CATALOG, catalog);
}

export async function getDefaultAvatarUrl(): Promise<string> {
  const catalog = await getAvatarCatalog();
  const def = catalog.find((a) => a.is_default);
  if (def) return def.url;
  return catalog[0]?.url || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80';
}
