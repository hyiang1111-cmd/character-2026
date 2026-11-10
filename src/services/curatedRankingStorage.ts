import { getSupabaseClient } from './supabase';
import { Character } from '../types/character';

export interface CuratedRanking {
  top1_id: string | null;
  top2_id: string | null;
  top3_id: string | null;
  updated_at?: string;
  updated_by?: string;
}

export interface CuratedRankedCharacter {
  rank: 1 | 2 | 3;
  character: Character;
}

const STORAGE_CURATED_RANKING = 'pca_character_curated_ranking';

export const DEFAULT_CURATED_RANKING: CuratedRanking = {
  top1_id: null,
  top2_id: null,
  top3_id: null,
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

/**
 * Fetches current Admin Curated Ranking (Top 1, Top 2, Top 3) from Supabase or LocalStorage.
 */
export async function getCuratedRanking(): Promise<CuratedRanking> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('character_curated_ranking')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data) {
        const ranking: CuratedRanking = {
          top1_id: data.top1_character_id || null,
          top2_id: data.top2_character_id || null,
          top3_id: data.top3_character_id || null,
          updated_at: data.updated_at || new Date().toISOString(),
          updated_by: data.updated_by || '',
        };
        setLocal(STORAGE_CURATED_RANKING, ranking);
        return ranking;
      }
    } catch (e) {
      console.warn('Failed to fetch curated ranking from Supabase:', e);
    }
  }

  return getLocal<CuratedRanking>(STORAGE_CURATED_RANKING, DEFAULT_CURATED_RANKING);
}

/**
 * Saves Admin Curated Ranking to Supabase and dispatches real-time event.
 */
export async function saveCuratedRanking(
  ranking: CuratedRanking,
  updatedBy?: string
): Promise<CuratedRanking> {
  // Sanitize: ensure no character occupies multiple positions
  const cleanRanking = sanitizeCuratedRanking(ranking);
  const now = new Date().toISOString();
  cleanRanking.updated_at = now;
  cleanRanking.updated_by = updatedBy || 'admin';

  const client = getSupabaseClient();
  let savedToSupabase = false;

  if (client) {
    try {
      const record = {
        id: 'default',
        top1_character_id: cleanRanking.top1_id || null,
        top2_character_id: cleanRanking.top2_id || null,
        top3_character_id: cleanRanking.top3_id || null,
        updated_at: now,
        updated_by: cleanRanking.updated_by,
      };

      const { error } = await client
        .from('character_curated_ranking')
        .upsert(record);

      if (!error) {
        savedToSupabase = true;
      } else {
        console.warn('Supabase character_curated_ranking save notice:', error.message);
      }
    } catch (e) {
      console.warn('Exception saving curated ranking to Supabase:', e);
    }
  }

  setLocal(STORAGE_CURATED_RANKING, cleanRanking);

  // Dispatch custom window event so home page and all views update in real time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pca_curated_ranking_updated', {
        detail: { ranking: cleanRanking },
      })
    );
  }

  return cleanRanking;
}

/**
 * Ensures each character appears at most once in Top 1, Top 2, Top 3.
 */
export function sanitizeCuratedRanking(ranking: CuratedRanking): CuratedRanking {
  let top1 = ranking.top1_id || null;
  let top2 = ranking.top2_id || null;
  let top3 = ranking.top3_id || null;

  if (top2 && top2 === top1) top2 = null;
  if (top3 && (top3 === top1 || top3 === top2)) top3 = null;

  return {
    top1_id: top1,
    top2_id: top2,
    top3_id: top3,
  };
}

/**
 * Smart assignment helper: assigns charId to target position (1, 2, or 3),
 * automatically swapping or clearing previous slots if charId was already ranked.
 */
export function assignCharacterToPosition(
  current: CuratedRanking,
  charId: string | null,
  targetPosition: 1 | 2 | 3
): CuratedRanking {
  const next: CuratedRanking = { ...current };

  // If target is clearing the slot
  if (!charId) {
    if (targetPosition === 1) next.top1_id = null;
    if (targetPosition === 2) next.top2_id = null;
    if (targetPosition === 3) next.top3_id = null;
    return sanitizeCuratedRanking(next);
  }

  // Find where charId is currently placed
  let currentPosOfChar: 1 | 2 | 3 | null = null;
  if (current.top1_id === charId) currentPosOfChar = 1;
  else if (current.top2_id === charId) currentPosOfChar = 2;
  else if (current.top3_id === charId) currentPosOfChar = 3;

  // What was in the target position before?
  const prevCharInTarget =
    targetPosition === 1
      ? current.top1_id
      : targetPosition === 2
      ? current.top2_id
      : current.top3_id;

  // Assign charId to target position
  if (targetPosition === 1) next.top1_id = charId;
  else if (targetPosition === 2) next.top2_id = charId;
  else if (targetPosition === 3) next.top3_id = charId;

  // Handle previous position of charId
  if (currentPosOfChar && currentPosOfChar !== targetPosition) {
    if (prevCharInTarget && prevCharInTarget !== charId) {
      // SWAP: Move previous occupant of target into charId's old position
      if (currentPosOfChar === 1) next.top1_id = prevCharInTarget;
      if (currentPosOfChar === 2) next.top2_id = prevCharInTarget;
      if (currentPosOfChar === 3) next.top3_id = prevCharInTarget;
    } else {
      // MOVE: Clear charId's old position
      if (currentPosOfChar === 1) next.top1_id = null;
      if (currentPosOfChar === 2) next.top2_id = null;
      if (currentPosOfChar === 3) next.top3_id = null;
    }
  }

  return sanitizeCuratedRanking(next);
}

/**
 * Computes ordered list of Top 1, Top 2, Top 3 ranked characters for UI display.
 */
export function computeCuratedRankingList(
  publishedCharacters: Character[],
  ranking: CuratedRanking
): CuratedRankedCharacter[] {
  const map = new Map<string, Character>();
  publishedCharacters.forEach((c) => map.set(c.id, c));

  const result: CuratedRankedCharacter[] = [];

  if (ranking.top1_id && map.has(ranking.top1_id)) {
    result.push({ rank: 1, character: map.get(ranking.top1_id)! });
  }

  if (ranking.top2_id && map.has(ranking.top2_id)) {
    result.push({ rank: 2, character: map.get(ranking.top2_id)! });
  }

  if (ranking.top3_id && map.has(ranking.top3_id)) {
    result.push({ rank: 3, character: map.get(ranking.top3_id)! });
  }

  return result;
}
