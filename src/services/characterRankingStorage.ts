import { getSupabaseClient } from './supabase';
import { Character } from '../types/character';
import { saveCharacter } from './storage';

// ==========================================
// TYPES & DATA STRUCTURES
// ==========================================

export interface CharacterTagRecord {
  id: string;
  name: string;
  slug: string; // Lowercase, trimmed key
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharacterReview {
  id: string;
  character_id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  rating: number; // 1 to 5
  feedback: string;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharacterMetrics {
  character_id: string;
  total_reviews: number;
  total_stars: number;
  average_rating: number; // e.g. 4.85
  star_1_count: number;
  star_2_count: number;
  star_3_count: number;
  star_4_count: number;
  star_5_count: number;
  views_count: number;
  chats_count: number;
  hot_score: number; // 0 to 1000
  is_hidden_from_ranking: boolean;
  last_calculated_at: string;
}

export interface RankingSettings {
  id: string;
  is_ranking_enabled: boolean;
  weight_rating: number; // default 40
  weight_reviews: number; // default 30
  weight_views: number; // default 15
  weight_chats: number; // default 15
  min_reviews_for_boost: number; // default 3
  anti_spam_cooldown_seconds: number; // default 300
  updated_at: string;
}

export interface RankingHistoryItem {
  id: string;
  character_id: string;
  character_name: string;
  old_rank: number | null;
  new_rank: number;
  hot_score: number;
  change_reason: string;
  recorded_at: string;
}

export interface HotCharacterRanked {
  rank: number;
  character: Character;
  metrics: CharacterMetrics;
}

// Local Fallback Storage Keys
const STORAGE_TAGS = 'pca_character_tags_catalog';
const STORAGE_REVIEWS = 'pca_character_reviews_list';
const STORAGE_METRICS = 'pca_character_metrics_map';
const STORAGE_SETTINGS = 'pca_character_ranking_settings';
const STORAGE_HISTORY = 'pca_character_ranking_history';
const STORAGE_RATE_LIMIT_PREFIX = 'pca_rate_limit_';

export const DEFAULT_RANKING_SETTINGS: RankingSettings = {
  id: 'default',
  is_ranking_enabled: true,
  weight_rating: 40,
  weight_reviews: 30,
  weight_views: 15,
  weight_chats: 15,
  min_reviews_for_boost: 3,
  anti_spam_cooldown_seconds: 300,
  updated_at: new Date().toISOString(),
};

function getLocal<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
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

// ==========================================
// 1. CHARACTER TAGS MANAGEMENT
// ==========================================

export async function getCharacterTags(): Promise<CharacterTagRecord[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('character_tags')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (!error && data) {
        return data as CharacterTagRecord[];
      }
    } catch {
      // Fallback to local
    }
  }
  return getLocal<CharacterTagRecord[]>(STORAGE_TAGS, []);
}

