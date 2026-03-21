'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameControls } from '@/components/GameControls';
import { GameTimer } from '@/components/GameTimer';
import { NumberPad } from '@/components/NumberPad';
import { SudokuBoard, Position } from '@/components/SudokuBoard';
import type { SudokuGrid, Difficulty, PuzzleResponse, ValidateResponse } from '@/types/sudoku';

export default function Home() {
  // ── Server State ──────────────────────────────────────────────────────────
  const [gameId, setGameId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [initialGrid, setInitialGrid] = useState<SudokuGrid | null>(null);

  // ── Client State ──────────────────────────────────────────────────────────
  const [grid, setGrid] = useState<SudokuGrid | null>(null);
  const [selectedCell, setSelectedCell] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ── Game Stats ────────────────────────────────────────────────────────────
  const [penaltyCount, setPenaltyCount] = useState(0);
  const [errorFlashKey, setErrorFlashKey] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [finalTime, setFinalTime] = useState<number | null>(null);

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const fetchNewPuzzle = useCallback(async (diff: Difficulty) => {
    try {
      setIsLoading(true);
      setIsWon(false);
      setPenaltyCount(0);
      setSelectedCell(null);
      setFinalTime(null);
      setErrorFlashKey(0);

      const res = await fetch(`/api/puzzle?difficulty=${diff}`);
      if (!res.ok) throw new Error('Failed to fetch puzzle');
      
      const data: PuzzleResponse = await res.json();
      setGameId(data.gameId);
      setDifficulty(data.difficulty);
      setInitialGrid(data.puzzle);
      // Create a deep copy for the mutable grid
      setGrid(data.puzzle.map(row => [...row]));
    } catch (error) {
      console.error(error);
      alert('Failed to start a new game. Make sure the server is running.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch puzzle on mount
  useEffect(() => {
    fetchNewPuzzle('medium');
  }, [fetchNewPuzzle]);

  // ── Game Logic ────────────────────────────────────────────────────────────

  // Trigger win state when board is full and no empty cells remain
  // We don't need to validate the whole board because we validate every move!
  useEffect(() => {
    if (!grid) return;
    const isFull = grid.every((row) => row.every((cell) => cell !== null));
    if (isFull) setIsWon(true);
  }, [grid]);

  // Handle number input (from Numpad or Keyboard)
  const handleNumberInput = async (num: number | null) => {
    if (isWon || isLoading || !selectedCell || !grid || !initialGrid || !gameId) return;

    const { row, col } = selectedCell;

    // Prevent overwriting initial puzzle clues
    if (initialGrid[row][col] !== null) return;

    // Handle erasing
    if (num === null) {
      setGrid((prev) => {
        if (!prev) return prev;
        const newGrid = prev.map(r => [...r]);
        newGrid[row][col] = null;
        return newGrid;
      });
      return;
    }

    // Don't waste API calls if the number is already there
    if (grid[row][col] === num) return;

    // Optimistically update the UI to feel responsive
    setGrid((prev) => {
      if (!prev) return prev;
      const newGrid = prev.map(r => [...r]);
      newGrid[row][col] = num;
      return newGrid;
    });

    // Validate move against server
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, row, col, value: num, currentBoard: grid }),
      });

      if (!res.ok) throw new Error('Validation request failed');

      const data: ValidateResponse = await res.json();

      if (!data.isValid || data.isRuleViolation) {
        // Incorrect move!
        // 1. Revert the optimistically placed number
        setGrid((prev) => {
          if (!prev) return prev;
          const newGrid = prev.map(r => [...r]);
          newGrid[row][col] = null;
          return newGrid;
        });

        // 2. Trigger penalty: +30s timer & UI flash only on rule violation
        if (data.isRuleViolation) {
          setPenaltyCount((c) => c + 1);
          setErrorFlashKey(Date.now()); // forces re-render of flash animation
        }
      }
    } catch (error) {
      console.error('Validation error:', error);
      // Revert if network fails
      setGrid((prev) => {
        if (!prev) return prev;
        const newGrid = prev.map(r => [...r]);
        newGrid[row][col] = null;
        return newGrid;
      });
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell || isWon) return;

      // Numbers 1-9
      if (/^[1-9]$/.test(e.key)) {
        handleNumberInput(parseInt(e.key, 10));
      }
      
      // Erase (Backspace/Delete/0)
      if (['Backspace', 'Delete', '0'].includes(e.key)) {
        handleNumberInput(null);
      }

      // Arrow keys navigation
      const { row, col } = selectedCell;
      if (e.key === 'ArrowUp') setSelectedCell({ row: Math.max(0, row - 1), col });
      if (e.key === 'ArrowDown') setSelectedCell({ row: Math.min(8, row + 1), col });
      if (e.key === 'ArrowLeft') setSelectedCell({ row, col: Math.max(0, col - 1) });
      if (e.key === 'ArrowRight') setSelectedCell({ row, col: Math.min(8, col + 1) });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, isWon, handleNumberInput]);

  // ── Render Helpers ────────────────────────────────────────────────────────

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
              
              {/* Win State Overlay */}
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
