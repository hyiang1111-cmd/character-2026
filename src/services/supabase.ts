import { createClient, SupabaseClient } from '@supabase/supabase-js';

// LocalStorage Keys for custom Supabase connection settings
export const SUPABASE_URL_KEY = 'pca_supabase_url';
export const SUPABASE_ANON_KEY = 'pca_supabase_anon_key';

// Central shared memory credentials (set from siteContent or server)
let sharedSupabaseUrl = '';
let sharedSupabaseAnonKey = '';

export function setSharedSupabaseCredentials(url?: string, anonKey?: string) {
  if (url && url.trim()) sharedSupabaseUrl = url.trim();
  if (anonKey && anonKey.trim()) sharedSupabaseAnonKey = anonKey.trim();
  if (url || anonKey) {
    supabaseInstance = null; // force re-evaluation of client
  }
}

// Get active Supabase configuration (from env vars, central site settings, or local overrides)
export function getSupabaseCredentials() {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  let localUrl = '';
  let localKey = '';

  if (typeof window !== 'undefined') {
    localUrl = localStorage.getItem(SUPABASE_URL_KEY) || '';
    localKey = localStorage.getItem(SUPABASE_ANON_KEY) || '';
  }

  const url = (sharedSupabaseUrl || localUrl || envUrl || '').trim();
  const anonKey = (sharedSupabaseAnonKey || localKey || envKey || '').trim();

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
  setSharedSupabaseCredentials(url, anonKey);
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
  is_online?: boolean; // Realtime presence flag (active in last 2 mins), strictly display-only
  last_heartbeat_at?: string;
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

export interface BankAccount {
  id: string;
  bank_name: string;
  bank_code?: string;
  account_number: string;
  account_holder: string;
  branch?: string;
  default_transfer_note: string;
  notes?: string;
  is_default: boolean;
  is_enabled: boolean;
  order: number;
  qr_code_url?: string;
  qr_description?: string;
}

export interface DonatePageContent {
  title: string;
  description: string;
  call_to_action: string;
  transfer_instructions: string;
  sample_transfer_note: string;
  benefits_info: string;
  banner_url?: string;
  post_submission_message: string;
  contact_info: string;
  success_message: string;
}

export interface SuggestedDonateAmount {
  id: string;
  amount: number;
  label?: string;
  benefit_description?: string;
  icon?: string;
  is_enabled: boolean;
  order: number;
}

export interface QrCodeImage {
  id: string;
  title: string;
  url: string;
  description?: string;
  bank_account_id?: string;
  uploaded_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  image_url?: string;
  color: string;
  border_style: string;
  glow_color?: string;
  animation_effect?: 'none' | 'pulse' | 'shimmer' | 'bounce' | 'spin-slow';
  category: 'automatic' | 'activity' | 'donation' | 'vip' | 'admin' | 'event' | 'achievement' | 'special' | 'custom' | string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  condition_type: 'messages' | 'exploration' | 'loyalty' | 'manual' | 'donation' | 'admin_grant';
  condition_value: number;
  is_enabled: boolean;
  expires_at?: string | null;
  created_at?: string;
  created_by?: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  granted_at: string;
  granted_by?: string;
  grant_type?: 'automatic' | 'admin_awarded';
  expires_at?: string | null;
  notes?: string;
  badge?: Badge;
}

export interface BadgeAuditLog {
  id: string;
  action: 'grant' | 'revoke' | 'update_expiry';
  admin_id: string;
  admin_name: string;
  user_id: string;
  username: string;
  badge_id: string;
  badge_name: string;
  reason?: string;
  expires_at?: string | null;
  timestamp: string;
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
  receipt_url?: string;
  internal_notes?: string;
  bank_account_id?: string;
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
  accounts?: BankAccount[];
  page_content?: DonatePageContent;
  suggested_amounts?: SuggestedDonateAmount[];
  min_amount?: number;
  allow_custom_amount?: boolean;
  xu_conversion_rate?: number;
  qr_images?: QrCodeImage[];
}

export const DEFAULT_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank_mb_default',
    bank_name: 'MB Bank (Ngân hàng Quân Đội)',
    bank_code: 'MBBANK',
    account_number: '0388998899',
    account_holder: 'CHARACTER ARCHIVE ADMIN',
    branch: 'Hà Nội',
    default_transfer_note: 'ARCHIVE VIP',
    notes: 'Tài khoản chính nhận ủng hộ duy trì hệ thống máy chủ và phát triển tính năng.',
    is_default: true,
    is_enabled: true,
    order: 1,
    qr_code_url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
    qr_description: 'Quét mã VietQR chuyển khoản nhanh 24/7 qua mọi ứng dụng ngân hàng.',
  },
];