export async function saveCharacterTag(tag: Partial<CharacterTagRecord>): Promise<CharacterTagRecord> {
  const now = new Date().toISOString();
  const name = String(tag.name || '').trim();
  const slug = name.toLowerCase();
  const id = tag.id || `tag_${slug.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;

  const record: CharacterTagRecord = {
    id,
    name,
    slug,
    description: tag.description || '',
    color: tag.color || '#D88CA3',
    icon: tag.icon || '✨',
    sort_order: Number(tag.sort_order) || 0,
    is_active: tag.is_active !== undefined ? tag.is_active : true,
    created_at: tag.created_at || now,
    updated_at: now,
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_tags').upsert(record);
    } catch (e) {
      console.warn('Failed to upsert tag in Supabase:', e);
    }
  }

  // Update local
  const current = getLocal<CharacterTagRecord[]>(STORAGE_TAGS, []);
  const existingIdx = current.findIndex((t) => t.id === record.id || t.slug === record.slug);
  if (existingIdx >= 0) {
    current[existingIdx] = record;
  } else {
    current.push(record);
  }
  setLocal(STORAGE_TAGS, current);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pca_tags_updated'));
  }

  return record;
}

export async function deleteCharacterTag(
  tagId: string,
  tagName: string,
  allCharacters: Character[],
  onSave?: (char: Character) => Promise<any>
): Promise<void> {
  const targetLower = tagName.toLowerCase().trim();

  // 1. Unlink from Supabase
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_tags').delete().eq('id', tagId);
    } catch (e) {
      console.warn('Failed to delete tag in Supabase:', e);
    }
  }

  // 2. Unlink from local tags
  const current = getLocal<CharacterTagRecord[]>(STORAGE_TAGS, []);
  setLocal(
    STORAGE_TAGS,
    current.filter((t) => t.id !== tagId && t.slug !== targetLower)
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pca_tags_updated'));
  }

  // 3. Remove tag from all characters without deleting character
  const saver = onSave || saveCharacter;
  for (const char of allCharacters) {
    if (Array.isArray(char.tags) && char.tags.some((t) => t.toLowerCase().trim() === targetLower)) {
      const updatedTags = char.tags.filter((t) => t.toLowerCase().trim() !== targetLower);
      const updatedChar = { ...char, tags: updatedTags, updatedAt: Date.now() };
      try {
        await saver(updatedChar);
      } catch (err) {
        console.error(`Failed to unlink tag from character ${char.id}:`, err);
      }
    }
  }
}

export async function renameCharacterTag(
  oldName: string,
  newName: string,
  tagRecord: CharacterTagRecord,
  allCharacters: Character[],
  onSave?: (char: Character) => Promise<any>
): Promise<void> {
  const oldLower = oldName.toLowerCase().trim();
  const cleanNew = newName.trim();
  const cleanNewSlug = cleanNew.toLowerCase();

  // 1. Update tag record
  const updatedTag: CharacterTagRecord = {
    ...tagRecord,
    name: cleanNew,
    slug: cleanNewSlug,
    updated_at: new Date().toISOString(),
  };

  await saveCharacterTag(updatedTag);

  // 2. Cascade rename across all characters
  const saver = onSave || saveCharacter;
  for (const char of allCharacters) {
    if (Array.isArray(char.tags) && char.tags.some((t) => t.toLowerCase().trim() === oldLower)) {
      const updatedTags = char.tags.map((t) => (t.toLowerCase().trim() === oldLower ? cleanNew : t));
      const updatedChar = { ...char, tags: updatedTags, updatedAt: Date.now() };
      try {
        await saver(updatedChar);
      } catch (err) {
        console.error(`Failed to cascade rename tag for character ${char.id}:`, err);
      }
    }
  }
}

export async function bulkAssignTagToCharacters(
  tagName: string,
  characterIds: string[],
  allCharacters: Character[],
  onSave?: (char: Character) => Promise<any>
): Promise<void> {
  const cleanTag = tagName.trim();
  const tagLower = cleanTag.toLowerCase();
  const saver = onSave || saveCharacter;

  for (const char of allCharacters) {
    if (characterIds.includes(char.id)) {
      const currentTags = Array.isArray(char.tags) ? [...char.tags] : [];
      const hasTag = currentTags.some((t) => t.toLowerCase().trim() === tagLower);
      if (!hasTag) {
        currentTags.push(cleanTag);
        const updatedChar = { ...char, tags: currentTags, updatedAt: Date.now() };
        await saver(updatedChar);
      }
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pca_tags_updated'));
  }
}

export async function bulkUnassignTagFromCharacters(
  tagName: string,
  characterIds: string[],
  allCharacters: Character[],
  onSave?: (char: Character) => Promise<any>
): Promise<void> {
  const tagLower = tagName.toLowerCase().trim();
  const saver = onSave || saveCharacter;

  for (const char of allCharacters) {
    if (characterIds.includes(char.id) && Array.isArray(char.tags)) {
      const hasTag = char.tags.some((t) => t.toLowerCase().trim() === tagLower);
      if (hasTag) {
        const updatedTags = char.tags.filter((t) => t.toLowerCase().trim() !== tagLower);
        const updatedChar = { ...char, tags: updatedTags, updatedAt: Date.now() };
        await saver(updatedChar);
      }
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pca_tags_updated'));
  }
}

// ==========================================
// 2. CHARACTER REVIEWS & RATINGS
// ==========================================

export async function getCharacterReviews(
  characterId?: string,
  includeHidden: boolean = false
): Promise<CharacterReview[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      let query = client.from('character_reviews').select('*').order('created_at', { ascending: false });
      if (characterId) {
        query = query.eq('character_id', characterId);
      }
      if (!includeHidden) {
        query = query.eq('is_hidden', false);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data as CharacterReview[];
      }
    } catch {
      // Fallback
    }
  }

  const all = getLocal<CharacterReview[]>(STORAGE_REVIEWS, []);
  return all
    .filter((r) => {
      if (characterId && r.character_id !== characterId) return false;
      if (!includeHidden && r.is_hidden) return false;
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function submitOrUpdateReview(reviewData: {
  character_id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  rating: number;
  feedback: string;
}): Promise<CharacterReview> {
  const now = new Date().toISOString();
  const existingReviews = await getCharacterReviews(reviewData.character_id, true);
  const existing = existingReviews.find((r) => r.user_id === reviewData.user_id);

  const id = existing?.id || `rev_${reviewData.character_id}_${reviewData.user_id}_${Date.now()}`;
  const review: CharacterReview = {
    id,
    character_id: reviewData.character_id,
    user_id: reviewData.user_id,
    username: reviewData.username,
    avatar_url: reviewData.avatar_url || '',
    rating: Math.max(1, Math.min(5, Math.round(reviewData.rating))),
    feedback: reviewData.feedback.trim(),
    is_hidden: false,
    created_at: existing ? existing.created_at : now,
    updated_at: now,
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_reviews').upsert(review);
    } catch (e) {
      console.warn('Failed to upsert review in Supabase:', e);
    }
  }

  // Update local reviews
  const all = getLocal<CharacterReview[]>(STORAGE_REVIEWS, []);
  const idx = all.findIndex((r) => r.id === review.id);
  if (idx >= 0) {
    all[idx] = review;
  } else {
    all.push(review);
  }
  setLocal(STORAGE_REVIEWS, all);

  // Recalculate metrics for this character
  await recalculateCharacterMetrics(reviewData.character_id);

  return review;
}

export async function deleteReview(reviewId: string, characterId: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_reviews').delete().eq('id', reviewId);
    } catch (e) {
      console.warn('Failed to delete review in Supabase:', e);
    }
  }

  const all = getLocal<CharacterReview[]>(STORAGE_REVIEWS, []);
  setLocal(
    STORAGE_REVIEWS,
    all.filter((r) => r.id !== reviewId)
  );

  // Recalculate metrics
  await recalculateCharacterMetrics(characterId);
}

export async function setReviewHiddenStatus(
  reviewId: string,
  characterId: string,
  isHidden: boolean
): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_reviews').update({ is_hidden: isHidden, updated_at: new Date().toISOString() }).eq('id', reviewId);
    } catch (e) {
      console.warn('Failed to toggle review visibility in Supabase:', e);
    }
  }

  const all = getLocal<CharacterReview[]>(STORAGE_REVIEWS, []);
  const idx = all.findIndex((r) => r.id === reviewId);
  if (idx >= 0) {
    all[idx].is_hidden = isHidden;
    all[idx].updated_at = new Date().toISOString();
    setLocal(STORAGE_REVIEWS, all);
  }

  await recalculateCharacterMetrics(characterId);
}

// ==========================================
// 3. CHARACTER METRICS & HOT SCORE
// ==========================================

export async function getCharacterMetrics(characterId: string): Promise<CharacterMetrics> {
  const all = await getAllCharacterMetrics();
  return (
    all[characterId] || {
      character_id: characterId,
      total_reviews: 0,
      total_stars: 0,
      average_rating: 0,
      star_1_count: 0,
      star_2_count: 0,
      star_3_count: 0,
      star_4_count: 0,
      star_5_count: 0,
      views_count: 0,
      chats_count: 0,
      hot_score: 0,
      is_hidden_from_ranking: false,
      last_calculated_at: new Date().toISOString(),
    }
  );
}

export async function getAllCharacterMetrics(): Promise<Record<string, CharacterMetrics>> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('character_metrics').select('*');
      if (!error && data) {
        const map: Record<string, CharacterMetrics> = {};
        data.forEach((m: any) => {
          map[m.character_id] = {
            ...m,
            total_reviews: Number(m.total_reviews) || 0,
            total_stars: Number(m.total_stars) || 0,
            average_rating: Number(m.average_rating) || 0,
            star_1_count: Number(m.star_1_count) || 0,
            star_2_count: Number(m.star_2_count) || 0,
            star_3_count: Number(m.star_3_count) || 0,
            star_4_count: Number(m.star_4_count) || 0,
            star_5_count: Number(m.star_5_count) || 0,
            views_count: Number(m.views_count) || 0,
            chats_count: Number(m.chats_count) || 0,
            hot_score: Number(m.hot_score) || 0,
            is_hidden_from_ranking: Boolean(m.is_hidden_from_ranking),
          };
        });
        return map;
      }
    } catch {
      // Fallback to local
    }
  }

  return getLocal<Record<string, CharacterMetrics>>(STORAGE_METRICS, {});
}

/**
 * Calculates Hot Score with configurable weights & Bayesian smoothing
 */
export function computeHotScore(
  metrics: {
    average_rating: number;
    total_reviews: number;
    views_count: number;
    chats_count: number;
  },
  settings: RankingSettings
): number {
  const { average_rating, total_reviews, views_count, chats_count } = metrics;
  const { weight_rating, weight_reviews, weight_views, weight_chats, min_reviews_for_boost } = settings;

  // Total weight normalization
  const sumWeights = (weight_rating + weight_reviews + weight_views + weight_chats) || 100;
  const normWr = weight_rating / sumWeights;
  const normWrev = weight_reviews / sumWeights;
  const normWv = weight_views / sumWeights;
  const normWc = weight_chats / sumWeights;

  // 1. Bayesian Average Rating:
  // C = 3.5 (prior baseline average rating), m = min_reviews_for_boost
  const C = 3.5;
  const m = Math.max(1, min_reviews_for_boost);
  const v = total_reviews;
  const R = v > 0 ? average_rating : C;
  const bayesianRating = (R * v + C * m) / (v + m); // scale 1..5
  const ratingScore = ((bayesianRating - 1) / 4) * 1000; // scale 0..1000

  // 2. Review Volume Score (damped log-curve up to ~50 reviews)
  const reviewScore = Math.min(1000, (Math.log10(1 + v) / Math.log10(1 + 50)) * 1000);

  // 3. Views Score (damped log-curve up to ~300 verified views)
  const viewsScore = Math.min(1000, (Math.log10(1 + Math.max(0, views_count)) / Math.log10(1 + 300)) * 1000);

  // 4. Chat Clicks Score (damped log-curve up to ~100 verified clicks)
  const chatsScore = Math.min(1000, (Math.log10(1 + Math.max(0, chats_count)) / Math.log10(1 + 100)) * 1000);

  // Combined Weighted Hot Score
  const rawScore = ratingScore * normWr + reviewScore * normWrev + viewsScore * normWv + chatsScore * normWc;

  return Math.round(Math.max(0, Math.min(1000, rawScore)) * 10) / 10;
}

export async function recalculateCharacterMetrics(characterId: string): Promise<CharacterMetrics> {
  const reviews = await getCharacterReviews(characterId, false);
  const currentMetrics = await getCharacterMetrics(characterId);
  const settings = await getRankingSettings();

  const total_reviews = reviews.length;
  const total_stars = reviews.reduce((sum, r) => sum + r.rating, 0);
  const average_rating = total_reviews > 0 ? Math.round((total_stars / total_reviews) * 100) / 100 : 0;

  let star_1_count = 0;
  let star_2_count = 0;
  let star_3_count = 0;
  let star_4_count = 0;
  let star_5_count = 0;

  reviews.forEach((r) => {
    if (r.rating === 1) star_1_count++;
    else if (r.rating === 2) star_2_count++;
    else if (r.rating === 3) star_3_count++;
    else if (r.rating === 4) star_4_count++;
    else if (r.rating === 5) star_5_count++;
  });

  const hot_score = computeHotScore(
    {
      average_rating,
      total_reviews,
      views_count: currentMetrics.views_count,
      chats_count: currentMetrics.chats_count,
    },
    settings
  );

  const updated: CharacterMetrics = {
    character_id: characterId,
    total_reviews,
    total_stars,
    average_rating,
    star_1_count,
    star_2_count,
    star_3_count,
    star_4_count,
    star_5_count,
    views_count: currentMetrics.views_count,
    chats_count: currentMetrics.chats_count,
    hot_score,
    is_hidden_from_ranking: currentMetrics.is_hidden_from_ranking,
    last_calculated_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_metrics').upsert(updated);
    } catch (e) {
      console.warn('Failed to upsert character metrics in Supabase:', e);
    }
  }

  // Update local
  const map = getLocal<Record<string, CharacterMetrics>>(STORAGE_METRICS, {});
  map[characterId] = updated;
  setLocal(STORAGE_METRICS, map);

  return updated;
}

/**
 * Validates and records a character view with anti-spam rate limiting
 */
export async function recordVerifiedCharacterView(characterId: string, cooldownSec: number = 300): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const key = `${STORAGE_RATE_LIMIT_PREFIX}view_${characterId}`;
  const lastTime = Number(sessionStorage.getItem(key)) || 0;
  const now = Date.now();

  // If viewed within cooldown, do not count again (anti-spam)
  if (now - lastTime < cooldownSec * 1000) {
    return false;
  }

  sessionStorage.setItem(key, String(now));

  const metrics = await getCharacterMetrics(characterId);
  metrics.views_count += 1;

  const settings = await getRankingSettings();
  metrics.hot_score = computeHotScore(
    {
      average_rating: metrics.average_rating,
      total_reviews: metrics.total_reviews,
      views_count: metrics.views_count,
      chats_count: metrics.chats_count,
    },
    settings
  );
  metrics.last_calculated_at = new Date().toISOString();

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_metrics').upsert(metrics);
    } catch (e) {
      console.warn('Failed to record view in Supabase:', e);
    }
  }

  const map = getLocal<Record<string, CharacterMetrics>>(STORAGE_METRICS, {});
  map[characterId] = metrics;
  setLocal(STORAGE_METRICS, map);

  return true;
}

/**
 * Validates and records a character AI chat link click with anti-spam rate limiting
 */
export async function recordVerifiedCharacterChat(characterId: string, cooldownSec: number = 300): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const key = `${STORAGE_RATE_LIMIT_PREFIX}chat_${characterId}`;
  const lastTime = Number(sessionStorage.getItem(key)) || 0;
  const now = Date.now();

  if (now - lastTime < cooldownSec * 1000) {
    return false;
  }

  sessionStorage.setItem(key, String(now));

  const metrics = await getCharacterMetrics(characterId);
  metrics.chats_count += 1;

  const settings = await getRankingSettings();
  metrics.hot_score = computeHotScore(
    {
      average_rating: metrics.average_rating,
      total_reviews: metrics.total_reviews,
      views_count: metrics.views_count,
      chats_count: metrics.chats_count,
    },
    settings
  );
  metrics.last_calculated_at = new Date().toISOString();

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_metrics').upsert(metrics);
    } catch (e) {
      console.warn('Failed to record chat click in Supabase:', e);
    }
  }

  const map = getLocal<Record<string, CharacterMetrics>>(STORAGE_METRICS, {});
  map[characterId] = metrics;
  setLocal(STORAGE_METRICS, map);

  return true;
}

export async function toggleCharacterRankingVisibility(
  characterId: string,
  isHidden: boolean
): Promise<CharacterMetrics> {
  const metrics = await getCharacterMetrics(characterId);
  metrics.is_hidden_from_ranking = isHidden;
  metrics.last_calculated_at = new Date().toISOString();

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_metrics').upsert(metrics);
    } catch (e) {
      console.warn('Failed to toggle ranking visibility in Supabase:', e);
    }
  }

  const map = getLocal<Record<string, CharacterMetrics>>(STORAGE_METRICS, {});
  map[characterId] = metrics;
  setLocal(STORAGE_METRICS, map);

  return metrics;
}

// ==========================================
// 4. RANKING SETTINGS & HISTORY
// ==========================================

export async function getRankingSettings(): Promise<RankingSettings> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from('character_ranking_settings').select('*').eq('id', 'default').single();
      if (!error && data) {
        return {
          ...data,
          weight_rating: Number(data.weight_rating) || 40,
          weight_reviews: Number(data.weight_reviews) || 30,
          weight_views: Number(data.weight_views) || 15,
          weight_chats: Number(data.weight_chats) || 15,
          min_reviews_for_boost: Number(data.min_reviews_for_boost) || 3,
          anti_spam_cooldown_seconds: Number(data.anti_spam_cooldown_seconds) || 300,
          is_ranking_enabled: Boolean(data.is_ranking_enabled),
        };
      }
    } catch {
      // Fallback
    }
  }

  return getLocal<RankingSettings>(STORAGE_SETTINGS, DEFAULT_RANKING_SETTINGS);
}

export async function saveRankingSettings(
  settings: Partial<RankingSettings>,
  allCharacters?: Character[]
): Promise<RankingSettings> {
  const current = await getRankingSettings();
  const updated: RankingSettings = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_ranking_settings').upsert(updated);
    } catch (e) {
      console.warn('Failed to save ranking settings in Supabase:', e);
    }
  }

  setLocal(STORAGE_SETTINGS, updated);

  // If characters provided, recalculate all scores with new weights
  if (allCharacters && allCharacters.length > 0) {
    for (const char of allCharacters) {
      await recalculateCharacterMetrics(char.id);
    }
  }

  return updated;
}

export async function getRankingHistory(): Promise<RankingHistoryItem[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('character_ranking_history')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(50);
      if (!error && data) {
        return data as RankingHistoryItem[];
      }
    } catch {
      // Fallback
    }
  }

  return getLocal<RankingHistoryItem[]>(STORAGE_HISTORY, []);
}

export async function logRankingChange(
  characterId: string,
  characterName: string,
  oldRank: number | null,
  newRank: number,
  hotScore: number,
  changeReason: string
): Promise<void> {
  const record: RankingHistoryItem = {
    id: `ranklog_${characterId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    character_id: characterId,
    character_name: characterName,
    old_rank: oldRank,
    new_rank: newRank,
    hot_score: hotScore,
    change_reason: changeReason,
    recorded_at: new Date().toISOString(),
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      await client.from('character_ranking_history').insert(record);
    } catch (e) {
      console.warn('Failed to insert ranking history in Supabase:', e);
    }
  }

  const list = getLocal<RankingHistoryItem[]>(STORAGE_HISTORY, []);
  list.unshift(record);
  if (list.length > 100) list.pop();
  setLocal(STORAGE_HISTORY, list);
}

