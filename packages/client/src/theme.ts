export interface NumberColor {
  fill: string;
  /** Text colour that stays legible on `fill`. */
  text: string;
}

export interface TileTheme {
  id: string;
  name: string;
  /** Face of a tile resting on the board. */
  fill: string;
  /** Face of the most recently played tile, so it stays readable but stands out. */
  fillRecent: string;
  stroke: string;
  text: string;
  /**
   * When set, a tile is drawn as three equal regions -- one per corner -- coloured by
   * the number in that corner, instead of a single flat face. Indexed by value 0-5.
   */
  numberColors?: NumberColor[];
  /**
   * Colour for a freestyle tile's "any" corner. Only meaningful alongside
   * `numberColors`; a flat-faced theme just paints wild corners like the rest of the
   * tile, since there is no per-corner colour to distinguish them from.
   */
  wildColor?: NumberColor;
}

export interface BoardTheme {
  id: string;
  name: string;
  bg: string;
  /** Optional decorative layer painted over `bg` (gradients only -- no external assets). */
  bgImage?: string;
  boardBg: string;
  panel: string;
  panelBorder: string;
  text: string;
  textDim: string;
  accent: string;
  accentDim: string;
}

export const TILE_THEMES: TileTheme[] = [
  { id: 'ivory', name: 'Ivory', fill: '#f4e9d8', fillRecent: '#fff3cd', stroke: '#b98d4f', text: '#2b2015' },
  { id: 'bone', name: 'Bone', fill: '#fbfbf7', fillRecent: '#eaf2ff', stroke: '#98a0ac', text: '#24282e' },
  { id: 'slate', name: 'Slate', fill: '#46536b', fillRecent: '#5c6f92', stroke: '#93a7c8', text: '#eef3fb' },
  { id: 'emerald', name: 'Emerald', fill: '#e6f6ec', fillRecent: '#c9f0d9', stroke: '#2f8f5b', text: '#123520' },
  { id: 'rose', name: 'Rose', fill: '#fde8ee', fillRecent: '#fbd0dd', stroke: '#c2557a', text: '#46101f' },
  { id: 'ocean', name: 'Ocean', fill: '#ddf0fb', fillRecent: '#bfe4f8', stroke: '#2b7fae', text: '#0d2b3a' },
  { id: 'amber', name: 'Amber', fill: '#fcefd0', fillRecent: '#ffe3a3', stroke: '#c98a1e', text: '#3d2a06' },
  { id: 'obsidian', name: 'Obsidian', fill: '#252a33', fillRecent: '#39414f', stroke: '#727d8e', text: '#e8ecf2' },
  {
    id: 'coded',
    name: 'Colour-coded',
    // Fallbacks used for the recent-tile tint and anywhere a flat face is still drawn.
    fill: '#f4f4f1',
    fillRecent: '#fff3cd',
    stroke: '#3a3f4a',
    text: '#20242c',
    // Hues chosen to stay distinguishable side by side; the printed digit remains the
    // primary cue, so colour is a shortcut rather than the only information.
    numberColors: [
      { fill: '#3b4252', text: '#eceff4' }, // 0 slate
      { fill: '#f7f7f4', text: '#23201b' }, // 1 white
      { fill: '#2f6fed', text: '#ffffff' }, // 2 blue
      { fill: '#ef8a1f', text: '#2b1a05' }, // 3 orange
      { fill: '#7b4fd1', text: '#ffffff' }, // 4 purple
      { fill: '#d63b3b', text: '#ffffff' }, // 5 red
    ],
    // Pink: the one hue left that reads apart from both the purple 4 and the red 5.
    wildColor: { fill: '#e8459b', text: '#ffffff' },
  },
];

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    bg: '#14181f',
    bgImage: 'radial-gradient(1200px 800px at 50% -10%, #1f2733 0%, transparent 70%)',
    boardBg: '#1b212b',
    panel: '#1d232d',
    panelBorder: '#2c3444',
    text: '#e9edf5',
    textDim: '#9aa5b8',
    accent: '#4f8cff',
    accentDim: '#2c4a86',
  },
  {
    id: 'felt',
    name: 'Card Table',
    bg: '#0f2a1d',
    bgImage: 'radial-gradient(1000px 700px at 50% 0%, #1a4531 0%, transparent 70%)',
    boardBg: '#143826',
    panel: '#163b29',
    panelBorder: '#245c40',
    text: '#e7f5ec',
    textDim: '#9dc0ac',
    accent: '#57c98a',
    accentDim: '#2b6b4b',
  },
  {
    id: 'walnut',
    name: 'Walnut',
    bg: '#2a1d14',
    bgImage: 'radial-gradient(1000px 700px at 50% 0%, #402d1f 0%, transparent 70%)',
    boardBg: '#3a2a1e',
    panel: '#3a2a1e',
    panelBorder: '#57422f',
    text: '#f4e9dd',
    textDim: '#c0a68e',
    accent: '#d99a4e',
    accentDim: '#7a5528',
  },
  {
    id: 'twilight',
    name: 'Twilight',
    bg: '#191233',
    bgImage: 'radial-gradient(1100px 750px at 50% -5%, #2b1f5c 0%, transparent 70%)',
    boardBg: '#221a45',
    panel: '#241a47',
    panelBorder: '#3d2e70',
    text: '#ece7ff',
    textDim: '#a89ccb',
    accent: '#9d7bff',
    accentDim: '#553a9e',
  },
  {
    id: 'paper',
    name: 'Paper',
    bg: '#f2efe8',
    // Deliberately darker than the page: pale tile palettes need a surface to sit against.
    boardBg: '#e5ded0',
    panel: '#ffffff',
    panelBorder: '#ddd7cc',
    text: '#23201b',
    textDim: '#6c665c',
    accent: '#2f6ee0',
    accentDim: '#c9dbfb',
  },
  {
    id: 'steel',
    name: 'Steel',
    bg: '#e8ecf1',
    boardBg: '#d5dde9',
    panel: '#ffffff',
    panelBorder: '#cfd7e2',
    text: '#1d232d',
    textDim: '#5f6b7c',
    accent: '#3b6fd4',
    accentDim: '#cfdefa',
  },
];

