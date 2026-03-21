import { NextResponse } from 'next/server';
import { getSolution } from '@/lib/gameStore';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { ValidateRequest, ValidateResponse } from '@/types/sudoku';

export async function POST(request: Request) {
  try {
    const body: ValidateRequest = await request.json();
    const { gameId, row, col, value } = body;

    // Basic validation
    if (!gameId || typeof row !== 'number' || typeof col !== 'number' || typeof value !== 'number') {
      return NextResponse.json<ValidateResponse>(
        { isValid: false, error: 'Invalid request body parameters' },
        { status: 400 }
      );
    }

    if (row < 0 || row > 8 || col < 0 || col > 8 || value < 1 || value > 9) {
      return NextResponse.json<ValidateResponse>(
        { isValid: false, error: 'Row, column, or value out of bounds' },
        { status: 400 }
      );
    }

    // Lookup game solution from Cloudflare KV
    const { env } = await getCloudflareContext();
    const solution = await getSolution(env.GAME_STORE, gameId);

    if (!solution) {
      return NextResponse.json<ValidateResponse>(
        { isValid: false, error: 'Game ID not found or expired' },
        { status: 404 }
      );
    }

    // Verify
    const isValid = solution[row][col] === value;

    return NextResponse.json<ValidateResponse>({ isValid });
    
  } catch (error) {
    return NextResponse.json<ValidateResponse>(
      { isValid: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
