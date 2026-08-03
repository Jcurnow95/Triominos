import { PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BonusType, CellCoord, cellKey } from '@triominos/shared';
import { BOARD_PADDING, Point, SCALE, cellCentroidPixel, cellPixelVertices, cellPolygonPoints, labelAngles, labelPositions, polygonPoints, regionPolygons } from '../geometry';

export interface BoardTileView {
  cell: CellCoord;
  values: [number, number, number];
  recent?: boolean;
  bonus?: BonusType;
}

export interface BoardHighlight {
  cell: CellCoord;
  values: [number, number, number];
}

export interface FloatingScore {
  /** Bumped on every scoring play so the popup animation replays. */
  seq: number;
  cell: CellCoord;
  points: number;
  bonus: BonusType;
}

interface BoardProps {
  tiles: BoardTileView[];
  highlights: BoardHighlight[];
  floating?: FloatingScore | null;
  /** Draw each tile as three colour-coded regions instead of one flat face. */
  splitByNumber?: boolean;
  /** Rotate each corner number to face outward, like a real printed tile. */
  pointFacingNumbers?: boolean;
  onHighlightClick?: (cell: CellCoord) => void;
}

/** Below 1 the board shrinks past its default framing, giving more surrounding context. */
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 4;
const ZOOM_STEP = 1.4;
/** On-screen cap for a tile edge, so a near-empty board isn't blown up to fill the panel. */
const MAX_TILE_PX = 88;
/** Pointer travel (px) before a press counts as a pan rather than a tap. */
const DRAG_THRESHOLD = 4;

export function Board({ tiles, highlights, floating, splitByNumber, pointFacingNumbers, onHighlightClick }: BoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  // The box that frames every tile currently on the board.
  const fit = useMemo(() => {
    const allCells = [...tiles.map((t) => t.cell), ...highlights.map((h) => h.cell)];
    if (allCells.length === 0) {
      return { x: -BOARD_PADDING, y: -BOARD_PADDING, w: BOARD_PADDING * 2, h: BOARD_PADDING * 2 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const cell of allCells) {
      for (const p of cellPixelVertices(cell)) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    return {
      x: minX - BOARD_PADDING,
      y: minY - BOARD_PADDING,
      w: maxX - minX + BOARD_PADDING * 2,
      h: maxY - minY + BOARD_PADDING * 2,
    };
  }, [tiles, highlights]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /**
   * The default framing: the fit box, widened if fitting it would render tiles larger
   * than MAX_TILE_PX. Without this, a board of two or three tiles fills the whole panel.
   */
  const base = useMemo(() => {
    let { x, y, w, h } = fit;
    if (size.w > 0 && size.h > 0 && w > 0 && h > 0) {
      // preserveAspectRatio="meet" fits the tighter axis, so that's the effective scale.
      const pxPerUnit = Math.min(size.w / w, size.h / h);
      const tilePx = SCALE * pxPerUnit;
      if (tilePx > MAX_TILE_PX) {
        const grow = tilePx / MAX_TILE_PX;
        const cx = x + w / 2;
        const cy = y + h / 2;
        w *= grow;
        h *= grow;
        x = cx - w / 2;
        y = cy - h / 2;
      }
    }
    return { x, y, w, h };
  }, [fit, size]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // A new round wipes the board back to a single tile; drop any zoom/pan with it.
  const tileCount = tiles.length;
  useEffect(() => {
    if (tileCount <= 1) resetView();
  }, [tileCount, resetView]);

  const view = useMemo(() => {
    const w = base.w / zoom;
    const h = base.h / zoom;
    const cx = base.x + base.w / 2 + pan.x;
    const cy = base.y + base.h / 2 + pan.y;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  }, [base, zoom, pan]);

  function unitsPerPixel(): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return 1;
    // The SVG letterboxes (preserveAspectRatio), so the true scale is the looser axis.
    return Math.max(view.w / rect.width, view.h / rect.height);
  }

  function handlePointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    suppressClick.current = false;
    if (zoom <= 1) return; // at or below the default framing the whole board is visible
    drag.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y, moved: false };
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    d.moved = true;
    const k = unitsPerPixel();
    setPan({ x: d.originX - dx * k, y: d.originY - dy * k });
  }

  function endDrag(e: ReactPointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      // pointerup lands before the click, so remember the pan in a flag that outlives it.
      if (d.moved) suppressClick.current = true;
      svgRef.current?.releasePointerCapture?.(e.pointerId);
      drag.current = null;
    }
  }

  /** Swallow the click that ends a pan so dragging never also places a tile. */
  function handleHighlightClick(cell: CellCoord) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onHighlightClick?.(cell);
  }

  const canZoomOut = zoom > MIN_ZOOM + 0.001;
  const canZoomIn = zoom < MAX_ZOOM - 0.001;
  const isDefaultView = Math.abs(zoom - 1) < 0.001 && pan.x === 0 && pan.y === 0;

  return (
    <div className="board-viewport" ref={wrapRef}>
      <svg
        ref={svgRef}
        className={zoom > 1 ? 'board-svg pannable' : 'board-svg'}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        role="img"
        aria-label="Tri-Ominos board"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {tiles.map((t) => (
          // Keyed by board position, so React creates each tile's DOM node exactly once --
          // that is what makes the CSS drop-in animation fire only for newly played tiles.
          <PlacedTileShape
            key={cellKey(t.cell)}
            cell={t.cell}
            values={t.values}
            recent={t.recent}
            bonus={t.bonus}
            splitByNumber={splitByNumber}
            pointFacingNumbers={pointFacingNumbers}
          />
        ))}

        {highlights.map((h) => (
          <g
            key={cellKey(h.cell)}
            className="board-highlight"
            data-cell={cellKey(h.cell)}
            onClick={() => handleHighlightClick(h.cell)}
            role="button"
            tabIndex={0}
            aria-label={`Place tile at ${h.values.join('-')}`}
          >
            <polygon points={cellPolygonPoints(h.cell)} className="highlight-polygon" />
          </g>
        ))}

        {floating && <FloatingScorePopup key={floating.seq} floating={floating} />}
      </svg>

      <div className="board-zoom">
        <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * ZOOM_STEP))} disabled={!canZoomIn} aria-label="Zoom in" title="Zoom in">+</button>
        <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / ZOOM_STEP))} disabled={!canZoomOut} aria-label="Zoom out" title="Zoom out">&minus;</button>
        <button onClick={resetView} disabled={isDefaultView} aria-label="Reset board view" title="Reset view">Fit</button>
      </div>
    </div>
  );
}

