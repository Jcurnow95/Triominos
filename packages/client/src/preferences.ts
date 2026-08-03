export interface GamePrefs {
  /**
   * When true, tiles you can't legally play this turn are dimmed. Turning it off makes
   * you read the board yourself to work out which tiles fit.
   */
  markPlayableTiles: boolean;
  /**
   * When true, computer opponents pause only briefly between moves instead of the
   * default readable pace. Applied when starting a new solo game.
   */
  fastAiMoves: boolean;
  /**
   * When true, each corner number is rotated to face outward, like a real printed
   * Tri-Ominos tile, instead of staying upright.
   */
  pointFacingNumbers: boolean;
}

export const DEFAULT_GAME_PREFS: GamePrefs = { markPlayableTiles: true, fastAiMoves: false, pointFacingNumbers: false };

const KEY = 'triominos:gameprefs';

export function loadGamePrefs(): GamePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_GAME_PREFS;
    const parsed = JSON.parse(raw) as Partial<GamePrefs>;
    return {
      markPlayableTiles:
        typeof parsed.markPlayableTiles === 'boolean'
          ? parsed.markPlayableTiles
          : DEFAULT_GAME_PREFS.markPlayableTiles,
      fastAiMoves:
        typeof parsed.fastAiMoves === 'boolean' ? parsed.fastAiMoves : DEFAULT_GAME_PREFS.fastAiMoves,
      pointFacingNumbers:
        typeof parsed.pointFacingNumbers === 'boolean'
          ? parsed.pointFacingNumbers
          : DEFAULT_GAME_PREFS.pointFacingNumbers,
    };
  } catch {
    return DEFAULT_GAME_PREFS;
  }
}

export function saveGamePrefs(prefs: GamePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable (private mode); the setting just won't persist.
  }
}
