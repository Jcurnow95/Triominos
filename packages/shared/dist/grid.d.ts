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
export type Orient = 'up' | 'down';
export interface VertexCoord {
    q: number;
    r: number;
}
export interface CellCoord {
    q: number;
    r: number;
    orient: Orient;
}
export declare function vertexKey(v: VertexCoord): string;
export declare function cellKey(c: CellCoord): string;
/** Inverse of {@link cellKey}, for recovering a cell from a DOM data-attribute etc. */
export declare function parseCellKey(key: string): CellCoord;
export declare function cellsEqual(a: CellCoord, b: CellCoord): boolean;
export declare function cellVertices(c: CellCoord): [VertexCoord, VertexCoord, VertexCoord];
/** The (up to) 3 cells that share a full edge with `c`. */
export declare function edgeNeighbors(c: CellCoord): CellCoord[];
/**
 * The 6 cells that meet at vertex `v`, in fixed cyclic (angular) order, each paired
 * with the index (0-2, per cellVertices) at which that cell touches `v`.
 * Two entries are edge-adjacent to each other iff they are cyclically adjacent here.
 */
export declare function ringAround(v: VertexCoord): {
    cell: CellCoord;
    vertexIndex: number;
}[];
/** Pixel-space centroid for rendering, using unit edge length 1. */
export declare function cellCentroid(c: CellCoord): {
    x: number;
    y: number;
};
export declare function vertexPoint(v: VertexCoord): {
    x: number;
    y: number;
};
