import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BonusType,
  CellCoord,
  GameEvent,
  PublicGameState,
  boardTiles,
  cellKey,
  emptyFringeCells,
  findLegalPlacements,
  hasAnyLegalPlacement,
  tileLabel,
} from '@triominos/shared';
import { Board, BoardHighlight, BoardTileView, FloatingScore } from '../components/Board';
import { Rack, tileMatchesFilters } from '../components/Rack';
import { SettingsMenu } from '../components/SettingsMenu';
import { playBridge, playHexagon, playPass, playTilePlaced } from '../sound';
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
  onResign: () => void;
  onLeave: () => void;
}

export function Game({ game, selfPlayerId, error, themePrefs, gamePrefs, onThemeChange, onGamePrefsChange, onPlace, onDraw, onPass, onChooseStarter, onContinueRound, onPlayAgain, onResign, onLeave }: GameProps) {
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [resultsHidden, setResultsHidden] = useState(false);
  const [handFilters, setHandFilters] = useState<Set<number>>(new Set());
  const [confirmingResign, setConfirmingResign] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);

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
  const canStillDraw = round.wellCount > 0 && round.drawsThisTurn < game.rules.maxDrawsPerTurn;

  // With the assist off -- or when it isn't your turn -- every tile is shown identically,
  // leaving it to the player to read the board and work out which tiles fit. Realism mode
  // forces this regardless of the markPlayableTiles setting.
  const markedTileIds =
    isMyTurn && gamePrefs.markPlayableTiles && !gamePrefs.realismMode
      ? playableTileIds
      : new Set(myHand.map((t) => t.id));

  const selectedTile = myHand.find((t) => t.id === selectedTileId) ?? null;
  const highlights: BoardHighlight[] = useMemo(() => {
    if (!selectedTile || !isMyTurn) return [];
    // Realism mode offers every empty edge cell instead of narrowing it down to the ones
    // the selected tile actually fits -- an illegal attempt is simply rejected by the
    // server, the same way a real tile just wouldn't sit flush against the board.
    if (gamePrefs.realismMode) {
      return emptyFringeCells(round.board).map((cell) => ({ cell, values: selectedTile.values }));
    }
    return findLegalPlacements(selectedTile, round.board);
  }, [selectedTile, round.board, isMyTurn, gamePrefs.realismMode]);

  // The most recent scoring play drives the highlight, the bonus glow, and the score popup.
  // The very first tile of a round is logged as 'round-start' rather than 'placed' -- it
  // always lands at the origin cell -- so it needs to be recognised here too, or the
  // opening play would be the one placement that never gets a highlight or points popup.
  const lastPlay = useMemo(() => {
    for (let i = round.log.length - 1; i >= 0; i--) {
      const ev = round.log[i];
      if (ev.type === 'placed' || ev.type === 'round-start') {
        const bonus: BonusType =
          ev.score.bonusLabel === 'hexagon' ? 'hexagon' : ev.score.bonusLabel === 'bridge' ? 'bridge' : 'none';
        const cell: CellCoord = ev.type === 'placed' ? ev.cell : { q: 0, r: 0, orient: 'up' };
        return { seq: i, key: cellKey(cell), cell, points: ev.score.total, bonus, playerId: ev.playerId };
      }
    }
    return null;
  }, [round.log]);

  // Plays a sound for every new log entry -- tile placements (bridge/hexagon get their
  // own fanfare instead of the plain placement sound) and passes -- for any player, not
  // just us. `round.log` resets to empty at the start of each round, which the "grew"
  // check below handles for free: a shorter log is never treated as new entries.
  // undefined = "haven't seen this round's log yet" (skip replaying its history on mount).
  const seenLogLengthRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const prevLength = seenLogLengthRef.current;
    if (prevLength !== undefined) {
      for (let i = prevLength; i < round.log.length; i++) {
        const ev = round.log[i];
        if (ev.type === 'placed') {
          if (ev.score.bonusLabel === 'bridge') playBridge();
          else if (ev.score.bonusLabel === 'hexagon') playHexagon();
          else playTilePlaced();
        } else if (ev.type === 'no-move-penalty') {
          playPass();
        }
      }
    }
    seenLogLengthRef.current = round.log.length;
  }, [round.log]);

  const boardTileViews: BoardTileView[] = boardTiles(round.board).map((t) => ({
    cell: t.cell,
    values: t.values,
    recent: lastPlay ? cellKey(t.cell) === lastPlay.key : false,
    bonus: lastPlay && cellKey(t.cell) === lastPlay.key ? lastPlay.bonus : 'none',
    printed: t.printed,
  }));

  const floating: FloatingScore | null = lastPlay
    ? {
        seq: lastPlay.seq,
        cell: lastPlay.cell,
        points: lastPlay.points,
        bonus: lastPlay.bonus,
        playerName: game.players.find((p) => p.id === lastPlay.playerId)?.name ?? '',
      }
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
        <div className="header-actions">
          <button
            className="back-button"
            // Leaving mid-game clears the session, so a live game is worth confirming;
            // once it's over there's nothing left to lose by walking away.
            onClick={() => (game.gameOver ? onLeave() : setConfirmingLeave(true))}
            title="Back to menu"
            aria-label="Back to menu"
          >
            <BackIcon />
          </button>
          {!game.gameOver && (
            <button
              className="resign-button"
              onClick={() => setConfirmingResign(true)}
              title="Resign"
              aria-label="Resign"
            >
              <FlagIcon />
            </button>
          )}
          <SettingsMenu
            themePrefs={themePrefs}
            gamePrefs={gamePrefs}
            onThemeChange={onThemeChange}
            onGamePrefsChange={onGamePrefsChange}
          />
        </div>
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
            <span className="rules-summary" title="This game's settings">
              Playing to {game.rules.winningScore}
              {game.rules.tileSets > 1 && ` · ${game.rules.tileSets}× tiles`}
            </span>
            {isMyTurn && !hasAnyMove && canStillDraw && (
              <button className="primary" onClick={onDraw}>
                Draw from well (-5)
                <span className="btn-sub">{round.drawsThisTurn}/{game.rules.maxDrawsPerTurn} drawn</span>
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

      {confirmingResign && (
        <ResignConfirmModal
          onConfirm={() => {
            setConfirmingResign(false);
            onResign();
          }}
          onCancel={() => setConfirmingResign(false)}
        />
      )}

      {confirmingLeave && (
        <LeaveConfirmModal
          onConfirm={() => {
            setConfirmingLeave(false);
            onLeave();
          }}
          onCancel={() => setConfirmingLeave(false)}
        />
      )}
    </div>
  );
}

