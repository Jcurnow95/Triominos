import { applyDrawFromWell, applyNoMovePenalty, applyPlaceTile, applyResign, chooseBotAction, chooseStartingTile, currentPlayerId, redactGameState, sanitizeGameRules, startNewGame, startNextRound, } from '@triominos/shared';
import { createRoom, createSoloRoom, getRoom, isBot, joinRoom, markDisconnected, rejoinRoom } from './rooms.js';
function toLobbyState(room) {
    return {
        roomCode: room.code,
        started: room.started,
        hostId: room.players.find((p) => p.isHost).id,
        players: room.players.map((p) => ({
            id: p.id,
            name: p.name,
            connected: isBot(p) ? true : p.socketId !== null,
            isHost: p.isHost,
            isBot: isBot(p),
        })),
        rules: room.rules,
    };
}
function broadcastLobby(io, room) {
    io.to(room.code).emit('lobbyUpdate', toLobbyState(room));
}
function broadcastGame(io, room, event) {
    if (!room.game)
        return;
    for (const player of room.players) {
        if (!player.socketId)
            continue;
        const socket = io.sockets.sockets.get(player.socketId);
        if (!socket)
            continue;
        socket.emit(event, redactGameState(room.game, player.id));
    }
}
function errorMessage(err) {
    return err instanceof Error ? err.message : 'Unknown error';
}
/** Pause between bot moves so players can follow along. */
const NORMAL_BOT_THINK_MS = Number(process.env.BOT_THINK_MS ?? 1800);
/** Pause used when the room opts into the "fast AI moves" setting. */
const FAST_BOT_THINK_MS = Number(process.env.FAST_BOT_THINK_MS ?? 500);
function botThinkMs(room) {
    return room.fastAiMoves ? FAST_BOT_THINK_MS : NORMAL_BOT_THINK_MS;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Plays out consecutive bot turns until it's a human's move (or the round/game ends),
 * broadcasting after each one so players watch the bots play at a readable pace.
 * Safe to call after any state change; it no-ops when the next actor is human.
 */
async function runBotTurns(io, room) {
    if (room.botRunning)
        return;
    room.botRunning = true;
    try {
        // Bounded to guarantee this loop can never spin forever on an engine bug.
        for (let guard = 0; guard < 500; guard++) {
            const game = room.game;
            if (!game || game.gameOver)
                return;
            const round = game.round;
            if (round.phase === 'round-ended')
                return;
            const actorId = round.phase === 'awaiting-starter-choice'
                ? round.starterChoice?.playerId
                : currentPlayerId(round);
            if (!actorId)
                return;
            const actor = room.players.find((p) => p.id === actorId);
            if (!actor || !isBot(actor))
                return;
            await sleep(botThinkMs(room));
            if (room.game !== game)
                return; // room was reset underneath us
            try {
                const action = chooseBotAction(game, actorId, actor.botDifficulty);
                switch (action.type) {
                    case 'choose-starter':
                        chooseStartingTile(game, actorId, action.tileId);
                        break;
                    case 'place':
                        applyPlaceTile(game, actorId, action.tileId, action.cell);
                        break;
                    case 'draw':
                        applyDrawFromWell(game, actorId);
                        break;
                    case 'pass':
                        applyNoMovePenalty(game, actorId);
                        break;
                }
            }
            catch (err) {
                console.error(`Bot ${actor.name} failed to move:`, err);
                io.to(room.code).emit('errorMessage', `${actor.name} got stuck and skipped a turn.`);
                return;
            }
            broadcastGame(io, room, 'gameUpdate');
        }
    }
    finally {
        room.botRunning = false;
    }
}
export function registerSocketHandlers(io, socket) {
    socket.on('createRoom', ({ name }, cb) => {
        const trimmed = name.trim().slice(0, 24) || 'Player';
        const { room, player } = createRoom(trimmed, socket.id);
        socket.join(room.code);
        cb({ ok: true, roomCode: room.code, sessionToken: player.sessionToken, playerId: player.id });
        broadcastLobby(io, room);
    });
    socket.on('createSoloGame', ({ name, botCount, difficulty, fastAiMoves, rules }, cb) => {
        const trimmed = name.trim().slice(0, 24) || 'Player';
        const { room, player } = createSoloRoom(trimmed, socket.id, botCount, difficulty, fastAiMoves, rules);
        socket.join(room.code);
        room.started = true;
        room.game = startNewGame(room.players.map((p) => ({ id: p.id, name: p.name })), room.rules);
        cb({ ok: true, roomCode: room.code, sessionToken: player.sessionToken, playerId: player.id });
        broadcastGame(io, room, 'gameStarted');
        void runBotTurns(io, room);
    });
    socket.on('joinRoom', ({ roomCode, name }, cb) => {
        const trimmed = name.trim().slice(0, 24) || 'Player';
        const result = joinRoom(roomCode, trimmed, socket.id);
        if ('error' in result)
            return cb({ ok: false, error: result.error });
        socket.join(result.room.code);
        cb({ ok: true, sessionToken: result.player.sessionToken, playerId: result.player.id });
        broadcastLobby(io, result.room);
    });
    socket.on('rejoinRoom', ({ roomCode, sessionToken }, cb) => {
        const result = rejoinRoom(roomCode, sessionToken, socket.id);
        if ('error' in result)
            return cb({ ok: false, error: result.error });
        socket.join(result.room.code);
        cb({ ok: true });
        broadcastLobby(io, result.room);
        if (result.room.game) {
            broadcastGame(io, result.room, 'gameUpdate');
            // Safety net: restart the bot driver if it had bailed out while nobody was connected.
            void runBotTurns(io, result.room);
        }
    });
    socket.on('updateGameRules', ({ roomCode, rules }, cb) => {
        const room = getRoom(roomCode);
        if (!room)
            return cb({ ok: false, error: 'Room not found' });
        const requester = room.players.find((p) => p.socketId === socket.id);
        if (!requester?.isHost)
            return cb({ ok: false, error: 'Only the host can change the rules' });
        if (room.started)
            return cb({ ok: false, error: 'Game already started' });
        room.rules = sanitizeGameRules({ ...room.rules, ...rules });
        cb({ ok: true });
        broadcastLobby(io, room);
    });
    socket.on('startGame', ({ roomCode }, cb) => {
        const room = getRoom(roomCode);
        if (!room)
            return cb({ ok: false, error: 'Room not found' });
        const requester = room.players.find((p) => p.socketId === socket.id);
        if (!requester?.isHost)
            return cb({ ok: false, error: 'Only the host can start the game' });
        if (room.players.length < 2)
            return cb({ ok: false, error: 'Need at least 2 players' });
        if (room.started)
            return cb({ ok: false, error: 'Game already started' });
        room.started = true;
        room.game = startNewGame(room.players.map((p) => ({ id: p.id, name: p.name })), room.rules);
        cb({ ok: true });
        broadcastGame(io, room, 'gameStarted');
        void runBotTurns(io, room);
    });
    socket.on('chooseStarter', ({ roomCode, tileId }, cb) => {
        const room = getRoom(roomCode);
        if (!room?.game)
            return cb({ ok: false, error: 'Game not found' });
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player)
            return cb({ ok: false, error: 'Not in this room' });
        try {
            chooseStartingTile(room.game, player.id, tileId);
            cb({ ok: true });
            broadcastGame(io, room, 'gameUpdate');
            void runBotTurns(io, room);
        }
        catch (err) {
            cb({ ok: false, error: errorMessage(err) });
        }
    });
    socket.on('placeTile', ({ roomCode, tileId, cell }, cb) => {
        const room = getRoom(roomCode);
        if (!room?.game)
            return cb({ ok: false, error: 'Game not found' });
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player)
            return cb({ ok: false, error: 'Not in this room' });
        try {
            applyPlaceTile(room.game, player.id, tileId, cell);
            cb({ ok: true });
            broadcastGame(io, room, 'gameUpdate');
            void runBotTurns(io, room);
        }
        catch (err) {
            cb({ ok: false, error: errorMessage(err) });
        }
    });
    socket.on('drawFromWell', ({ roomCode }, cb) => {
        const room = getRoom(roomCode);
        if (!room?.game)
            return cb({ ok: false, error: 'Game not found' });
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player)
            return cb({ ok: false, error: 'Not in this room' });
        try {
            applyDrawFromWell(room.game, player.id);
            cb({ ok: true });
            broadcastGame(io, room, 'gameUpdate');
            void runBotTurns(io, room);
        }
        catch (err) {
            cb({ ok: false, error: errorMessage(err) });
        }
    });
    socket.on('passNoMove', ({ roomCode }, cb) => {
        const room = getRoom(roomCode);
        if (!room?.game)
            return cb({ ok: false, error: 'Game not found' });
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player)
            return cb({ ok: false, error: 'Not in this room' });
        try {
            applyNoMovePenalty(room.game, player.id);
            cb({ ok: true });
            broadcastGame(io, room, 'gameUpdate');
            void runBotTurns(io, room);
        }
        catch (err) {
            cb({ ok: false, error: errorMessage(err) });
        }
    });
    socket.on('continueNextRound', ({ roomCode }, cb) => {
        const room = getRoom(roomCode);
        if (!room?.game)
            return cb({ ok: false, error: 'Game not found' });
        if (room.game.round.phase !== 'round-ended' || room.game.gameOver) {
            return cb({ ok: false, error: 'Round is not over' });
        }
        startNextRound(room.game);
        cb({ ok: true });
        broadcastGame(io, room, 'gameUpdate');
        void runBotTurns(io, room);
    });
    socket.on('playAgain', ({ roomCode }, cb) => {
        const room = getRoom(roomCode);
        if (!room?.game)
            return cb({ ok: false, error: 'Game not found' });
        const requester = room.players.find((p) => p.socketId === socket.id);
        if (!requester)
            return cb({ ok: false, error: 'Not in this room' });
        if (!room.game.gameOver)
            return cb({ ok: false, error: 'Game is still in progress' });
        // Same seats, names, and rules, scores back to zero.
        room.game = startNewGame(room.players.map((p) => ({ id: p.id, name: p.name })), room.rules);
        cb({ ok: true });
        broadcastGame(io, room, 'gameUpdate');
        void runBotTurns(io, room);
    });
    socket.on('resign', ({ roomCode }, cb) => {
        const room = getRoom(roomCode);
        if (!room?.game)
            return cb({ ok: false, error: 'Game not found' });
        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player)
            return cb({ ok: false, error: 'Not in this room' });
        try {
            applyResign(room.game, player.id);
            cb({ ok: true });
            broadcastGame(io, room, 'gameUpdate');
        }
        catch (err) {
            cb({ ok: false, error: errorMessage(err) });
        }
    });
    socket.on('disconnect', () => {
        const result = markDisconnected(socket.id);
        if (!result)
            return;
        broadcastLobby(io, result.room);
        if (result.room.game)
            broadcastGame(io, result.room, 'gameUpdate');
    });
}
//# sourceMappingURL=socketHandlers.js.map