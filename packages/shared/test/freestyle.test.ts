import { describe, expect, it } from 'vitest';
import { emptyBoard, findLegalPlacements, isPlacedFreestyle, placeTile, placedWildCorners } from '../src/board.js';
import { cellKey } from '../src/grid.js';
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

describe('a placed freestyle keeps its wildcard identity', () => {
  it('remembers which corners were printed wild after they settle', () => {
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);

    const placement = findLegalPlacements({ id: 'f', values: [4, 5, WILD] }, board)[0];
    board = placeTile(board, 'f', placement.cell, placement.values, placement.printed);

    const placed = board[cellKey(placement.cell)];
    expect(isPlacedFreestyle(placed)).toBe(true);
    // Exactly the corner printed "any" is flagged, in the rotation the tile was laid at.
    expect(placedWildCorners(placed).filter(Boolean)).toHaveLength(1);
    const wildIndex = placedWildCorners(placed).indexOf(true);
    expect(isWild(placement.printed[wildIndex])).toBe(true);
  });

  it('lines the printed corners up with the rotation the placement actually uses', () => {
    let board = emptyBoard();
    board = placeTile(board, 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);

    // A tile is rotated to fit, so `printed` has to be rotated with it. If it were taken
    // straight off the tile the wild flag would land on whichever corner happened to share
    // that index, marking a printed number as wild and vice versa.
    for (const placement of findLegalPlacements({ id: 'f', values: [4, 5, WILD] }, board)) {
      expect(placement.printed).toHaveLength(3);
      // Exactly one corner was printed wild, and wherever it is, that is the only index
      // allowed to differ between printed and settled values.
      expect(placement.printed.filter(isWild)).toHaveLength(1);
      for (let i = 0; i < 3; i++) {
        if (!isWild(placement.printed[i])) {
          expect(placement.values[i]).toBe(placement.printed[i]);
        }
      }
    }
  });

  it('treats an ordinary tile as having no wild corners', () => {
    const board = placeTile(emptyBoard(), 'A', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const placed = board[cellKey({ q: 0, r: 0, orient: 'up' })];
    expect(isPlacedFreestyle(placed)).toBe(false);
    expect(placedWildCorners(placed)).toEqual([false, false, false]);
  });

  it('leaves a freestyle played in the open fully wild, and keeps it that way', () => {
    const printed: [number, number, number] = [4, WILD, WILD];
    let board = placeTile(emptyBoard(), 'F', { q: 0, r: 0, orient: 'up' }, printed, printed);

    const openKey = cellKey({ q: 0, r: 0, orient: 'up' });
    expect(board[openKey].values).toEqual([4, WILD, WILD]);

    // Placing a neighbour against it must not retroactively settle the open tile's corners.
    const neighbour = findLegalPlacements({ id: 'n', values: [1, 2, 3] }, board)[0];
    board = placeTile(board, 'n', neighbour.cell, neighbour.values);

    expect(board[openKey].values).toEqual([4, WILD, WILD]);
    expect(placedWildCorners(board[openKey])).toEqual([false, true, true]);
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
