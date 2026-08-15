import { CellCoord } from './grid.js';
import { Tile } from './tiles.js';
export interface PlacedTile {
    tileId: string;
    cell: CellCoord;
    /** values[i] sits at cellVertices(cell)[i] */
    values: [number, number, number];
    /**
     * The tile's corners exactly as printed on it, before `resolveAssignment` settled any
     * of them. For an ordinary tile this is identical to `values`; for a freestyle it keeps
     * the WILD markers, so the board can still tell which corners were played as wildcards
     * after they've settled onto real numbers and would otherwise be indistinguishable from
     * an ordinary printed tile.
     */
    printed: [number, number, number];
}
/** Keyed by cellKey(cell). Plain object so it serializes cleanly over the wire. */
export type Board = Record<string, PlacedTile>;
export declare function emptyBoard(): Board;
export declare function boardTiles(board: Board): PlacedTile[];
export interface Placement {
    cell: CellCoord;
    values: [number, number, number];
    /**
     * The same corners before `resolveAssignment` settled any of them, in the rotation this
     * placement uses. Kept alongside `values` because a tile is rotated to fit, so the
     * tile's own `values` order does not line up with the placed one -- pairing them up here
     * is what lets a played freestyle mark the right corners as wild.
     */
    printed: [number, number, number];
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
export declare function placeTile(board: Board, tileId: string, cell: CellCoord, values: [number, number, number], 
/** The tile's corners as printed, before `resolveAssignment` settled any of them.
 *  Defaults to `values` for ordinary tiles, which have nothing to settle. */
printed?: [number, number, number]): Board;
/** True when this cell was played from a freestyle wildcard, however its corners settled. */
export declare function isPlacedFreestyle(placed: PlacedTile): boolean;
/**
 * Which of this cell's corners were printed "any" -- the ones that should still read as
 * wild on the board. A corner that settled onto a neighbour's number keeps that number
 * (players need to see what it matches), but stays flagged here so it can be drawn as the
 * wildcard it was played as rather than as an ordinary printed digit.
 */
export declare function placedWildCorners(placed: PlacedTile): [boolean, boolean, boolean];