// ==========================================
// 5. HOT CHARACTERS RANKING COMPUTATION
// ==========================================

export async function computeHotRankingList(
  publishedCharacters: Character[]
): Promise<HotCharacterRanked[]> {
  const metricsMap = await getAllCharacterMetrics();
  const settings = await getRankingSettings();

  if (!settings.is_ranking_enabled) {
    return [];
  }

  // Filter out characters hidden from ranking
  const eligible = publishedCharacters.map((char) => {
    const metrics = metricsMap[char.id] || {
      character_id: char.id,
      total_reviews: 0,
      total_stars: 0,
      average_rating: 0,
      star_1_count: 0,
      star_2_count: 0,
      star_3_count: 0,
      star_4_count: 0,
      star_5_count: 0,
      views_count: 0,
      chats_count: 0,
      hot_score: 0,
      is_hidden_from_ranking: false,
      last_calculated_at: new Date().toISOString(),
    };
    return { character: char, metrics };
  }).filter((item) => !item.metrics.is_hidden_from_ranking);

  // Sort by Hot Score descending, then by average rating, then by reviews count, then created date
  eligible.sort((a, b) => {
    if (b.metrics.hot_score !== a.metrics.hot_score) {
      return b.metrics.hot_score - a.metrics.hot_score;
    }
    if (b.metrics.average_rating !== a.metrics.average_rating) {
      return b.metrics.average_rating - a.metrics.average_rating;
    }
    if (b.metrics.total_reviews !== a.metrics.total_reviews) {
      return b.metrics.total_reviews - a.metrics.total_reviews;
    }
    return (b.character.createdAt || 0) - (a.character.createdAt || 0);
  });

  // Assign ranks
  return eligible.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    character: item.character,
    metrics: item.metrics,
  }));
}
