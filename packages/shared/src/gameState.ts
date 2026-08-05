import { Board, emptyBoard, evaluateBonus, findLegalPlacements, hasAnyLegalPlacement, placeTile as placeBoardTile } from './board.js';
import { CellCoord, cellKey } from './grid.js';
import { DEFAULT_GAME_RULES, GameRules } from './rules.js';
import {
  HAND_EMPTY_BONUS,
  NO_MOVE_PENALTY,
  ScoreResult,
  WELL_DRAW_PENALTY,
  scorePlay,
  scoreStartingTile,
  scoreStartingTileNoTriple,
} from './scoring.js';
import { Tile, generateDeck, isTriple, shuffle, tileSum } from './tiles.js';

export interface PlayerSetup {
  id: string;
  name: string;
}

export interface PlayerState {
  id: string;
  name: string;
  hand: Tile[];
  score: number;
  connected: boolean;
}

export type GameEvent =
  | { type: 'round-start'; playerId: string; tile: Tile; score: ScoreResult; noTriple: boolean }
  | { type: 'placed'; playerId: string; tile: Tile; cell: CellCoord; score: ScoreResult }
  | { type: 'drew'; playerId: string; tile: Tile }
  | { type: 'no-move-penalty'; playerId: string }
  | { type: 'round-end'; reason: 'hand-empty' | 'blocked'; winnerId: string; scoreChanges: Record<string, number> }
  | { type: 'game-end'; winnerId: string }
  | { type: 'resigned'; playerId: string };

export type RoundPhase = 'awaiting-starter-choice' | 'playing' | 'round-ended';

export interface StarterChoice {
  playerId: string;
  optionTileIds: string[];
}

export interface RoundState {
  roundNumber: number;
  phase: RoundPhase;
  board: Board;
  well: Tile[];
  turnOrder: string[];
  currentPlayerIndex: number;
  passStreak: number;
  /** Tiles the current player has drawn this turn; capped by rules.maxDrawsPerTurn. */
  drawsThisTurn: number;
  starterChoice?: StarterChoice;
  log: GameEvent[];
}

export interface GameState {
  players: PlayerState[];
  round: RoundState;
  gameOver: boolean;
  winnerId?: string;
  rules: GameRules;
}

export function handSizeFor(playerCount: number): number {
  if (playerCount === 2) return 9;
  if (playerCount <= 4) return 7;
  return 6;
}

export function currentPlayerId(round: RoundState): string {
  return round.turnOrder[round.currentPlayerIndex];
}

function advanceTurn(round: RoundState): void {
  round.currentPlayerIndex = (round.currentPlayerIndex + 1) % round.turnOrder.length;
  round.drawsThisTurn = 0;
}

/** True once the player has exhausted the well or hit this turn's draw cap. */
export function mustPassInsteadOfDrawing(round: RoundState, maxDrawsPerTurn: number): boolean {
  return round.well.length === 0 || round.drawsThisTurn >= maxDrawsPerTurn;
}

function highestTripleAmong(players: PlayerState[]): { playerId: string; tile: Tile } | null {
  let best: { playerId: string; tile: Tile } | null = null;
  for (const p of players) {
    for (const tile of p.hand) {
      if (!isTriple(tile)) continue;
      if (!best || tile.values[0] > best.tile.values[0]) {
        best = { playerId: p.id, tile };
      }
    }
  }
  return best;
}

function highestSumAmong(players: PlayerState[]): { playerId: string; tile: Tile } {
  let best: { playerId: string; tile: Tile } | null = null;
  for (const p of players) {
    for (const tile of p.hand) {
      if (!best || tileSum(tile) > tileSum(best.tile)) {
        best = { playerId: p.id, tile };
      }
    }
  }
  return best!;
}

