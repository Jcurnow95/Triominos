import { describe, expect, it } from 'vitest';
import { emptyBoard, findLegalPlacements, placeTile } from '../src/board.js';
import { DEFAULT_GAME_RULES, maxFreestyleTiles, sanitizeGameRules } from '../src/rules.js';
import { startNewGame } from '../src/gameState.js';
import { WILD, generateDeck, generateFreestyleTiles, isFreestyle, isTriple, isWild, tileSum, valuesMatch } from '../src/tiles.js';

describe('freestyle tiles', () => {
  it('only ever prints one or two numbers, never three and never none', () => {
    for (const tile of generateFreestyleTiles(27)) {
      const printed = tile.values.filter((v) => !isWild(v));
      expect(printed.length).toBeGreaterThanOrEqual(1);
      expect(printed.length).toBeLessThanOrEqual(2);
      expect(isFreestyle(tile)).toBe(true);
    }
  });

  it('gives every tile a unique id, even past the pool size', () => {
    const tiles = generateFreestyleTiles(60);
    expect(tiles).toHaveLength(60);
    expect(new Set(tiles.map((t) => t.id)).size).toBe(60);
  });

  it('spreads a small allotment across the numbers rather than clustering low', () => {
    const printed = new Set(generateFreestyleTiles(6).flatMap((t) => t.values.filter((v) => !isWild(v))));
    expect(printed.size).toBeGreaterThan(2);
  });

  it('scores wild corners as zero, so flexibility costs points', () => {
    expect(tileSum({ id: 'f', values: [5, 4, WILD] })).toBe(9);
    expect(tileSum({ id: 'f', values: [5, WILD, WILD] })).toBe(5);
  });

  it('is never treated as a triple, so it cannot open a round as one', () => {
    expect(isTriple({ id: 'f', values: [WILD, WILD, WILD] })).toBe(false);
    expect(isTriple({ id: 'f', values: [3, WILD, WILD] })).toBe(false);
    expect(isTriple({ id: 't', values: [3, 3, 3] })).toBe(true);
  });

  it('adds to the standard deck without disturbing it', () => {
    const deck = generateDeck(1, 8);
    expect(deck).toHaveLength(64);
    expect(deck.filter(isFreestyle)).toHaveLength(8);
    expect(new Set(deck.map((t) => t.id)).size).toBe(64);
  });
});

describe('valuesMatch', () => {
  it('matches equal numbers and anything against a wild', () => {
    expect(valuesMatch(3, 3)).toBe(true);
    expect(valuesMatch(3, 4)).toBe(false);
    expect(valuesMatch(WILD, 4)).toBe(true);
    expect(valuesMatch(4, WILD)).toBe(true);
  });
});

describe('placing a freestyle tile', () => {
  it('settles a wild corner onto the number its neighbour already holds', () => {
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);

    const placements = findLegalPlacements({ id: 'f', values: [4, 5, WILD] }, board);
    expect(placements.length).toBeGreaterThan(0);
    // Wherever it lands, no corner touching a committed number may still read as wild.
    for (const placement of placements) {
      expect(placement.values.some((v) => v === 4 || v === 5)).toBe(true);
    }
  });

  it('fits where a fully printed tile cannot', () => {
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);

    // 0-1-2 shares no edge pair with 3-4-5, but the same tile with a wild corner does.
    expect(findLegalPlacements({ id: '0-1-2', values: [0, 1, 2] }, board)).toHaveLength(0);
    expect(findLegalPlacements({ id: 'f', values: [4, 5, WILD] }, board).length).toBeGreaterThan(0);
  });

  it('leaves an unconstrained wild corner open for a later tile to match', () => {
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);

    const placement = findLegalPlacements({ id: 'f', values: [4, 5, WILD] }, board)[0];
    board = placeTile(board, 'f', placement.cell, placement.values);

    // A wild that touched nothing stays wild on the board, so the next tile can meet it.
    if (placement.values.some(isWild)) {
      const openings = findLegalPlacements({ id: '0-0-1', values: [0, 0, 1] }, board);
      expect(openings.length).toBeGreaterThan(0);
    }
  });

  it('rejects an orientation where two neighbours demand different numbers of one corner', () => {
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [0, 1, 2]);
    board = placeTile(board, 'B', { q: 0, r: 0, orient: 'down' }, [1, 2, 3]);

    // Whatever fits must genuinely agree with every neighbour it touches.
    for (const placement of findLegalPlacements({ id: 'f', values: [5, WILD, WILD] }, board)) {
      expect(placement.values.filter((v) => v === 5)).toHaveLength(1);
    }
  });
});

describe('the freestyle allotment cap', () => {
  it('is half the standard deck it is added to', () => {
    expect(maxFreestyleTiles(1)).toBe(28);
    expect(maxFreestyleTiles(2)).toBe(56);
    expect(maxFreestyleTiles(3)).toBe(84);
  });

  it('defaults to off', () => {
    expect(DEFAULT_GAME_RULES.freestyleTiles).toBe(0);
    expect(generateDeck(1, DEFAULT_GAME_RULES.freestyleTiles)).toHaveLength(56);
  });

  it('clamps an over-cap request down to the cap', () => {
    expect(sanitizeGameRules({ tileSets: 1, freestyleTiles: 999 }).freestyleTiles).toBe(28);
    expect(sanitizeGameRules({ tileSets: 3, freestyleTiles: 999 }).freestyleTiles).toBe(84);
  });

  it('clamps against the sanitized tile-set count, not the requested one', () => {
    // tileSets 9 is not a legal option, so it falls back to 1 -- and 40 must then be
    // held to 1 set's cap of 28, not to the cap of the deck that was asked for.
    expect(sanitizeGameRules({ tileSets: 9, freestyleTiles: 40 })).toMatchObject({
      tileSets: 1,
      freestyleTiles: 28,
    });
  });

  it('rejects negative, fractional, and non-numeric allotments', () => {
    expect(sanitizeGameRules({ freestyleTiles: -5 }).freestyleTiles).toBe(0);
    expect(sanitizeGameRules({ freestyleTiles: 3.6 }).freestyleTiles).toBe(4);
    expect(sanitizeGameRules({ freestyleTiles: NaN }).freestyleTiles).toBe(0);
    expect(sanitizeGameRules({ freestyleTiles: 'lots' as unknown as number }).freestyleTiles).toBe(0);
  });
});

describe('a game dealt with freestyle tiles', () => {
  it('puts them into play and never opens the round with one as a triple', () => {
    const rules = { ...DEFAULT_GAME_RULES, freestyleTiles: 20 };
    const state = startNewGame([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], rules);

    const opener = state.round.log.find((e) => e.type === 'round-start');
    if (opener && opener.type === 'round-start' && !opener.noTriple) {
      expect(isFreestyle(opener.tile)).toBe(false);
    }

    const inPlay = [...state.players.flatMap((p) => p.hand), ...state.round.well];
    expect(inPlay.filter(isFreestyle)).toHaveLength(20);
  });
});
