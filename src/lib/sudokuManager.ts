/**
 * SudokuManager — 數獨核心引擎
 *
 * 這是一個純函數 (Pure Function) 模組，主要提供以下功能：
 *  1. 產生一個完整合法解答的 9×9 數獨盤面。
 *  2. 透過遞迴回溯法 (Recursive Backtracking) 解開任意合法的 9×9 盤面。
 *  3. 計算一個盤面有多少解 (帶有上限提早離開機制)，確保謎題唯一解。
 *  4. 依據難度挖空答案，產生可供遊玩的題目。
 *
 * 演算法概念 (Algorithm Overview)
 * ──────────────────────────
 * `generateSolvedGrid()` 採用了「對角線 3×3 預填優化 (Diagonal 3×3 pre-fill optimisation)」：
 *   • 盤面上左上、正中、右下三個 3×3 九宮格彼此完全獨立 (不會在同一行或列發生衝突)。
 *   • 因此我們可以先填滿這三個區塊，再用 Backtracking 把剩餘空位填完。
 *   • 目的：此優化大幅減少了單純從全空格開始做 Backtracking 帶來的窮舉範圍，提升產生效能。
 *
 * `createPuzzle()` 將格子打亂並逐一挖空：
 *   • 每次挖空後，立刻驗證該盤面是否依然只有「唯一解」。
 *   • 若出現多解，則將該格子填回。持續此過程直到符合目標難度所需的開局提示數 (Clues)。
 *
 * 注意：除非輔助函式中有特別註明需要更動內部暫存變數，這裡的所有對外匯出 (export) 函式
 * 都是不可變的 (Immutable)，避免去污染傳入的參數。
 */

import type { SudokuGrid, Difficulty } from '@/types/sudoku';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Grid dimension. */
const SIZE = 6;

/** Sub-box dimension (2×3). */
const BOX_ROWS = 2;
const BOX_COLS=3

/**
 * Clue counts per difficulty level.
 * More clues → easier puzzle.
 */
const CLUE_COUNTS: Record<Difficulty, number> = {
  easy: 18,
  medium: 14,
  hard:10,
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Fisher–Yates 洗牌演算法 (Shuffle)
 * 目的：回傳一個全新的隨機陣列拷貝 (避免修改到原始陣列)，
 * 用來隨機化填字順序與挖空順序，確保每次產生的數獨都不一樣。
 */
function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 進行深拷貝 (Deep-clone)。
 * 目的：確保產生題目的過程中（包含遞迴嘗試），針對盤面的任何 Mutate 都不會污染到原始傳入的 grid 資料。
 */
function cloneGrid(grid: SudokuGrid): SudokuGrid {
  return grid.map((row) => [...row]);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * 檢查目前欲填入的數字是否符合數獨「基本規則」(非解答比對)。
 * 規則定義：同列 (Row)、同行 (Col)、同一個 3×3 九宮格 內不得出現重複數字。
 *
 * @param grid  目前正在驗證的盤面 (可能是半完成狀態)
 * @param row   列索引 (0–8)
 * @param col   行索引 (0–8)
 * @param num   打算填入此格的測試數字 (1–9)
 * @returns 傳回 `true` 代表符合規則，可以暫時填入。
 */
function isValid(
  grid: SudokuGrid,
  row: number,
  col: number,
  num: number,
): boolean {
  // ── Row check ────────────────────────────────────────────────────────
  for (let c = 0; c < SIZE; c++) {
    if (grid[row][c] === num) return false;
  }

  // ── Column check ─────────────────────────────────────────────────────
  for (let r = 0; r < SIZE; r++) {
    if (grid[r][col] === num) return false;
  }

  // ── 2×3 box check ───────────────────────────────────────────────────
  const boxRowStart = row - (row % BOX_ROWS);
  const boxColStart = col - (col % BOX_COLS);
  for (let r = boxRowStart; r < boxRowStart + BOX_ROWS; r++) {
    for (let c = boxColStart; c < boxColStart + BOX_COLS; c++) {
      if (grid[r][c] === num) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Solver (backtracking)
// ---------------------------------------------------------------------------

/**
 * 回溯法 (Backtracking) 解題核心引擎。
 * 概念：嘗試遍歷 (Traverse) 所有空格，並嘗試填入數字。若卡關 (無合法數字可填)，則退回上一步重新嘗試。
 * 注意：這是一個 In-place 變更函式，會直接修改傳入的 grid。
 *
 * @param randomise 當為 `true` 時，填寫數字的嘗試順序會被打亂，確保產生的解答夠多樣。
 * @returns `true` 代表成功找到一組完整解答，並已套用於 grid 上。
 */
function solve(grid: SudokuGrid, randomise = false): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] !== null) continue; // 此格子已有數字，跳過處理

      // 產生候選數字陣列
      const digits = randomise
        ? shuffle([1, 2, 3, 4, 5, 6])
        : [1, 2, 3, 4, 5, 6];

      for (const num of digits) {
        if (isValid(grid, row, col, num)) {
          grid[row][col] = num; // 嘗試給定候選數字

          if (solve(grid, randomise)) return true; // 進入下一層遞迴 (Recursion)

          grid[row][col] = null; // 【關鍵】：若下方路徑不通 (return false)，將目前格子清空，也就是退回上一步 (Backtrack) 重新嘗試其它數字。
        }
      }

      // 【面試防呆總結】防呆機制：如果對於這個格子，1-9 都試過且無法繼續下去，
      // 代表「我們在更久以前的選擇是錯的」，所以直接 return false 觸發上層呼叫去清空再試。
      return false; 
    }
  }

  return true; // 所有格子都成功填滿，解題成功！
}

