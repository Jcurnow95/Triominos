export interface Tile {
    id: string;
    values: [number, number, number];
}
/**
 * A corner printed as "any number" rather than a digit, used by freestyle tiles. It is
 * deliberately outside the real 0-5 range so it can travel anywhere a value does without
 * colliding with one; everything that compares corners goes through `valuesMatch`.
 */
export declare const WILD = -1;
/** How many tiles are in one standard set -- every multiset of 3 values from 0-5. */
export declare const STANDARD_SET_SIZE = 56;
export declare function isWild(value: number): boolean;
/** True when two corners may sit against each other: equal, or either one an "any". */
export declare function valuesMatch(a: number, b: number): boolean;
/** A freestyle tile: 1 or 2 printed numbers, the rest "any". */
export declare function isFreestyle(tile: Tile): boolean;
/**
 * How a tile reads in prose -- "4-0-0", or "4-any-any" for a freestyle tile. Everything
 * user-facing goes through this so the WILD sentinel never leaks out as a bare -1.
 */
export declare function tileLabel(values: [number, number, number]): string;
/**
 * `count` freestyle tiles, picked by striding across the pool so even a small allotment
 * spans the range of numbers instead of clustering on the lowest ones. Asking for more
 * than the pool holds simply repeats it, each copy keeping a unique id.
 */
export declare function generateFreestyleTiles(count: number): Tile[];
/**
 * The 56 official tiles: every multiset of 3 values from 0-5. Pass `setCount` > 1 to
 * shuffle multiple standard sets together into one shared deck (a real house rule for
 * bigger tables) -- the extra copies get a `#2`, `#3`, ... suffix on their id so every
 * tile in the combined deck still has a unique id, while `setCount` 1 (the default)
 * keeps the original bare ids for backward compatibility. `freestyleCount` adds that
 * many wildcard tiles on top of the standard sets.
 */
export declare function generateDeck(setCount?: number, freestyleCount?: number): Tile[];
/** A freestyle tile is never a triple: it has no three matching printed numbers. */
export declare function isTriple(tile: Tile): boolean;
/** "Any" corners are worth nothing, so a freestyle tile trades points for flexibility. */
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