export const DEFAULT_DONATE_PAGE_CONTENT: DonatePageContent = {
  title: 'Ủng hộ duy trì Character Archive (Donate)',
  description: 'Tất cả đóng góp tích lũy được Admin xác nhận sẽ tự động tích điểm nâng cấp danh hiệu VIP Supporter, vinh danh trên Hall of Fame và nhận XU cộng đồng!',
  call_to_action: 'Mọi sự ủng hộ của bạn là nguồn động lực to lớn giúp Character Archive duy trì máy chủ, thư viện nhạc nền, hệ thống AI và tiếp tục phát triển nhiều nhân vật mới.',
  transfer_instructions: 'Vui lòng chuyển khoản đúng số tài khoản và kèm cú pháp để Admin đối soát và phê duyệt tự động nhanh chóng.',
  sample_transfer_note: 'ARCHIVE VIP [Username]',
  benefits_info: 'Nhận huy hiệu VIP Supporter lấp lánh bên cạnh Username, viền avatar hoàng kim, điểm danh dự và tích lũy XU vĩnh cửu.',
  banner_url: '',
  post_submission_message: 'Yêu cầu của bạn đã được gửi tới ban quản trị. Admin sẽ kiểm tra giao dịch và phê duyệt trong vòng vài phút đến vài giờ.',
  contact_info: 'Nếu có bất kỳ thắc mắc hoặc cần hỗ trợ giao dịch, vui lòng gửi tin nhắn trong The Lounge hoặc liên hệ Admin.',
  success_message: 'Xác nhận ủng hộ thành công! Cảm ơn bạn đã đồng hành và xây dựng thế giới Character Archive.',
};

export const DEFAULT_SUGGESTED_AMOUNTS: SuggestedDonateAmount[] = [
  { id: 'sug_10k', amount: 10000, label: '10.000đ', benefit_description: 'Ủng hộ cà phê nhỏ, nhận 10 Xu & khởi đầu VIP', icon: '☕', is_enabled: true, order: 1 },
  { id: 'sug_20k', amount: 20000, label: '20.000đ', benefit_description: 'Đạt mốc VIP Supporter, viền avatar vàng hoàng gia', icon: '👑', is_enabled: true, order: 2 },
  { id: 'sug_50k', amount: 50000, label: '50.000đ', benefit_description: 'Nâng cấp Golden Supporter, nhận 50 Xu cộng đồng', icon: '🌟', is_enabled: true, order: 3 },
  { id: 'sug_100k', amount: 100000, label: '100.000đ', benefit_description: 'Cấp Angel Supporter, tỏa sáng trên Hall of Fame', icon: '👼', is_enabled: true, order: 4 },
  { id: 'sug_200k', amount: 200000, label: '200.000đ', benefit_description: 'Cấp Eternal Supporter vĩnh cửu, nhà tài trợ danh dự', icon: '💎', is_enabled: true, order: 5 },
];

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

export interface PresetAvatar {
  id: string;
  category: 'cats' | 'bunnies' | 'flowers' | 'bears' | 'butterflies' | 'kawaii' | 'aesthetic' | 'dark_aesthetic';
  title: string;
  url: string;
  is_default?: boolean;
}

