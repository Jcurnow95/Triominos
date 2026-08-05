import { describe, expect, it } from 'vitest';
import { generateDeck, isTriple, tileOrientations, tileSum } from '../src/tiles.js';

describe('generateDeck', () => {
  it('produces exactly 56 unique tiles', () => {
    const deck = generateDeck();
    expect(deck).toHaveLength(56);
    expect(new Set(deck.map((t) => t.id)).size).toBe(56);
  });

  it('has exactly 6 triples (0-0-0 through 5-5-5)', () => {
    const deck = generateDeck();
    const triples = deck.filter(isTriple);
    expect(triples).toHaveLength(6);
  });

  it('sums values correctly', () => {
    expect(tileSum({ id: '1-4-5', values: [1, 4, 5] })).toBe(10);
  });

  it('combines multiple sets into one deck with unique, disambiguated ids', () => {
    const deck = generateDeck(3);
    expect(deck).toHaveLength(168);
    expect(new Set(deck.map((t) => t.id)).size).toBe(168);
    // Every tile's values still appear exactly 3 times (one per set).
    const key = (t: { values: [number, number, number] }) => t.values.join('-');
    const counts = new Map<string, number>();
    for (const t of deck) counts.set(key(t), (counts.get(key(t)) ?? 0) + 1);
    expect([...counts.values()]).toEqual(Array(56).fill(3));
  });

  it('setCount 1 keeps the original bare ids', () => {
    expect(generateDeck(1)).toEqual(generateDeck());
  });
});

describe('tileOrientations', () => {
  it('gives 3 rotations for distinct values, never 6', () => {
    // A tile is printed on one face: it turns, it does not flip. Six would mean we were
    // also offering its mirror image, which is a different tile and not in the box.
    expect(tileOrientations([1, 2, 3], false)).toEqual([[1, 2, 3], [2, 3, 1], [3, 1, 2]]);
  });

  it('gives the mirrored cycle for reversed-winding cells', () => {
    expect(tileOrientations([1, 2, 3], true)).toEqual([[1, 3, 2], [3, 2, 1], [2, 1, 3]]);
  });

  it('never offers a reflection within one winding', () => {
    const forward = tileOrientations([1, 2, 3], false).map((p) => p.join(''));
    // 132 is 123 flipped over; it must not appear among the same cell type's options.
    expect(forward).not.toContain('132');
    expect(forward).not.toContain('321');
    expect(forward).not.toContain('213');
  });

  it('collapses duplicates: 3 for a pair, 1 for a triple', () => {
    expect(tileOrientations([1, 1, 3], false)).toHaveLength(3);
    expect(tileOrientations([4, 4, 4], false)).toHaveLength(1);
  });
});