function openRoundWith(round: RoundState, players: PlayerState[], playerId: string, tile: Tile, hasTriple: boolean): void {
  const player = players.find((p) => p.id === playerId)!;
  player.hand = player.hand.filter((t) => t.id !== tile.id);

  const isZero = tile.values[0] === 0 && tile.values[1] === 0 && tile.values[2] === 0;
  const score = hasTriple ? scoreStartingTile(tile, isZero) : scoreStartingTileNoTriple(tile);
  player.score += score.total;

  round.board = placeBoardTile(round.board, tile.id, { q: 0, r: 0, orient: 'up' }, tile.values);
  round.log.push({ type: 'round-start', playerId, tile, score, noTriple: !hasTriple });
  round.currentPlayerIndex = round.turnOrder.indexOf(playerId);
  advanceTurn(round);
}

/**
 * Deals a fresh deck (one shared deck per `rules.tileSets` standard sets) directly into
 * `players`' hands (scores carry over across rounds, so `players` must be the live
 * PlayerState array) and opens the round. May land in 'awaiting-starter-choice' if one
 * player holds both the overall-highest triple and 0-0-0 -- the rulebook lets them pick
 * which to open with.
 */
export function startRound(
  players: PlayerState[],
  roundNumber: number,
  rules: GameRules = DEFAULT_GAME_RULES,
  rng: () => number = Math.random,
): RoundState {
  const deck = shuffle(generateDeck(rules.tileSets), rng);
  const size = handSizeFor(players.length);
  let cursor = 0;
  for (const p of players) {
    p.hand = deck.slice(cursor, cursor + size);
    cursor += size;
  }
  const well = deck.slice(cursor);
  const turnOrder = players.map((p) => p.id);

  const round: RoundState = {
    roundNumber,
    phase: 'playing',
    board: emptyBoard(),
    well,
    turnOrder,
    currentPlayerIndex: 0,
    passStreak: 0,
    drawsThisTurn: 0,
    log: [],
  };

  const highest = highestTripleAmong(players);
  if (!highest) {
    const { playerId, tile } = highestSumAmong(players);
    openRoundWith(round, players, playerId, tile, false);
    return round;
  }

  const holder = players.find((p) => p.id === highest.playerId)!;
  const zeroTile = holder.hand.find((t) => isTriple(t) && t.values[0] === 0);
  if (zeroTile && highest.tile.id !== zeroTile.id) {
    round.phase = 'awaiting-starter-choice';
    round.starterChoice = { playerId: highest.playerId, optionTileIds: [highest.tile.id, zeroTile.id] };
    return round;
  }

  openRoundWith(round, players, highest.playerId, highest.tile, true);
  return round;
}

export function chooseStartingTile(state: GameState, playerId: string, tileId: string): void {
  const round = state.round;
  if (round.phase !== 'awaiting-starter-choice' || !round.starterChoice) {
    throw new Error('No starter choice pending');
  }
  if (round.starterChoice.playerId !== playerId) throw new Error('Not your choice to make');
  if (!round.starterChoice.optionTileIds.includes(tileId)) throw new Error('Invalid choice');

  const player = state.players.find((p) => p.id === playerId)!;
  const tile = player.hand.find((t) => t.id === tileId)!;
  round.phase = 'playing';
  round.starterChoice = undefined;
  openRoundWith(round, state.players, playerId, tile, true);
}

export interface PlaceTileResult {
  score: ScoreResult;
  roundEnded: boolean;
  gameEnded: boolean;
}

export function applyPlaceTile(state: GameState, playerId: string, tileId: string, cell: CellCoord): PlaceTileResult {
  const round = state.round;
  if (round.phase !== 'playing') throw new Error('Round is not accepting moves');
  if (currentPlayerId(round) !== playerId) throw new Error('Not your turn');

  const player = state.players.find((p) => p.id === playerId)!;
  const tile = player.hand.find((t) => t.id === tileId);
  if (!tile) throw new Error('Tile not in hand');

  const legal = findLegalPlacements(tile, round.board);
  const match = legal.find((p) => cellKey(p.cell) === cellKey(cell));
  if (!match) throw new Error('Illegal placement');

  const bonus = evaluateBonus(round.board, cell, match.values);
  const score = scorePlay(tile, bonus);

  round.board = placeBoardTile(round.board, tile.id, cell, match.values);
  player.hand = player.hand.filter((t) => t.id !== tileId);
  player.score += score.total;
  round.passStreak = 0;
  round.log.push({ type: 'placed', playerId, tile, cell, score });

  if (player.hand.length === 0) {
    const scoreChanges = endRoundHandEmpty(state, playerId);
    round.phase = 'round-ended';
    round.log.push({ type: 'round-end', reason: 'hand-empty', winnerId: playerId, scoreChanges });
    return { score, roundEnded: true, gameEnded: checkGameOver(state) };
  }

  advanceTurn(round);
  return { score, roundEnded: false, gameEnded: false };
}