/** How long a "+N" delta bubble stays before fading; must match the CSS animation duration. */
const SCORE_DELTA_MS = 1700;

function Scoreboard({ game, selfPlayerId }: { game: PublicGameState; selfPlayerId: string }) {
  const currentId = game.round.turnOrder[game.round.currentPlayerIndex];

  // Diff each player's score against what we last rendered so a change -- from either
  // player, not just a floating popup over the board -- shows up right on their row.
  const prevScores = useRef<Map<string, number>>(new Map());
  const [deltas, setDeltas] = useState<Map<string, { amount: number; seq: number }>>(new Map());
  const seqRef = useRef(0);

  useEffect(() => {
    const changes: [string, number][] = [];
    for (const p of game.players) {
      const prev = prevScores.current.get(p.id);
      if (prev !== undefined && prev !== p.score) changes.push([p.id, p.score - prev]);
      prevScores.current.set(p.id, p.score);
    }
    if (changes.length === 0) return;

    setDeltas((cur) => {
      const next = new Map(cur);
      for (const [id, amount] of changes) {
        seqRef.current += 1;
        const seq = seqRef.current;
        next.set(id, { amount, seq });
        setTimeout(() => {
          setDeltas((c) => {
            if (c.get(id)?.seq !== seq) return c; // superseded by a newer change
            const copy = new Map(c);
            copy.delete(id);
            return copy;
          });
        }, SCORE_DELTA_MS);
      }
      return next;
    });
  }, [game.players]);

  const highScore = Math.max(...game.players.map((p) => p.score));
  const leaders = game.players.length > 1 && highScore > 0 ? new Set(game.players.filter((p) => p.score === highScore).map((p) => p.id)) : new Set<string>();

  return (
    <div className="scoreboard">
      {game.round.turnOrder.map((id) => {
        const p = game.players.find((pl) => pl.id === id)!;
        const delta = deltas.get(id);
        const classNames = ['score-row'];
        if (id === currentId && game.round.phase === 'playing') classNames.push('active');
        if (leaders.has(id)) classNames.push('leader');

        return (
          <div key={id} className={classNames.join(' ')}>
            <span className="score-avatar" style={{ background: avatarColor(id) }} aria-hidden="true">
              {p.name.trim().charAt(0).toUpperCase() || '?'}
            </span>
            <span className={`status-dot ${p.connected ? 'online' : 'offline'}`} />
            <span
              className="score-name"
              title={`${p.handCount} tile${p.handCount === 1 ? '' : 's'} left`}
            >
              <TilePile count={p.handCount} />
              <span className="score-name-text">
                {p.name}
                {id === selfPlayerId ? ' (you)' : ''}
                {leaders.has(id) && <CrownIcon />}
              </span>
            </span>
            <span
              className={p.handCount <= 2 ? 'score-hand low' : 'score-hand'}
              title={`${p.handCount} tile${p.handCount === 1 ? '' : 's'} left`}
            >
              {p.handCount}
            </span>
            <span className="score-points-wrap">
              <span className="score-points">{p.score}</span>
              {delta && (
                <span key={delta.seq} className={delta.amount >= 0 ? 'score-delta positive' : 'score-delta negative'}>
                  {delta.amount >= 0 ? `+${delta.amount}` : delta.amount}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Deterministic per-player colour so the same name/id always gets the same avatar hue. */
function avatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360}, 60%, 42%)`;
}

const TILE_PILE_CAP = 15;
/** The pile spans the name card's full height, so a single tile still reads as a tile. */
const TILE_PILE_HEIGHT = 32;
/** Rendered edge length of one triangle. The path's own triangle is ~18 units across. */
const TILE_PILE_PIECE_SIZE = 22;
/** Horizontal step between neighbours -- half an edge, so they interlock like real tiles. */
const TILE_PILE_STEP = 9;

/**
 * A pile of the game's own triangle shape, sitting behind a player's name. Tiles alternate
 * point-up and point-down and interlock into a strip, the same zig-zag the real board makes,
 * filling the name card top to bottom. Every tile still in hand widens the pile, so a
 * nearly-empty hand is a small clump and a full hand is a card-wide heap.
 */
function TilePile({ count }: { count: number }) {
  const shown = Math.min(count, TILE_PILE_CAP);
  const width = TILE_PILE_PIECE_SIZE + TILE_PILE_STEP * (shown - 1);
  const scale = TILE_PILE_PIECE_SIZE / 18;

  const tiles = Array.from({ length: shown }, (_, i) => ({
    key: i,
    x: TILE_PILE_PIECE_SIZE / 2 + TILE_PILE_STEP * i,
    // A little scatter off the centre line keeps the strip looking heaped rather than ruled.
    y: TILE_PILE_HEIGHT / 2 + (pileJitter(i, 12.9898) - 0.5) * 5,
    rotation: (pileJitter(i, 78.233) - 0.5) * 16,
    // Alternating orientation is what makes neighbours nest into each other.
    flip: i % 2 === 1 ? -1 : 1,
  }));

  return (
    <svg
      className="tile-pile"
      viewBox={`0 0 ${width} ${TILE_PILE_HEIGHT}`}
      width={width}
      height={TILE_PILE_HEIGHT}
      aria-hidden="true"
    >
      {tiles.map((t) => (
        <path
          key={t.key}
          className="tile-pile-piece"
          d="M12 3 L21 20 L3 20 Z"
          transform={`translate(${t.x} ${t.y}) rotate(${t.rotation}) scale(${scale} ${scale * t.flip}) translate(-12 -12)`}
        />
      ))}
    </svg>
  );
}

/** Deterministic 0..1 jitter, so a pile looks scattered but never reshuffles between renders. */
function pileJitter(i: number, salt: number): number {
  const v = Math.sin((i + 1) * salt) * 43758.5453;
  return v - Math.floor(v);
}

function CrownIcon() {
  return (
    <svg className="leader-crown" viewBox="0 0 24 24" width="13" height="13" aria-label="Leading" role="img">
      <path
        d="M3 8l4 3 5-6 5 6 4-3-1.5 10h-15L3 8z"
        fill="var(--gold)"
        stroke="var(--gold)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 21V4" strokeLinecap="round" />
      <path d="M5 4h13l-3 4 3 4H5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M19 12H5" strokeLinecap="round" />
      <path d="M11 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResignConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Resign the game?</h2>
        <p>This ends the game right away and hands the win to whoever's ahead among the other players. You can&apos;t undo this.</p>
        <div className="modal-actions">
          <button className="danger" onClick={onConfirm}>Resign</button>
          <button onClick={onCancel}>Keep playing</button>
        </div>
      </div>
    </div>
  );
}

function LeaveConfirmModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Leave the game?</h2>
        <p>You&apos;ll go back to the menu and won&apos;t be able to rejoin this game. To end it properly and hand the win to whoever&apos;s ahead, resign instead.</p>
        <div className="modal-actions">
          <button className="danger" onClick={onConfirm}>Leave</button>
          <button onClick={onCancel}>Keep playing</button>
        </div>
      </div>
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
                  {tileLabel(t.values)}
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
      return `${nameOf(ev.playerId)} opened with ${tileLabel(ev.tile.values)} for ${ev.score.total} points.`;
    case 'placed':
      return `${nameOf(ev.playerId)} played ${tileLabel(ev.tile.values)} for ${ev.score.total} points${ev.score.bonusLabel !== 'none' ? ` (${ev.score.bonusLabel}!)` : ''}.`;
    case 'drew':
      return `${nameOf(ev.playerId)} drew a tile from the well (-5).`;
    case 'no-move-penalty':
      return `${nameOf(ev.playerId)} had no legal move (-10).`;
    case 'round-end':
      return `Round ended -- ${nameOf(ev.winnerId)} came out ahead.`;
    case 'game-end':
      return `${nameOf(ev.winnerId)} won the game!`;
    case 'resigned':
      return `${nameOf(ev.playerId)} resigned.`;
    default:
      return '';
  }
}
