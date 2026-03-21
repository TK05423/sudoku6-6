import { NextResponse } from 'next/server';
import { generateSolvedGrid, createPuzzle } from '@/lib/sudokuManager';
import { saveGame } from '@/lib/gameStore';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { Difficulty, PuzzleResponse } from '@/types/sudoku';

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

  // Save full solution to Cloudflare KV
  const { env } = await getCloudflareContext();
  await saveGame(env.GAME_STORE, gameId, solution);

  const responseBody: PuzzleResponse = {
    gameId,
    puzzle,
    difficulty,
  };

  return NextResponse.json(responseBody);
}
