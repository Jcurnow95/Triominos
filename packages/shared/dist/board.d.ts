import { CellCoord } from './grid.js';
import { Tile } from './tiles.js';
export interface PlacedTile {
    tileId: string;
    cell: CellCoord;
    /** values[i] sits at cellVertices(cell)[i] */
    values: [number, number, number];
}
/** Keyed by cellKey(cell). Plain object so it serializes cleanly over the wire. */
export type Board = Record<string, PlacedTile>;
export declare function emptyBoard(): Board;
export declare function boardTiles(board: Board): PlacedTile[];
export interface Placement {
    cell: CellCoord;
    values: [number, number, number];
}
/** All legal placements for a single tile against the current board. */
export declare function findLegalPlacements(tile: Tile, board: Board): Placement[];
export declare function hasAnyLegalPlacement(hand: Tile[], board: Board): boolean;
export type BonusType = 'none' | 'bridge' | 'hexagon';
/** Scans the 3 vertices of a just-placed tile for bridge/hexagon formations. */
export declare function evaluateBonus(board: Board, cell: CellCoord, values: [number, number, number]): BonusType;
export declare function placeTile(board: Board, tileId: string, cell: CellCoord, values: [number, number, number]): Board;
