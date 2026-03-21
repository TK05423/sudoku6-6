import { NextResponse } from 'next/server';
import { generateSolvedGrid, createPuzzle } from '@/lib/sudokuManager';
import { saveGame } from '@/lib/gameStore';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Difficulty, PuzzleResponse } from '@/types/sudoku';

export async function GET(request: Request) {
  try {
    // 1. 解析難度設定
    const url = new URL(request.url);
    const difficultyParam = url.searchParams.get('difficulty');

    const difficulty: Difficulty =
      difficultyParam === 'easy' || difficultyParam === 'medium' || difficultyParam === 'hard'
        ? difficultyParam
        : 'medium';

    // 2. 產出數獨題目
    const solution = generateSolvedGrid();
    const puzzle = createPuzzle(solution, difficulty);
    const gameId = crypto.randomUUID();

    // 3. 🛡️ 安全地取得 Cloudflare 環境變數
    let env;
    try {
      // 在本地開發環境中，這行可能會拋出錯誤或回傳空值
      const context = await getCloudflareContext();
      env = context?.env;
    } catch (e) {
      // 僅在本地開發時印出，方便除錯
      if (process.env.NODE_ENV === 'development') {
        console.log("📡 [Local Dev] Cloudflare Context not found, using Mock Store.");
      }
    }

    // 4. 儲存遊戲解答 (env?.GAME_STORE 若為 undefined，saveGame 會自動切換至本地 Map)
    await saveGame(env?.GAME_STORE, gameId, solution);

    // 5. 回傳結果
    const responseBody: PuzzleResponse = {
      gameId,
      puzzle,
      difficulty,
    };

    return NextResponse.json(responseBody);
  } catch (error) {
    // 捕捉所有未知的後端錯誤，避免前端直接 Failed to fetch
    console.error("❌ [API Puzzle] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}