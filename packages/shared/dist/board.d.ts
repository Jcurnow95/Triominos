import { CellCoord } from './grid.js';
import { Tile } from './tiles.js';
export interface PlacedTile {
    tileId: string;
    cell: CellCoord;
    /** values[i] sits at cellVertices(cell)[i] */
    values: [number, number, number];
    /**
     * True when the tile that was placed here started as a freestyle wildcard. Its "any"
     * corners may since have settled onto real numbers (see `resolveAssignment`), which
     * would otherwise make it indistinguishable from an ordinary printed tile -- this is
     * what lets the board keep marking it as one after the fact.
     */
    freestyle: boolean;
}
/** Keyed by cellKey(cell). Plain object so it serializes cleanly over the wire. */
export type Board = Record<string, PlacedTile>;
export declare function emptyBoard(): Board;
export declare function boardTiles(board: Board): PlacedTile[];
export interface Placement {
    cell: CellCoord;
    values: [number, number, number];
}
/**
 * Every empty cell touching at least one already-placed tile -- the full set of spots
 * *some* tile could occupy next, before checking whether any particular tile's values
 * actually fit there. Used for "realism mode", where the board shows every cell you're
 * allowed to try placing on rather than narrowing it down to the ones that will work.
 */
export declare function emptyFringeCells(board: Board): CellCoord[];
/** All legal placements for a single tile against the current board. */
export declare function findLegalPlacements(tile: Tile, board: Board): Placement[];
export declare function hasAnyLegalPlacement(hand: Tile[], board: Board): boolean;
export type BonusType = 'none' | 'bridge' | 'hexagon';
/** Scans the 3 vertices of a just-placed tile for bridge/hexagon formations. */
export declare function evaluateBonus(board: Board, cell: CellCoord, values: [number, number, number]): BonusType;
export declare function placeTile(board: Board, tileId: string, cell: CellCoord, values: [number, number, number], freestyle?: boolean): Board;
