import { describe, expect, it } from 'vitest';
import { scorePlay, scoreStartingTile, scoreStartingTileNoTriple } from '../src/scoring.js';

// Every number here is taken directly from the Pressman Deluxe Tri-Ominos rulebook's
// worked examples, to make sure our arithmetic matches the physical game exactly.
describe('rulebook worked examples', () => {
  it('starting with a triple: 4x3=12, +10 = 22', () => {
    const r = scoreStartingTile({ id: '4-4-4', values: [4, 4, 4] }, false);
    expect(r.total).toBe(22);
  });

  it('starting with 0-0-0: 0 +10 +30 = 40', () => {
    const r = scoreStartingTile({ id: '0-0-0', values: [0, 0, 0] }, true);
    expect(r.total).toBe(40);
  });

  it('starting with no triple in anyone\'s hand: 5+4+3=12, no bonus', () => {
    const r = scoreStartingTileNoTriple({ id: '3-4-5', values: [5, 4, 3] });
    expect(r.total).toBe(12);
  });

  it('plain match: 3+4+4=11', () => {
    expect(scorePlay({ id: '3-4-4', values: [3, 4, 4] }, 'none').total).toBe(11);
  });

  it('plain match: 5+5+2=12', () => {
    expect(scorePlay({ id: '2-5-5', values: [5, 5, 2] }, 'none').total).toBe(12);
  });

  it('hexagon: 0+5+5=10, +50 = 60', () => {
    expect(scorePlay({ id: '0-5-5', values: [0, 5, 5] }, 'hexagon').total).toBe(60);
  });

  it('bridge: 1+4+4=9, +40 = 49', () => {
    expect(scorePlay({ id: '1-4-4', values: [1, 4, 4] }, 'bridge').total).toBe(49);
  });

  it('bridge: 1+1+5=7, +40 = 47', () => {
    expect(scorePlay({ id: '1-1-5', values: [1, 1, 5] }, 'bridge').total).toBe(47);
  });
});