export function canCurrentPlayerPlay(state: GameState): boolean {
  const round = state.round;
  const player = state.players.find((p) => p.id === currentPlayerId(round))!;
  return hasAnyLegalPlacement(player.hand, round.board);
}

export interface DrawResult {
  tile: Tile | null;
  wellEmpty: boolean;
}

export function applyDrawFromWell(state: GameState, playerId: string): DrawResult {
  const round = state.round;
  if (round.phase !== 'playing') throw new Error('Round is not accepting moves');
  if (currentPlayerId(round) !== playerId) throw new Error('Not your turn');

  const player = state.players.find((p) => p.id === playerId)!;
  if (hasAnyLegalPlacement(player.hand, round.board)) {
    throw new Error('You have a legal move; you cannot draw');
  }
  if (round.drawsThisTurn >= state.rules.maxDrawsPerTurn) {
    throw new Error(`You have already drawn ${state.rules.maxDrawsPerTurn} tiles this turn; pass instead`);
  }
  if (round.well.length === 0) {
    return { tile: null, wellEmpty: true };
  }

  const tile = round.well[round.well.length - 1];
  round.well = round.well.slice(0, -1);
  player.hand = [...player.hand, tile];
  player.score -= WELL_DRAW_PENALTY;
  round.drawsThisTurn += 1;
  round.log.push({ type: 'drew', playerId, tile });
  return { tile, wellEmpty: round.well.length === 0 };
}

/** Called when the current player has no legal move and has drawn as much as they may. */
export function applyNoMovePenalty(state: GameState, playerId: string): { roundEnded: boolean; gameEnded: boolean } {
  const round = state.round;
  if (round.phase !== 'playing') throw new Error('Round is not accepting moves');
  if (currentPlayerId(round) !== playerId) throw new Error('Not your turn');
  if (!mustPassInsteadOfDrawing(round, state.rules.maxDrawsPerTurn)) {
    throw new Error(`Draw from the well first (up to ${state.rules.maxDrawsPerTurn} tiles a turn)`);
  }

  const player = state.players.find((p) => p.id === playerId)!;
  if (hasAnyLegalPlacement(player.hand, round.board)) {
    throw new Error('You have a legal move');
  }

  player.score -= NO_MOVE_PENALTY;
  round.log.push({ type: 'no-move-penalty', playerId });
  round.passStreak += 1;

  // Only a true stalemate ends the round: everyone passed AND there is nothing left to
  // draw. With tiles still in the well the game can continue, since the draw cap resets
  // each turn -- and the well drains steadily, so this always terminates.
  if (round.passStreak >= round.turnOrder.length && round.well.length === 0) {
    const scoreChanges = endRoundBlocked(state);
    round.phase = 'round-ended';
    const winnerId = pickBlockedWinner(state);
    round.log.push({ type: 'round-end', reason: 'blocked', winnerId, scoreChanges });
    return { roundEnded: true, gameEnded: checkGameOver(state) };
  }

  advanceTurn(round);
  return { roundEnded: false, gameEnded: false };
}

/**
 * Concedes the whole match immediately, not just the current round -- there's no sane
 * way to keep a round going with one player's tiles frozen on the board and no one able
 * to act on their behalf. The win goes to whichever remaining player has the highest
 * score (in a 2-player game that's simply the other player, regardless of who was ahead).
 */
