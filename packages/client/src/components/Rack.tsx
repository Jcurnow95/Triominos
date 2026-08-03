import { PointerEvent as ReactPointerEvent, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CellCoord, Tile, parseCellKey } from '@triominos/shared';
import { Point } from '../geometry';
import { TileFace } from './Board';

// The rack tile is drawn in a fixed 100x88 viewBox; these are its three corners, in the
// same order as a tile's values.
const RACK_VERTS: [Point, Point, Point] = [
  { x: 50, y: 4 },
  { x: 96, y: 84 },
  { x: 4, y: 84 },
];

/** Pointer travel (px) before a press on a rack tile counts as a drag rather than a tap. */
const DRAG_THRESHOLD = 6;

export const TILE_VALUES = [0, 1, 2, 3, 4, 5] as const;

interface RackProps {
  hand: Tile[];
  selectedTileId: string | null;
  playableTileIds: Set<string>;
  /** Values the hand is filtered to; empty means show everything. */
  activeFilters: Set<number>;
  splitByNumber?: boolean;
  pointFacingNumbers?: boolean;
  onToggleFilter: (value: number) => void;
  onClearFilters: () => void;
  onSelect: (tileId: string) => void;
  /** Called when a tile is dragged onto a highlighted board cell (identified by Board's `data-cell`). */
  onDropOnCell: (cell: CellCoord) => void;
}

export function tileMatchesFilters(tile: Tile, filters: Set<number>): boolean {
  if (filters.size === 0) return true;
  return tile.values.some((v) => filters.has(v));
}

export function Rack({
  hand,
  selectedTileId,
  playableTileIds,
  activeFilters,
  splitByNumber,
  pointFacingNumbers,
  onToggleFilter,
  onClearFilters,
  onSelect,
  onDropOnCell,
}: RackProps) {
  const visible = hand.filter((t) => tileMatchesFilters(t, activeFilters));
  const hiddenCount = hand.length - visible.length;

  return (
    <div className="rack-area">
      <div
        className="rack-filters"
        role="group"
        aria-label="Filter your tiles by number"
        hidden={hand.length === 0}
      >
        <span className="rack-filters-label">Show</span>
        {TILE_VALUES.map((value) => {
          const count = hand.filter((t) => t.values.includes(value)).length;
          const active = activeFilters.has(value);
          return (
            <button
              key={value}
              className={active ? 'filter-chip active' : 'filter-chip'}
              onClick={() => onToggleFilter(value)}
              disabled={count === 0}
              aria-pressed={active}
              title={count === 0 ? `No tiles with ${value}` : `${count} tile${count === 1 ? '' : 's'} with ${value}`}
            >
              {value}
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
        {activeFilters.size > 0 && (
          <button className="filter-clear" onClick={onClearFilters}>
            Clear{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}
          </button>
        )}
      </div>

      <div className="rack">
        {visible.map((tile) => (
          <RackTile
            key={tile.id}
            tile={tile}
            selected={tile.id === selectedTileId}
            playable={playableTileIds.has(tile.id)}
            splitByNumber={splitByNumber}
            pointFacingNumbers={pointFacingNumbers}
            onSelect={() => onSelect(tile.id)}
            onDropOnCell={onDropOnCell}
          />
        ))}
        {visible.length === 0 && hand.length > 0 && (
          <p className="rack-empty">No tiles match that filter.</p>
        )}
      </div>
    </div>
  );
}

function RackTile({
  tile,
  selected,
  playable,
  splitByNumber,
  pointFacingNumbers,
  onSelect,
  onDropOnCell,
}: {
  tile: Tile;
  selected: boolean;
  playable: boolean;
  splitByNumber?: boolean;
  pointFacingNumbers?: boolean;
  onSelect: () => void;
  onDropOnCell: (cell: CellCoord) => void;
}) {
  const drag = useRef<{ pointerId: number; startX: number; startY: number; dragging: boolean } | null>(null);
  const hoveredEl = useRef<Element | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{ x: number; y: number } | null>(null);

  function setHover(el: Element | null) {
    if (el === hoveredEl.current) return;
    hoveredEl.current?.classList.remove('drag-over');
    el?.classList.add('drag-over');
    hoveredEl.current = el;
  }

  function cellUnderPointer(clientX: number, clientY: number): Element | null {
    return document.elementFromPoint(clientX, clientY)?.closest('[data-cell]') ?? null;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, dragging: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (!d.dragging) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < DRAG_THRESHOLD) return;
      d.dragging = true;
      onSelect(); // reveal this tile's legal placements on the board
    }
    setGhost({ x: e.clientX, y: e.clientY });
    setHover(cellUnderPointer(e.clientX, e.clientY));
  }

  function endDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    drag.current = null;

    if (d.dragging) {
      // The pointerup that ends a drag is followed by a synthetic click; swallow it so
      // dropping a tile doesn't also toggle its selection back off.
      suppressClick.current = true;
      const cellEl = cellUnderPointer(e.clientX, e.clientY);
      const key = cellEl?.getAttribute('data-cell');
      if (key) onDropOnCell(parseCellKey(key));
      setHover(null);
      setGhost(null);
    }
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onSelect();
  }

  const classNames = ['rack-tile'];
  if (selected) classNames.push('selected');
  if (!playable) classNames.push('unplayable');
  if (splitByNumber) classNames.push('coded');
  if (ghost) classNames.push('dragging');

  return (
    <button
      className={classNames.join(' ')}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      aria-pressed={selected}
      aria-label={`Tile ${tile.values.join('-')}${playable ? '' : ' (no legal move)'}`}
    >
      <svg viewBox="0 0 100 88" className="rack-tile-svg">
        <TileFace vertices={RACK_VERTS} values={tile.values} splitByNumber={splitByNumber} pointFacingNumbers={pointFacingNumbers} />
      </svg>

      {ghost &&
        createPortal(
          <div className="tile-drag-ghost" style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
            <svg viewBox="0 0 100 88">
              <TileFace vertices={RACK_VERTS} values={tile.values} splitByNumber={splitByNumber} pointFacingNumbers={pointFacingNumbers} />
            </svg>
          </div>,
          document.body,
        )}
    </button>
  );
}