export const DEFAULT_PRESET_AVATARS: PresetAvatar[] = [
  // 🐱 Cats
  { id: 'cat_1', category: 'cats', title: 'Mèo Mắt Xanh', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80', is_default: true },
  { id: 'cat_2', category: 'cats', title: 'Mèo Tam Thể', url: 'https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&q=80' },
  { id: 'cat_3', category: 'cats', title: 'Mèo Đeo Kính Cool', url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&q=80' },
  { id: 'cat_4', category: 'cats', title: 'Mèo Trắng Tuyết', url: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?auto=format&fit=crop&w=400&q=80' },
  { id: 'cat_5', category: 'cats', title: 'Mèo Mập Tròn', url: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=400&q=80' },
  { id: 'cat_6', category: 'cats', title: 'Mèo Con Mộng Mơ', url: 'https://images.unsplash.com/photo-1561948955-570b270e7c36?auto=format&fit=crop&w=400&q=80' },
  { id: 'cat_7', category: 'cats', title: 'Mèo Xám Lông Xù', url: 'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&w=400&q=80' },
  { id: 'cat_8', category: 'cats', title: 'Mèo Mắt Tròn Long Lanh', url: 'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?auto=format&fit=crop&w=400&q=80' },

  // 🐰 Bunnies
  { id: 'bun_1', category: 'bunnies', title: 'Thỏ Trắng Lông Bông', url: 'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?auto=format&fit=crop&w=400&q=80' },
  { id: 'bun_2', category: 'bunnies', title: 'Thỏ Nâu Dễ Thương', url: 'https://images.unsplash.com/photo-1559214362-e68510ebf1a3?auto=format&fit=crop&w=400&q=80' },
  { id: 'bun_3', category: 'bunnies', title: 'Thỏ Con Ngơ Ngác', url: 'https://images.unsplash.com/photo-1518796745738-41048802f99a?auto=format&fit=crop&w=400&q=80' },
  { id: 'bun_4', category: 'bunnies', title: 'Thỏ Tai Rủ Kawaii', url: 'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?auto=format&fit=crop&w=400&q=80' },
  { id: 'bun_5', category: 'bunnies', title: 'Thỏ Tuyết Xinh Xắn', url: 'https://images.unsplash.com/photo-1535241749838-299277b6305f?auto=format&fit=crop&w=400&q=80' },
  { id: 'bun_6', category: 'bunnies', title: 'Thỏ Hồng Pastel', url: 'https://images.unsplash.com/photo-1571151522047-920f0ebff23e?auto=format&fit=crop&w=400&q=80' },
  { id: 'bun_7', category: 'bunnies', title: 'Thỏ Bông Nằm Ngủ', url: 'https://images.unsplash.com/photo-1516642898673-edd1ced08e87?auto=format&fit=crop&w=400&q=80' },
  { id: 'bun_8', category: 'bunnies', title: 'Thỏ Nhỏ Đồng Cỏ', url: 'https://images.unsplash.com/photo-1506108182982-f5c2250ec43b?auto=format&fit=crop&w=400&q=80' },

  // 🌸 Flowers
  { id: 'flw_1', category: 'flowers', title: 'Hoa Anh Đào Sakura', url: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=400&q=80' },
  { id: 'flw_2', category: 'flowers', title: 'Tulip Hồng Pastel', url: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=400&q=80' },
  { id: 'flw_3', category: 'flowers', title: 'Hoa Cúc Trắng Thuần Khiết', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
  { id: 'flw_4', category: 'flowers', title: 'Hoa Hồng Mộng Mơ', url: 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?auto=format&fit=crop&w=400&q=80' },
  { id: 'flw_5', category: 'flowers', title: 'Hoa Thạch Thảo Tím', url: 'https://images.unsplash.com/photo-1533616688419-b7a585564566?auto=format&fit=crop&w=400&q=80' },
  { id: 'flw_6', category: 'flowers', title: 'Cánh Hoa Nắng Mai', url: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?auto=format&fit=crop&w=400&q=80' },
  { id: 'flw_7', category: 'flowers', title: 'Hoa Hướng Dương Ấm Áp', url: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&w=400&q=80' },
  { id: 'flw_8', category: 'flowers', title: 'Hoa Oải Hương Lavender', url: 'https://images.unsplash.com/photo-1528183429752-a97d0bf99b5a?auto=format&fit=crop&w=400&q=80' },

  // 🧸 Teddy Bears
  { id: 'bear_1', category: 'bears', title: 'Gấu Bông Teddy Nâu', url: 'https://images.unsplash.com/photo-1559454403-b8fb88521f11?auto=format&fit=crop&w=400&q=80' },
  { id: 'bear_2', category: 'bears', title: 'Gấu Bông Mini Đáng Yêu', url: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=400&q=80' },
  { id: 'bear_3', category: 'bears', title: 'Gấu Trắng Tuyết Pastel', url: 'https://images.unsplash.com/photo-1530325553241-4f6e7690cf36?auto=format&fit=crop&w=400&q=80' },
  { id: 'bear_4', category: 'bears', title: 'Chú Gấu Nhỏ Thân Thiện', url: 'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?auto=format&fit=crop&w=400&q=80' },
  { id: 'bear_5', category: 'bears', title: 'Gấu Ôm Trái Tim', url: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=400&q=80' },
  { id: 'bear_6', category: 'bears', title: 'Gấu Vintage Đáng Yêu', url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=400&q=80' },
  { id: 'bear_7', category: 'bears', title: 'Gấu Bông Mũi Hồng', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80' },
  { id: 'bear_8', category: 'bears', title: 'Bộ Ba Gấu Bông Dễ Thương', url: 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?auto=format&fit=crop&w=400&q=80' },

  // 🦋 Butterflies
  { id: 'btf_1', category: 'butterflies', title: 'Bướm Xanh Mộng Mơ', url: 'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?auto=format&fit=crop&w=400&q=80' },
  { id: 'btf_2', category: 'butterflies', title: 'Bướm Cam Lấp Lánh', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=400&q=80' },
  { id: 'btf_3', category: 'butterflies', title: 'Bướm Huyền Mạch', url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=400&q=80' },
  { id: 'btf_4', category: 'butterflies', title: 'Bướm Dạ Quang Dạ Hội', url: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=400&q=80' },
  { id: 'btf_5', category: 'butterflies', title: 'Cánh Bướm Tím Lavender', url: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80' },
  { id: 'btf_6', category: 'butterflies', title: 'Bướm Hoàng Hôn Nghệ Thuật', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80' },
  { id: 'btf_7', category: 'butterflies', title: 'Bướm Vàng Nắng', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
  { id: 'btf_8', category: 'butterflies', title: 'Cánh Bướm Thiên Đường', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&q=80' },

  // 🎀 Kawaii
  { id: 'kaw_1', category: 'kawaii', title: 'Bánh Ngọt Dâu Hồng', url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=400&q=80' },
  { id: 'kaw_2', category: 'kawaii', title: 'Trang Trí Nơ Pastel', url: 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=400&q=80' },
  { id: 'kaw_3', category: 'kawaii', title: 'Cupcake Kem Bông', url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=80' },
  { id: 'kaw_4', category: 'kawaii', title: 'Kẹo Ngọt Cầu Cồng', url: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=400&q=80' },
  { id: 'kaw_5', category: 'kawaii', title: 'Hộp Quà Dễ Thương', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80' },
  { id: 'kaw_6', category: 'kawaii', title: 'Trái Tim Bồng Bềnh', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
  { id: 'kaw_7', category: 'kawaii', title: 'Thỏ Bánh Quy Kawaii', url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80' },
  { id: 'kaw_8', category: 'kawaii', title: 'Ly Trà Sữa Thạch Hồng', url: 'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=400&q=80' },

  // 🌙 Aesthetic
  { id: 'aes_1', category: 'aesthetic', title: 'Trăng Rằm Mộng Mơ', url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80' },
  { id: 'aes_2', category: 'aesthetic', title: 'Biển Chiều Hoàng Hôn', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80' },
  { id: 'aes_3', category: 'aesthetic', title: 'Bầu Trời Sao Ngân Hà', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=400&q=80' },
  { id: 'aes_4', category: 'aesthetic', title: 'Đom Đóm Đêm Rừng', url: 'https://images.unsplash.com/photo-1499209974431-9dac3ada00d7?auto=format&fit=crop&w=400&q=80' },
  { id: 'aes_5', category: 'aesthetic', title: 'Mây Hồng Lavender', url: 'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=400&q=80' },
  { id: 'aes_6', category: 'aesthetic', title: 'Ánh Dương Tối Giản', url: 'https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?auto=format&fit=crop&w=400&q=80' },
  { id: 'aes_7', category: 'aesthetic', title: 'Thành Phố Đêm Nhạt', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80' },
  { id: 'aes_8', category: 'aesthetic', title: 'Giọt Sương Rạng Đông', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80' },

  // 🖤 Dark Aesthetic
  { id: 'drk_1', category: 'dark_aesthetic', title: 'Bầu Trời Đêm Xám Lạnh', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80' },
  { id: 'drk_2', category: 'dark_aesthetic', title: 'Hoa Hồng Đen Bí U', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
  { id: 'drk_3', category: 'dark_aesthetic', title: 'Lâu Đài Gothic Đen', url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=400&q=80' },
  { id: 'drk_4', category: 'dark_aesthetic', title: 'Rừng Đêm U Tối', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=400&q=80' },
  { id: 'drk_5', category: 'dark_aesthetic', title: 'Neon Đỏ Đêm Lạnh', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
  { id: 'drk_6', category: 'dark_aesthetic', title: 'Trăng Khuyết Bí Ẩn', url: 'https://images.unsplash.com/photo-1532767153582-b1a0e5145009?auto=format&fit=crop&w=400&q=80' },
  { id: 'drk_7', category: 'dark_aesthetic', title: 'Bóng Đêm Thơ Mộng', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80' },
  { id: 'drk_8', category: 'dark_aesthetic', title: 'Cánh Cổng Hoàng Hôn Đen', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80' },
];