export interface ThemePrefs {
  tileThemeId: string;
  boardThemeId: string;
}

export const DEFAULT_THEME_PREFS: ThemePrefs = { tileThemeId: 'ivory', boardThemeId: 'midnight' };

const KEY = 'triominos:theme';

export function loadThemePrefs(): ThemePrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_THEME_PREFS;
    const parsed = JSON.parse(raw) as Partial<ThemePrefs>;
    return {
      tileThemeId: TILE_THEMES.some((t) => t.id === parsed.tileThemeId) ? parsed.tileThemeId! : DEFAULT_THEME_PREFS.tileThemeId,
      boardThemeId: BOARD_THEMES.some((b) => b.id === parsed.boardThemeId) ? parsed.boardThemeId! : DEFAULT_THEME_PREFS.boardThemeId,
    };
  } catch {
    return DEFAULT_THEME_PREFS;
  }
}

export function saveThemePrefs(prefs: ThemePrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be unavailable (private mode); themes just won't persist.
  }
}

export function getTileTheme(id: string): TileTheme {
  return TILE_THEMES.find((t) => t.id === id) ?? TILE_THEMES[0];
}

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((b) => b.id === id) ?? BOARD_THEMES[0];
}

/** Pushes the chosen palettes onto :root as CSS custom properties. */
export function applyTheme(prefs: ThemePrefs): void {
  const tile = getTileTheme(prefs.tileThemeId);
  const board = getBoardTheme(prefs.boardThemeId);
  const root = document.documentElement;

  root.style.setProperty('--tile-fill', tile.fill);
  root.style.setProperty('--tile-fill-recent', tile.fillRecent);
  root.style.setProperty('--tile-stroke', tile.stroke);
  root.style.setProperty('--tile-text', tile.text);

  // Per-number colours are read by the split-tile renderer as var(--num-N-fill/text).
  for (let value = 0; value <= 5; value++) {
    const c = tile.numberColors?.[value];
    root.style.setProperty(`--num-${value}-fill`, c ? c.fill : tile.fill);
    root.style.setProperty(`--num-${value}-text`, c ? c.text : tile.text);
  }

  // A freestyle tile's "any" corner. Without a per-corner palette it falls back to the
  // plain tile face, which reads as "blank, anything goes".
  const wild = tile.wildColor;
  root.style.setProperty('--wild-fill', wild ? wild.fill : tile.fill);
  root.style.setProperty('--wild-text', wild ? wild.text : tile.text);

  root.style.setProperty('--bg', board.bg);
  root.style.setProperty('--bg-image', board.bgImage ?? 'none');
  root.style.setProperty('--board-bg', board.boardBg);
  root.style.setProperty('--panel', board.panel);
  root.style.setProperty('--panel-border', board.panelBorder);
  root.style.setProperty('--text', board.text);
  root.style.setProperty('--text-dim', board.textDim);
  root.style.setProperty('--accent', board.accent);
  root.style.setProperty('--accent-dim', board.accentDim);
}
