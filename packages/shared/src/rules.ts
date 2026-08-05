import { MAX_DRAWS_PER_TURN, WINNING_SCORE } from './scoring.js';

export interface GameRules {
  /** First player to reach this total score ends the game. */
  winningScore: number;
  /** How many standard 56-tile sets are shuffled together into one shared deck. */
  tileSets: number;
  /** How many tiles a player may draw in one turn before being forced to pass. */
  maxDrawsPerTurn: number;
}

export const WINNING_SCORE_OPTIONS = [200, 400, 600] as const;
export const TILE_SET_OPTIONS = [1, 2, 3] as const;
export const MAX_DRAWS_OPTIONS = [1, 2, 3, 4, 5] as const;

export const DEFAULT_GAME_RULES: GameRules = {
  winningScore: WINNING_SCORE,
  tileSets: 1,
  maxDrawsPerTurn: MAX_DRAWS_PER_TURN,
};

function clampToOptions(value: unknown, options: readonly number[], fallback: number): number {
  return typeof value === 'number' && options.includes(value) ? value : fallback;
}

/**
 * Normalizes a partial/untrusted rules object -- e.g. straight off a socket payload --
 * against the known-good option lists, so a malformed or tampered client can never push
 * an out-of-range value (like a negative winning score) into a shared game.
 */
export function sanitizeGameRules(input: Partial<GameRules> | undefined): GameRules {
  if (!input) return DEFAULT_GAME_RULES;
  return {
    winningScore: clampToOptions(input.winningScore, WINNING_SCORE_OPTIONS, DEFAULT_GAME_RULES.winningScore),
    tileSets: clampToOptions(input.tileSets, TILE_SET_OPTIONS, DEFAULT_GAME_RULES.tileSets),
    maxDrawsPerTurn: clampToOptions(input.maxDrawsPerTurn, MAX_DRAWS_OPTIONS, DEFAULT_GAME_RULES.maxDrawsPerTurn),
  };
}
