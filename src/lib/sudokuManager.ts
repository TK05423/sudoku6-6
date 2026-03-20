/**
 * SudokuManager — Core puzzle engine.
 *
 * Provides functions to:
 *  1. Generate a fully-solved, valid 9×9 Sudoku grid.
 *  2. Solve any 9×9 grid via recursive backtracking.
 *  3. Count solutions (with an early-exit limit) to verify uniqueness.
 *  4. Create a playable puzzle by removing cells from a solved grid
 *     while guaranteeing a unique solution.
 *
 * Algorithm overview
 * ──────────────────
 * `generateSolvedGrid()` uses a **diagonal 3×3 pre-fill optimisation**:
 *   • The three diagonal 3×3 boxes (top-left, centre, bottom-right) are
 *     mutually independent — no row or column overlaps between them.
 *   • We fill each diagonal box with a random permutation of 1–9.
 *   • The remaining cells are then completed with classic backtracking.
 *   This dramatically reduces the backtracking search space compared to
 *   filling from an entirely empty grid.
 *
 * `createPuzzle()` removes cells one at a time (in a random order) and
 * after each removal checks that the puzzle still has exactly one
 * solution.  It stops when the target number of **clues** is reached.
 * The clue count is determined by the requested `Difficulty`.
 *
 * All functions are **pure** (they do not mutate their arguments) unless
 * noted otherwise (the internal helpers mutate a working copy).
 */

import type { SudokuGrid, Difficulty } from '@/types/sudoku';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Grid dimension. */
const SIZE = 9;

/** Sub-box dimension (3×3). */
const BOX = 3;

/**
 * Clue counts per difficulty level.
 * More clues → easier puzzle.
 */
const CLUE_COUNTS: Record<Difficulty, number> = {
  easy: 40,
  medium: 32,
  hard: 25,
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Fisher–Yates shuffle — returns a **new** shuffled copy of `arr`.
 * Used to randomise digit order and cell removal order.
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
 * Deep-clone a 9×9 grid so mutations do not affect the original.
 */
function cloneGrid(grid: SudokuGrid): SudokuGrid {
  return grid.map((row) => [...row]);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

/**
 * Check whether placing `num` at `(row, col)` is legal according to
 * standard Sudoku rules (no duplicate in row, column, or 3×3 box).
 *
 * @param grid  The current (possibly partial) grid.
 * @param row   Row index   (0–8).
 * @param col   Column index (0–8).
 * @param num   Digit to test (1–9).
 * @returns `true` if the placement is valid.
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

  // ── 3×3 box check ───────────────────────────────────────────────────
  const boxRowStart = row - (row % BOX);
  const boxColStart = col - (col % BOX);
  for (let r = boxRowStart; r < boxRowStart + BOX; r++) {
    for (let c = boxColStart; c < boxColStart + BOX; c++) {
      if (grid[r][c] === num) return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Solver (backtracking)
// ---------------------------------------------------------------------------

/**
 * Solve the grid **in place** using recursive backtracking.
 *
 * When `randomise` is `true`, digit candidates are shuffled so that
 * the first solution found is random — used during generation.
 *
 * @returns `true` when a valid solution has been found and applied.
 */
function solve(grid: SudokuGrid, randomise = false): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] !== null) continue; // cell already filled

      // Try each candidate digit.
      const digits = randomise
        ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
        : [1, 2, 3, 4, 5, 6, 7, 8, 9];

      for (const num of digits) {
        if (isValid(grid, row, col, num)) {
          grid[row][col] = num; // place candidate

          if (solve(grid, randomise)) return true; // recurse

          grid[row][col] = null; // backtrack
        }
      }

      return false; // no valid digit → backtrack to caller
    }
  }

  return true; // all cells filled → solved!
}

// ---------------------------------------------------------------------------
// Solution counter (uniqueness check)
// ---------------------------------------------------------------------------

