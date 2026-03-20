import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { generateSolvedGrid, createPuzzle } from '@/lib/sudokuManager';
import { gameStore } from '@/lib/gameStore';
import type { Difficulty, PuzzleResponse } from '@/types/sudoku';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Parse difficulty from URL, default to 'medium'
  const url = new URL(request.url);
  const difficultyParam = url.searchParams.get('difficulty');
  
  const difficulty: Difficulty = 
    difficultyParam === 'easy' || difficultyParam === 'medium' || difficultyParam === 'hard'
      ? difficultyParam
      : 'medium';

  // Generate full solution
  const solution = generateSolvedGrid();
  
  // Cut holes to create the playable puzzle
  const puzzle = createPuzzle(solution, difficulty);

  // Generate unique game ID
  const gameId = crypto.randomUUID();

  // Save full solution on server
  gameStore.saveGame(gameId, solution);

  const responseBody: PuzzleResponse = {
    gameId,
    puzzle,
    difficulty,
  };

  return NextResponse.json(responseBody);
}
