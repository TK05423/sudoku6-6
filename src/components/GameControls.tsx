import type { Difficulty } from '@/types/sudoku';

interface GameControlsProps {
  // 當前遊戲的難度級別，用來控制 UI 上高亮顯示目前正在遊玩的難度
  currentDifficulty: Difficulty;
  // 觸發向後端要求新局的函式。
  // 面試備註：這背後可能是一支非同步 (Async) API。
  // 後端會透過 Backtracking (嘗試填入數字，若失敗則退回上一步重新嘗試) 即時生成題目，
  // 或是從 Cloudflare KV (跨請求的資料儲存空間，用來存放每一局的正確答案) 直接撈取預建題目。
  onNewGame: (difficulty: Difficulty) => void;
  // 標記是否正在等待資料載入
  isLoading: boolean;
}

// 透過解構 (Destructuring) 取出 props，減輕每次存取變數的冗長感，讓程式碼更簡潔
export function GameControls({ currentDifficulty, onNewGame, isLoading }: GameControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full max-w-[350px] mx-auto md:max-w-none">
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
        {/* 建立難度選項陣列，並運用 map 遍歷 (Traverse) 渲染出三個難度切換按鈕 */}
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
          <button
            key={level}
            // 防呆保護：若非同步請求還在執行中，則停用按鈕，防止使用者狂點造成重複發出 Request
            disabled={isLoading}
            onClick={() => onNewGame(level)}
            className={`
              px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all duration-200
              ${
                /* 樣式邏輯：區分「當前選取的難度」與「其他難度」，給予使用者明確的位置感知 */
                currentDifficulty === level 
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {level}
          </button>
        ))}
      </div>
      <button
        // 同樣是防止重複點擊觸發多次新局請求的控制機制
        disabled={isLoading}
        onClick={() => onNewGame(currentDifficulty)}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
      >
        {/* 動態狀態顯示：根據 isLoading 給予「Loading...」或「New Game」的文案回饋，提升 UX */}
        {isLoading ? 'Loading...' : 'New Game'}
      </button>
    </div>
  );
}
