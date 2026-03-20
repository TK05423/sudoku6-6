import type { SudokuGrid } from '@/types/sudoku';

export interface Position {
  row: number;
  col: number;
}

interface SudokuBoardProps {
  /** The current state of the 9x9 board */
  grid: SudokuGrid;
  /** The original puzzle (null for empty cells, numbers for given clues) */
  initialGrid: SudokuGrid;
  /** the 0-indexed coords of the selected cell */
  selectedCell: Position | null;
  /** Event triggered when a cell is clicked */
  onCellSelect: (pos: Position) => void;
  /** If > 0, the board will show a red error flash animation */
  errorFlashKey: number; 
}

export function SudokuBoard({
  grid,
  initialGrid,
  selectedCell,
  onCellSelect,
  errorFlashKey,
}: SudokuBoardProps) {
  
  // Calculate highlighted cells based on selection
  const selectedNum = selectedCell ? grid[selectedCell.row][selectedCell.col] : null;

  const isRelated = (r: number, c: number) => {
    if (!selectedCell) return false;
    const sameRow = r === selectedCell.row;
    const sameCol = c === selectedCell.col;
    const sameBox = 
      Math.floor(r / 3) === Math.floor(selectedCell.row / 3) &&
      Math.floor(c / 3) === Math.floor(selectedCell.col / 3);
    
    return sameRow || sameCol || sameBox;
  };

  return (
    <div className="w-full max-w-[450px] aspect-square mx-auto sm:p-2">
      {/* 
        Error flash wrapper. Re-triggers animation when `errorFlashKey` changes.
        We use `animate-error-pulse` which will be defined in globals.css.
      */}
      <div 
        key={errorFlashKey}
        className={`w-full h-full bg-slate-900 border-2 sm:border-4 border-slate-800 shadow-xl overflow-hidden
          ${errorFlashKey > 0 ? 'animate-[pulse_0.4s_ease-in-out_2_alternate] border-red-500' : ''}`}
      >
        <div className="grid grid-cols-9 grid-rows-9 h-full w-full">
          {grid.map((rowArr, rowIndex) =>
            rowArr.map((cellValue, colIndex) => {
              // Status booleans
              const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
              const isInitial = initialGrid[rowIndex][colIndex] !== null;
              const isSameNumber = cellValue !== null && cellValue === selectedNum && !isSelected;
              const related = !isSelected && isRelated(rowIndex, colIndex);

              // ── Dynamic Border Styling ─────────────────────────────────────
              // Thicker borders every 3 cells to distinguish 3x3 boxes.
              const borderClasses = `
                border-slate-300 dark:border-slate-700
                ${colIndex % 3 === 2 && colIndex !== 8 ? 'border-r-2 sm:border-r-4 border-r-slate-800 dark:border-r-slate-900' : 'border-r'}
                ${rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-b-2 sm:border-b-4 border-b-slate-800 dark:border-b-slate-900' : 'border-b'}
              `;

              // ── Dynamic Background Styling ─────────────────────────────────
              let bgClass = 'bg-white dark:bg-slate-800'; // default
              if (isSelected) {
                bgClass = 'bg-blue-200 dark:bg-blue-600'; // hard highlight
              } else if (isSameNumber) {
                bgClass = 'bg-blue-100 dark:bg-blue-800/60'; // soft highlight matching digits
              } else if (related) {
                bgClass = 'bg-slate-100 dark:bg-slate-700/60'; // crosshair highlight
              }

              // ── Dynamic Text Styling ───────────────────────────────────────
              let textStyle = '';
              if (isInitial) {
                textStyle = 'text-slate-900 dark:text-white font-bold tracking-tight'; // Given clues
              } else if (cellValue !== null) {
                textStyle = 'text-blue-600 dark:text-blue-300 font-semibold'; // User input
              }

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  // Role 'button' makes it accessible
                  role="button"
                  tabIndex={0}
                  onClick={() => onCellSelect({ row: rowIndex, col: colIndex })}
                  // Keyboard support
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCellSelect({ row: rowIndex, col: colIndex });
                    }
                  }}
                  className={`
                    flex items-center justify-center 
                    text-xl sm:text-2xl lg:text-3xl
                    cursor-pointer transition-colors duration-[50ms] outline-none 
                    focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500
                    ${borderClasses}
                    ${bgClass}
                    ${textStyle}
                  `}
                >
                  {cellValue !== null ? cellValue : ''}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
