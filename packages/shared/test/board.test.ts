import { describe, expect, it } from 'vitest';
import { emptyBoard, evaluateBonus, findLegalPlacements, placeTile } from '../src/board.js';
import { CellCoord, cellKey } from '../src/grid.js';
import { generateDeck, tileOrientations } from '../src/tiles.js';

describe('findLegalPlacements', () => {
  it('allows any orientation for the very first tile on an empty board', () => {
    const placements = findLegalPlacements({ id: '1-2-3', values: [1, 2, 3] }, emptyBoard());
    expect(placements).toHaveLength(1);
    expect(placements[0].cell).toEqual({ q: 0, r: 0, orient: 'up' });
  });

  it('finds a placement that matches an edge of an existing tile', () => {
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    // Edge (1,0)-(0,1) of up(0,0) carries 4 then 5, so a neighbour must read 4,5,x.
    // 4-4-5 can rotate into that; a tile like 2-4-5 could only do it by flipping over.
    const placements = findLegalPlacements({ id: '4-4-5', values: [4, 4, 5] }, board);
    expect(placements.length).toBeGreaterThan(0);
  });

  it('only ever offers rotations of the tile, never a mirrored one', () => {
    // Every returned placement must be one of the tile's 3 rotations as seen in that
    // cell's winding. A physical tile cannot be turned over, so a reflection means the
    // engine has silently rearranged the numbers to force a fit.
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    board = placeTile(board, 'B', { q: 0, r: 0, orient: 'down' }, [4, 5, 1]);

    for (const tile of generateDeck()) {
      for (const placement of findLegalPlacements(tile, board)) {
        const allowed = tileOrientations(tile.values, placement.cell.orient === 'down');
        expect(
          allowed.some((o) => o.join(',') === placement.values.join(',')),
          `${tile.id} at ${cellKey(placement.cell)} placed as ${placement.values.join(',')}`,
        ).toBe(true);
      }
    }
  });

  it('rejects a tile that cannot match any exposed edge', () => {
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    // No edge of up(0,0) exposes the pair (0,1) together with a lone unmatched third value.
    const placements = findLegalPlacements({ id: '0-1-2', values: [0, 1, 2] }, board);
    expect(placements).toHaveLength(0);
  });
});

describe('evaluateBonus around a shared vertex', () => {
  // The six cells meeting at vertex (0,0), in cyclic order, each carrying a matching 0
  // at that vertex. Cyclically adjacent entries share a full edge.
  const ring: { cell: CellCoord; values: [number, number, number] }[] = [
    { cell: { q: 0, r: 0, orient: 'up' }, values: [2, 0, 0] },
    { cell: { q: -1, r: 0, orient: 'down' }, values: [2, 0, 0] },
    { cell: { q: -1, r: 0, orient: 'up' }, values: [0, 2, 0] },
    { cell: { q: -1, r: -1, orient: 'down' }, values: [0, 0, 2] },
    { cell: { q: 0, r: -1, orient: 'up' }, values: [0, 0, 2] },
    { cell: { q: 0, r: -1, orient: 'down' }, values: [0, 2, 0] },
  ];

  function boardWith(indices: number[]) {
    let board = emptyBoard();
    for (const i of indices) board = placeTile(board, `t${i}`, ring[i].cell, ring[i].values);
    return board;
  }

  it('scores nothing extra while a solid fan grows around the vertex', () => {
    // Regression: a contiguous run of tiles is never a bridge, however long it gets.
    // Treating it as one made almost every ordinary play score +40.
    let board = emptyBoard();
    for (let i = 0; i < 5; i++) {
      expect(evaluateBonus(board, ring[i].cell, ring[i].values), `step ${i}`).toBe('none');
      board = placeTile(board, `t${i}`, ring[i].cell, ring[i].values);
    }
  });

  it('scores a hexagon for the sixth tile that closes the ring', () => {
    const board = boardWith([0, 1, 2, 3, 4]);
    expect(evaluateBonus(board, ring[5].cell, ring[5].values)).toBe('hexagon');
  });

  it('scores a bridge when the new tile meets an existing one only at the point', () => {
    const board = boardWith([2]);
    expect(evaluateBonus(board, ring[0].cell, ring[0].values)).toBe('bridge');
  });

  it('scores nothing for the tile that flush-fills the last gap between two groups', () => {
    // Regression: ring[1] is edge-adjacent to both ring[0] and ring[2], so placing it
    // leaves no point-only contact anywhere -- it's an ordinary flush connection, not a
    // bridge, even though ring[0] and ring[2] were built up independently. Scoring this
    // as a bridge was the bug: every tile that later completed a gap next to a real
    // bridge kept re-triggering the bonus.
    const board = boardWith([0, 2]);
    expect(evaluateBonus(board, ring[1].cell, ring[1].values)).toBe('none');
  });

  it('scores nothing for a tile flush on one side that also happens to match a distant tile', () => {
    // Regression: every occupied ring slot inevitably carries the same value (a vertex
    // only has one valid number), so "also matches a tile elsewhere in the ring" is true
    // almost by definition once a vertex is busy -- it says nothing about whether *this*
    // tile is bridging anything. ring[1] is flush against ring[0]; that ring[3] happens to
    // sit on the far side, unconnected, doesn't change that ring[1] itself touches nothing
    // except by a real edge. Scoring this as a bridge was the bug: once a genuine bridge
    // (ring[3], placed with both flanks empty) sat at this vertex, every later tile that
    // simply extended the fan next to it kept re-triggering the bonus.
    const board = boardWith([0, 3]);
    expect(evaluateBonus(board, ring[1].cell, ring[1].values)).toBe('none');
  });

  it('scores a bridge only for the tile that actually spans the gap, not later flush neighbours', () => {
    const board = boardWith([0]);
    // ring[3] touches ring[0]'s value with both its own flanks (2 and 4) empty -- a
    // genuine point-only bridge.
    expect(evaluateBonus(board, ring[3].cell, ring[3].values), 'ring[3] bridges').toBe('bridge');
    const withBridge = placeTile(board, 't3', ring[3].cell, ring[3].values);
    // ring[4] is edge-flush against the bridge tile (ring[3]); it must not inherit the
    // bonus just because ring[3]'s far side still isn't connected to ring[0..2].
    expect(evaluateBonus(withBridge, ring[4].cell, ring[4].values), 'ring[4] is flush, not a bridge').toBe('none');
  });

  it('scores nothing for a plain two-tile edge match', () => {
    const board = boardWith([0]);
    expect(evaluateBonus(board, ring[1].cell, ring[1].values)).toBe('none');
  });
});
