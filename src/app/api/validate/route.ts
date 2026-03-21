import { NextResponse } from 'next/server';
import { getSolution } from '@/lib/gameStore';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { ValidateRequest, ValidateResponse } from '@/types/sudoku';

export async function POST(request: Request) {
  try {
    const body: ValidateRequest = await request.json();
    const { gameId, row, col, value, currentBoard } = body;

    // 1. 基本參數檢查
    if (!gameId || typeof row !== 'number' || typeof col !== 'number' || typeof value !== 'number' || !Array.isArray(currentBoard)) {
      return NextResponse.json<ValidateResponse>(
        { isValid: false, error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // 2. 數獨規則檢查 (Rule Validation)
    let isRuleViolation = false;

    // 檢查列與行
    for (let i = 0; i < 9; i++) {
      if (i !== col && currentBoard[row][i] === value) isRuleViolation = true;
      if (i !== row && currentBoard[i][col] === value) isRuleViolation = true;
    }

    // 檢查 3x3 九宮格
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const r = startRow + i;
        const c = startCol + j;
        if ((r !== row || c !== col) && currentBoard[r][c] === value) {
          isRuleViolation = true;
        }
      }
    }

    // 如果違反規則 (重複數字)，直接回傳 isValid: false 並觸發處罰
    if (isRuleViolation) {
      return NextResponse.json<ValidateResponse>({
        isValid: false,
        isRuleViolation: true,
        isSolutionMatch: false
      });
    }

    // 3. 🛡️ 安全地取得 Cloudflare 環境變數
    let env;
    try {
      const context = await getCloudflareContext();
      env = context?.env;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.log("📡 [Local Dev] Validation: Cloudflare Context not found, using Mock Store.");
      }
    }

    // 4. 從 KV 或 Mock Store 抓取解答
    const solution = await getSolution(env?.GAME_STORE, gameId);

    if (!solution) {
      return NextResponse.json<ValidateResponse>(
        { isValid: false, error: 'Game session not found. Please restart the game.' },
        { status: 404 }
      );
    }

    // 5. 比對最終解答
    const isSolutionMatch = solution[row][col] === value;

    return NextResponse.json<ValidateResponse>({
      isValid: true,
      isRuleViolation: false,
      isSolutionMatch
    });

  } catch (error) {
    console.error("❌ [API Validate] Error:", error);
    return NextResponse.json<ValidateResponse>(
      { isValid: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}