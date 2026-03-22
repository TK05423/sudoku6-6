import { NextResponse } from 'next/server';
import { generateSolvedGrid, createPuzzle } from '@/lib/sudokuManager';
import { saveGame } from '@/lib/gameStore';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Difficulty, PuzzleResponse } from '@/types/sudoku';

// 處理取得新題目的 API 請求 (非同步 Async 函式)
export async function GET(request: Request) {
  try {
    // 1. 解析難度設定：從 URL 參數提取難度並給予預設值，避免前端傳入非預期格式導致邏輯錯誤
    const url = new URL(request.url);
    const difficultyParam = url.searchParams.get('difficulty');

    const difficulty: Difficulty =
      difficultyParam === 'easy' || difficultyParam === 'medium' || difficultyParam === 'hard'
        ? difficultyParam
        : 'medium';

    // 2. 產出數獨題目：先產出完整解答，再依據難度挖空產生題目
    // generateSolvedGrid 內部會使用 Backtracking (嘗試填入數字，若失敗則退回上一步重新嘗試) 來生成合法解答
    const solution = generateSolvedGrid();
    const puzzle = createPuzzle(solution, difficulty);
    const gameId = crypto.randomUUID(); // 產生唯一識別碼，用來將玩家與當局解答綁定

    // 3. 🛡️ 環境變數安全檢查：嘗試取得 Cloudflare 環境變數 (Env Vars)
    // 目的：確保在本地開發 (Node.js) 與部署環境 (Cloudflare Workers) 都能正常運作，避免因找不到環境變數而 Crash
    let env;
    try {
      // getCloudflareContext 在非 Cloudflare 環境下可能會拋出例外
      const context = await getCloudflareContext();
      env = context?.env;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.log("📡 [Local Dev] Cloudflare Context not found, using Mock Store.");
      }
    }

    // 4. 儲存遊戲解答：將該局的解答存入後端，防止作弊
    // GAME_STORE 是串接 Cloudflare KV (跨請求的資料儲存空間，用來存放每一局的正確答案)。
    // 若 env?.GAME_STORE 不存在，saveGame 會降級使用本地的 Map (記憶體) 儲存，提升開發體驗
    await saveGame(env?.GAME_STORE, gameId, solution);

    // 5. 回傳結果：將生成的題目資訊回傳給前端，以便初始化遊戲畫面
    // 面試防呆：只將「題目(puzzle)」與「gameId」傳給前端，絕不回傳完整解答(solution)以確保遊戲公平性
    const responseBody: PuzzleResponse = {
      gameId,
      puzzle,
      difficulty,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    // 面試防呆：捕捉所有未知的後端錯誤，回傳 500 與明確內容給前端，避免前端因 parse 錯誤而出現未預期的 Failed to fetch 導致破圖
    console.error("❌ [API Puzzle] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}