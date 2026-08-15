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
    /**
     * Hardcore mode: the game stops policing whether you *actually* have a legal move.
     * You may draw (and then pass) whenever you like -- if you can't spot a move, the
     * table doesn't tell you one exists, it just charges you the usual -5 / -10. The
     * client also drops every placement hint, since keeping them would give the answer
     * away for free.
     */
    hardcoreMode: boolean;
}
export declare const WINNING_SCORE_OPTIONS: readonly [200, 400, 600];
export declare const TILE_SET_OPTIONS: readonly [1, 2, 3];
export declare const MAX_DRAWS_OPTIONS: readonly [1, 2, 3, 4, 5];
/** The ceiling the freestyle allotment is held to: half the standard deck it's added to. */
export declare function maxFreestyleTiles(tileSets: number): number;
export declare const DEFAULT_GAME_RULES: GameRules;
/** The ready-made setups offered above the individual controls in the pre-game panel. */
export interface GameRulesPreset {
    id: string;
    name: string;
    blurb: string;
    rules: GameRules;
}
export declare const GAME_RULES_PRESETS: readonly GameRulesPreset[];
/** The preset a rules object matches exactly, if any -- used to light up the preset row. */
export declare function matchingPresetId(rules: GameRules): string | null;
/** One-line recap of a configured game, e.g. for a collapsed setup panel or a guest's lobby view. */
export declare function summarizeGameRules(rules: GameRules): string;
/**
 * Normalizes a partial/untrusted rules object -- e.g. straight off a socket payload --
 * against the known-good option lists, so a malformed or tampered client can never push
 * an out-of-range value (like a negative winning score) into a shared game.
 */
export declare function sanitizeGameRules(input: Partial<GameRules> | undefined): GameRules;
