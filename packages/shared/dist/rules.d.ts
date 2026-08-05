export interface GameRules {
    /** First player to reach this total score ends the game. */
    winningScore: number;
    /** How many standard 56-tile sets are shuffled together into one shared deck. */
    tileSets: number;
    /** How many tiles a player may draw in one turn before being forced to pass. */
    maxDrawsPerTurn: number;
}
export declare const WINNING_SCORE_OPTIONS: readonly [200, 400, 600];
export declare const TILE_SET_OPTIONS: readonly [1, 2, 3];
export declare const MAX_DRAWS_OPTIONS: readonly [1, 2, 3, 4, 5];
export declare const DEFAULT_GAME_RULES: GameRules;
/**
 * Normalizes a partial/untrusted rules object -- e.g. straight off a socket payload --
 * against the known-good option lists, so a malformed or tampered client can never push
 * an out-of-range value (like a negative winning score) into a shared game.
 */
export declare function sanitizeGameRules(input: Partial<GameRules> | undefined): GameRules;
