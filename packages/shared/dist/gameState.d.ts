import { Board } from './board.js';
import { CellCoord } from './grid.js';
import { ScoreResult } from './scoring.js';
import { Tile } from './tiles.js';
export interface PlayerSetup {
    id: string;
    name: string;
}
export interface PlayerState {
    id: string;
    name: string;
    hand: Tile[];
    score: number;
    connected: boolean;
}
export type GameEvent = {
    type: 'round-start';
    playerId: string;
    tile: Tile;
    score: ScoreResult;
    noTriple: boolean;
} | {
    type: 'placed';
    playerId: string;
    tile: Tile;
    cell: CellCoord;
    score: ScoreResult;
} | {
    type: 'drew';
    playerId: string;
    tile: Tile;
} | {
    type: 'no-move-penalty';
    playerId: string;
} | {
    type: 'round-end';
    reason: 'hand-empty' | 'blocked';
    winnerId: string;
    scoreChanges: Record<string, number>;
} | {
    type: 'game-end';
    winnerId: string;
} | {
    type: 'resigned';
    playerId: string;
};
export type RoundPhase = 'awaiting-starter-choice' | 'playing' | 'round-ended';
export interface StarterChoice {
    playerId: string;
    optionTileIds: string[];
}
export interface RoundState {
    roundNumber: number;
    phase: RoundPhase;
    board: Board;
    well: Tile[];
    turnOrder: string[];
    currentPlayerIndex: number;
    passStreak: number;
    /** Tiles the current player has drawn this turn; capped by MAX_DRAWS_PER_TURN. */
    drawsThisTurn: number;
    starterChoice?: StarterChoice;
    log: GameEvent[];
}
export interface GameState {
    players: PlayerState[];
    round: RoundState;
    gameOver: boolean;
    winnerId?: string;
}
export declare function handSizeFor(playerCount: number): number;
export declare function currentPlayerId(round: RoundState): string;
/** True once the player has exhausted the well or hit this turn's draw cap. */
export declare function mustPassInsteadOfDrawing(round: RoundState): boolean;
/**
 * Deals a fresh 56-tile deck directly into `players`' hands (scores carry over across
 * rounds, so `players` must be the live PlayerState array) and opens the round. May
 * land in 'awaiting-starter-choice' if one player holds both the overall-highest
 * triple and 0-0-0 -- the rulebook lets them pick which to open with.
 */
export declare function startRound(players: PlayerState[], roundNumber: number, rng?: () => number): RoundState;
export declare function chooseStartingTile(state: GameState, playerId: string, tileId: string): void;
export interface PlaceTileResult {
    score: ScoreResult;
    roundEnded: boolean;
    gameEnded: boolean;
}
export declare function applyPlaceTile(state: GameState, playerId: string, tileId: string, cell: CellCoord): PlaceTileResult;
export declare function canCurrentPlayerPlay(state: GameState): boolean;
export interface DrawResult {
    tile: Tile | null;
    wellEmpty: boolean;
}
export declare function applyDrawFromWell(state: GameState, playerId: string): DrawResult;
/** Called when the current player has no legal move and has drawn as much as they may. */
export declare function applyNoMovePenalty(state: GameState, playerId: string): {
    roundEnded: boolean;
    gameEnded: boolean;
};
/**
 * Concedes the whole match immediately, not just the current round -- there's no sane
 * way to keep a round going with one player's tiles frozen on the board and no one able
 * to act on their behalf. The win goes to whichever remaining player has the highest
 * score (in a 2-player game that's simply the other player, regardless of who was ahead).
 */
export declare function applyResign(state: GameState, playerId: string): void;
export declare function startNewGame(players: PlayerSetup[], rng?: () => number): GameState;
export declare function startNextRound(state: GameState, rng?: () => number): void;
export interface PublicPlayerState {
    id: string;
    name: string;
    handCount: number;
    hand?: Tile[];
    score: number;
    connected: boolean;
}
export interface PublicGameState {
    players: PublicPlayerState[];
    round: Omit<RoundState, 'well'> & {
        wellCount: number;
    };
    gameOver: boolean;
    winnerId?: string;
}
/** Strips other players' hands and the well's contents so a viewer only sees what
 *  they're allowed to: their own hand, everyone's hand *count*, and the well size. */
export declare function redactGameState(state: GameState, viewerId: string): PublicGameState;
