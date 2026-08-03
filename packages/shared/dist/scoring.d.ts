import { BonusType } from './board.js';
import { Tile } from './tiles.js';
export declare const WELL_DRAW_PENALTY = 5;
export declare const NO_MOVE_PENALTY = 10;
/**
 * House rule: the official game makes you draw until you can play or the well runs dry,
 * which can mean drawing a dozen tiles in one turn. Here a turn is capped at 3 draws,
 * after which you may take the -10 and pass even if the well still has tiles.
 */
export declare const MAX_DRAWS_PER_TURN = 3;
export declare const HAND_EMPTY_BONUS = 25;
export declare const START_BONUS = 10;
export declare const START_TRIPLE_ZERO_BONUS = 30;
export declare const BRIDGE_BONUS = 40;
export declare const HEXAGON_BONUS = 50;
export declare const WINNING_SCORE = 400;
export interface ScoreResult {
    base: number;
    bonus: number;
    bonusLabel: 'none' | 'start' | 'start-triple-zero' | 'bridge' | 'hexagon';
    total: number;
}
export declare function scorePlay(tile: Tile, bonusType: BonusType): ScoreResult;
export declare function scoreStartingTile(tile: Tile, isTripleZeroChosen: boolean): ScoreResult;
export declare function scoreStartingTileNoTriple(tile: Tile): ScoreResult;
