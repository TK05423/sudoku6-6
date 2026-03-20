import type { Difficulty } from '@/types/sudoku';

interface GameControlsProps {
  currentDifficulty: Difficulty;
  onNewGame: (difficulty: Difficulty) => void;
  isLoading: boolean;
}

export function GameControls({ currentDifficulty, onNewGame, isLoading }: GameControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between w-full max-w-[350px] mx-auto md:max-w-none">
      <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
          <button
            key={level}
            disabled={isLoading}
            onClick={() => onNewGame(level)}
            className={`
              px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all duration-200
              ${currentDifficulty === level 
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {level}
          </button>
        ))}
      </div>
      <button
        disabled={isLoading}
        onClick={() => onNewGame(currentDifficulty)}
        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg shadow-sm transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Loading...' : 'New Game'}
      </button>
    </div>
  );
}