/**
 * Count the number of valid solutions for `grid`, stopping early once
 * the count reaches `limit`.
 *
 * Used by `createPuzzle()` to ensure that removing a cell does not
 * introduce a second solution (uniqueness guarantee).
 *
 * The grid is **mutated** internally but restored by backtracking.
 *
 * @param grid  The (partial) puzzle grid — will be restored on return.
 * @param limit Stop counting once this many solutions are found.
 * @returns     Number of solutions found (≤ `limit`).
 */
function countSolutions(grid: SudokuGrid, limit = 2): number {
  // Find the first empty cell.
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (grid[row][col] !== null) continue;

      let count = 0;

      for (let num = 1; num <= SIZE; num++) {
        if (!isValid(grid, row, col, num)) continue;

        grid[row][col] = num;
        count += countSolutions(grid, limit - count);
        grid[row][col] = null; // restore

        if (count >= limit) return count; // early exit
      }

      return count; // exhausted all digits for this cell
    }
  }

  // No empty cells found → this is a complete, valid solution.
  return 1;
}

// ---------------------------------------------------------------------------
// Solved-grid generation
// ---------------------------------------------------------------------------

/**
 * Generate a fully-solved 9×9 Sudoku grid.
 *
 * **Diagonal 3×3 pre-fill optimisation:**
 * The three diagonal boxes (indices 0,0 / 3,3 / 6,6) share no rows
 * or columns, so they can each be filled independently with a random
 * permutation of 1–9.  This pre-fills 27 cells and massively prunes
 * the remaining backtracking search.
 *
 * @returns A complete 9×9 grid of numbers 1–9 (no nulls).
 */
export function generateSolvedGrid(): number[][] {
  // Start with an empty grid.
  const grid: SudokuGrid = Array.from({ length: SIZE }, () =>
    Array<number | null>(SIZE).fill(null),
  );

  // ── Fill the three diagonal 3×3 boxes ────────────────────────────────
  for (let box = 0; box < SIZE; box += BOX) {
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let idx = 0;
    for (let r = box; r < box + BOX; r++) {
      for (let c = box; c < box + BOX; c++) {
        grid[r][c] = digits[idx++];
      }
    }
  }

  // ── Backtrack-fill the remaining cells ───────────────────────────────
  solve(grid, true);

  // At this point every cell is filled; cast to number[][].
  return grid as number[][];
}

// ---------------------------------------------------------------------------
// Puzzle creation (cell removal)
// ---------------------------------------------------------------------------

/**
 * Create a playable puzzle by removing cells from a solved grid.
 *
 * Cells are removed one-by-one in a random order.  After each removal
 * the puzzle is checked with `countSolutions()` to ensure it still has
 * exactly **one** solution.  If a removal would create multiple
 * solutions, it is reverted.
 *
 * The process stops when the number of remaining filled cells (clues)
 * matches the target for the requested difficulty.
 *
 * @param solution   A fully-solved 9×9 grid (will NOT be mutated).
 * @param difficulty Determines the target clue count.
 * @returns          A puzzle grid with `null` for removed cells.
 */
export function createPuzzle(
  solution: number[][],
  difficulty: Difficulty = 'medium',
): SudokuGrid {
  const targetClues = CLUE_COUNTS[difficulty];
  const puzzle = cloneGrid(solution);

  // Build a list of all 81 cell positions and randomise the order.
  const positions: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      positions.push([r, c]);
    }
  }
  const shuffledPositions = shuffle(positions);

  let filledCount = SIZE * SIZE; // 81

  for (const [r, c] of shuffledPositions) {
    if (filledCount <= targetClues) break; // reached target

    const backup = puzzle[r][c]; // save cell value
    puzzle[r][c] = null; // tentatively remove

    // Check uniqueness (stop counting at 2).
    if (countSolutions(cloneGrid(puzzle), 2) !== 1) {
      puzzle[r][c] = backup; // revert — removal breaks uniqueness
    } else {
      filledCount--;
    }
  }

  return puzzle;
}
