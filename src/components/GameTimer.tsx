import { useEffect, useState } from 'react';

interface GameTimerProps {
  /** 控制計時器是否正在運行 */
  isActive: boolean;
  /** 錯誤次數，用來觸發 "+30s" 的處罰與動畫 */
  penaltyCount: number;
  /** 當遊戲結束或暫停時，將最終時間回報給父元件 */
  onTimeUpdate?: (seconds: number) => void;
}

export function GameTimer({ isActive, penaltyCount, onTimeUpdate }: GameTimerProps) {
  // ── Client State (前端狀態) ────────────────────────────────────────────────────────
  // seconds: 記錄當下經過的總秒數
  const [seconds, setSeconds] = useState(0);
  // showPenalty: 控制 "+30s" 動畫是否要顯示
  const [showPenalty, setShowPenalty] = useState(false);

  // 1. 處理計時器的跳動邏輯 (副作用/Side Effect)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      // 若遊戲進行中，每秒將秒數 +1
      interval = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      // 當遊戲結束 (isActive 變為 false)，將最終時間往上傳遞，交由父元件處理結算畫面
      onTimeUpdate?.(seconds);
    }
    // 面試防呆：卸載 (Unmount) 或依賴變更時，清除定時器，避免 Memory Leak (記憶體洩漏)
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, onTimeUpdate]);

  // 2. 處理加時處罰 (+30s)
  // 監聽 penaltyCount 的變化。當玩家填錯數字 (且屬於規則違規)，父元件會增加 penaltyCount
  useEffect(() => {
    if (penaltyCount > 0) {
      // 狀態變更：將當前秒數直接加 30 秒
      setSeconds((s) => s + 30);
      
      // 觸發 "+30s" 視覺動畫
      setShowPenalty(true);
      
      // 1.5 秒後關閉動畫狀態，為下一次可能的處罰做準備
      const timer = setTimeout(() => setShowPenalty(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [penaltyCount]);

  // 3. 格式化時間 (MM:SS)
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* 顯示主計時器，如果有觸發處罰，文字會出於視覺回饋短暫變紅 */}
      <div 
        className={`text-3xl font-mono font-bold transition-colors duration-300 ${
          showPenalty ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'
        }`}
      >
        {formatTime(seconds)}
      </div>
      
      {/* "+30s" 浮動文字動畫 */}
      {/* 透過 opacity 與 translate 來實現彈出與浮出的非同步動畫效果 */}
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
