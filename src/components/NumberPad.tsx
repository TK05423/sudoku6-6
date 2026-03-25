import type { SudokuGrid } from '@/types/sudoku';

interface NumberPadProps {
  // 將使用者點擊的數字回傳給父層，以便更新盤面狀態或進行 Validation (驗證)。
  // 面試備註：這裡的驗證可區分「規則違規（同格/行/列重複）」與「答案錯誤」兩種情境。
  onNumberClick: (num: number) => void;
  // 觸發清除功能，將當前輸入格恢復為空白。當玩家填錯需要修改時使用。
  onErase: () => void;
  // 全局控管鍵盤的啟用狀態（例如：等待非同步 (Async) 驗證回傳結果時暫時停用，避免操作衝突）
  disabled?: boolean;
  /** 
   * 傳入當前盤面，用來動態計算每個數字的剩餘可填數量。
   * 這是一個進階的 UX 優化，讓玩家一目了然哪些數字已經填滿了。
   */
  currentGrid?: SudokuGrid;
}

// 透過解構 (Destructuring) 取出元件參數，保持程式碼乾淨易讀
export function NumberPad({ onNumberClick, onErase, disabled, currentGrid }: NumberPadProps) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  // 計算特定數字在目前盤面上出現的次數。
  // 由於標準數獨的每個數字最多出現 9 次，依此判斷該數字是否已完全排滿。
  const getDigitCount = (num: number) => {
    if (!currentGrid) return 0;
    let count = 0;
    
    // 遍歷 (Traverse) 整個 9x9 盤面陣列，累加特定數字的出現次數
    for (const row of currentGrid) {
      for (const cell of row) {
        if (cell === num) count++;
      }
    }
    return count;
  };

  return (
    <div className="grid grid-cols-5 gap-2 w-full max-w-[350px] mx-auto select-none">
      {/* 遍歷 1 到 9 陣列，動態產生對應的數字選取按鈕 */}
      {digits.map((num) => {
        const count = getDigitCount(num);
        // 狀態判斷：該數字是否已在盤面上填滿 9 個
        const isComplete = count >= 9;

        return (
          <button
            key={num}
            // 防呆保護：若整個數字區塊被禁用，或是該數字已填滿 9 個，則禁用此按鈕，避免無效輸入
            disabled={disabled || isComplete}
            onClick={() => onNumberClick(num)}
            className={`
              relative flex flex-col items-center justify-center p-3 rounded-xl text-2xl font-semibold transition-all
              ${
                /* 樣式邏輯：當數字填滿時，將按鈕改為灰階字體，作為直覺的視覺回饋 */
                isComplete
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-default'
                : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-sm hover:shadow hover:bg-slate-50 dark:hover:bg-slate-600 active:scale-95'
              }
              border border-slate-200 dark:border-slate-600
            `}
            aria-label={`Enter number ${num}`}
          >
            {num}
            {/* 視覺小提示：當該數字完全填滿時，在按鈕右上角加上小圓點作為完成標記 */}
            {isComplete && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />}
          </button>
        );
      })}

      {/* 清除按鈕：佔據 1 格空間，使總共 10 個按鈕（9 個數字 + 1 個清除）能完美配置在 5 欄 (grid-cols-5) 的佈局中 */}
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
