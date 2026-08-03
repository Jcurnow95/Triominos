import { tileSum } from './tiles.js';
export const WELL_DRAW_PENALTY = 5;
export const NO_MOVE_PENALTY = 10;
/**
 * House rule: the official game makes you draw until you can play or the well runs dry,
 * which can mean drawing a dozen tiles in one turn. Here a turn is capped at 3 draws,
 * after which you may take the -10 and pass even if the well still has tiles.
 */
export const MAX_DRAWS_PER_TURN = 3;
export const HAND_EMPTY_BONUS = 25;
export const START_BONUS = 10;
export const START_TRIPLE_ZERO_BONUS = 30;
export const BRIDGE_BONUS = 40;
export const HEXAGON_BONUS = 50;
export const WINNING_SCORE = 400;
export function scorePlay(tile, bonusType) {
    const base = tileSum(tile);
    if (bonusType === 'hexagon') {
        return { base, bonus: HEXAGON_BONUS, bonusLabel: 'hexagon', total: base + HEXAGON_BONUS };
    }
    if (bonusType === 'bridge') {
        return { base, bonus: BRIDGE_BONUS, bonusLabel: 'bridge', total: base + BRIDGE_BONUS };
    }
    return { base, bonus: 0, bonusLabel: 'none', total: base };
}
export function scoreStartingTile(tile, isTripleZeroChosen) {
    const base = tileSum(tile);
    const bonus = START_BONUS + (isTripleZeroChosen ? START_TRIPLE_ZERO_BONUS : 0);
    return {
        base,
        bonus,
        bonusLabel: isTripleZeroChosen ? 'start-triple-zero' : 'start',
        total: base + bonus,
    };
}
export function scoreStartingTileNoTriple(tile) {
    const base = tileSum(tile);
    return { base, bonus: 0, bonusLabel: 'none', total: base };
}
//# sourceMappingURL=scoring.js.map