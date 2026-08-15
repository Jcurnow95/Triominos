import { cellKey, cellsEqual, cellVertices, edgeNeighbors, ringAround } from './grid.js';
import { isWild, tileOrientations, valuesMatch } from './tiles.js';
export function emptyBoard() {
    return {};
}
export function boardTiles(board) {
    return Object.values(board);
}
/**
 * Checks an orientation against the board and returns the values it would actually be
 * placed with, or null if it doesn't fit. They can differ from what was passed in: an
 * "any" corner of a freestyle tile takes on whatever number its neighbours already hold,
 * so the board keeps a single settled value at that point. An "any" corner touching no
 * committed number stays wild, and any later tile may match it -- which is what makes
 * freestyle tiles good for closing bridges and hexagons.
 */
function resolveAssignment(board, cell, values) {
    const verts = cellVertices(cell);
    const resolved = [...values];
    let touchesExisting = false;
    for (let i = 0; i < 3; i++) {
        for (const entry of ringAround(verts[i])) {
            if (cellsEqual(entry.cell, cell))
                continue;
            const occ = board[cellKey(entry.cell)];
            if (!occ)
                continue;
            touchesExisting = true;
            const theirs = occ.values[entry.vertexIndex];
            // Compare against `resolved`, not `values`: once a wild corner has settled on a
            // number, a second neighbour demanding a different one is a genuine conflict.
            if (!valuesMatch(resolved[i], theirs))
                return null;
            if (isWild(resolved[i]))
                resolved[i] = theirs;
        }
    }
    return touchesExisting ? resolved : null;
}
/**
 * Every empty cell touching at least one already-placed tile -- the full set of spots
 * *some* tile could occupy next, before checking whether any particular tile's values
 * actually fit there. Used for "realism mode", where the board shows every cell you're
 * allowed to try placing on rather than narrowing it down to the ones that will work.
 */
export function emptyFringeCells(board) {
    if (Object.keys(board).length === 0) {
        return [{ q: 0, r: 0, orient: 'up' }];
    }
    const candidates = new Map();
    for (const placed of boardTiles(board)) {
        for (const neighbor of edgeNeighbors(placed.cell)) {
            const k = cellKey(neighbor);
            if (!board[k])
                candidates.set(k, neighbor);
        }
    }
    return [...candidates.values()];
}
/** All legal placements for a single tile against the current board. */
export function findLegalPlacements(tile, board) {
    if (Object.keys(board).length === 0) {
        return [{ cell: { q: 0, r: 0, orient: 'up' }, values: tile.values, printed: tile.values }];
    }
    const results = [];
    for (const cell of emptyFringeCells(board)) {
        // Only the tile's real rotations, chosen for this cell's winding -- never a flip.
        for (const perm of tileOrientations(tile.values, cell.orient === 'down')) {
            const resolved = resolveAssignment(board, cell, perm);
            if (resolved) {
                results.push({ cell, values: resolved, printed: perm });
                break; // any valid orientation scores identically; see design notes
            }
        }
    }
    return results;
}
export function hasAnyLegalPlacement(hand, board) {
    return hand.some((t) => findLegalPlacements(t, board).length > 0);
}
/** Scans the 3 vertices of a just-placed tile for bridge/hexagon formations. */
export function evaluateBonus(board, cell, values) {
    const verts = cellVertices(cell);
    let bridge = false;
    for (let i = 0; i < 3; i++) {
        const ring = ringAround(verts[i]);
        const selfPos = ring.findIndex((e) => cellsEqual(e.cell, cell));
        if (selfPos < 0)
            continue;
        // Ring slots (excluding our own) already holding a tile that matches at this vertex.
        const occupied = ring.map((entry, idx) => {
            if (idx === selfPos)
                return false;
            const occ = board[cellKey(entry.cell)];
            return !!occ && valuesMatch(occ.values[entry.vertexIndex], values[i]);
        });
        const occupiedCount = occupied.filter(Boolean).length;
        if (occupiedCount === 5)
            return 'hexagon'; // this tile closes the ring of six
        if (occupiedCount === 0)
            continue;
        // A vertex only has one valid number, so every occupied ring slot inevitably matches
        // our value -- that alone says nothing about whether we're bridging anything. What
        // actually makes a bridge is touching the vertex without either side of us being
        // flush against a neighbour: if EITHER immediate ring-neighbour is occupied, we're
        // just an ordinary flush extension/fill, no matter what else happens to be occupied
        // further round the ring (including tiles a genuine bridge already reached).
        const sharesAnEdge = occupied[(selfPos + 1) % 6] || occupied[(selfPos + 5) % 6];
        if (!sharesAnEdge)
            bridge = true;
    }
    return bridge ? 'bridge' : 'none';
}
export function placeTile(board, tileId, cell, values, 
/** The tile's corners as printed, before `resolveAssignment` settled any of them.
 *  Defaults to `values` for ordinary tiles, which have nothing to settle. */
printed = values) {
    return { ...board, [cellKey(cell)]: { tileId, cell, values, printed } };
}
/** True when this cell was played from a freestyle wildcard, however its corners settled. */
export function isPlacedFreestyle(placed) {
    return placed.printed.some(isWild);
}
/**
 * Which of this cell's corners were printed "any" -- the ones that should still read as
 * wild on the board. A corner that settled onto a neighbour's number keeps that number
 * (players need to see what it matches), but stays flagged here so it can be drawn as the
 * wildcard it was played as rather than as an ordinary printed digit.
 */
export function placedWildCorners(placed) {
    return placed.printed.map(isWild);
}
//# sourceMappingURL=board.js.map