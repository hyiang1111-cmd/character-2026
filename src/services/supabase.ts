import { createClient, SupabaseClient } from '@supabase/supabase-js';

// LocalStorage Keys for custom Supabase connection settings
export const SUPABASE_URL_KEY = 'pca_supabase_url';
export const SUPABASE_ANON_KEY = 'pca_supabase_anon_key';

// Get active Supabase configuration (either from VITE env vars or stored local settings)
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  let localUrl = '';
  let localKey = '';

  if (typeof window !== 'undefined') {
    localUrl = localStorage.getItem(SUPABASE_URL_KEY) || '';
    localKey = localStorage.getItem(SUPABASE_ANON_KEY) || '';
  }

  const url = (localUrl || envUrl || '').trim();
  const anonKey = (localKey || envKey || '').trim();

  return { url, anonKey };
}

// Singleton Supabase Client Instance
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    if (url) localStorage.setItem(SUPABASE_URL_KEY, url.trim());
    else localStorage.removeItem(SUPABASE_URL_KEY);

    if (anonKey) localStorage.setItem(SUPABASE_ANON_KEY, anonKey.trim());
    else localStorage.removeItem(SUPABASE_ANON_KEY);
  }
  supabaseInstance = null; // reset instance so next get re-evaluates
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http'));
}

