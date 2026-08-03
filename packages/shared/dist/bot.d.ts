import { CellCoord } from './grid.js';
import { GameState } from './gameState.js';
export type BotDifficulty = 'easy' | 'normal' | 'hard';
export type BotAction = {
    type: 'place';
    tileId: string;
    cell: CellCoord;
} | {
    type: 'draw';
} | {
    type: 'pass';
} | {
    type: 'choose-starter';
    tileId: string;
};
/**
 * Decides the bot's next action from the authoritative game state. The caller must have
 * already confirmed it is this player's turn (or that they owe a starter choice).
 */
export declare function chooseBotAction(state: GameState, playerId: string, difficulty?: BotDifficulty, rng?: () => number): BotAction;
