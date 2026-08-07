import { MAX_DRAWS_PER_TURN, WINNING_SCORE } from './scoring.js';
import { STANDARD_SET_SIZE } from './tiles.js';

export interface GameRules {
  /** First player to reach this total score ends the game. */
  winningScore: number;
  /** How many standard 56-tile sets are shuffled together into one shared deck. */
  tileSets: number;
  /** How many tiles a player may draw in one turn before being forced to pass. */
  maxDrawsPerTurn: number;
  /**
   * Wildcard tiles shuffled in on top of the standard sets. Never more than half the
   * standard deck, so the printed tiles always stay in the majority.
   */
  freestyleTiles: number;
}

export const WINNING_SCORE_OPTIONS = [200, 400, 600] as const;
export const TILE_SET_OPTIONS = [1, 2, 3] as const;
export const MAX_DRAWS_OPTIONS = [1, 2, 3, 4, 5] as const;

/** The ceiling the freestyle allotment is held to: half the standard deck it's added to. */
export function maxFreestyleTiles(tileSets: number): number {
  return Math.floor((STANDARD_SET_SIZE * tileSets) / 2);
}

export const DEFAULT_GAME_RULES: GameRules = {
  winningScore: WINNING_SCORE,
  tileSets: 1,
  maxDrawsPerTurn: MAX_DRAWS_PER_TURN,
  freestyleTiles: 0,
};

function clampToOptions(value: unknown, options: readonly number[], fallback: number): number {
  return typeof value === 'number' && options.includes(value) ? value : fallback;
}

function clampCount(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), max);
}

/**
 * Normalizes a partial/untrusted rules object -- e.g. straight off a socket payload --
 * against the known-good option lists, so a malformed or tampered client can never push
 * an out-of-range value (like a negative winning score) into a shared game.
 */
export function sanitizeGameRules(input: Partial<GameRules> | undefined): GameRules {
  if (!input) return DEFAULT_GAME_RULES;
  // Freestyle is clamped against the sanitized tile-set count, not the requested one, so
  // dropping to a smaller deck can never leave an oversized allotment behind.
  const tileSets = clampToOptions(input.tileSets, TILE_SET_OPTIONS, DEFAULT_GAME_RULES.tileSets);
  return {
    winningScore: clampToOptions(input.winningScore, WINNING_SCORE_OPTIONS, DEFAULT_GAME_RULES.winningScore),
    tileSets,
    maxDrawsPerTurn: clampToOptions(input.maxDrawsPerTurn, MAX_DRAWS_OPTIONS, DEFAULT_GAME_RULES.maxDrawsPerTurn),
    freestyleTiles: clampCount(input.freestyleTiles, maxFreestyleTiles(tileSets)),
  };
}
