import { CellCoord, cellKey, cellsEqual, cellVertices, edgeNeighbors, ringAround } from './grid.js';
import { Tile, tileOrientations } from './tiles.js';

export interface PlacedTile {
  tileId: string;
  cell: CellCoord;
  /** values[i] sits at cellVertices(cell)[i] */
  values: [number, number, number];
}

/** Keyed by cellKey(cell). Plain object so it serializes cleanly over the wire. */
export type Board = Record<string, PlacedTile>;

export function emptyBoard(): Board {
  return {};
}

export function boardTiles(board: Board): PlacedTile[] {
  return Object.values(board);
}

function isAssignmentValid(board: Board, cell: CellCoord, values: [number, number, number]): boolean {
  const verts = cellVertices(cell);
  let touchesExisting = false;
  for (let i = 0; i < 3; i++) {
    for (const entry of ringAround(verts[i])) {
      if (cellsEqual(entry.cell, cell)) continue;
      const occ = board[cellKey(entry.cell)];
      if (!occ) continue;
      touchesExisting = true;
      if (occ.values[entry.vertexIndex] !== values[i]) return false;
    }
  }
  return touchesExisting;
}

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
export function emptyFringeCells(board: Board): CellCoord[] {
  if (Object.keys(board).length === 0) {
    return [{ q: 0, r: 0, orient: 'up' }];
  }
  const candidates = new Map<string, CellCoord>();
  for (const placed of boardTiles(board)) {
    for (const neighbor of edgeNeighbors(placed.cell)) {
      const k = cellKey(neighbor);
      if (!board[k]) candidates.set(k, neighbor);
    }
  }
  return [...candidates.values()];
}

/** All legal placements for a single tile against the current board. */
export function findLegalPlacements(tile: Tile, board: Board): Placement[] {
  if (Object.keys(board).length === 0) {
    return [{ cell: { q: 0, r: 0, orient: 'up' }, values: tile.values }];
  }

  const results: Placement[] = [];
  for (const cell of emptyFringeCells(board)) {
    // Only the tile's real rotations, chosen for this cell's winding -- never a flip.
    for (const perm of tileOrientations(tile.values, cell.orient === 'down')) {
      if (isAssignmentValid(board, cell, perm)) {
        results.push({ cell, values: perm });
        break; // any valid orientation scores identically; see design notes
      }
    }
  }
  return results;
}

export function hasAnyLegalPlacement(hand: Tile[], board: Board): boolean {
  return hand.some((t) => findLegalPlacements(t, board).length > 0);
}

export type BonusType = 'none' | 'bridge' | 'hexagon';

/** Scans the 3 vertices of a just-placed tile for bridge/hexagon formations. */
export function evaluateBonus(board: Board, cell: CellCoord, values: [number, number, number]): BonusType {
  const verts = cellVertices(cell);
  let bridge = false;

  for (let i = 0; i < 3; i++) {
    const ring = ringAround(verts[i]);
    const selfPos = ring.findIndex((e) => cellsEqual(e.cell, cell));
    if (selfPos < 0) continue;

    // Ring slots (excluding our own) already holding a tile that matches at this vertex.
    const occupied = ring.map((entry, idx) => {
      if (idx === selfPos) return false;
      const occ = board[cellKey(entry.cell)];
      return !!occ && occ.values[entry.vertexIndex] === values[i];
    });

    const occupiedCount = occupied.filter(Boolean).length;
    if (occupiedCount === 5) return 'hexagon'; // this tile closes the ring of six
    if (occupiedCount === 0) continue;

    // A vertex only has one valid number, so every occupied ring slot inevitably matches
    // our value -- that alone says nothing about whether we're bridging anything. What
    // actually makes a bridge is touching the vertex without either side of us being
    // flush against a neighbour: if EITHER immediate ring-neighbour is occupied, we're
    // just an ordinary flush extension/fill, no matter what else happens to be occupied
    // further round the ring (including tiles a genuine bridge already reached).
    const sharesAnEdge = occupied[(selfPos + 1) % 6] || occupied[(selfPos + 5) % 6];
    if (!sharesAnEdge) bridge = true;
  }

  return bridge ? 'bridge' : 'none';
}

export function placeTile(board: Board, tileId: string, cell: CellCoord, values: [number, number, number]): Board {
  return { ...board, [cellKey(cell)]: { tileId, cell, values } };
}
