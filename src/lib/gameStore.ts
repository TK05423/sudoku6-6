/**
 * KV-backed game store for Cloudflare Workers with Local Mock support.
 * * Supports both production (Cloudflare KV) and local development (In-memory Map).
 */

import { KVNamespace } from '@cloudflare/workers-types';

/** * 本地開發用的模擬存儲空間。
 * 當 kv 未定義時（例如 npm run dev），資料會暫存在這裡。
 */
const localMockStore = new Map<string, number[][]>();

/** Time-to-live for game sessions (2 hours in seconds). */
const SESSION_TTL_SECONDS = 2 * 60 * 60;

/**
 * Saves a game solution.
 *
 * @param kv       The KV namespace binding (optional for local dev).
 * @param gameId   Unique game identifier (UUID).
 * @param solution The full, solved 9×9 grid.
 */
export async function saveGame(
  kv: KVNamespace | undefined,
  gameId: string,
  solution: number[][],
): Promise<void> {
  if (!kv) {
    console.log(`📡 [Local Dev] Saving game ${gameId} to memory.`);
    localMockStore.set(gameId, solution);
    return;
  }

  await kv.put(gameId, JSON.stringify(solution), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

/**
 * Retrieves a game solution.
 *
 * @param kv     The KV namespace binding (optional for local dev).
 * @param gameId Unique game identifier (UUID).
 * @returns      The solved grid, or `null` if not found / expired.
 */
export async function getSolution(
  kv: KVNamespace | undefined,
  gameId: string,
): Promise<number[][] | null> {
  if (!kv) {
    console.log(`📡 [Local Dev] Retrieving game ${gameId} from memory.`);
    const mockData = localMockStore.get(gameId);
    return mockData || null;
  }

  return kv.get<number[][]>(gameId, { type: 'json' });
}