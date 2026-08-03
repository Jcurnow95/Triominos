import { CellCoord, cellVertices, vertexPoint } from '@triominos/shared';

export const SCALE = 58;

/** Breathing room around the board, in SVG units (a tile edge is SCALE wide). */
export const BOARD_PADDING = 22;

export interface Point {
  x: number;
  y: number;
}

export function cellPixelVertices(cell: CellCoord): [Point, Point, Point] {
  const verts = cellVertices(cell);
  return verts.map((v) => {
    const p = vertexPoint(v);
    return { x: p.x * SCALE, y: p.y * SCALE };
  }) as [Point, Point, Point];
}

export function polygonPoints(points: Point[]): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

export function cellPolygonPoints(cell: CellCoord): string {
  return polygonPoints(cellPixelVertices(cell));
}

export function cellCentroidPixel(cell: CellCoord): Point {
  const [a, b, c] = cellPixelVertices(cell);
  return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
}

/**
 * Splits a triangle into three regions of exactly equal area, one owning each corner.
 *
 * Joining the centroid to the three edge midpoints produces three congruent
 * quadrilaterals; the one for corner A is A -> mid(A,B) -> centroid -> mid(A,C). Returned
 * in the same order as the input vertices, so region i belongs to values[i].
 */
export function regionPolygons(verts: [Point, Point, Point]): [string, string, string] {
  const [a, b, c] = verts;
  const centroid = { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 };
  const mid = (p: Point, q: Point): Point => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const toPath = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

  return [
    toPath([a, mid(a, b), centroid, mid(a, c)]),
    toPath([b, mid(b, c), centroid, mid(b, a)]),
    toPath([c, mid(c, a), centroid, mid(c, b)]),
  ];
}

export function cellRegionPolygons(cell: CellCoord): [string, string, string] {
  return regionPolygons(cellPixelVertices(cell));
}

/**
 * Positions for the 3 corner numbers, inset from each vertex toward the centroid.
 *
 * The inset has to clear the two edges meeting at that vertex, or digits spill into the
 * neighbouring tile and read as one two-digit number. A label `d` from the vertex sits
 * `d * sin(30deg)` from each adjacent edge, so clearing a ~10u glyph radius (bold 17px
 * digits run taller than the 7.7u this was originally tuned for -- they were touching
 * the flat top edge of "up" tiles) needs d >= ~20u. Vertex-to-centroid is
 * SCALE/sqrt(3) ~= 33.5u, hence ~0.6.
 */
const LABEL_PULL = 0.6;

export function labelPositions(verts: [Point, Point, Point]): [Point, Point, Point] {
  const centroid = { x: (verts[0].x + verts[1].x + verts[2].x) / 3, y: (verts[0].y + verts[1].y + verts[2].y) / 3 };
  return verts.map((v) => ({
    x: v.x + (centroid.x - v.x) * LABEL_PULL,
    y: v.y + (centroid.y - v.y) * LABEL_PULL,
  })) as [Point, Point, Point];
}

export function cellLabelPositions(cell: CellCoord): [Point, Point, Point] {
  return labelPositions(cellPixelVertices(cell));
}

/**
 * The rotation (degrees, for SVG's clockwise-positive `rotate()`) that makes a corner
 * number's "up" point outward along that corner's tip, the way real Tri-Ominos tiles are
 * printed. A vertex pointing straight up needs no rotation, so the angle is measured from
 * due north (-90deg in atan2's convention) rather than from due east.
 */
export function labelAngles(verts: [Point, Point, Point]): [number, number, number] {
  const centroid = { x: (verts[0].x + verts[1].x + verts[2].x) / 3, y: (verts[0].y + verts[1].y + verts[2].y) / 3 };
  return verts.map((v) => (Math.atan2(v.y - centroid.y, v.x - centroid.x) * 180) / Math.PI + 90) as [
    number,
    number,
    number,
  ];
}
