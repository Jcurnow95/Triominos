export interface Tile {
    id: string;
    values: [number, number, number];
}
/**
 * The 56 official tiles: every multiset of 3 values from 0-5. Pass `setCount` > 1 to
 * shuffle multiple standard sets together into one shared deck (a real house rule for
 * bigger tables) -- the extra copies get a `#2`, `#3`, ... suffix on their id so every
 * tile in the combined deck still has a unique id, while `setCount` 1 (the default)
 * keeps the original bare ids for backward compatibility.
 */
export declare function generateDeck(setCount?: number): Tile[];
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
