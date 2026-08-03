import { CellCoord } from './grid.js';
import { BotDifficulty } from './bot.js';
import { PublicGameState } from './gameState.js';

export interface RoomPlayerInfo {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
  isBot: boolean;
}

export interface LobbyState {
  roomCode: string;
  players: RoomPlayerInfo[];
  hostId: string;
  started: boolean;
}

/** Client -> server events. */
export interface ClientToServerEvents {
  createRoom: (payload: { name: string }, cb: (res: { ok: true; roomCode: string; sessionToken: string; playerId: string } | { ok: false; error: string }) => void) => void;
  createSoloGame: (payload: { name: string; botCount: number; difficulty: BotDifficulty; fastAiMoves?: boolean }, cb: (res: { ok: true; roomCode: string; sessionToken: string; playerId: string } | { ok: false; error: string }) => void) => void;
  joinRoom: (payload: { roomCode: string; name: string }, cb: (res: { ok: true; sessionToken: string; playerId: string } | { ok: false; error: string }) => void) => void;
  rejoinRoom: (payload: { roomCode: string; sessionToken: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  startGame: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  placeTile: (payload: { roomCode: string; tileId: string; cell: CellCoord }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  drawFromWell: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  passNoMove: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  chooseStarter: (payload: { roomCode: string; tileId: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  continueNextRound: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
  playAgain: (payload: { roomCode: string }, cb: (res: { ok: true } | { ok: false; error: string }) => void) => void;
}

/** Server -> client events. */
export interface ServerToClientEvents {
  lobbyUpdate: (state: LobbyState) => void;
  gameStarted: (state: PublicGameState) => void;
  gameUpdate: (state: PublicGameState) => void;
  errorMessage: (message: string) => void;
}