// ---------------------------------------------------------------------------
// Solution counter (uniqueness check)
// ---------------------------------------------------------------------------

/**
 * 計算指定盤面的合法解答數量，一旦達到 `limit` 就會提早中斷 (Early Exit)。
 *
 * 用途：在 `createPuzzle()` 挖空過程中被呼叫，用來確保移除某個格子後，
 * 盤面依然具備「唯一解」(只有 1 種可能)。若存在第二種解，代表題目出壞了。
 *
 * 注意：內部會暫時 Mutate `grid` 以進行運算，但會在 return 前透過回溯恢復原狀。
 *
 * @param grid  部分挖空的數獨盤面 (返回時會恢復原狀)。
 * @param limit 設定解答數量上限，通常設為 2 即可 (只要找到 2 種解就不合格，不需全部找完)。
 * @returns     找到的解答總數 (小於等於 `limit`)。
 */
function countSolutions(grid: SudokuGrid, limit = 2): number {
  // 尋找第一個空白格 (null)
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] !== null) continue;

      let count = 0;

      for (let num = 1; num <= SIZE; num++) {
        if (!isValid(grid, row, col, num)) continue;

        grid[row][col] = num;
        count += countSolutions(grid, limit - count);
        grid[row][col] = null; // 恢復原狀 (Restore)

        if (count >= limit) return count; // 【效能優化】提早中斷 (Early exit)：只要解答數超標，後續就沒有繼續窮舉的意義了
      }

      return count; // 這個格子能探索的所有分支已經跑完
    }
  }

  // 找不到任何空白格 → 代表找到一組完整的有效解答了
  return 1;
}

// ---------------------------------------------------------------------------
// Solved-grid generation
// ---------------------------------------------------------------------------

/**
 * 產生一個完整且正確的 9×9 數獨解答盤面。
 *
 * 【效能優化】對角線 3×3 預填優化 (Diagonal 3×3 pre-fill optimisation)：
 * 由於盤面上左上、正中、右下的三個九宮格，在列與行之間互相不影響，
 * 因此可直接幫它們填入 1–9 的隨機排列。
 * 這樣的做法預先填滿了 27 格，將能大幅剪枝 (Pruning) 隨後交給 Backtracking 處理時的窮舉樹。
 *
 * @returns 完整的 9×9 數字陣列 (無 null 空格)。
 */
export function generateSolvedGrid(): number[][] {
  // 建立一個初始的全空盤面
  const grid: SudokuGrid = Array.from({ length: SIZE }, () =>
    Array<number | null>(SIZE).fill(null),
  );

  // ── 填滿對角線的三個 3×3 九宮格 ────────────────────────────────
  
  // ── 利用 Backtracking 將剩下未填的格子補滿 ───────────────────────────────
  solve(grid, true);

  // 到此所有格子都應安全填滿，轉換型別 (強制斷言) 為純數字的二維陣列
  return grid as number[][];
}

// ---------------------------------------------------------------------------
// Puzzle creation (cell removal)
// ---------------------------------------------------------------------------

/**
 * 將完整解答盤面「隨機挖空」來建立玩家要挑戰的數獨題目。
 *
 * 演算法概念：
 *   1. 隨機決定要測試挖空的格子順序。
 *   2. 逐一嘗試將該格子設為 `null`。
 *   3. 每次挖空後，立刻呼叫 `countSolutions()` 確認盤面是否依然只有唯一解。
 *   4. 【防呆】如果挖空後出現多解，代表這個挖空破壞了題目的邏輯性，必須將原本的數字補回去。
 *   5. 直到留下的格子數量降至該難度設定的「開局提示數 (Clues)」為止。
 *
 * @param solution   完整解答盤面 (函式內會深拷貝，不會污染此參數)。
 * @param difficulty 遊戲難度 (決定目標開局提示數量)。
 * @returns          帶有 `null` 空格的題目盤面。
 */
export function createPuzzle(
  solution: number[][],
  difficulty: Difficulty = 'medium',
): SudokuGrid {
  const targetClues = CLUE_COUNTS[difficulty];
  const puzzle = cloneGrid(solution);

  // 建立所有 81 個座標點的列表，接著打亂順序 (洗牌)
  const positions: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions);

  let filledCount = SIZE * SIZE; // 總格數 81

  for (const [r, c] of shuffledPositions) {
    if (filledCount <= targetClues) break; // 已達到目標難度的提示數

    const backup = puzzle[r][c]; // 備份原始數字
    puzzle[r][c] = null; // 暫時挖空

    // 檢查挖空後是否維持唯一解 (limit 設為 2 即可提早發現錯誤)
    if (countSolutions(cloneGrid(puzzle), 2) !== 1) {
      puzzle[r][c] = backup; // 若非唯一解則復原 (Revert)
    } else {
      filledCount--;
    }
  }

  return puzzle;
}
