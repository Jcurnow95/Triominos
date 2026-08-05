import { randomUUID } from 'node:crypto';
import { BotDifficulty, DEFAULT_GAME_RULES, GameRules, GameState, sanitizeGameRules } from '@triominos/shared';

export interface RoomPlayer {
  id: string;
  name: string;
  sessionToken: string;
  socketId: string | null;
  isHost: boolean;
  /** Set for computer opponents; humans leave this undefined. */
  botDifficulty?: BotDifficulty;
}

export interface Room {
  code: string;
  players: RoomPlayer[];
  started: boolean;
  game?: GameState;
  createdAt: number;
  emptySince: number | null;
  /** Guards against two concurrent bot-turn drivers running on the same room. */
  botRunning?: boolean;
  /** When true, bots pause only briefly between moves instead of the readable default. */
  fastAiMoves?: boolean;
  /** Score to win, tile set count, draw cap, etc. Editable by the host until the game starts. */
  rules: GameRules;
}

export function isBot(player: RoomPlayer): boolean {
  return player.botDifficulty !== undefined;
}

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 6;

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(hostName: string, hostSocketId: string): { room: Room; player: RoomPlayer } {
  const code = generateRoomCode();
  const player: RoomPlayer = {
    id: randomUUID(),
    name: hostName,
    sessionToken: randomUUID(),
    socketId: hostSocketId,
    isHost: true,
  };
  const room: Room = {
    code,
    players: [player],
    started: false,
    createdAt: Date.now(),
    emptySince: null,
    rules: DEFAULT_GAME_RULES,
  };
  rooms.set(code, room);
  return { room, player };
}

const BOT_NAMES = ['Ada', 'Turing', 'Hopper', 'Lovelace', 'Babbage'];

/** Creates a room already populated with computer opponents, for single-player games. */
export function createSoloRoom(
  hostName: string,
  hostSocketId: string,
  botCount: number,
  difficulty: BotDifficulty,
  fastAiMoves = false,
  rules?: Partial<GameRules>,
): { room: Room; player: RoomPlayer } {
  const { room, player } = createRoom(hostName, hostSocketId);
  room.fastAiMoves = fastAiMoves;
  room.rules = sanitizeGameRules(rules);
  const count = Math.max(1, Math.min(3, botCount));
  for (let i = 0; i < count; i++) {
    room.players.push({
      id: randomUUID(),
      name: BOT_NAMES[i % BOT_NAMES.length],
      sessionToken: randomUUID(),
      socketId: null,
      isHost: false,
      botDifficulty: difficulty,
    });
  }
  return { room, player };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(code: string, name: string, socketId: string): { room: Room; player: RoomPlayer } | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  if (room.started) return { error: 'That game has already started' };
  if (room.players.length >= MAX_PLAYERS) return { error: 'Room is full' };

  const player: RoomPlayer = {
    id: randomUUID(),
    name,
    sessionToken: randomUUID(),
    socketId,
    isHost: false,
  };
  room.players.push(player);
  room.emptySince = null;
  return { room, player };
}

export function rejoinRoom(code: string, sessionToken: string, socketId: string): { room: Room; player: RoomPlayer } | { error: string } {
  const room = getRoom(code);
  if (!room) return { error: 'Room not found' };
  const player = room.players.find((p) => p.sessionToken === sessionToken);
  if (!player) return { error: 'Session not recognized' };
  player.socketId = socketId;
  room.emptySince = null;
  if (room.game) {
    const gp = room.game.players.find((p) => p.id === player.id);
    if (gp) gp.connected = true;
  }
  return { room, player };
}

export function markDisconnected(socketId: string): { room: Room; player: RoomPlayer } | null {
  for (const room of rooms.values()) {
    const player = room.players.find((p) => p.socketId === socketId);
    if (player) {
      player.socketId = null;
      if (room.game) {
        const gp = room.game.players.find((p) => p.id === player.id);
        if (gp) gp.connected = false;
      }
      if (room.players.filter((p) => !isBot(p)).every((p) => p.socketId === null)) {
        room.emptySince = Date.now();
      }
      return { room, player };
    }
  }
  return null;
}

const ROOM_TTL_MS = 30 * 60 * 1000;

export function sweepEmptyRooms(): void {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (room.emptySince && now - room.emptySince > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}
