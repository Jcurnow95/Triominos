import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Board,
  CellCoord,
  Tile,
  boardTiles,
  cellKey,
  emptyFringeCells,
  findLegalPlacements,
  hasAnyLegalPlacement,
  placeTile as placeBoardTile,
  shuffle,
} from '@triominos/shared';
import { Board as BoardView, BoardHighlight, BoardTileView } from '../components/Board';
import { Rack } from '../components/Rack';
import { SettingsMenu } from '../components/SettingsMenu';
import {
  PUZZLE_LEVELS,
  PuzzleLevel,
  initialPuzzleBoard,
  isPointTileId,
  isPuzzleSolved,
  loadPuzzleProgress,
  markPuzzleSolved,
} from '../puzzles';
import { playGameWon, playTilePlaced } from '../sound';
import type { ThemePrefs } from '../theme';
import type { GamePrefs } from '../preferences';

interface PuzzleProps {
  themePrefs: ThemePrefs;
  gamePrefs: GamePrefs;
  onThemeChange: (prefs: ThemePrefs) => void;
  onGamePrefsChange: (prefs: GamePrefs) => void;
  onExit: () => void;
}

export function Puzzle({ themePrefs, gamePrefs, onThemeChange, onGamePrefsChange, onExit }: PuzzleProps) {
  const [levelId, setLevelId] = useState<string | null>(null);
  const [solvedIds, setSolvedIds] = useState<Set<string>>(() => loadPuzzleProgress());

  const level = levelId ? PUZZLE_LEVELS.find((l) => l.id === levelId) ?? null : null;

  if (!level) {
    return (
      <PuzzleLevelSelect
        solvedIds={solvedIds}
        themePrefs={themePrefs}
        gamePrefs={gamePrefs}
        onThemeChange={onThemeChange}
        onGamePrefsChange={onGamePrefsChange}
        onSelect={setLevelId}
        onExit={onExit}
      />
    );
  }

  const levelIndex = PUZZLE_LEVELS.findIndex((l) => l.id === level.id);
  const nextLevel = PUZZLE_LEVELS[levelIndex + 1] ?? null;

  return (
    <PuzzlePlay
      key={level.id}
      level={level}
      themePrefs={themePrefs}
      gamePrefs={gamePrefs}
      onThemeChange={onThemeChange}
      onGamePrefsChange={onGamePrefsChange}
      onSolved={() => setSolvedIds(markPuzzleSolved(level.id))}
      onBackToLevels={() => setLevelId(null)}
      onNextLevel={nextLevel ? () => setLevelId(nextLevel.id) : null}
    />
  );
}

