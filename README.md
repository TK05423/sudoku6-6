# Full-Stack Sudoku

A modern, single-player Sudoku web application built with Next.js 14+, TypeScript, and Tailwind CSS. The game features server-side puzzle generation and move validation to prevent client-side cheating, a competitive timer with a 30-second error penalty, and a responsive dark-mode UI.

## Features

- **Server-Side Engine**: Puzzles are generated and validated on the server. The full solution is never sent to the browser.
- **Three Difficulties**: Easy (40 clues), Medium (32 clues), Hard (25 clues).
- **Penalty System**: Incorrect moves add 30 seconds to the timer with a red flash animation.
- **Responsive UI**: Playable on desktop and mobile devices.
- **Edge-Ready**: Designed to run on Cloudflare Pages/Workers using the Edge runtime.

## Algorithm Overview

The core puzzle logic lives in `src/lib/sudokuManager.ts`.

1. **Generation (Diagonal Pre-fill)**: Generating a fully solved 9x9 board from an empty state using pure backtracking is slow. Instead, the engine takes advantage of the fact that the three diagonal 3x3 boxes share no rows or columns. It fills these 27 cells instantly with random permutations of 1–9, and then uses backtracking to fill the remaining cells. This provides a massive performance boost.
2. **Backtracking Solver**: A classic recursive algorithm that tries digits 1–9 in empty cells, backtracking when a collision occurs.
3. **Puzzle Creation (Uniqueness Guarantee)**: To create a playable puzzle, cells are removed one by one in random order from a solved grid. After every removal, a solution-counting algorithm runs. If removing a cell results in >1 valid solution, that removal is reverted. This guarantees every puzzle has exactly one logical solution.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000)

## Deployment (Cloudflare Pages)

This project is configured to run on Cloudflare's Edge network. Because the `/api/puzzle` and `/api/validate` routes use an in-memory Map to store game solutions (`src/lib/gameStore.ts`), be aware that Cloudflare Edge cold starts will clear the memory. This is generally acceptable for short-lived games on the free tier.

For a production environment with persistent games, swap the in-memory Map with **Cloudflare KV** or **D1**.

### Deployment Steps:

1. Install the Cloudflare CLI:
   ```bash
   npm install -g wrangler
   ```
2. Ensure you have the Next.js Cloudflare adapter:
   ```bash
   npm install -D @cloudflare/next-on-pages
   ```
3. Build the project for Cloudflare:
   ```bash
   npx @cloudflare/next-on-pages
   ```
4. Deploy:
   ```bash
   npx wrangler pages deploy .vercel/output/static
   ```
