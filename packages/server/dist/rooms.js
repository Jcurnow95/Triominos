import { randomUUID } from 'node:crypto';
export function isBot(player) {
    return player.botDifficulty !== undefined;
}
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_PLAYERS = 6;
const rooms = new Map();
function generateRoomCode() {
    let code;
    do {
        code = Array.from({ length: 4 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join('');
    } while (rooms.has(code));
    return code;
}
export function createRoom(hostName, hostSocketId) {
    const code = generateRoomCode();
    const player = {
        id: randomUUID(),
        name: hostName,
        sessionToken: randomUUID(),
        socketId: hostSocketId,
        isHost: true,
    };
    const room = { code, players: [player], started: false, createdAt: Date.now(), emptySince: null };
    rooms.set(code, room);
    return { room, player };
}
const BOT_NAMES = ['Ada', 'Turing', 'Hopper', 'Lovelace', 'Babbage'];
/** Creates a room already populated with computer opponents, for single-player games. */
export function createSoloRoom(hostName, hostSocketId, botCount, difficulty, fastAiMoves = false) {
    const { room, player } = createRoom(hostName, hostSocketId);
    room.fastAiMoves = fastAiMoves;
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
export function getRoom(code) {
    return rooms.get(code.toUpperCase());
}
export function joinRoom(code, name, socketId) {
    const room = getRoom(code);
    if (!room)
        return { error: 'Room not found' };
    if (room.started)
        return { error: 'That game has already started' };
    if (room.players.length >= MAX_PLAYERS)
        return { error: 'Room is full' };
    const player = {
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
export function rejoinRoom(code, sessionToken, socketId) {
    const room = getRoom(code);
    if (!room)
        return { error: 'Room not found' };
    const player = room.players.find((p) => p.sessionToken === sessionToken);
    if (!player)
        return { error: 'Session not recognized' };
    player.socketId = socketId;
    room.emptySince = null;
    if (room.game) {
        const gp = room.game.players.find((p) => p.id === player.id);
        if (gp)
            gp.connected = true;
    }
    return { room, player };
}
export function markDisconnected(socketId) {
    for (const room of rooms.values()) {
        const player = room.players.find((p) => p.socketId === socketId);
        if (player) {
            player.socketId = null;
            if (room.game) {
                const gp = room.game.players.find((p) => p.id === player.id);
                if (gp)
                    gp.connected = false;
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
export function sweepEmptyRooms() {
    const now = Date.now();
    for (const [code, room] of rooms) {
        if (room.emptySince && now - room.emptySince > ROOM_TTL_MS) {
            rooms.delete(code);
        }
    }
}
//# sourceMappingURL=rooms.js.map