export function applyResign(state: GameState, playerId: string): void {
  if (state.gameOver) throw new Error('Game is already over');
  if (!state.players.some((p) => p.id === playerId)) throw new Error('Not a player in this game');

  const others = state.players.filter((p) => p.id !== playerId);
  if (others.length === 0) throw new Error('No opponents to resign to');
  let winner = others[0];
  for (const p of others) if (p.score > winner.score) winner = p;

  state.round.log.push({ type: 'resigned', playerId });
  state.round.phase = 'round-ended';
  state.gameOver = true;
  state.winnerId = winner.id;
  state.round.log.push({ type: 'game-end', winnerId: winner.id });
}

function endRoundHandEmpty(state: GameState, winnerId: string): Record<string, number> {
  let othersTotal = 0;
  for (const p of state.players) {
    if (p.id === winnerId) continue;
    othersTotal += p.hand.reduce((s, t) => s + tileSum(t), 0);
  }
  const winnerGain = HAND_EMPTY_BONUS + othersTotal;
  const winner = state.players.find((p) => p.id === winnerId)!;
  winner.score += winnerGain;
  return { [winnerId]: winnerGain };
}

function pickBlockedWinner(state: GameState): string {
  let best: PlayerState | null = null;
  for (const p of state.players) {
    if (!best || p.hand.length < best.hand.length) best = p;
  }
  return best!.id;
}

function endRoundBlocked(state: GameState): Record<string, number> {
  const winnerId = pickBlockedWinner(state);
  const winner = state.players.find((p) => p.id === winnerId)!;

  let othersTotal = 0;
  for (const p of state.players) {
    if (p.id === winnerId) continue;
    othersTotal += p.hand.reduce((s, t) => s + tileSum(t), 0);
  }
  const ownRemainder = winner.hand.reduce((s, t) => s + tileSum(t), 0);
  const delta = othersTotal - ownRemainder;
  winner.score += delta;
  return { [winnerId]: delta };
}

function checkGameOver(state: GameState): boolean {
  const anyContender = state.players.some((p) => p.score >= state.rules.winningScore);
  if (!anyContender) return false;
  let winner = state.players[0];
  for (const p of state.players) if (p.score > winner.score) winner = p;
  state.gameOver = true;
  state.winnerId = winner.id;
  state.round.log.push({ type: 'game-end', winnerId: winner.id });
  return true;
}

export function startNewGame(
  players: PlayerSetup[],
  rules: GameRules = DEFAULT_GAME_RULES,
  rng: () => number = Math.random,
): GameState {
  const playerStates: PlayerState[] = players.map((p) => ({ id: p.id, name: p.name, hand: [], score: 0, connected: true }));
  const state: GameState = {
    players: playerStates,
    round: startRound(playerStates, 1, rules, rng),
    gameOver: false,
    rules,
  };
  return state;
}

export function startNextRound(state: GameState, rng: () => number = Math.random): void {
  state.round = startRound(state.players, state.round.roundNumber + 1, state.rules, rng);
}

export interface PublicPlayerState {
  id: string;
  name: string;
  handCount: number;
  hand?: Tile[]; // only present for the viewing player
  score: number;
  connected: boolean;
}

export interface PublicGameState {
  players: PublicPlayerState[];
  round: Omit<RoundState, 'well'> & { wellCount: number };
  gameOver: boolean;
  winnerId?: string;
  rules: GameRules;
}

/** Strips other players' hands and the well's contents so a viewer only sees what
 *  they're allowed to: their own hand, everyone's hand *count*, and the well size. The
 *  rules themselves aren't secret, so they pass through unredacted. */
export function redactGameState(state: GameState, viewerId: string): PublicGameState {
  const { well, ...roundRest } = state.round;
  return {
    gameOver: state.gameOver,
    winnerId: state.winnerId,
    rules: state.rules,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      handCount: p.hand.length,
      hand: p.id === viewerId ? p.hand : undefined,
      score: p.score,
      connected: p.connected,
    })),
    round: { ...roundRest, wellCount: well.length },
  };
}
