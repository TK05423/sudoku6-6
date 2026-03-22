import type { SudokuGrid } from '@/types/sudoku';

export interface Position {
  row: number;
  col: number;
}

interface SudokuBoardProps {
  /** 當前的 9x9 盤面狀態 (包含玩家填入的數字) */
  grid: SudokuGrid;
  /** 初始題目 (用來區分哪些是題目給的固定數字，哪些是玩家自己填的) */
  initialGrid: SudokuGrid;
  /** 目前被選取的格子座標 */
  selectedCell: Position | null;
  /** 使用者點擊格子時觸發的事件 */
  onCellSelect: (pos: Position) => void;
  /** 用來驅動盤面發紅光警告的 Key，數值改變就會重新渲染觸發動畫 */
  errorFlashKey: number; 
}

export function SudokuBoard({
  grid,
  initialGrid,
  selectedCell,
  onCellSelect,
  errorFlashKey,
}: SudokuBoardProps) {
  
  // 取得目前選取格子內的數字，用來高亮盤面上所有相同的數字
  const selectedNum = selectedCell ? grid[selectedCell.row][selectedCell.col] : null;

  // 判斷某個格子是否與當前選取的格子「相關聯」(同行、同列、或同九宮格)
  const isRelated = (r: number, c: number) => {
    if (!selectedCell) return false;
    const sameRow = r === selectedCell.row;
    const sameCol = c === selectedCell.col;
    
    // 遍歷 (Traverse) 的視覺化：計算是否在同一個 3x3 九宮格內
    const sameBox = 
      Math.floor(r / 3) === Math.floor(selectedCell.row / 3) &&
      Math.floor(c / 3) === Math.floor(selectedCell.col / 3);
    
    return sameRow || sameCol || sameBox;
  };

  return (
    <div className="w-full max-w-[450px] aspect-square mx-auto sm:p-2">
      {/* 
        錯誤閃爍動畫的外層
        當外部因為 Validation (驗證) 發現「規則違規」時，會改變 errorFlashKey。
        React 看到 key (解構後的狀態之一) 改變，就會重新觸發 animate-error-pulse 的 CSS 動畫。
      */}
      <div 
        key={errorFlashKey}
        className={`w-full h-full bg-slate-900 border-2 sm:border-4 border-slate-800 shadow-xl overflow-hidden
          ${errorFlashKey > 0 ? 'animate-[pulse_0.4s_ease-in-out_2_alternate] border-red-500' : ''}`}
      >
        <div className="grid grid-cols-9 grid-rows-9 h-full w-full">
          {/* 遍歷 (Traverse) 渲染 81 個格子 */}
          {grid.map((rowArr, rowIndex) =>
            rowArr.map((cellValue, colIndex) => {
              // 狀態判斷 boolean 常數，讓後續的 class 組合更乾淨可讀
              const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
              const isInitial = initialGrid[rowIndex][colIndex] !== null;
              const isSameNumber = cellValue !== null && cellValue === selectedNum && !isSelected;
              const related = !isSelected && isRelated(rowIndex, colIndex);

              // ── 動態邊框樣式 ─────────────────────────────────────────────
              // 為了凸顯 3x3 九宮格，每隔三格加粗邊框
              const borderClasses = `
                border-slate-300 dark:border-slate-700
                ${colIndex % 3 === 2 && colIndex !== 8 ? 'border-r-2 sm:border-r-4 border-r-slate-800 dark:border-r-slate-900' : 'border-r'}
                ${rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-b-2 sm:border-b-4 border-b-slate-800 dark:border-b-slate-900' : 'border-b'}
              `;

              // ── 動態背景樣式 ─────────────────────────────────────────────
              let bgClass = 'bg-white dark:bg-slate-800'; // 預設背景
              if (isSelected) {
                bgClass = 'bg-blue-200 dark:bg-blue-600'; // 強烈高亮：當前選取的格子
              } else if (isSameNumber) {
                bgClass = 'bg-blue-100 dark:bg-blue-800/60'; // 柔和高亮：盤面上其他相同的數字
              } else if (related) {
                bgClass = 'bg-slate-100 dark:bg-slate-700/60'; // 十字與九宮格高亮
              }

              // ── 動態文字樣式 ─────────────────────────────────────────────
              let textStyle = '';
              if (isInitial) {
                textStyle = 'text-slate-900 dark:text-white font-bold tracking-tight'; // 題目給定的數字 (黑色/白色粗體)
              } else if (cellValue !== null) {
                textStyle = 'text-blue-600 dark:text-blue-300 font-semibold'; // 玩家手動填入的數字 (藍色)
              }

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => onCellSelect({ row: rowIndex, col: colIndex })}
                  // 支援鍵盤操作，提升無障礙體驗 (a11y)
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
