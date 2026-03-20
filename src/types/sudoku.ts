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
}

/** Response indicating whether the player's move matches the solution. */
export interface ValidateResponse {
  /** `true` when `value` matches `solution[row][col]`. */
  isValid: boolean;

  /** Optional error description (e.g. malformed request). */
  error?: string;
}
