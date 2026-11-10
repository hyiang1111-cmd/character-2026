import { getSupabaseClient } from './supabase';
import { Character } from '../types/character';

const STORAGE_CHAT_OPENS_COUNTS = 'pca_character_chat_opens_counts';

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
 * Fetches total chat open counts for all characters (mapping character_id -> count)
 */
export async function getChatOpenCounts(): Promise<Record<string, number>> {
  const client = getSupabaseClient();
  if (client) {
    try {
      // 1. Try RPC get_character_chat_open_counts first
      const { data: rpcData, error: rpcErr } = await client.rpc('get_character_chat_open_counts');
      if (!rpcErr && Array.isArray(rpcData)) {
        const map: Record<string, number> = {};
        rpcData.forEach((row: any) => {
          map[row.character_id] = Number(row.total_chats) || 0;
        });
        setLocal(STORAGE_CHAT_OPENS_COUNTS, map);
        return map;
      }

      // 2. Direct select fallback from character_metrics
      const { data: metricsData, error: metricsErr } = await client
        .from('character_metrics')
        .select('character_id, chats_count');

      if (!metricsErr && Array.isArray(metricsData)) {
        const map: Record<string, number> = {};
        metricsData.forEach((row: any) => {
          map[row.character_id] = Number(row.chats_count) || 0;
        });
        setLocal(STORAGE_CHAT_OPENS_COUNTS, map);
        return map;
      }
    } catch (e) {
      console.warn('Failed to fetch chat open counts from Supabase:', e);
    }
  }

  return getLocal<Record<string, number>>(STORAGE_CHAT_OPENS_COUNTS, {});
}

/**
 * Atomically records a character chat open event with deduplication token p_event_id.
 */
export async function recordCharacterChatOpen(characterId: string): Promise<number> {
  if (!characterId) return 0;

  const eventId = `chat_open_${characterId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const client = getSupabaseClient();
  let totalChats = 0;
  let handledBySupabase = false;

  if (client) {
    try {
      const { data: rpcRes, error: rpcErr } = await client.rpc('record_character_chat_open', {
        p_character_id: characterId,
        p_event_id: eventId,
      });

      if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
        handledBySupabase = true;
        totalChats = Number(rpcRes.total_chats) || 0;
      } else if (rpcErr) {
        console.warn('RPC record_character_chat_open notice:', rpcErr.message);
      }
    } catch (e) {
      console.warn('RPC record_character_chat_open exception:', e);
    }
  }

  const countsMap = getLocal<Record<string, number>>(STORAGE_CHAT_OPENS_COUNTS, {});

  if (!handledBySupabase) {
    countsMap[characterId] = (countsMap[characterId] || 0) + 1;
    totalChats = countsMap[characterId];
  } else {
    countsMap[characterId] = totalChats;
  }

  setLocal(STORAGE_CHAT_OPENS_COUNTS, countsMap);

  // Dispatch custom window event so all UI components update in real time
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('pca_chat_opens_updated', {
        detail: { characterId, totalChats },
      })
    );
  }

  return totalChats;
}

export interface ChatOpensRankedCharacter {
  rank: number;
  character: Character;
  totalChats: number;
}

/**
 * Computes Chat Opens (🔥) leaderboard ranking list
 */
export function computeChatOpensRankingList(
  publishedCharacters: Character[],
  chatCounts: Record<string, number>
): ChatOpensRankedCharacter[] {
  const eligible = publishedCharacters.map((char) => ({
    character: char,
    totalChats: Number(chatCounts[char.id]) || 0,
  }));

  eligible.sort((a, b) => {
    if (b.totalChats !== a.totalChats) {
      return b.totalChats - a.totalChats;
    }
    return (b.character.createdAt || 0) - (a.character.createdAt || 0);
  });

  return eligible.slice(0, 10).map((item, index) => ({
    rank: index + 1,
    character: item.character,
    totalChats: item.totalChats,
  }));
}
