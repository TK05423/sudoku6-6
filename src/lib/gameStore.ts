/**
 * KV-backed game store for Cloudflare Workers.
 *
 * Each game session's solution is stored in Cloudflare KV
 * keyed by its `gameId` (UUID) with a 2-hour TTL.
 *
 * This replaces the previous in-memory Map, which cannot
 * persist across Worker isolates on Cloudflare.
 */

/** Time-to-live for game sessions (2 hours in seconds). */
const SESSION_TTL_SECONDS = 2 * 60 * 60;

/**
 * Saves a game solution to KV.
 *
 * @param kv       The KV namespace binding (`env.GAME_STORE`).
 * @param gameId   Unique game identifier (UUID).
 * @param solution The full, solved 9×9 grid.
 */
export async function saveGame(
  kv: KVNamespace,
  gameId: string,
  solution: number[][],
): Promise<void> {
  await kv.put(gameId, JSON.stringify(solution), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

/**
 * Retrieves a game solution from KV.
 *
 * @param kv     The KV namespace binding (`env.GAME_STORE`).
 * @param gameId Unique game identifier (UUID).
 * @returns      The solved grid, or `null` if not found / expired.
 */
export async function getSolution(
  kv: KVNamespace,
  gameId: string,
): Promise<number[][] | null> {
  return kv.get<number[][]>(gameId, { type: 'json' });
}
