import { useEffect, useState } from 'react';

interface GameTimerProps {
  /** True when the game is actively running */
  isActive: boolean;
  /** Current penalty count to trigger "+30s" animations */
  penaltyCount: number;
  /** Callback to report final time when game is won/stopped */
  onTimeUpdate?: (seconds: number) => void;
}

export function GameTimer({ isActive, penaltyCount, onTimeUpdate }: GameTimerProps) {
  const [seconds, setSeconds] = useState(0);
  const [showPenalty, setShowPenalty] = useState(false);

  // Handle timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      // Report final time when timer stops
      onTimeUpdate?.(seconds);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, onTimeUpdate]);

  // Handle penalty trigger (add 30s)
  useEffect(() => {
    if (penaltyCount > 0) {
      setSeconds((s) => s + 30);
      setShowPenalty(true);
      const timer = setTimeout(() => setShowPenalty(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [penaltyCount]);

  // Formatting MM:SS
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div 
        className={`text-3xl font-mono font-bold transition-colors duration-300 ${
          showPenalty ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {formatTime(seconds)}
      </div>
      
      {/* Absolute positioning for the animated "+30s" floating text */}
      <div 
        className={`absolute -right-12 top-0 text-red-500 font-bold transition-all duration-700 ease-out ${
          showPenalty 
            ? 'opacity-100 translate-y-[-1rem] scale-110' 
            : 'opacity-0 translate-y-0 scale-90'
        }`}
        aria-hidden="true"
      >
        +30s
      </div>
    </div>
  );
}
