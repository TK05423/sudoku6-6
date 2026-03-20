import type { SudokuGrid } from '@/types/sudoku';

/**
 * A game session stored in memory on the server.
 */
interface GameSession {
  /** The full, solved grid (never sent to the client). */
  solution: number[][];
  /** Last active timestamp for memory cleanup. */
  lastUpdate: number;
}

/**
 * In-memory game store.
 * Maps `gameId` (UUID) -> `GameSession`.
 *
 * NOTE: Since this is an edge/serverless environment, this Map resets
 * on cold starts. This is acceptable for a simple, free-tier deployment
 * where games are meant to be completed in one sitting.
 */
class GameStore {
  private store: Map<string, GameSession> = new Map();
  // Time-to-live: 2 hours in ms
  private ttl = 2 * 60 * 60 * 1000;

  /**
   * Saves a new game session.
   */
  saveGame(gameId: string, solution: number[][]): void {
    this.store.set(gameId, {
      solution,
      lastUpdate: Date.now(),
    });
    // Trigger an async cleanup whenever a new game is created
    this.cleanup();
  }

  /**
   * Retrieves a game solution.
   */
  getSolution(gameId: string): number[][] | undefined {
    const session = this.store.get(gameId);
    if (session) {
      session.lastUpdate = Date.now();
      return session.solution;
    }
    return undefined;
  }

  /**
   * Removes stale games to prevent memory leaks.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [gameId, session] of this.store.entries()) {
      if (now - session.lastUpdate > this.ttl) {
        this.store.delete(gameId);
      }
    }
  }
}

// Export as a singleton
export const gameStore = new GameStore();
