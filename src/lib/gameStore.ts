/**
 * Cloudflare KV 與本地 Mock 的混合儲存層 (Game Store)。
 * 
 * 目的：Cloudflare Workers 無法在不同請求間透過全域變數保留狀態 (State)，
 * 因此導入 Cloudflare KV 做為跨請求的資料儲存空間，用來存放每一局的正確答案。
 * 這麼做能確保即使在 Edge Runtime 分散式架構下，驗證邏輯也能取得一致的解答，
 * 且答案不會暴露給前端，避免作弊。
 * 
 * 同時支援環境變數 (Env Vars) 未綁定時，自動降級至本地的 Mock 儲存，提升開發體驗。
 */

import { KVNamespace } from '@cloudflare/workers-types';

/**
 * 本地開發用的模擬存儲空間 (In-memory Map)。
 * 目的：當 `KVNamespace` 未被定義時（例如在 local 執行 `npm run dev`），
 * 遊戲解答會暫存在這裡，讓開發與測試不被雲端資源綁死。
 */
const localMockStore = new Map<string, number[][]>();

/** 遊戲 Session 的存活時間 (TTL, Time-to-Live)，預設為兩小時 (單位：秒)。 */
const SESSION_TTL_SECONDS = 2 * 60 * 60;

/**
 * 非同步 (Async) 儲存遊戲解答到 KV 或 Mock Store。
 * 
 * @param kv       Cloudflare 的 KV 綁定物件 (可能為 undefined 以支援本機開發)。
 * @param gameId   唯一組局識別碼 (UUID)，作為存取的 Key。
 * @param solution 完整的 9x9 正確解答陣列。
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
 * 非同步 (Async) 從 KV 或 Mock Store 中取得對應遊戲的正確解答。
 * 
 * @param kv       Cloudflare 的 KV 綁定物件。
 * @param gameId   前端發送請求時夾帶的組局識別碼 (UUID)。
 * @returns        回傳解構過後的解答陣列；若過期或找不到則回傳 `null`。
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