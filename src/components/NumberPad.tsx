import type { SudokuGrid } from '@/types/sudoku';

interface NumberPadProps {
  onNumberClick: (num: number) => void;
  onErase: () => void;
  disabled?: boolean;
  /** Pass the current grid to dynamically calculate how many of each number are used (optional extra polish) */
  currentGrid?: SudokuGrid;
}

export function NumberPad({ onNumberClick, onErase, disabled, currentGrid }: NumberPadProps) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // Helper to count occurrences of a digit on the board.
  // 9 max, so if count is 9, the number is completely placed.
  const getDigitCount = (num: number) => {
    if (!currentGrid) return 0;
    let count = 0;
    for (const row of currentGrid) {
      for (const cell of row) {
        if (cell === num) count++;
      }
    }
    return count;
  };

  return (
    <div className="grid grid-cols-5 gap-2 w-full max-w-[350px] mx-auto select-none">
      {digits.map((num) => {
        const count = getDigitCount(num);
        const isComplete = count >= 9;

        return (
          <button
            key={num}
            disabled={disabled || isComplete}
            onClick={() => onNumberClick(num)}
            className={`
              relative flex flex-col items-center justify-center p-3 rounded-xl text-2xl font-semibold transition-all
              ${isComplete
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-default'
                : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm hover:shadow hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95'}
              border border-slate-200 dark:border-slate-600
            `}
            aria-label={`Enter number ${num}`}
          >
            {num}
            {/* Small indicator dot if fully placed */}
            {isComplete && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />}
          </button>
        );
      })}

      {/* Erase Button spanning 2 cols */}
      <button
        disabled={disabled}
        onClick={onErase}
        className="col-span-1 flex items-center justify-center p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 active:scale-95 transition-all outline outline-1 outline-red-200 dark:outline-red-800/30 font-semibold text-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Erase cell"
      >
        {/* Simple erase icon (SVG) */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 shrink-0">
          <path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z" />
          <line x1="18" y1="9" x2="12" y2="15" />
          <line x1="12" y1="9" x2="18" y2="15" />
        </svg>
      </button>
    </div>
  );
}
