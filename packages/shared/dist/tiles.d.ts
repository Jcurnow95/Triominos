export interface Tile {
    id: string;
    values: [number, number, number];
}
/** All 56 official tiles: every multiset of 3 values from 0-5. */
export declare function generateDeck(): Tile[];
export declare function isTriple(tile: Tile): boolean;
export declare function tileSum(tile: Tile): number;
export declare function shuffle<T>(items: T[], rng?: () => number): T[];
/**
 * The orientations a tile can legally take in a cell.
 *
 * A real Tri-Omino is printed on one face: you may turn it, never flip it over. So a
 * tile has three orientations (its rotations), not six -- the other three permutations
 * are mirror images and belong to a different tile that isn't in the box.
 *
 * Rotating a triangle by 60deg swaps it between up-pointing and down-pointing cells, and
 * `cellVertices` lists those two cell types with opposite winding. Reading the same
 * physical tile against a reversed winding reverses its cyclic order, so down cells take
 * the reversed rotations. Both sets together are still only the tile's 3 real rotations.
 */
export declare function tileOrientations(values: [number, number, number], reversedWinding: boolean): [number, number, number][];
