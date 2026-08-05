/**
 * The 56 official tiles: every multiset of 3 values from 0-5. Pass `setCount` > 1 to
 * shuffle multiple standard sets together into one shared deck (a real house rule for
 * bigger tables) -- the extra copies get a `#2`, `#3`, ... suffix on their id so every
 * tile in the combined deck still has a unique id, while `setCount` 1 (the default)
 * keeps the original bare ids for backward compatibility.
 */
export function generateDeck(setCount = 1) {
    const singleSet = [];
    for (let a = 0; a <= 5; a++) {
        for (let b = a; b <= 5; b++) {
            for (let c = b; c <= 5; c++) {
                singleSet.push({ id: `${a}-${b}-${c}`, values: [a, b, c] });
            }
        }
    }
    if (setCount <= 1)
        return singleSet;
    const tiles = [...singleSet];
    for (let set = 2; set <= setCount; set++) {
        for (const tile of singleSet) {
            tiles.push({ id: `${tile.id}#${set}`, values: tile.values });
        }
    }
    return tiles;
}
export function isTriple(tile) {
    return tile.values[0] === tile.values[1] && tile.values[1] === tile.values[2];
}
export function tileSum(tile) {
    return tile.values[0] + tile.values[1] + tile.values[2];
}
export function shuffle(items, rng = Math.random) {
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
export function tileOrientations(values, reversedWinding) {
    const [a, b, c] = values;
    const cycle = reversedWinding
        ? [[a, c, b], [c, b, a], [b, a, c]]
        : [[a, b, c], [b, c, a], [c, a, b]];
    // Tiles with repeated values have fewer distinct orientations (a triple has just one).
    const seen = new Set();
    const results = [];
    for (const perm of cycle) {
        const key = perm.join(',');
        if (!seen.has(key)) {
            seen.add(key);
            results.push(perm);
        }
    }
    return results;
}
//# sourceMappingURL=tiles.js.map