import { describe, expect, it } from 'vitest';
import { CellCoord, cellKey, cellVertices, cellsEqual, edgeNeighbors, ringAround, vertexKey, vertexPoint } from '../src/grid.js';

/** Signed area x2; its sign is the winding direction of cellVertices' ordering. */
function signedArea(cell: CellCoord): number {
  const [a, b, c] = cellVertices(cell).map(vertexPoint);
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

describe('grid geometry', () => {
  it('edgeNeighbors is symmetric: if B is a neighbor of A, A is a neighbor of B', () => {
    const cells = [
      { q: 0, r: 0, orient: 'up' as const },
      { q: 2, r: -1, orient: 'down' as const },
      { q: -3, r: 4, orient: 'up' as const },
    ];
    for (const c of cells) {
      for (const n of edgeNeighbors(c)) {
        const backNeighbors = edgeNeighbors(n);
        expect(backNeighbors.some((b) => cellsEqual(b, c))).toBe(true);
      }
    }
  });

  it('edgeNeighbors share exactly 2 vertices with the cell', () => {
    const c = { q: 1, r: 1, orient: 'up' as const };
    const myVerts = new Set(cellVertices(c).map(vertexKey));
    for (const n of edgeNeighbors(c)) {
      const theirVerts = new Set(cellVertices(n).map(vertexKey));
      const shared = [...myVerts].filter((v) => theirVerts.has(v));
      expect(shared).toHaveLength(2);
    }
  });

  it('ringAround returns 6 distinct cells that all actually touch the vertex', () => {
    const v = { q: 0, r: 0 };
    const ring = ringAround(v);
    expect(ring).toHaveLength(6);
    const keys = new Set(ring.map((e) => cellKey(e.cell)));
    expect(keys.size).toBe(6);
    for (const entry of ring) {
      const verts = cellVertices(entry.cell);
      expect(vertexKey(verts[entry.vertexIndex])).toBe(vertexKey(v));
    }
  });

  it('lists up and down cells with opposite winding', () => {
    // tileOrientations relies on this: it reverses a tile's rotation cycle for down
    // cells precisely because their vertices are enumerated the other way round. If this
    // ever flips, tile chirality silently breaks.
    for (const [q, r] of [[0, 0], [2, -1], [-3, 4]] as const) {
      const up = signedArea({ q, r, orient: 'up' });
      const down = signedArea({ q, r, orient: 'down' });
      expect(Math.sign(up)).toBe(-Math.sign(down));
      expect(up).not.toBe(0);
    }
  });

  it('ringAround entries are cyclically edge-adjacent to their neighbors', () => {
    const ring = ringAround({ q: 2, r: -1 });
    for (let i = 0; i < 6; i++) {
      const a = ring[i].cell;
      const b = ring[(i + 1) % 6].cell;
      const neighbors = edgeNeighbors(a);
      expect(neighbors.some((n) => cellsEqual(n, b))).toBe(true);
    }
  });
});
