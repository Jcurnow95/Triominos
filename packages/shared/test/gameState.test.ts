import { describe, expect, it } from 'vitest';
import { emptyBoard, findLegalPlacements, placeTile } from '../src/board.js';
import {
  GameState,
  applyDrawFromWell,
  applyNoMovePenalty,
  applyPlaceTile,
  applyResign,
  currentPlayerId,
  handSizeFor,
  startNewGame,
} from '../src/gameState.js';
import { DEFAULT_GAME_RULES } from '../src/rules.js';

// Deterministic PRNG (mulberry32) so dealt hands are reproducible across runs.
function seededRng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('handSizeFor', () => {
  it('matches the rulebook for 2-4 players, extended sizing for 5-6', () => {
    expect(handSizeFor(2)).toBe(9);
    expect(handSizeFor(3)).toBe(7);
    expect(handSizeFor(4)).toBe(7);
    expect(handSizeFor(5)).toBe(6);
    expect(handSizeFor(6)).toBe(6);
  });
});

describe('startNewGame', () => {
  it('deals all 56 tiles between hands, well, and the opening board tile', () => {
    const state = startNewGame(
      [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      DEFAULT_GAME_RULES,
      seededRng(42),
    );
    const handTotal = state.players.reduce((s, p) => s + p.hand.length, 0);
    const boardTotal = Object.keys(state.round.board).length;
    expect(handTotal + state.round.well.length + boardTotal).toBe(56);
    expect(boardTotal).toBe(1);
  });

  it('awards the opening player a nonzero score and sets a valid current turn', () => {
    const state = startNewGame(
      [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      DEFAULT_GAME_RULES,
      seededRng(7),
    );
    if (state.round.phase === 'awaiting-starter-choice') return; // rare edge case, covered separately
    const totalScore = state.players.reduce((s, p) => s + p.score, 0);
    expect(totalScore).toBeGreaterThan(0);
    expect(state.round.turnOrder).toContain(state.round.turnOrder[state.round.currentPlayerIndex]);
  });
});

describe('applyPlaceTile', () => {
  it('scores the play and ends the round with the going-out bonus when a hand empties', () => {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const winningTile = { id: '4-4-5', values: [4, 4, 5] as [number, number, number] };
    const [placement] = findLegalPlacements(winningTile, board);
    expect(placement).toBeDefined();

    const state: GameState = {
      players: [
        { id: 'p1', name: 'Alice', hand: [winningTile], score: 0, connected: true },
        { id: 'p2', name: 'Bob', hand: [{ id: '0-1-2', values: [0, 1, 2] }], score: 0, connected: true },
      ],
      round: {
        roundNumber: 1,
        phase: 'playing',
        board,
        well: [],
        turnOrder: ['p1', 'p2'],
        currentPlayerIndex: 0,
        passStreak: 0,
        log: [],
      },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };

    const result = applyPlaceTile(state, 'p1', '4-4-5', placement.cell);
    expect(result.score.total).toBe(4 + 4 + 5); // plain match, no bonus at this vertex config
    expect(result.roundEnded).toBe(true);
    expect(state.round.phase).toBe('round-ended');
    // Alice: her play score + 25 going-out bonus + Bob's stranded 0+1+2=3
    expect(state.players[0].score).toBe(13 + 25 + 3);
  });

  it('rejects a placement when it is not that player\'s turn', () => {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const state: GameState = {
      players: [
        { id: 'p1', name: 'Alice', hand: [{ id: '4-4-5', values: [4, 4, 5]}], score: 0, connected: true },
        { id: 'p2', name: 'Bob', hand: [], score: 0, connected: true },
      ],
      round: { roundNumber: 1, phase: 'playing', board, well: [], turnOrder: ['p1', 'p2'], currentPlayerIndex: 1, passStreak: 0, log: [] },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };
    expect(() => applyPlaceTile(state, 'p1', '4-4-5', { q: 0, r: -1, orient: 'up' })).toThrow(/turn/i);
  });
});

describe('draw cap house rule', () => {
  function stuckState(wellSize: number): GameState {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    // 0-1-2 can never match this board, so the player stays stuck however much they draw.
    const well = Array.from({ length: wellSize }, (_, i) => ({
      id: `w${i}`,
      values: [0, 0, 1] as [number, number, number],
    }));
    return {
      players: [
        { id: 'p1', name: 'Alice', hand: [{ id: '0-1-2', values: [0, 1, 2] }], score: 100, connected: true },
        { id: 'p2', name: 'Bob', hand: [{ id: '0-0-1', values: [0, 0, 1] }], score: 100, connected: true },
      ],
      round: {
        roundNumber: 1, phase: 'playing', board, well,
        turnOrder: ['p1', 'p2'], currentPlayerIndex: 0, passStreak: 0, drawsThisTurn: 0, log: [],
      },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };
  }

  it('refuses a pass until the player has drawn 3 tiles', () => {
    const state = stuckState(20);
    expect(() => applyNoMovePenalty(state, 'p1')).toThrow(/draw from the well first/i);
    applyDrawFromWell(state, 'p1');
    expect(() => applyNoMovePenalty(state, 'p1')).toThrow(/draw from the well first/i);
    applyDrawFromWell(state, 'p1');
    applyDrawFromWell(state, 'p1');
    expect(state.round.drawsThisTurn).toBe(3);
    expect(() => applyNoMovePenalty(state, 'p1')).not.toThrow();
  });

  it('caps drawing at 3 a turn even with a full well', () => {
    const state = stuckState(20);
    applyDrawFromWell(state, 'p1');
    applyDrawFromWell(state, 'p1');
    applyDrawFromWell(state, 'p1');
    expect(() => applyDrawFromWell(state, 'p1')).toThrow(/already drawn/i);
    expect(state.round.well).toHaveLength(17);
    expect(state.players[0].score).toBe(100 - 15); // three draws at -5
  });

  it('allows the pass immediately when the well is empty', () => {
    const state = stuckState(0);
    expect(() => applyNoMovePenalty(state, 'p1')).not.toThrow();
    expect(state.players[0].score).toBe(90);
  });

  it('resets the draw allowance when the turn passes on', () => {
    const state = stuckState(20);
    applyDrawFromWell(state, 'p1');
    applyDrawFromWell(state, 'p1');
    applyDrawFromWell(state, 'p1');
    applyNoMovePenalty(state, 'p1');
    expect(currentPlayerId(state.round)).toBe('p2');
    expect(state.round.drawsThisTurn).toBe(0);
  });

  it('does not end the round while tiles remain to draw', () => {
    const state = stuckState(9);
    for (const id of ['p1', 'p2']) {
      applyDrawFromWell(state, id);
      applyDrawFromWell(state, id);
      applyDrawFromWell(state, id);
      const res = applyNoMovePenalty(state, id);
      expect(res.roundEnded).toBe(false); // 3 tiles still in the well
    }
    expect(state.round.phase).toBe('playing');
  });
});

describe('applyResign', () => {
  function twoPlayerState(scores: [number, number]): GameState {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    return {
      players: [
        { id: 'p1', name: 'Alice', hand: [], score: scores[0], connected: true },
        { id: 'p2', name: 'Bob', hand: [], score: scores[1], connected: true },
      ],
      round: { roundNumber: 1, phase: 'playing', board, well: [], turnOrder: ['p1', 'p2'], currentPlayerIndex: 0, passStreak: 0, log: [] },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };
  }

  it('ends the game immediately, awarding the win to the other player even if they were behind', () => {
    const state = twoPlayerState([200, 50]); // Alice is winning on points
    applyResign(state, 'p1'); // Alice quits anyway
    expect(state.gameOver).toBe(true);
    expect(state.winnerId).toBe('p2'); // Bob wins by forfeit, despite the lower score
    expect(state.round.phase).toBe('round-ended');
    expect(state.round.log.map((e) => e.type)).toEqual(['resigned', 'game-end']);
  });

  it('awards the highest-scoring remaining player in a 3+ player game', () => {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const state: GameState = {
      players: [
        { id: 'p1', name: 'Alice', hand: [], score: 10, connected: true },
        { id: 'p2', name: 'Bob', hand: [], score: 80, connected: true },
        { id: 'p3', name: 'Cara', hand: [], score: 40, connected: true },
      ],
      round: { roundNumber: 1, phase: 'playing', board, well: [], turnOrder: ['p1', 'p2', 'p3'], currentPlayerIndex: 0, passStreak: 0, log: [] },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };
    applyResign(state, 'p3');
    expect(state.winnerId).toBe('p2');
  });

  it('refuses to resign a game that has already ended', () => {
    const state = twoPlayerState([50, 50]);
    applyResign(state, 'p1');
    expect(() => applyResign(state, 'p2')).toThrow(/already over/i);
  });
});

describe('GameRules', () => {
  it('deals from a bigger combined deck when tileSets > 1', () => {
    const state = startNewGame(
      [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
      { ...DEFAULT_GAME_RULES, tileSets: 2 },
      seededRng(1),
    );
    const handTotal = state.players.reduce((s, p) => s + p.hand.length, 0);
    const boardTotal = Object.keys(state.round.board).length;
    expect(handTotal + state.round.well.length + boardTotal).toBe(112);
  });

  it('ends the game at a custom winning score instead of the 400 default', () => {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const winningTile = { id: '4-4-5', values: [4, 4, 5] as [number, number, number] };
    const [placement] = findLegalPlacements(winningTile, board);
    const state: GameState = {
      players: [
        { id: 'p1', name: 'Alice', hand: [winningTile], score: 90, connected: true },
        { id: 'p2', name: 'Bob', hand: [{ id: '0-1-2', values: [0, 1, 2] }], score: 0, connected: true },
      ],
      round: {
        roundNumber: 1, phase: 'playing', board, well: [],
        turnOrder: ['p1', 'p2'], currentPlayerIndex: 0, passStreak: 0, log: [],
      },
      gameOver: false,
      rules: { ...DEFAULT_GAME_RULES, winningScore: 100 },
    };
    // 90 + (13 base + 25 going-out + 3 stranded) comfortably clears the 100-point target.
    const result = applyPlaceTile(state, 'p1', '4-4-5', placement.cell);
    expect(result.gameEnded).toBe(true);
    expect(state.gameOver).toBe(true);
    expect(state.winnerId).toBe('p1');
  });

  it('honors a custom max-draws-per-turn instead of the default 3', () => {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const well = Array.from({ length: 10 }, (_, i) => ({ id: `w${i}`, values: [0, 0, 1] as [number, number, number] }));
    const state: GameState = {
      players: [
        { id: 'p1', name: 'Alice', hand: [{ id: '0-1-2', values: [0, 1, 2] }], score: 0, connected: true },
        { id: 'p2', name: 'Bob', hand: [{ id: '0-0-1', values: [0, 0, 1] }], score: 0, connected: true },
      ],
      round: {
        roundNumber: 1, phase: 'playing', board, well,
        turnOrder: ['p1', 'p2'], currentPlayerIndex: 0, passStreak: 0, drawsThisTurn: 0, log: [],
      },
      gameOver: false,
      rules: { ...DEFAULT_GAME_RULES, maxDrawsPerTurn: 1 },
    };
    applyDrawFromWell(state, 'p1');
    expect(() => applyDrawFromWell(state, 'p1')).toThrow(/already drawn/i);
    expect(() => applyNoMovePenalty(state, 'p1')).not.toThrow();
  });
});

describe('applyNoMovePenalty (blocked game)', () => {
  it('ends the round once every player has passed with an empty well', () => {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const state: GameState = {
      players: [
        { id: 'p1', name: 'Alice', hand: [{ id: '0-1-2', values: [0, 1, 2] }], score: 100, connected: true },
        { id: 'p2', name: 'Bob', hand: [{ id: '0-0-1', values: [0, 0, 1] }], score: 100, connected: true },
      ],
      round: { roundNumber: 1, phase: 'playing', board, well: [], turnOrder: ['p1', 'p2'], currentPlayerIndex: 0, passStreak: 0, log: [] },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };

    const first = applyNoMovePenalty(state, 'p1');
    expect(first.roundEnded).toBe(false);
    expect(state.players[0].score).toBe(90);
    expect(state.round.currentPlayerIndex).toBe(1);

    const second = applyNoMovePenalty(state, 'p2');
    expect(second.roundEnded).toBe(true);
    expect(state.round.phase).toBe('round-ended');
    // Both have 1 tile (tie) -> first player in array order wins by our tiebreak: Alice.
    // Alice gains Bob's hand sum (1) minus her own hand sum (3) = -2.
    expect(state.players[0].score).toBe(90 - 2);
  });
});
