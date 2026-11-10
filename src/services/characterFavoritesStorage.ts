import { getSupabaseClient } from './supabase';
import { Character } from '../types/character';

const STORAGE_FAVORITES_COUNTS = 'pca_character_favorites_counts';
const STORAGE_USER_FAVORITES = 'pca_user_favorites_list';

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
  * Fetches total favorite counts for all characters (mapping character_id -> count)
  */
export async function getAllFavoriteCounts(): Promise<Record<string, number>> {
  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Try RPC first
      const { data: rpcData, error: rpcErr } = await client.rpc('get_character_favorite_counts');
      if (!rpcErr && Array.isArray(rpcData)) {
        const map: Record<string, number> = {};
        rpcData.forEach((row: any) => {
          map[row.character_id] = Number(row.total_favorites) || 0;
        });
        setLocal(STORAGE_FAVORITES_COUNTS, map);
        return map;
      }

      // 2. Direct select fallback
      const { data: directData, error: directErr } = await client
        .from('character_favorites')
        .select('character_id');

      if (!directErr && Array.isArray(directData)) {
        const map: Record<string, number> = {};
        directData.forEach((row: any) => {
          map[row.character_id] = (map[row.character_id] || 0) + 1;
        });
        setLocal(STORAGE_FAVORITES_COUNTS, map);
        return map;
      }
    } catch (e) {
      console.warn('Failed to fetch favorite counts from Supabase:', e);
    }
  }

  return getLocal<Record<string, number>>(STORAGE_FAVORITES_COUNTS, {});
}

/**
  * Fetches list of character_ids favorited by the current logged-in user
  */
export async function getUserFavorites(userId?: string): Promise<string[]> {
  if (!userId) return [];

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('character_favorites')
        .select('character_id')
        .eq('user_id', userId);

      if (!error && Array.isArray(data)) {
        const list = data.map((d: any) => d.character_id);
        setLocal(`${STORAGE_USER_FAVORITES}_${userId}`, list);
        return list;
      }
    } catch (e) {
      console.warn('Failed to fetch user favorites from Supabase:', e);
    }
  }

  return getLocal<string[]>(`${STORAGE_USER_FAVORITES}_${userId}`, []);
}

/**
  * Toggles favorite status for a character and updates Supabase + local state
  */
export async function toggleCharacterFavorite(
  characterId: string,
  userId: string
): Promise<{ isFavorited: boolean; totalFavorites: number }> {
  if (!userId) {
    throw new Error('Bạn cần đăng nhập để thực hiện yêu thích nhân vật.');
  }

  const client = getSupabaseClient();
  let isFavorited = false;
  let totalFavorites = 0;
  let handledBySupabase = false;

  if (client) {
    // 1. Try atomic server RPC
    try {
      const { data: rpcRes, error: rpcErr } = await client.rpc('toggle_character_favorite', {
        p_character_id: characterId,
      });

      if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
        handledBySupabase = true;
        isFavorited = Boolean(rpcRes.is_favorited);
        totalFavorites = Number(rpcRes.total_favorites) || 0;
      } else if (rpcErr) {
        console.warn('RPC toggle_character_favorite notice, trying direct table operations:', rpcErr.message);
      }
    } catch (rpcEx) {
      console.warn('RPC toggle_character_favorite exception:', rpcEx);
    }

    // 2. Direct table fallback if RPC wasn't executed
    if (!handledBySupabase) {
      try {
        const { data: existing } = await client
          .from('character_favorites')
          .select('character_id')
          .eq('character_id', characterId)
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          await client.from('character_favorites').delete().eq('character_id', characterId).eq('user_id', userId);
          isFavorited = false;
        } else {
          await client.from('character_favorites').insert([{ character_id: characterId, user_id: userId }]);
          isFavorited = true;
        }

        // Count new total
        const { count } = await client
          .from('character_favorites')
          .select('*', { count: 'exact', head: true })
          .eq('character_id', characterId);

        totalFavorites = count || 0;
        handledBySupabase = true;
      } catch (e) {
        console.warn('Failed to toggle favorite directly in Supabase:', e);
      }
    }
  }

  // Update local caches
  const countsMap = getLocal<Record<string, number>>(STORAGE_FAVORITES_COUNTS, {});
  if (!handledBySupabase) {
    const userFavs = getLocal<string[]>(`${STORAGE_USER_FAVORITES}_${userId}`, []);
    if (userFavs.includes(characterId)) {
      isFavorited = false;
      countsMap[characterId] = Math.max(0, (countsMap[characterId] || 1) - 1);
      setLocal(`${STORAGE_USER_FAVORITES}_${userId}`, userFavs.filter((id) => id !== characterId));
    } else {
      isFavorited = true;
      countsMap[characterId] = (countsMap[characterId] || 0) + 1;
      userFavs.push(characterId);
      setLocal(`${STORAGE_USER_FAVORITES}_${userId}`, userFavs);
    }
    totalFavorites = countsMap[characterId];
  } else {
    countsMap[characterId] = totalFavorites;
    const userFavs = getLocal<string[]>(`${STORAGE_USER_FAVORITES}_${userId}`, []);
    if (isFavorited && !userFavs.includes(characterId)) {
      userFavs.push(characterId);
    } else if (!isFavorited) {
      const idx = userFavs.indexOf(characterId);
      if (idx >= 0) userFavs.splice(idx, 1);
    }
    setLocal(`${STORAGE_USER_FAVORITES}_${userId}`, userFavs);
  }

  setLocal(STORAGE_FAVORITES_COUNTS, countsMap);

  // Dispatch custom window event so UI auto-updates in real-time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pca_favorites_updated', {
        detail: { characterId, isFavorited, totalFavorites, userId },
      })
    );
  }

  return { isFavorited, totalFavorites };
}

export interface FavoriteRankedCharacter {
  rank: number;
  character: Character;
  totalFavorites: number;
}

/**
  * Computes favorite-based leaderboard ranking
  */
export function computeFavoriteRankingList(
  publishedCharacters: Character[],
  favoriteCounts: Record<string, number>
): FavoriteRankedCharacter[] {
  const eligible = publishedCharacters.map((char) => ({
    character: char,
    totalFavorites: Number(favoriteCounts[char.id]) || 0,
  }));

  eligible.sort((a, b) => {
    if (b.totalFavorites !== a.totalFavorites) {
      return b.totalFavorites - a.totalFavorites;
    }
    return (b.character.createdAt || 0) - (a.character.createdAt || 0);
  });

  return eligible.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    character: item.character,
    totalFavorites: item.totalFavorites,
  }));
}
