import { NextResponse } from 'next/server';
import { getSolution } from '@/lib/gameStore';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { ValidateRequest, ValidateResponse } from '@/types/sudoku';

// 處理玩家填寫數字時的驗證請求 (非同步 Async 函式)
export async function POST(request: Request) {
  try {
    // 解構 (Destructuring) 提取前端傳來的請求 Payload 內容
    const body: ValidateRequest = await request.json();
    const { gameId, row, col, value, currentBoard } = body;

    // 1. 基本參數檢查：防禦性編程，確保所有必要參數都存在且型別正確，避免後續邏輯發生 Runtime Error
    if (!gameId || typeof row !== 'number' || typeof col !== 'number' || typeof value !== 'number' || !Array.isArray(currentBoard)) {
      return NextResponse.json<ValidateResponse>(
        { isValid: false, error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    // 2. 數獨規則違規檢查 (Rule Validation)
    // 目的：區分「規則違規」(同列/行/九宮格有重複，前端應立刻提示不能填) 與「答案錯誤」(未重複但非正解，會走向死胡同) 的差異
    let isRuleViolation = false;

    // 遍歷 (Traverse) 檢查該數字所在的列 (Row) 與行 (Col) 是否已經存在相同數字
    for (let i = 0; i < 6; i++) {
      if (i !== col && currentBoard[row][i] === value) isRuleViolation = true;
      if (i !== row && currentBoard[i][col] === value) isRuleViolation = true;
    }

    // 遍歷檢查 2x3 6宮格：計算該格所屬九宮格的起始座標，並檢查九宮格內是否已有相同數字
    const startRow = Math.floor(row / 2) * 2;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        const r = startRow + i;
        const c = startCol + j;
        if ((r !== row || c !== col) && currentBoard[r][c] === value) {
          isRuleViolation = true;
        }
      }
    }

    // 面試防呆：若觸犯規則違規 (重複數字)，不需繼續向後端比對解答，提早回傳 (Early Return)
    // 將違規結果回傳給前端，以便觸發計時器處罰與畫面的錯誤提示
    if (isRuleViolation) {
      return NextResponse.json<ValidateResponse>({
        isValid: false,
        isRuleViolation: true,
        isSolutionMatch: false
      });
    }

    // 3. 🛡️ 環境變數安全檢查：嘗試取得 Cloudflare 環境變數 (Env Vars)
    // 目的：確保在執行環境切換時 (例如從 Local 換到 Production)，API 不會因為讀不到 Context 而全面崩潰導致 500 錯誤
    let env;
    try {
      const context = await getCloudflareContext();
      env = context?.env;
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.log("📡 [Local Dev] Validation: Cloudflare Context not found, using Mock Store.");
      }
    }

    // 4. 取得該局正確解答：從 Cloudflare KV (跨請求的資料儲存空間) 取出當局答案來進行最終比對
    const solution = await getSolution(env?.GAME_STORE, gameId);

    // 處理找不到遊戲階段的極端情況 (可能 KV 裡的資料過期或因故被清除)
    if (!solution) {
      return NextResponse.json<ValidateResponse>(
        { isValid: false, error: 'Game session not found. Please restart the game.' },
        { status: 404 }
      );
    }

    // 5. 答案正確性比對 (Solution Match)：即使符合基礎規則，也要比對是否與我們生成的最終解答相同
    // 確保玩家就算沒違反規則，也能靠這個狀態讓前端決定是否要給予特定的視覺反饋或判斷通關
    const isSolutionMatch = solution[row][col] === value;

    // 將驗證結果回傳給前端，以便更新格子狀態與確認進度
    return NextResponse.json<ValidateResponse>({
      isValid: true,
      isRuleViolation: false,
      isSolutionMatch
    });

  } catch (error) {
    // 統整錯誤處理，確保無論發生什麼意外，後端都不會掛掉或吐出敏感除錯資訊給前端
    console.error("❌ [API Validate] Error:", error);
    return NextResponse.json<ValidateResponse>(
      { isValid: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}