'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameControls } from '@/components/GameControls';
import { GameTimer } from '@/components/GameTimer';
import { NumberPad } from '@/components/NumberPad';
import { SudokuBoard, Position } from '@/components/SudokuBoard';
import type { SudokuGrid, Difficulty, PuzzleResponse, ValidateResponse } from '@/types/sudoku';

export default function Home() {
  // ── Server State (從 API 取得的不變狀態) ──────────────────────────────────────────────────
  const [gameId, setGameId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  // initialGrid 作為比對基礎，防止玩家修改到原本題目的數字
  const [initialGrid, setInitialGrid] = useState<SudokuGrid | null>(null);

  // ── Client State (會頻繁變動的互動狀態) ──────────────────────────────────────────────────
  // grid: 當前盤面狀態，包含玩家填入的數字
  const [grid, setGrid] = useState<SudokuGrid | null>(null);
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ── Game Stats (遊戲結算與進度狀態) ──────────────────────────────────────────────────────
  const [penaltyCount, setPenaltyCount] = useState(0); // 記錄錯誤次數以處罰時間
  const [errorFlashKey, setErrorFlashKey] = useState(0); // 用來強制觸發盤面的紅色閃爍動畫
  const [isWon, setIsWon] = useState(false);
  const [finalTime, setFinalTime] = useState<number | null>(null);

  // ── Data Fetching (與後端互動) ───────────────────────────────────────────────────────
  
  // 面試防呆：使用 useCallback 快取函式記憶體位置，避免 useEffect 不必要的 Re-render
  const fetchNewPuzzle = useCallback(async (diff: Difficulty) => {
    try {
      // 1. 初始化所有狀態
      setIsLoading(true);
      setIsWon(false);
      setPenaltyCount(0);
      setSelectedCell(null);
      setFinalTime(null);
      setErrorFlashKey(0);

      // 2. 非同步 (Async) 向我們撰寫的 API 請求新題目
      const res = await fetch(`/api/puzzle?difficulty=${diff}`);
      if (!res.ok) throw new Error('Failed to fetch puzzle');
      
      const data: PuzzleResponse = await res.json();
      setGameId(data.gameId);
      setDifficulty(data.difficulty);
      setInitialGrid(data.puzzle);
      // 陣列解構與深拷貝 (Deep Copy)：保護 initialGrid 不被 grid 修改污染
      setGrid(data.puzzle.map(row => [...row]));
    } catch (error) {
      console.error(error);
      alert('Failed to start a new game. Make sure the server is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 組件掛載 (Mount) 時自動打 API 拿題目
  useEffect(() => {
    fetchNewPuzzle('medium');
  }, [fetchNewPuzzle]);

  // ── Game Logic (核心遊戲邏輯) ──────────────────────────────────────────────────────

  // 判斷是否勝利：只要盤面全滿，就代表過關。
  // 面試防呆：我們不需要在這裡重新寫邏輯驗證整張盤面「答案對不對」，因為我們在每次玩家填入數字時都會打 Validation API，錯誤根本填不進去！
  useEffect(() => {
    if (!grid) return;
    const isFull = grid.every((row) => row.every((cell) => cell !== null));
    if (isFull) setIsWon(true);
  }, [grid]);

  // 統合處理鍵盤或畫面上數字鍵盤的輸入 (非同步 Async 函式)
  const handleNumberInput = async (num: number | null) => {
    if (isWon || isLoading || !selectedCell || !grid || !initialGrid || !gameId) return;

    const { row, col } = selectedCell;

    // 防止玩家覆蓋原本題目的提示數字 (如果該格不為 null 就提早 Return)
    if (initialGrid[row][col] !== null) return;

    // 處理「橡皮擦」功能 (傳入 num 為 null)
    if (num === null) {
      setGrid((prev) => {
        if (!prev) return prev;
        const newGrid = prev.map(r => [...r]);
        newGrid[row][col] = null;
        return newGrid;
      });
      return;
    }

    // 防禦性編程：避免重複輸入同個數字浪費 API 請求
    if (grid[row][col] === num) return;

    // 樂觀更新 (Optimistic UI)：在等待後端 API 回應前，先直接把數字填進前端畫面上，讓使用者感覺不到網路延遲
    setGrid((prev) => {
      if (!prev) return prev;
      const newGrid = prev.map(r => [...r]);
      newGrid[row][col] = num;
      return newGrid;
    });

    // 將填入的動作送到後端進行 Validation (驗證)
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, row, col, value: num, currentBoard: grid }),
      });

      if (!res.ok) throw new Error('Validation request failed');

      const data: ValidateResponse = await res.json();

      // 判斷回傳結果：區分「規則違規」(同格/行/列重複) 與「答案錯誤」的邏輯差異
      if (!data.isValid || data.isRuleViolation) {
        // 填錯了！
        // 1. 退回 (Revert) 剛剛樂觀更新填入的數字
        setGrid((prev) => {
          if (!prev) return prev;
          const newGrid = prev.map(r => [...r]);
          newGrid[row][col] = null;
          return newGrid;
        });

        // 2. 處罰機制：如果是「規則違規」(例如該列原本就有 5 你又填 5)，才給予時間處罰與紅色閃爍
        // 如果只是「答案錯誤」(未發現重複，但這個解答未來會遇到死胡同而走到回溯法 Backtracking 失敗)，我們不扣秒數，但依然不讓你填入
        if (data.isRuleViolation) {
           // setState 變動：將 penaltyCount + 1，這會作為 prop 往下傳遞給 GameTimer 以觸發 +30s 動畫
          setPenaltyCount((c) => c + 1);
          // 改變 key 強制 SudokuBoard 重置並觸發紅色閃動的 CSS 動畫
          setErrorFlashKey(Date.now()); 
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      // 若遇到網路斷線或 Server 掛掉，安全退回剛剛樂觀更新的選項
      setGrid((prev) => {
        if (!prev) return prev;
        const newGrid = prev.map(r => [...r]);
        newGrid[row][col] = null;
        return newGrid;
      });
    }
  };

  // 鍵盤操控綁定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || isWon) return;

      // 監聽數字鍵 1-9
      if (/^[1-9]$/.test(e.key)) {
        handleNumberInput(parseInt(e.key, 10));
      }
      
      // 監聽清除鍵
      if (['Backspace', 'Delete', '0'].includes(e.key)) {
        handleNumberInput(null);
      }

      // 方向鍵導航功能
      const { row, col } = selectedCell;
      if (e.key === 'ArrowUp') setSelectedCell({ row: Math.max(0, row - 1), col });
      if (e.key === 'ArrowDown') setSelectedCell({ row: Math.min(8, row + 1), col });
      if (e.key === 'ArrowLeft') setSelectedCell({ row, col: Math.max(0, col - 1) });
      if (e.key === 'ArrowRight') setSelectedCell({ row, col: Math.min(8, col + 1) });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isWon, handleNumberInput]);

  // ── Render Helpers (渲染輔助) ──────────────────────────────────────────────────────

  const formatTime = (totalSeconds: number | null) => {
    if (totalSeconds === null) return '--:--';
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <main className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col items-center py-4 sm:py-8 px-2 sm:px-4 font-sans selection:bg-blue-200">
      
      {/* Header */}
      <div className="w-full max-w-xl flex flex-col items-center mb-4 sm:mb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-1 sm:mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          Sudoku
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium tracking-wide">
          Logical Number Puzzle
        </p>
      </div>

      <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* Play Area */}
        <div className="md:col-span-8 flex flex-col items-center gap-4 sm:gap-6">
          {(!grid || !initialGrid) ? (
            <div className="w-full max-w-[450px] aspect-square flex items-center justify-center bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse">
              <span className="text-slate-400 font-medium">Generating Puzzle...</span>
            </div>
          ) : (
            <div className="w-full relative">
              <SudokuBoard 
                grid={grid} 
                initialGrid={initialGrid}
                selectedCell={selectedCell}
                onCellSelect={setSelectedCell}
                errorFlashKey={errorFlashKey}
              />
              
              {/* Win State Overlay (勝利結算畫面) */}
              {isWon && (
                <div className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center pointer-events-none rounded-xl">
                  <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl text-center pointer-events-auto transform animate-[pop_0.3s_ease-out]">
                    <div className="text-5xl mb-4">🎉</div>
                    <h2 className="text-3xl font-bold mb-2">You Win!</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                      Final Time: <span className="font-bold text-slate-900 dark:text-white">{formatTime(finalTime)}</span>
                      <br/>
                      Mistakes: {penaltyCount}
                    </p>
                    <button
                      onClick={() => fetchNewPuzzle(difficulty)}
                      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-colors"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="md:col-span-4 flex flex-col items-center md:items-stretch gap-8 w-full">
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-full max-w-[350px] mx-auto hidden md:block">
            <h3 className="text-xs uppercase font-bold tracking-widest text-slate-400 dark:text-slate-500 mb-4 text-center">Timer</h3>
            <GameTimer 
              key={gameId || 'timer-desktop'}
              isActive={!isLoading && !isWon} 
              penaltyCount={penaltyCount} 
              onTimeUpdate={setFinalTime}
            />
          </div>

          {/* Mobile Timer is shown inline rather than hidden entirely */}
          <div className="md:hidden flex flex-col items-center gap-2">
             <span className="text-xs uppercase font-bold text-slate-400">Timer</span>
             <GameTimer 
              key={gameId || 'timer-mobile'}
              isActive={!isLoading && !isWon} 
              penaltyCount={penaltyCount} 
              onTimeUpdate={setFinalTime}
            />
          </div>

          <NumberPad 
            onNumberClick={handleNumberInput}
            onErase={() => handleNumberInput(null)}
            disabled={isLoading || isWon || !selectedCell}
            currentGrid={grid || undefined}
          />

          <div className="w-full pt-4 border-t border-slate-200 dark:border-slate-800 mt-[auto]">
            <GameControls 
              currentDifficulty={difficulty}
              onNewGame={fetchNewPuzzle}
              isLoading={isLoading}
            />
          </div>
          
        </div>

      </div>
    </main>
  );
}
