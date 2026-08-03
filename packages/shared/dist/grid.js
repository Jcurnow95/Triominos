/**
 * Triangular board geometry.
 *
 * Lattice vertices are addressed with axial coordinates (q, r) on two 60deg axes.
 * Each unit rhombus (q,r)-(q+1,r)-(q,r+1)-(q+1,r+1) splits into an "up" triangle
 * and a "down" triangle:
 *   up(q,r)   has vertices (q,r),   (q+1,r),   (q,r+1)
 *   down(q,r) has vertices (q+1,r), (q,r+1),   (q+1,r+1)
 *
 * Every interior lattice vertex touches exactly 6 triangle cells (3 up, 3 down),
 * which is what makes hexagon-bonus detection ("6 tiles meet at a point") exact.
 */
export function vertexKey(v) {
    return `${v.q},${v.r}`;
}
export function cellKey(c) {
    return `${c.q},${c.r},${c.orient}`;
}
/** Inverse of {@link cellKey}, for recovering a cell from a DOM data-attribute etc. */
export function parseCellKey(key) {
    const [q, r, orient] = key.split(',');
    return { q: Number(q), r: Number(r), orient: orient };
}
export function cellsEqual(a, b) {
    return a.q === b.q && a.r === b.r && a.orient === b.orient;
}
export function cellVertices(c) {
    const { q, r, orient } = c;
    if (orient === 'up') {
        return [{ q, r }, { q: q + 1, r }, { q, r: r + 1 }];
    }
    return [{ q: q + 1, r }, { q, r: r + 1 }, { q: q + 1, r: r + 1 }];
}
/** The (up to) 3 cells that share a full edge with `c`. */
export function edgeNeighbors(c) {
    const { q, r, orient } = c;
    if (orient === 'up') {
        return [
            { q, r, orient: 'down' },
            { q, r: r - 1, orient: 'down' },
            { q: q - 1, r, orient: 'down' },
        ];
    }
    return [
        { q, r, orient: 'up' },
        { q: q + 1, r, orient: 'up' },
        { q, r: r + 1, orient: 'up' },
    ];
}
/**
 * The 6 cells that meet at vertex `v`, in fixed cyclic (angular) order, each paired
 * with the index (0-2, per cellVertices) at which that cell touches `v`.
 * Two entries are edge-adjacent to each other iff they are cyclically adjacent here.
 */
export function ringAround(v) {
    const { q, r } = v;
    return [
        { cell: { q, r, orient: 'up' }, vertexIndex: 0 },
        { cell: { q: q - 1, r, orient: 'down' }, vertexIndex: 0 },
        { cell: { q: q - 1, r, orient: 'up' }, vertexIndex: 1 },
        { cell: { q: q - 1, r: r - 1, orient: 'down' }, vertexIndex: 2 },
        { cell: { q, r: r - 1, orient: 'up' }, vertexIndex: 2 },
        { cell: { q, r: r - 1, orient: 'down' }, vertexIndex: 1 },
    ];
}
/** Pixel-space centroid for rendering, using unit edge length 1. */
export function cellCentroid(c) {
    const verts = cellVertices(c);
    const pts = verts.map((v) => vertexPoint(v));
    return {
        x: (pts[0].x + pts[1].x + pts[2].x) / 3,
        y: (pts[0].y + pts[1].y + pts[2].y) / 3,
    };
}
export function vertexPoint(v) {
    const SIN60 = Math.sqrt(3) / 2;
    return { x: v.q + v.r * 0.5, y: v.r * SIN60 };
}
//# sourceMappingURL=grid.js.map