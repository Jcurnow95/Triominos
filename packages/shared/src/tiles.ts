export interface Tile {
  id: string;
  values: [number, number, number];
}

/**
 * A corner printed as "any number" rather than a digit, used by freestyle tiles. It is
 * deliberately outside the real 0-5 range so it can travel anywhere a value does without
 * colliding with one; everything that compares corners goes through `valuesMatch`.
 */
export const WILD = -1;

/** How many tiles are in one standard set -- every multiset of 3 values from 0-5. */
export const STANDARD_SET_SIZE = 56;

export function isWild(value: number): boolean {
  return value === WILD;
}

/** True when two corners may sit against each other: equal, or either one an "any". */
export function valuesMatch(a: number, b: number): boolean {
  return a === b || isWild(a) || isWild(b);
}

/** A freestyle tile: 1 or 2 printed numbers, the rest "any". */
export function isFreestyle(tile: Tile): boolean {
  return tile.values.some(isWild);
}

/**
 * How a tile reads in prose -- "4-0-0", or "4-any-any" for a freestyle tile. Everything
 * user-facing goes through this so the WILD sentinel never leaks out as a bare -1.
 */
export function tileLabel(values: [number, number, number]): string {
  return values.map((v) => (isWild(v) ? 'any' : String(v))).join('-');
}

/**
 * Every freestyle tile that can exist: the 21 two-number tiles and the 6 one-number ones.
 * Held in a fixed order so a given allotment always produces the same deck.
 */
function freestylePool(): [number, number, number][] {
  const pool: [number, number, number][] = [];
  for (let a = 0; a <= 5; a++) {
    for (let b = a; b <= 5; b++) pool.push([a, b, WILD]);
  }
  for (let a = 0; a <= 5; a++) pool.push([a, WILD, WILD]);
  return pool;
}

/**
 * `count` freestyle tiles, picked by striding across the pool so even a small allotment
 * spans the range of numbers instead of clustering on the lowest ones. Asking for more
 * than the pool holds simply repeats it, each copy keeping a unique id.
 */
export function generateFreestyleTiles(count: number): Tile[] {
  if (count <= 0) return [];
  const pool = freestylePool();
  const tiles: Tile[] = [];
  for (let i = 0; i < count; i++) {
    const values = pool[Math.floor((i * pool.length) / count) % pool.length];
    const label = values.map((v) => (isWild(v) ? 'w' : v)).join('-');
    tiles.push({ id: `free${i + 1}-${label}`, values });
  }
  return tiles;
}

/**
 * The 56 official tiles: every multiset of 3 values from 0-5. Pass `setCount` > 1 to
 * shuffle multiple standard sets together into one shared deck (a real house rule for
 * bigger tables) -- the extra copies get a `#2`, `#3`, ... suffix on their id so every
 * tile in the combined deck still has a unique id, while `setCount` 1 (the default)
 * keeps the original bare ids for backward compatibility. `freestyleCount` adds that
 * many wildcard tiles on top of the standard sets.
 */
export function generateDeck(setCount = 1, freestyleCount = 0): Tile[] {
  const singleSet: Tile[] = [];
  for (let a = 0; a <= 5; a++) {
    for (let b = a; b <= 5; b++) {
      for (let c = b; c <= 5; c++) {
        singleSet.push({ id: `${a}-${b}-${c}`, values: [a, b, c] });
      }
    }
  }

  const tiles: Tile[] = [...singleSet];
  for (let set = 2; set <= setCount; set++) {
    for (const tile of singleSet) {
      tiles.push({ id: `${tile.id}#${set}`, values: tile.values });
    }
  }
  return [...tiles, ...generateFreestyleTiles(freestyleCount)];
}

/** A freestyle tile is never a triple: it has no three matching printed numbers. */
export function isTriple(tile: Tile): boolean {
  if (isFreestyle(tile)) return false;
  return tile.values[0] === tile.values[1] && tile.values[1] === tile.values[2];
}

/** "Any" corners are worth nothing, so a freestyle tile trades points for flexibility. */
export function tileSum(tile: Tile): number {
  return tile.values.reduce((sum, v) => sum + (isWild(v) ? 0 : v), 0);
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
export function tileOrientations(
  values: [number, number, number],
  reversedWinding: boolean,
): [number, number, number][] {
  const [a, b, c] = values;
  const cycle: [number, number, number][] = reversedWinding
    ? [[a, c, b], [c, b, a], [b, a, c]]
    : [[a, b, c], [b, c, a], [c, a, b]];

  // Tiles with repeated values have fewer distinct orientations (a triple has just one).
  const seen = new Set<string>();
  const results: [number, number, number][] = [];
  for (const perm of cycle) {
    const key = perm.join(',');
    if (!seen.has(key)) {
      seen.add(key);
      results.push(perm);
    }
  }
  return results;
}
