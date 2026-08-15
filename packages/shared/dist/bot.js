import { boardTiles, evaluateBonus, findLegalPlacements, placeTile } from './board.js';
import { currentPlayerId, mustPassInsteadOfDrawing } from './gameState.js';
import { scorePlay, scoreStartingTile } from './scoring.js';
import { generateDeck, tileSum } from './tiles.js';
/** Tiles that could still be in an opponent's hand or the well: the full deck minus
 *  what's on the board and what the bot holds. Inferring from public information only. */
function unseenTiles(board, ownHand, tileSets, freestyleTiles) {
    const known = new Set(boardTiles(board).map((t) => t.tileId));
    for (const t of ownHand)
        known.add(t.id);
    return generateDeck(tileSets, freestyleTiles).filter((t) => !known.has(t.id));
}
/** Best single-play score any unseen tile could take off the given board. Used by the
 *  'hard' bot to avoid handing an opponent a hexagon or bridge. */
function bestOpponentReply(board, unseen) {
    let best = 0;
    for (const tile of unseen) {
        for (const placement of findLegalPlacements(tile, board)) {
            const bonus = evaluateBonus(board, placement.cell, placement.values);
            const value = scorePlay(tile, bonus).total;
            if (value > best)
                best = value;
        }
    }
    return best;
}
function collectMoves(hand, board) {
    const moves = [];
    for (const tile of hand) {
        for (const placement of findLegalPlacements(tile, board)) {
            const bonus = evaluateBonus(board, placement.cell, placement.values);
            moves.push({ tile, placement, immediate: scorePlay(tile, bonus).total });
        }
    }
    return moves;
}
function pickRandom(items, rng) {
    return items[Math.floor(rng() * items.length)];
}
// Only the strongest few candidates get the expensive opponent-reply analysis.
const HARD_CANDIDATE_LIMIT = 6;
function chooseMove(moves, board, hand, difficulty, rng, tileSets, freestyleTiles) {
    if (difficulty === 'easy') {
        return pickRandom(moves, rng);
    }
    const bestImmediate = Math.max(...moves.map((m) => m.immediate));
    const topMoves = moves.filter((m) => m.immediate === bestImmediate);
    if (difficulty === 'normal') {
        return pickRandom(topMoves, rng);
    }
    // 'hard': among the best-scoring plays, prefer shedding high-pip tiles (they hurt most
    // if you're caught holding them at round end), then pick whichever leaves opponents the
    // weakest possible reply.
    const ranked = [...moves].sort((a, b) => b.immediate - a.immediate || tileSum(b.tile) - tileSum(a.tile));
    const candidates = ranked.slice(0, HARD_CANDIDATE_LIMIT);
    const unseen = unseenTiles(board, hand, tileSets, freestyleTiles);
    let best = candidates[0];
    let bestValue = -Infinity;
    for (const move of candidates) {
        const nextBoard = placeTile(board, move.tile.id, move.placement.cell, move.placement.values, move.placement.printed);
        const risk = bestOpponentReply(nextBoard, unseen);
        const value = move.immediate + tileSum(move.tile) * 0.1 - risk * 0.5;
        if (value > bestValue) {
            bestValue = value;
            best = move;
        }
    }
    return best;
}
/**
 * Decides the bot's next action from the authoritative game state. The caller must have
 * already confirmed it is this player's turn (or that they owe a starter choice).
 */
export function chooseBotAction(state, playerId, difficulty = 'normal', rng = Math.random) {
    const round = state.round;
    const player = state.players.find((p) => p.id === playerId);
    if (!player)
        throw new Error('Bot is not a player in this game');
    if (round.phase === 'awaiting-starter-choice') {
        if (round.starterChoice?.playerId !== playerId)
            throw new Error('Not the bot\'s starter choice');
        // Take whichever opening tile scores more -- 0-0-0 pays 40, any other triple pays at most 25.
        let bestId = round.starterChoice.optionTileIds[0];
        let bestScore = -Infinity;
        for (const tileId of round.starterChoice.optionTileIds) {
            const tile = player.hand.find((t) => t.id === tileId);
            if (!tile)
                continue;
            const isZero = tile.values.every((v) => v === 0);
            const total = scoreStartingTile(tile, isZero).total;
            if (total > bestScore) {
                bestScore = total;
                bestId = tileId;
            }
        }
        return { type: 'choose-starter', tileId: bestId };
    }
    if (round.phase !== 'playing')
        throw new Error('Round is not accepting moves');
    if (currentPlayerId(round) !== playerId)
        throw new Error('Not the bot\'s turn');
    const moves = collectMoves(player.hand, round.board);
    if (moves.length === 0) {
        return mustPassInsteadOfDrawing(round, state.rules.maxDrawsPerTurn) ? { type: 'pass' } : { type: 'draw' };
    }
    const move = chooseMove(moves, round.board, player.hand, difficulty, rng, state.rules.tileSets, state.rules.freestyleTiles);
    return { type: 'place', tileId: move.tile.id, cell: move.placement.cell };
}
//# sourceMappingURL=bot.js.map