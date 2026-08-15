import { MAX_DRAWS_PER_TURN, WINNING_SCORE } from './scoring.js';
import { STANDARD_SET_SIZE } from './tiles.js';
export const WINNING_SCORE_OPTIONS = [200, 400, 600];
export const TILE_SET_OPTIONS = [1, 2, 3];
export const MAX_DRAWS_OPTIONS = [1, 2, 3, 4, 5];
/** The ceiling the freestyle allotment is held to: half the standard deck it's added to. */
export function maxFreestyleTiles(tileSets) {
    return Math.floor((STANDARD_SET_SIZE * tileSets) / 2);
}
export const DEFAULT_GAME_RULES = {
    winningScore: WINNING_SCORE,
    tileSets: 1,
    maxDrawsPerTurn: MAX_DRAWS_PER_TURN,
    freestyleTiles: 0,
    hardcoreMode: false,
};
export const GAME_RULES_PRESETS = [
    {
        id: 'classic',
        name: 'Classic',
        blurb: 'The standard game: one 56-tile set, printed tiles only, up to 3 draws a turn.',
        rules: DEFAULT_GAME_RULES,
    },
    {
        id: 'casual',
        name: 'Casual',
        blurb: 'A shorter, friendlier game -- a few wildcards and a deeper draw allowance.',
        rules: { winningScore: 200, tileSets: 1, maxDrawsPerTurn: 5, freestyleTiles: 8, hardcoreMode: false },
    },
    {
        id: 'hardcore',
        name: 'Hardcore',
        blurb: 'No hints and no safety net: spot your own moves, and draw only if you dare.',
        rules: { winningScore: 400, tileSets: 1, maxDrawsPerTurn: 3, freestyleTiles: 0, hardcoreMode: true },
    },
];
/** The preset a rules object matches exactly, if any -- used to light up the preset row. */
export function matchingPresetId(rules) {
    const found = GAME_RULES_PRESETS.find((p) => p.rules.winningScore === rules.winningScore &&
        p.rules.tileSets === rules.tileSets &&
        p.rules.maxDrawsPerTurn === rules.maxDrawsPerTurn &&
        p.rules.freestyleTiles === rules.freestyleTiles &&
        p.rules.hardcoreMode === rules.hardcoreMode);
    return found ? found.id : null;
}
/** One-line recap of a configured game, e.g. for a collapsed setup panel or a guest's lobby view. */
export function summarizeGameRules(rules) {
    const parts = [
        `Playing to ${rules.winningScore}`,
        `${rules.tileSets}x tile set${rules.tileSets > 1 ? 's' : ''}`,
        `draw up to ${rules.maxDrawsPerTurn} a turn`,
    ];
    if (rules.freestyleTiles > 0)
        parts.push(`${rules.freestyleTiles} freestyle tiles`);
    if (rules.hardcoreMode)
        parts.push('Hardcore');
    return parts.join(' · ');
}
function clampToOptions(value, options, fallback) {
    return typeof value === 'number' && options.includes(value) ? value : fallback;
}
function clampCount(value, max) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return 0;
    return Math.min(Math.max(Math.round(value), 0), max);
}
/**
 * Normalizes a partial/untrusted rules object -- e.g. straight off a socket payload --
 * against the known-good option lists, so a malformed or tampered client can never push
 * an out-of-range value (like a negative winning score) into a shared game.
 */
export function sanitizeGameRules(input) {
    if (!input)
        return DEFAULT_GAME_RULES;
    // Freestyle is clamped against the sanitized tile-set count, not the requested one, so
    // dropping to a smaller deck can never leave an oversized allotment behind.
    const tileSets = clampToOptions(input.tileSets, TILE_SET_OPTIONS, DEFAULT_GAME_RULES.tileSets);
    return {
        winningScore: clampToOptions(input.winningScore, WINNING_SCORE_OPTIONS, DEFAULT_GAME_RULES.winningScore),
        tileSets,
        maxDrawsPerTurn: clampToOptions(input.maxDrawsPerTurn, MAX_DRAWS_OPTIONS, DEFAULT_GAME_RULES.maxDrawsPerTurn),
        freestyleTiles: clampCount(input.freestyleTiles, maxFreestyleTiles(tileSets)),
        hardcoreMode: input.hardcoreMode === true,
    };
}
//# sourceMappingURL=rules.js.map