// Community Data Types
export interface MemberProfile {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
  bio: string;
  is_admin: boolean;
  is_banned: boolean;
  vip_tier: string; // 'none', 'vip', 'golden', 'angel', 'eternal' or custom
  is_manual_vip?: boolean; // Distinguishes manual VIP from automatic donation VIP
  manual_vip_reason?: string;
  total_donated: number;
  messages_count: number;
  characters_explored_count: number;
  active_time_seconds: number; // Total online active duration in seconds
  character_chats_count: number; // Total valid AI character chat clicks
  donation_xu: number; // Total converted donation xu (1,000đ = 1 xu)
  active_badge_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface VipTierConfig {
  id: string; // e.g. 'vip', 'golden', 'angel', 'eternal'
  name: string; // e.g. 'VIP Supporter'
  minAmount: number; // e.g. 1
  maxAmount: number; // e.g. 20000 (0 means unlimited)
  icon: string; // e.g. '👑'
  color: string; // e.g. '#FFD700'
  badgeId: string;
  description: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  border_style: string;
  category: 'automatic' | 'admin' | 'vip';
  condition_type: 'messages' | 'exploration' | 'loyalty' | 'manual' | 'donation';
  condition_value: number;
  is_enabled: boolean;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  granted_at: string;
  granted_by?: string;
  notes?: string;
  badge?: Badge;
}

export interface LoungeMessage {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  vip_tier: string;
  content: string;
  reply_to_id?: string | null;
  reply_to_username?: string | null;
  reply_to_content?: string | null;
  likes_count: number;
  liked_by_users: string[];
  is_deleted: boolean;
  created_at: string;
  badges?: Badge[];
}

export interface DonationClaim {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  transaction_code: string;
  transfer_time: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface DonationConfig {
  bank_name: string;
  account_number: string;
  account_holder: string;
  qr_code_url: string;
  transfer_note_prefix: string;
}

// Default VIP Tier Threshold Configurations
export const DEFAULT_VIP_TIERS: VipTierConfig[] = [
  {
    id: 'vip',
    name: 'VIP Supporter',
    minAmount: 1,
    maxAmount: 20000,
    icon: '👑',
    color: '#FFD700',
    badgeId: 'vip_supporter',
    description: 'Thành viên VIP Supporter (1đ – 20.000đ)',
  },
  {
    id: 'golden',
    name: 'Golden Supporter',
    minAmount: 20001,
    maxAmount: 30000,
    icon: '🌟',
    color: '#FFA500',
    badgeId: 'golden_supporter',
    description: 'Thành viên Hoàng Gia Vàng (20.001đ – 30.000đ)',
  },
  {
    id: 'angel',
    name: 'Angel Supporter',
    minAmount: 30001,
    maxAmount: 100000,
    icon: '👼',
    color: '#FF69B4',
    badgeId: 'angel_supporter',
    description: 'Thiên thần bảo trợ (30.001đ – 100.000đ)',
  },
  {
    id: 'eternal',
    name: 'Eternal Supporter',
    minAmount: 100001,
    maxAmount: 0, // Unlimited
    icon: '💎',
    color: '#8A2BE2',
    badgeId: 'eternal_supporter',
    description: 'Nhà tài trợ vĩnh cửu (Trên 100.000đ)',
  },
];

// Default Badges catalog definitions
export const SYSTEM_BADGES: Badge[] = [
  // Automatic Activity
  { id: 'newcomer', name: 'Newcomer', description: 'Thành viên mới gia nhập cộng đồng', icon: '🌸', color: '#E9A9BB', border_style: 'solid', category: 'automatic', condition_type: 'loyalty', condition_value: 0, is_enabled: true },
  { id: 'regular', name: 'Regular', description: 'Thành viên hoạt động thường xuyên', icon: '✨', color: '#D88CA3', border_style: 'solid', category: 'automatic', condition_type: 'loyalty', condition_value: 3, is_enabled: true },
  { id: 'social_butterfly', name: 'Social Butterfly', description: 'Có nhiều tương tác năng nổ trong chatroom', icon: '🦋', color: '#9B51E0', border_style: 'dashed', category: 'automatic', condition_type: 'messages', condition_value: 100, is_enabled: true },
  { id: 'talkative', name: 'Talkative', description: 'Thường xuyên trò chuyện giao lưu', icon: '💬', color: '#2F80ED', border_style: 'solid', category: 'automatic', condition_type: 'messages', condition_value: 50, is_enabled: true },
  { id: 'storyteller_auto', name: 'Storyteller', description: 'Thành viên tích cực chia sẻ câu chuyện', icon: '📖', color: '#F2994A', border_style: 'solid', category: 'automatic', condition_type: 'messages', condition_value: 300, is_enabled: true },
  { id: 'night_owl', name: 'Night Owl', description: 'Thường xuyên hoạt động về đêm', icon: '🌙', color: '#4A0E17', border_style: 'double', category: 'automatic', condition_type: 'loyalty', condition_value: 5, is_enabled: true },
  { id: 'old_friend', name: 'Old Friend', description: 'Thành viên gắn bó lâu dài với Archive', icon: '💎', color: '#6FCF97', border_style: 'double', category: 'automatic', condition_type: 'loyalty', condition_value: 30, is_enabled: true },
  { id: 'community_star', name: 'Community Star', description: 'Ngôi sao rực rỡ của cộng đồng Archive', icon: '⭐', color: '#F2C94C', border_style: 'double', category: 'automatic', condition_type: 'messages', condition_value: 1000, is_enabled: true },

  // Automatic Exploration
  { id: 'little_explorer', name: 'Little Explorer', description: 'Lần đầu khám phá hồ sơ nhân vật', icon: '🔍', color: '#E9A9BB', border_style: 'solid', category: 'automatic', condition_type: 'exploration', condition_value: 1, is_enabled: true },
  { id: 'curious_soul', name: 'Curious Soul', description: 'Đã xem 10 hồ sơ nhân vật khác nhau', icon: '🎀', color: '#9B51E0', border_style: 'solid', category: 'automatic', condition_type: 'exploration', condition_value: 10, is_enabled: true },
  { id: 'wanderer', name: 'Wanderer', description: 'Đã xem 30 hồ sơ nhân vật khác nhau', icon: '🗺️', color: '#2D9CDB', border_style: 'solid', category: 'automatic', condition_type: 'exploration', condition_value: 30, is_enabled: true },
  { id: 'character_hunter', name: 'Character Hunter', description: 'Đã khám phá 50 hồ sơ nhân vật khác nhau', icon: '🏹', color: '#EB5757', border_style: 'double', category: 'automatic', condition_type: 'exploration', condition_value: 50, is_enabled: true },
  { id: 'archive_lover', name: 'Archive Lover', description: 'Đã khám phá 100 hồ sơ nhân vật khác nhau', icon: '💖', color: '#D88CA3', border_style: 'double', category: 'automatic', condition_type: 'exploration', condition_value: 100, is_enabled: true },

  // Admin Awarded
  { id: 'founder', name: 'Founder', description: 'Người sáng lập dự án Character Archive', icon: '👑', color: '#FFD700', border_style: 'double', category: 'admin', condition_type: 'manual', condition_value: 0, is_enabled: true },
  { id: 'royal_member', name: 'Royal Member', description: 'Thành viên hoàng gia đặc biệt', icon: '🏰', color: '#9B51E0', border_style: 'double', category: 'admin', condition_type: 'manual', condition_value: 0, is_enabled: true },
  { id: 'legend', name: 'Legend', description: 'Thành viên huyền thoại', icon: '⚡', color: '#F2C94C', border_style: 'dashed', category: 'admin', condition_type: 'manual', condition_value: 0, is_enabled: true },
  { id: 'dreamer', name: 'Dreamer', description: 'Tâm hồn mộng mơ yêu câu chuyện', icon: '🌌', color: '#BB6BD9', border_style: 'solid', category: 'admin', condition_type: 'manual', condition_value: 0, is_enabled: true },
  { id: 'artist', name: 'Artist', description: 'Nhà sáng tạo nghệ thuật persona', icon: '🎨', color: '#6FCF97', border_style: 'solid', category: 'admin', condition_type: 'manual', condition_value: 0, is_enabled: true },
  { id: 'sweet_soul', name: 'Sweet Soul', description: 'Tâm hồn ngọt ngào thân thiện', icon: '🍬', color: '#F2994A', border_style: 'solid', category: 'admin', condition_type: 'manual', condition_value: 0, is_enabled: true },

  // VIP Badges
  { id: 'vip_supporter', name: 'VIP Supporter', description: 'Nhà ủng hộ VIP của Archive (1đ – 20.000đ)', icon: '👑', color: '#FFD700', border_style: 'double', category: 'vip', condition_type: 'donation', condition_value: 1, is_enabled: true },
  { id: 'golden_supporter', name: 'Golden Supporter', description: 'Nhà ủng hộ cấp Hoàng Gia Vàng (20.001đ – 30.000đ)', icon: '🌟', color: '#FFA500', border_style: 'double', category: 'vip', condition_type: 'donation', condition_value: 20001, is_enabled: true },
  { id: 'angel_supporter', name: 'Angel Supporter', description: 'Thiên thần bảo trợ Archive (30.001đ – 100.000đ)', icon: '👼', color: '#FF69B4', border_style: 'double', category: 'vip', condition_type: 'donation', condition_value: 30001, is_enabled: true },
  { id: 'eternal_supporter', name: 'Eternal Supporter', description: 'Nhà tài trợ vĩnh cửu bất diệt (Trên 100.000đ)', icon: '💎', color: '#8A2BE2', border_style: 'double', category: 'vip', condition_type: 'donation', condition_value: 10001, is_enabled: true },
];
