import { MAX_DRAWS_PER_TURN, WINNING_SCORE } from './scoring.js';
export const WINNING_SCORE_OPTIONS = [200, 400, 600];
export const TILE_SET_OPTIONS = [1, 2, 3];
export const MAX_DRAWS_OPTIONS = [1, 2, 3, 4, 5];
export const DEFAULT_GAME_RULES = {
    winningScore: WINNING_SCORE,
    tileSets: 1,
    maxDrawsPerTurn: MAX_DRAWS_PER_TURN,
};
function clampToOptions(value, options, fallback) {
    return typeof value === 'number' && options.includes(value) ? value : fallback;
}
/**
 * Normalizes a partial/untrusted rules object -- e.g. straight off a socket payload --
 * against the known-good option lists, so a malformed or tampered client can never push
 * an out-of-range value (like a negative winning score) into a shared game.
 */
export function sanitizeGameRules(input) {
    if (!input)
        return DEFAULT_GAME_RULES;
    return {
        winningScore: clampToOptions(input.winningScore, WINNING_SCORE_OPTIONS, DEFAULT_GAME_RULES.winningScore),
        tileSets: clampToOptions(input.tileSets, TILE_SET_OPTIONS, DEFAULT_GAME_RULES.tileSets),
        maxDrawsPerTurn: clampToOptions(input.maxDrawsPerTurn, MAX_DRAWS_OPTIONS, DEFAULT_GAME_RULES.maxDrawsPerTurn),
    };
}
//# sourceMappingURL=rules.js.map