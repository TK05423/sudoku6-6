/**
 * Shared type definitions for the Sudoku application.
 *
 * These types are used by both server-side API routes and
 * client-side components to ensure type-safe communication.
 */

// ---------------------------------------------------------------------------
// Grid Types
// ---------------------------------------------------------------------------

/**
 * A 9×9 Sudoku grid.
 * `null` represents an empty (unfilled) cell.
 * Numbers 1–9 represent filled cells.
 */
export type SudokuGrid = (number | null)[][];

/** Difficulty presets that map to different clue counts. */
export type Difficulty = 'easy' | 'medium' | 'hard';

// ---------------------------------------------------------------------------
// API: GET /api/puzzle
// ---------------------------------------------------------------------------

/** Response returned when a new puzzle is generated. */
export interface PuzzleResponse {
  /** Unique identifier for this game session (UUID). */
  gameId: string;

  /** 9×9 grid with `null` for empty cells — solution is NEVER sent. */
  puzzle: SudokuGrid;

  /** The difficulty level used to generate this puzzle. */
  difficulty: Difficulty;
}

// ---------------------------------------------------------------------------
// API: POST /api/validate
// ---------------------------------------------------------------------------

/** Request body for validating a single move. */
export interface ValidateRequest {
  /** Game session identifier returned by GET /api/puzzle. */
  gameId: string;

  /** Row index (0–8) of the cell being validated. */
  row: number;

  /** Column index (0–8) of the cell being validated. */
  col: number;

  /** The number (1–9) the player entered. */
  value: number;

  /** The current state of the board, used to check for rule violations. */
  currentBoard: SudokuGrid;
}

/** 
 * 玩家動作的驗證結果回傳格式。
 * 將驗證結果明確解構 (Destructuring) 以讓前端精準判斷應如何更新 UI 狀態（例如：觸發計時器懲罰或標示為正確）。
 */
export interface ValidateResponse {
  /** 
   * `true` 代表此步操作在目前的盤面上是合法的（沒有違反基本規則）。
   * 目的：區分「暫時看起來沒錯的嘗試」與「絕對違規的錯誤」。合法不代表是最終正確答案。
   */
  isValid: boolean;

  /** 
   * `true` 代表違反數獨基本規則（同格、同列、或同九宮格內出現重複數字）。
   * 目的：做為前端觸發懲罰機制 (Penalty, 例如增加 30 秒) 的唯一判斷標準。
   */
  isRuleViolation?: boolean;

  /** 
   * `true` 代表這步不僅符合規則，且與存放於 KV 內的最終完整解答完全一致。
   * 目的：用來推進遊戲勝利條件，確認玩家確實找出了唯一解。
   */
  isSolutionMatch?: boolean;

  /** 執行過程中的例外錯誤訊息 (例如：環境變數或是 API 參數傳遞錯誤)。 */
  error?: string;
}