function PuzzleLevelSelect({
  solvedIds,
  themePrefs,
  gamePrefs,
  onThemeChange,
  onGamePrefsChange,
  onSelect,
  onExit,
}: {
  solvedIds: Set<string>;
  themePrefs: ThemePrefs;
  gamePrefs: GamePrefs;
  onThemeChange: (prefs: ThemePrefs) => void;
  onGamePrefsChange: (prefs: GamePrefs) => void;
  onSelect: (levelId: string) => void;
  onExit: () => void;
}) {
  return (
    <div className="puzzle-select-page">
      <div className="home-header">
        <div>
          <button className="link-button" onClick={onExit}>&larr; Back to menu</button>
          <h1>Puzzle Mode</h1>
          <p className="tagline">Connect the marked tiles using every tile you're given.</p>
        </div>
        <SettingsMenu
          themePrefs={themePrefs}
          gamePrefs={gamePrefs}
          onThemeChange={onThemeChange}
          onGamePrefsChange={onGamePrefsChange}
        />
      </div>

      <div className="puzzle-level-grid">
        {PUZZLE_LEVELS.map((level, i) => (
          <button key={level.id} className="puzzle-level-card" onClick={() => onSelect(level.id)}>
            {solvedIds.has(level.id) && <span className="puzzle-level-badge" aria-label="Solved">&#10003;</span>}
            <span className="puzzle-level-number">{i + 1}</span>
            <span className="puzzle-level-name">{level.name}</span>
            <span className="puzzle-level-tiles">{level.tiles.length} tiles</span>
            {level.points.length > 2 && (
              <span className="puzzle-level-contacts">{level.points.length} points</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface PuzzlePlayProps {
  level: PuzzleLevel;
  themePrefs: ThemePrefs;
  gamePrefs: GamePrefs;
  onThemeChange: (prefs: ThemePrefs) => void;
  onGamePrefsChange: (prefs: GamePrefs) => void;
  onSolved: () => void;
  onBackToLevels: () => void;
  onNextLevel: (() => void) | null;
}

function PuzzlePlay({
  level,
  themePrefs,
  gamePrefs,
  onThemeChange,
  onGamePrefsChange,
  onSolved,
  onBackToLevels,
  onNextLevel,
}: PuzzlePlayProps) {
  const [board, setBoard] = useState<Board>(() => initialPuzzleBoard(level));
  const [hand, setHand] = useState<Tile[]>(() => shuffle(level.tiles));
  const [history, setHistory] = useState<{ board: Board; hand: Tile[]; placedKey: string | null }[]>([]);
  const [lastPlacedKey, setLastPlacedKey] = useState<string | null>(null);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [handFilters, setHandFilters] = useState<Set<number>>(new Set());
  const [placementError, setPlacementError] = useState<string | null>(null);

  const solved = useMemo(() => isPuzzleSolved(board, level), [board, level]);
  // "Stuck" covers both a hand that still has tiles but none of them fit anywhere, and a
  // hand that's been fully placed without the points ever connecting -- either way the
  // player is out of moves and needs to undo or reset.
  const stuck = !solved && (hand.length === 0 || !hasAnyLegalPlacement(hand, board));

  const announcedRef = useRef(false);
  useEffect(() => {
    if (solved && !announcedRef.current) {
      announcedRef.current = true;
      playGameWon();
      onSolved();
    }
    if (!solved) announcedRef.current = false;
  }, [solved, onSolved]);

  const selectedTile = hand.find((t) => t.id === selectedTileId) ?? null;
  const highlights: BoardHighlight[] = useMemo(() => {
    if (!selectedTile || solved) return [];
    // Realism mode offers every empty edge cell instead of narrowing it down to the ones
    // the selected tile actually fits -- an illegal attempt is just rejected on click.
    if (gamePrefs.realismMode) {
      return emptyFringeCells(board).map((cell) => ({ cell, values: selectedTile.values }));
    }
    return findLegalPlacements(selectedTile, board);
  }, [selectedTile, board, solved, gamePrefs.realismMode]);

  const playableTileIds = useMemo(() => {
    const set = new Set<string>();
    for (const tile of hand) {
      if (findLegalPlacements(tile, board).length > 0) set.add(tile.id);
    }
    return set;
  }, [hand, board]);
  const markedTileIds = gamePrefs.realismMode ? new Set(hand.map((t) => t.id)) : playableTileIds;

  const boardTileViews: BoardTileView[] = boardTiles(board).map((t) => ({
    cell: t.cell,
    values: t.values,
    recent: lastPlacedKey !== null && cellKey(t.cell) === lastPlacedKey,
    point: isPointTileId(t.tileId),
  }));

  const splitByNumber = themePrefs.tileThemeId === 'coded';

  function handlePlace(cell: CellCoord) {
    if (!selectedTile || solved) return;
    const legal = findLegalPlacements(selectedTile, board);
    const match = legal.find((p) => cellKey(p.cell) === cellKey(cell));
    if (!match) {
      // Only reachable in realism mode, where every empty edge cell is offered up front --
      // otherwise a highlighted cell is always legal by construction.
      setPlacementError("That tile doesn't fit there.");
      return;
    }

    setPlacementError(null);
    setHistory((h) => [...h, { board, hand, placedKey: lastPlacedKey }]);
    setBoard(placeBoardTile(board, selectedTile.id, match.cell, match.values));
    setHand((cur) => cur.filter((t) => t.id !== selectedTile.id));
    setLastPlacedKey(cellKey(match.cell));
    setSelectedTileId(null);
    playTilePlaced();
  }

  function handleUndo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setBoard(prev.board);
      setHand(prev.hand);
      setLastPlacedKey(prev.placedKey);
      return h.slice(0, -1);
    });
    setSelectedTileId(null);
    setPlacementError(null);
  }

  function handleReset() {
    setBoard(initialPuzzleBoard(level));
    setHand(shuffle(level.tiles));
    setHistory([]);
    setLastPlacedKey(null);
    setSelectedTileId(null);
    setHandFilters(new Set());
    setPlacementError(null);
  }

  function toggleFilter(value: number) {
    setHandFilters((cur) => {
      const next = new Set(cur);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <div className="game-page puzzle-page">
      <div className="game-header">
        <div className="puzzle-header-info">
          <button className="link-button" onClick={onBackToLevels}>&larr; Levels</button>
          <h2>{level.name}</h2>
        </div>
        <SettingsMenu
          themePrefs={themePrefs}
          gamePrefs={gamePrefs}
          onThemeChange={onThemeChange}
          onGamePrefsChange={onGamePrefsChange}
        />
      </div>

      <div className="board-wrap">
        <BoardView
          tiles={boardTileViews}
          highlights={highlights}
          splitByNumber={splitByNumber}
          pointFacingNumbers={gamePrefs.pointFacingNumbers}
          onHighlightClick={handlePlace}
        />
      </div>

      <div className="turn-bar">
        {solved ? (
          <span className="turn-indicator mine">Solved! Every point is connected.</span>
        ) : stuck ? (
          <span className="turn-indicator">
            {hand.length === 0 ? 'Out of tiles -- the points never connected.' : 'No legal moves left with your remaining tiles.'}
          </span>
        ) : (
          <span className="turn-indicator">{hand.length} tile{hand.length === 1 ? '' : 's'} left to place</span>
        )}
        <div className="puzzle-controls">
          <button onClick={handleUndo} disabled={history.length === 0}>Undo</button>
          <button onClick={handleReset}>Reset</button>
        </div>
      </div>

      <Rack
        hand={hand}
        selectedTileId={selectedTileId}
        playableTileIds={solved ? new Set() : markedTileIds}
        activeFilters={handFilters}
        splitByNumber={splitByNumber}
        pointFacingNumbers={gamePrefs.pointFacingNumbers}
        onToggleFilter={toggleFilter}
        onClearFilters={() => setHandFilters(new Set())}
        onSelect={(id) => {
          setSelectedTileId((cur) => (cur === id ? null : id));
          setPlacementError(null);
        }}
        onDropOnCell={(cell) => handlePlace(cell)}
      />

      {placementError && <p className="error-text">{placementError}</p>}

      {(solved || stuck) && (
        <div className="modal-overlay">
          <div className="modal">
            {solved ? (
              <>
                <h2>Puzzle solved!</h2>
                <p>You connected every point using every tile.</p>
                <div className="modal-actions">
                  {onNextLevel && <button className="primary" onClick={onNextLevel}>Next puzzle</button>}
                  <button onClick={handleReset}>Play again</button>
                  <button onClick={onBackToLevels}>Back to levels</button>
                </div>
              </>
            ) : (
              <>
                <h2>No moves left</h2>
                <p>
                  {hand.length === 0
                    ? "You've placed every tile, but the points still aren't all connected."
                    : 'None of your remaining tiles fit anywhere on the board.'}{' '}
                  Undo a move or start over.
                </p>
                <div className="modal-actions">
                  <button className="primary" onClick={handleUndo} disabled={history.length === 0}>Undo last move</button>
                  <button onClick={handleReset}>Reset puzzle</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
