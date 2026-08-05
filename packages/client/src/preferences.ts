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
   * When true, the board never marks which of your tiles are playable or which cells a
   * selected tile legally fits -- every empty edge cell is offered and an illegal attempt
   * just gets rejected, like laying a real tile against the board yourself. Overrides
   * `markPlayableTiles`.
   */
  realismMode: boolean;
  /**
   * When true, each corner number is rotated to face outward, like a real printed
   * Tri-Ominos tile, instead of staying upright.
   */
  pointFacingNumbers: boolean;
  /** When true, tile/shuffle/win/lose sound effects play. */
  sfxEnabled: boolean;
  /** 0-100. */
  sfxVolume: number;
  /** When true, background music plays during a game. */
  musicEnabled: boolean;
  /** 0-100. */
  musicVolume: number;
}

export const DEFAULT_GAME_PREFS: GamePrefs = {
  markPlayableTiles: true,
  fastAiMoves: false,
  realismMode: false,
  pointFacingNumbers: false,
  sfxEnabled: true,
  sfxVolume: 80,
  musicEnabled: true,
  musicVolume: 40,
};

const KEY = 'triominos:gameprefs';

function clampVolume(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

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
      realismMode:
        typeof parsed.realismMode === 'boolean' ? parsed.realismMode : DEFAULT_GAME_PREFS.realismMode,
      pointFacingNumbers:
        typeof parsed.pointFacingNumbers === 'boolean'
          ? parsed.pointFacingNumbers
          : DEFAULT_GAME_PREFS.pointFacingNumbers,
      sfxEnabled: typeof parsed.sfxEnabled === 'boolean' ? parsed.sfxEnabled : DEFAULT_GAME_PREFS.sfxEnabled,
      sfxVolume: clampVolume(parsed.sfxVolume, DEFAULT_GAME_PREFS.sfxVolume),
      musicEnabled:
        typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : DEFAULT_GAME_PREFS.musicEnabled,
      musicVolume: clampVolume(parsed.musicVolume, DEFAULT_GAME_PREFS.musicVolume),
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
