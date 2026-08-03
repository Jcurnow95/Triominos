import { useEffect, useMemo, useState } from 'react';
import {
  BonusType,
  CellCoord,
  GameEvent,
  MAX_DRAWS_PER_TURN,
  PublicGameState,
  boardTiles,
  cellKey,
  findLegalPlacements,
  hasAnyLegalPlacement,
} from '@triominos/shared';
import { Board, BoardHighlight, BoardTileView, FloatingScore } from '../components/Board';
import { Rack, tileMatchesFilters } from '../components/Rack';
import { SettingsMenu } from '../components/SettingsMenu';
import type { ThemePrefs } from '../theme';
import type { GamePrefs } from '../preferences';

interface GameProps {
  game: PublicGameState;
  selfPlayerId: string;
  error: string | null;
  themePrefs: ThemePrefs;
  gamePrefs: GamePrefs;
  onThemeChange: (prefs: ThemePrefs) => void;
  onGamePrefsChange: (prefs: GamePrefs) => void;
  onPlace: (tileId: string, cell: CellCoord) => void;
  onDraw: () => void;
  onPass: () => void;
  onChooseStarter: (tileId: string) => void;
  onContinueRound: () => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function Game({ game, selfPlayerId, error, themePrefs, gamePrefs, onThemeChange, onGamePrefsChange, onPlace, onDraw, onPass, onChooseStarter, onContinueRound, onPlayAgain, onLeave }: GameProps) {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [resultsHidden, setResultsHidden] = useState(false);
  const [handFilters, setHandFilters] = useState<Set<number>>(new Set());

  // Re-show the results whenever a new round ends or the game finishes, so dismissing
  // one recap never suppresses the next.
  useEffect(() => {
    setResultsHidden(false);
  }, [game.round.phase, game.round.roundNumber, game.gameOver]);

  // A fresh deal invalidates the old filter selection.
  useEffect(() => {
    setHandFilters(new Set());
  }, [game.round.roundNumber]);

  const self = game.players.find((p) => p.id === selfPlayerId)!;
  const myHand = self.hand ?? [];
  const round = game.round;

  // Never leave a hidden tile selected -- its placement hints would linger on the board.
  useEffect(() => {
    if (!selectedTileId) return;
    const tile = myHand.find((t) => t.id === selectedTileId);
    if (!tile || !tileMatchesFilters(tile, handFilters)) setSelectedTileId(null);
  }, [handFilters, myHand, selectedTileId]);

  const isMyTurn = round.phase === 'playing' && round.turnOrder[round.currentPlayerIndex] === selfPlayerId;

  const playableTileIds = useMemo(() => {
    const set = new Set<string>();
    for (const tile of myHand) {
      if (findLegalPlacements(tile, round.board).length > 0) set.add(tile.id);
    }
    return set;
  }, [myHand, round.board]);

  const hasAnyMove = hasAnyLegalPlacement(myHand, round.board);
  // House rule: up to 3 draws a turn, then you may take the -10 and pass even if the
  // well still has tiles.
  const canStillDraw = round.wellCount > 0 && round.drawsThisTurn < MAX_DRAWS_PER_TURN;

  // With the assist off -- or when it isn't your turn -- every tile is shown identically,
  // leaving it to the player to read the board and work out which tiles fit.
  const markedTileIds =
    isMyTurn && gamePrefs.markPlayableTiles ? playableTileIds : new Set(myHand.map((t) => t.id));

  const selectedTile = myHand.find((t) => t.id === selectedTileId) ?? null;
  const highlights: BoardHighlight[] = useMemo(() => {
    if (!selectedTile || !isMyTurn) return [];
    return findLegalPlacements(selectedTile, round.board);
  }, [selectedTile, round.board, isMyTurn]);

  // The most recent scoring play drives the highlight, the bonus glow, and the score popup.
  const lastPlay = useMemo(() => {
    for (let i = round.log.length - 1; i >= 0; i--) {
      const ev = round.log[i];
      if (ev.type === 'placed') {
        const bonus: BonusType =
          ev.score.bonusLabel === 'hexagon' ? 'hexagon' : ev.score.bonusLabel === 'bridge' ? 'bridge' : 'none';
        return { seq: i, key: cellKey(ev.cell), cell: ev.cell, points: ev.score.total, bonus };
      }
    }
    return null;
  }, [round.log]);

  const boardTileViews: BoardTileView[] = boardTiles(round.board).map((t) => ({
    cell: t.cell,
    values: t.values,
    recent: lastPlay ? cellKey(t.cell) === lastPlay.key : false,
    bonus: lastPlay && cellKey(t.cell) === lastPlay.key ? lastPlay.bonus : 'none',
  }));

  const floating: FloatingScore | null = lastPlay
    ? { seq: lastPlay.seq, cell: lastPlay.cell, points: lastPlay.points, bonus: lastPlay.bonus }
    : null;

  function handlePlace(cell: CellCoord) {
    if (!selectedTile) return;
    onPlace(selectedTile.id, cell);
    setSelectedTileId(null);
  }

  function toggleFilter(value: number) {
    setHandFilters((cur) => {
      const next = new Set(cur);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const splitByNumber = themePrefs.tileThemeId === 'coded';

  return (
    <div className="game-page">
      <div className="game-header">
        <Scoreboard game={game} selfPlayerId={selfPlayerId} />
        <SettingsMenu
          themePrefs={themePrefs}
          gamePrefs={gamePrefs}
          onThemeChange={onThemeChange}
          onGamePrefsChange={onGamePrefsChange}
        />
      </div>

      <div className="board-wrap">
        <Board
          tiles={boardTileViews}
          highlights={highlights}
          floating={floating}
          splitByNumber={splitByNumber}
          pointFacingNumbers={gamePrefs.pointFacingNumbers}
          onHighlightClick={handlePlace}
        />
      </div>

      <div className="turn-bar">
        {round.phase === 'playing' && (
          <>
            <span className={isMyTurn ? 'turn-indicator mine' : 'turn-indicator'}>
              {isMyTurn ? (
                "It's your turn"
              ) : (
                <>
                  {game.players.find((p) => p.id === round.turnOrder[round.currentPlayerIndex])?.name} is thinking
                  <span className="thinking-dots"><i /><i /><i /></span>
                </>
              )}
            </span>
            <span className="well-count">Well: {round.wellCount} tiles</span>
            {isMyTurn && !hasAnyMove && canStillDraw && (
              <button className="primary" onClick={onDraw}>
                Draw from well (-5)
                <span className="btn-sub">{round.drawsThisTurn}/{MAX_DRAWS_PER_TURN} drawn</span>
              </button>
            )}
            {isMyTurn && !hasAnyMove && !canStillDraw && (
              <button className="primary" onClick={onPass}>
                Pass (-10)
                <span className="btn-sub">{round.wellCount === 0 ? 'well is empty' : `drew ${round.drawsThisTurn}`}</span>
              </button>
            )}
          </>
        )}

        {round.phase === 'round-ended' && resultsHidden && (
          <button className="primary" onClick={() => setResultsHidden(false)}>Show results</button>
        )}
      </div>

      <Rack
        hand={myHand}
        selectedTileId={selectedTileId}
        playableTileIds={markedTileIds}
        activeFilters={handFilters}
        splitByNumber={splitByNumber}
        pointFacingNumbers={gamePrefs.pointFacingNumbers}
        onToggleFilter={toggleFilter}
        onClearFilters={() => setHandFilters(new Set())}
        onSelect={(id) => setSelectedTileId((cur) => (cur === id ? null : id))}
        onDropOnCell={(cell) => handlePlace(cell)}
      />

      <ActivityLog log={round.log} players={game.players} />

      {error && <p className="error-text">{error}</p>}

      {round.phase === 'awaiting-starter-choice' && round.starterChoice && (
        <StarterChoiceModal
          isMe={round.starterChoice.playerId === selfPlayerId}
          starterName={game.players.find((p) => p.id === round.starterChoice!.playerId)?.name ?? ''}
          options={myHand.filter((t) => round.starterChoice!.optionTileIds.includes(t.id))}
          onChoose={onChooseStarter}
        />
      )}

      {round.phase === 'round-ended' && !resultsHidden && (
        <RoundEndModal
          game={game}
          onContinue={onContinueRound}
          onPlayAgain={onPlayAgain}
          onLeave={onLeave}
          onClose={() => setResultsHidden(true)}
        />
      )}
    </div>
  );
}

function Scoreboard({ game, selfPlayerId }: { game: PublicGameState; selfPlayerId: string }) {
  const currentId = game.round.turnOrder[game.round.currentPlayerIndex];
  return (
    <div className="scoreboard">
      {game.round.turnOrder.map((id) => {
        const p = game.players.find((pl) => pl.id === id)!;
        return (
          <div key={id} className={`score-row ${id === currentId && game.round.phase === 'playing' ? 'active' : ''}`}>
            <span className={`status-dot ${p.connected ? 'online' : 'offline'}`} />
            <span className="score-name">{p.name}{id === selfPlayerId ? ' (you)' : ''}</span>
            <span className="score-hand">{p.handCount} tiles</span>
            <span className="score-points">{p.score}</span>
          </div>
        );
      })}
    </div>
  );
}

function StarterChoiceModal({ isMe, starterName, options, onChoose }: { isMe: boolean; starterName: string; options: { id: string; values: [number, number, number] }[]; onChoose: (tileId: string) => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal">
        {isMe ? (
          <>
            <h2>You hold both the highest triple and 0-0-0</h2>
            <p>Choose which tile to open the round with.</p>
            <div className="starter-options">
              {options.map((t) => (
                <button key={t.id} className="starter-option" onClick={() => onChoose(t.id)}>
                  {t.values.join('-')}
                </button>
              ))}
            </div>
          </>
        ) : (
          <h2>Waiting for {starterName} to choose their starting tile...</h2>
        )}
      </div>
    </div>
  );
}

interface RoundEndModalProps {
  game: PublicGameState;
  onContinue: () => void;
  onPlayAgain: () => void;
  onLeave: () => void;
  onClose: () => void;
}

function RoundEndModal({ game, onContinue, onPlayAgain, onLeave, onClose }: RoundEndModalProps) {
  const lastEnd = [...game.round.log].reverse().find((e) => e.type === 'round-end') as Extract<GameEvent, { type: 'round-end' }> | undefined;
  const winner = lastEnd ? game.players.find((p) => p.id === lastEnd.winnerId) : undefined;

  const ranked = [...game.players].sort((a, b) => b.score - a.score);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close results">&times;</button>

        {game.gameOver ? (
          <>
            <h2>{game.players.find((p) => p.id === game.winnerId)?.name} wins the game!</h2>
            <p>Final scores</p>
          </>
        ) : (
          <>
            <h2>Round {game.round.roundNumber} over</h2>
            {lastEnd && winner && (
              <p>
                {lastEnd.reason === 'hand-empty'
                  ? `${winner.name} played their last tile.`
                  : `The game was blocked -- ${winner.name} had the fewest tiles.`}
              </p>
            )}
          </>
        )}

        <ul className="round-end-scores">
          {ranked.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <span className="round-end-points">{p.score}</span>
            </li>
          ))}
        </ul>

        <div className="modal-actions">
          {game.gameOver ? (
            <>
              <button className="primary" onClick={onPlayAgain}>Play again</button>
              <button onClick={onLeave}>Back to menu</button>
            </>
          ) : (
            <button className="primary" onClick={onContinue}>Start next round</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityLog({ log, players }: { log: GameEvent[]; players: PublicGameState['players'] }) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const recent = log.slice(-6).reverse();

  return (
    <div className="activity-log">
      {recent.map((ev, i) => (
        <div key={i} className="activity-entry">{describeEvent(ev, nameOf)}</div>
      ))}
    </div>
  );
}

function describeEvent(ev: GameEvent, nameOf: (id: string) => string): string {
  switch (ev.type) {
    case 'round-start':
      return `${nameOf(ev.playerId)} opened with ${ev.tile.values.join('-')} for ${ev.score.total} points.`;
    case 'placed':
      return `${nameOf(ev.playerId)} played ${ev.tile.values.join('-')} for ${ev.score.total} points${ev.score.bonusLabel !== 'none' ? ` (${ev.score.bonusLabel}!)` : ''}.`;
    case 'drew':
      return `${nameOf(ev.playerId)} drew a tile from the well (-5).`;
    case 'no-move-penalty':
      return `${nameOf(ev.playerId)} had no legal move (-10).`;
    case 'round-end':
      return `Round ended -- ${nameOf(ev.winnerId)} came out ahead.`;
    case 'game-end':
      return `${nameOf(ev.winnerId)} won the game!`;
    default:
      return '';
  }
}
