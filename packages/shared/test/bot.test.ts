import { describe, expect, it } from 'vitest';
import { BotDifficulty, chooseBotAction } from '../src/bot.js';
import { emptyBoard, findLegalPlacements, placeTile } from '../src/board.js';
import {
  GameState,
  applyDrawFromWell,
  applyNoMovePenalty,
  applyPlaceTile,
  chooseStartingTile,
  currentPlayerId,
  startNewGame,
} from '../src/gameState.js';
import { DEFAULT_GAME_RULES } from '../src/rules.js';

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

const DIFFICULTIES: BotDifficulty[] = ['easy', 'normal', 'hard'];

describe('chooseBotAction basics', () => {
  it('draws when it has no legal move but the well still has tiles', () => {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const state: GameState = {
      players: [
        { id: 'bot', name: 'Bot', hand: [{ id: '0-1-2', values: [0, 1, 2] }], score: 0, connected: true },
        { id: 'p2', name: 'Human', hand: [{ id: '0-0-1', values: [0, 0, 1] }], score: 0, connected: true },
      ],
      round: {
        roundNumber: 1, phase: 'playing', board,
        well: [{ id: '1-1-1', values: [1, 1, 1] }],
        turnOrder: ['bot', 'p2'], currentPlayerIndex: 0, passStreak: 0, log: [],
      },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };
    expect(chooseBotAction(state, 'bot').type).toBe('draw');
  });

  it('passes when it has no legal move and the well is empty', () => {
    const board = placeTile(emptyBoard(), 'start', { q: 0, r: 0, orient: 'up' }, [3, 4, 5]);
    const state: GameState = {
      players: [
        { id: 'bot', name: 'Bot', hand: [{ id: '0-1-2', values: [0, 1, 2] }], score: 0, connected: true },
        { id: 'p2', name: 'Human', hand: [{ id: '0-0-1', values: [0, 0, 1] }], score: 0, connected: true },
      ],
      round: {
        roundNumber: 1, phase: 'playing', board, well: [],
        turnOrder: ['bot', 'p2'], currentPlayerIndex: 0, passStreak: 0, log: [],
      },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };
    expect(chooseBotAction(state, 'bot').type).toBe('pass');
  });

  it('opens with 0-0-0 over a higher triple, because 40 beats 25', () => {
    const state: GameState = {
      players: [
        {
          id: 'bot', name: 'Bot', score: 0, connected: true,
          hand: [{ id: '0-0-0', values: [0, 0, 0] }, { id: '5-5-5', values: [5, 5, 5] }],
        },
        { id: 'p2', name: 'Human', hand: [{ id: '0-0-1', values: [0, 0, 1] }], score: 0, connected: true },
      ],
      round: {
        roundNumber: 1, phase: 'awaiting-starter-choice', board: emptyBoard(), well: [],
        turnOrder: ['bot', 'p2'], currentPlayerIndex: 0, passStreak: 0,
        starterChoice: { playerId: 'bot', optionTileIds: ['5-5-5', '0-0-0'] },
        log: [],
      },
      gameOver: false,
      rules: DEFAULT_GAME_RULES,
    };
    const action = chooseBotAction(state, 'bot');
    expect(action).toEqual({ type: 'choose-starter', tileId: '0-0-0' });
  });

  it('always returns a placement that the engine accepts as legal', () => {
    for (const difficulty of DIFFICULTIES) {
      const state = startNewGame(
        [{ id: 'bot', name: 'Bot' }, { id: 'p2', name: 'Human' }],
        DEFAULT_GAME_RULES,
        seededRng(11),
      );
      if (state.round.phase !== 'playing') continue;
      const actor = currentPlayerId(state.round);
      const action = chooseBotAction(state, actor, difficulty, seededRng(5));
      if (action.type !== 'place') continue;
      const player = state.players.find((p) => p.id === actor)!;
      const tile = player.hand.find((t) => t.id === action.tileId)!;
      const legal = findLegalPlacements(tile, state.round.board);
      expect(legal.some((p) => p.cell.q === action.cell.q && p.cell.r === action.cell.r && p.cell.orient === action.cell.orient)).toBe(true);
    }
  });
});

describe('bot-vs-bot full round', () => {
  // Drives complete rounds entirely through the public engine API. If the bot could ever
  // return an illegal action or fail to make progress, these would throw or hang out.
  function playRound(difficulty: BotDifficulty, seed: number): GameState {
    const state = startNewGame(
      [{ id: 'a', name: 'Bot A' }, { id: 'b', name: 'Bot B' }, { id: 'c', name: 'Bot C' }],
      DEFAULT_GAME_RULES,
      seededRng(seed),
    );
    const rng = seededRng(seed + 1000);

    for (let steps = 0; steps < 2000; steps++) {
      if (state.round.phase === 'round-ended' || state.gameOver) return state;

      const actor =
        state.round.phase === 'awaiting-starter-choice'
          ? state.round.starterChoice!.playerId
          : currentPlayerId(state.round);

      const action = chooseBotAction(state, actor, difficulty, rng);
      switch (action.type) {
        case 'choose-starter':
          chooseStartingTile(state, actor, action.tileId);
          break;
        case 'place':
          applyPlaceTile(state, actor, action.tileId, action.cell);
          break;
        case 'draw':
          applyDrawFromWell(state, actor);
          break;
        case 'pass':
          applyNoMovePenalty(state, actor);
          break;
      }
    }
    throw new Error('Round did not terminate within the step budget');
  }

  for (const difficulty of DIFFICULTIES) {
    it(`completes a full ${difficulty} round without an illegal move`, () => {
      const state = playRound(difficulty, 2024);
      expect(state.round.phase).toBe('round-ended');
      const totalTiles =
        state.players.reduce((s, p) => s + p.hand.length, 0) +
        state.round.well.length +
        Object.keys(state.round.board).length;
      expect(totalTiles).toBe(56);
    });
  }

  it('reaches a decisive round end across several different deals', () => {
    for (const seed of [1, 7, 13, 99, 404]) {
      const state = playRound('normal', seed);
      expect(state.round.phase).toBe('round-ended');
      const ended = state.round.log.filter((e) => e.type === 'round-end');
      expect(ended).toHaveLength(1);
    }
  });
});