function PlacedTileShape({
  cell,
  values,
  recent,
  bonus,
  splitByNumber,
  pointFacingNumbers,
}: BoardTileView & { splitByNumber?: boolean; pointFacingNumbers?: boolean }) {
  const classNames = ['placed-tile'];
  if (recent) classNames.push('recent');
  if (bonus === 'bridge' || bonus === 'hexagon') classNames.push(`bonus-${bonus}`);
  if (splitByNumber) classNames.push('coded');

  return (
    <g className={classNames.join(' ')}>
      <TileFace vertices={cellPixelVertices(cell)} values={values} splitByNumber={splitByNumber} pointFacingNumbers={pointFacingNumbers} />
    </g>
  );
}

/**
 * The visual face of a single triangle: either a flat fill or three colour-coded
 * regions, plus its corner numbers. Shared by the board and any other place a tile
 * needs to render identically (e.g. the menu's decorative tiles), so they can never
 * drift apart the way two independent implementations would.
 */
export function TileFace({
  vertices,
  values,
  splitByNumber,
  pointFacingNumbers,
}: {
  vertices: [Point, Point, Point];
  values: [number, number, number];
  splitByNumber?: boolean;
  /** Rotate each corner number to face outward, like a real printed tile. */
  pointFacingNumbers?: boolean;
}) {
  const labels = labelPositions(vertices);
  const angles = pointFacingNumbers ? labelAngles(vertices) : null;

  return (
    <>
      {splitByNumber ? (
        <>
          {regionPolygons(vertices).map((points, i) => (
            <polygon key={i} points={points} className="tile-region" style={{ fill: `var(--num-${values[i]}-fill)` }} />
          ))}
          <polygon points={polygonPoints(vertices)} className="tile-outline" />
        </>
      ) : (
        <polygon points={polygonPoints(vertices)} className="tile-polygon" />
      )}

      {labels.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          className="tile-number"
          textAnchor="middle"
          dominantBaseline="middle"
          transform={angles ? `rotate(${angles[i]} ${p.x} ${p.y})` : undefined}
          style={splitByNumber ? { fill: `var(--num-${values[i]}-text)` } : undefined}
        >
          {values[i]}
        </text>
      ))}
    </>
  );
}

function FloatingScorePopup({ floating }: { floating: FloatingScore }) {
  const { x, y } = cellCentroidPixel(floating.cell);
  const label = floating.bonus === 'hexagon' ? 'HEXAGON!' : floating.bonus === 'bridge' ? 'BRIDGE!' : null;

  // The positioning transform must live on an outer <g>: a CSS `transform` (used by the
  // rise-and-fade animation) replaces an SVG transform attribute rather than composing
  // with it, which would otherwise snap the popup back to the viewBox origin.
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <g className="floating-score">
        <text className="floating-score-points" textAnchor="middle">+{floating.points}</text>
        {label && <text className="floating-score-bonus" y={22} textAnchor="middle">{label}</text>}
      </g>
    </g>
  );
}
