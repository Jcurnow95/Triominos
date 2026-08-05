import { FormEvent, useMemo, useState } from 'react';
import type { BotDifficulty, CellCoord, GameRules } from '@triominos/shared';
import { DEFAULT_GAME_RULES } from '@triominos/shared';
import { SettingsMenu } from '../components/SettingsMenu';
import { GameRulesEditor } from '../components/GameRulesEditor';
import { TileFace } from '../components/Board';
import { cellPixelVertices } from '../geometry';
import type { ThemePrefs } from '../theme';
import type { GamePrefs } from '../preferences';

type Mode = 'menu' | 'solo' | 'online';

interface HomeProps {
  initialRoomCode: string;
  busy: boolean;
  error: string | null;
  themePrefs: ThemePrefs;
  gamePrefs: GamePrefs;
  onThemeChange: (prefs: ThemePrefs) => void;
  onGamePrefsChange: (prefs: GamePrefs) => void;
  onCreate: (name: string) => void;
  onJoin: (name: string, roomCode: string) => void;
  onCreateSolo: (name: string, botCount: number, difficulty: BotDifficulty, rules: GameRules) => void;
  onPuzzleMode: () => void;
}

const DIFFICULTIES: { value: BotDifficulty; label: string; blurb: string }[] = [
  { value: 'easy', label: 'Easy', blurb: 'Plays a random legal move.' },
  { value: 'normal', label: 'Normal', blurb: 'Always takes the highest-scoring move.' },
  { value: 'hard', label: 'Hard', blurb: 'Scores high, sheds big tiles, and avoids setting you up.' },
];

export function Home({ initialRoomCode, busy, error, themePrefs, gamePrefs, onThemeChange, onGamePrefsChange, onCreate, onJoin, onCreateSolo, onPuzzleMode }: HomeProps) {
  const [mode, setMode] = useState<Mode>(initialRoomCode ? 'online' : 'menu');
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [botCount, setBotCount] = useState(1);
  const [difficulty, setDifficulty] = useState<BotDifficulty>('normal');
  const [rules, setRules] = useState<GameRules>(DEFAULT_GAME_RULES);
  const [showRules, setShowRules] = useState(false);

  const nameReady = name.trim().length > 0;

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!nameReady || !roomCode.trim()) return;
    onJoin(name.trim(), roomCode.trim());
  }

  return (
    <div className="home-page">
      <div className="home-header">
        <div>
          <h1>Tri-Ominos</h1>
          <p className="tagline">The classic triangular tile game.</p>
        </div>
        <SettingsMenu
          themePrefs={themePrefs}
          gamePrefs={gamePrefs}
          onThemeChange={onThemeChange}
          onGamePrefsChange={onGamePrefsChange}
        />
      </div>

      <HeroTiles themePrefs={themePrefs} gamePrefs={gamePrefs} />

      <label className="field">
        <span>Your name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          placeholder="e.g. Jamie"
          autoFocus
        />
      </label>

      {mode === 'menu' && (
        <div className="mode-buttons">
          <button className="primary" disabled={!nameReady} onClick={() => setMode('solo')}>
            Play vs Computer
          </button>
          <button disabled={!nameReady} onClick={() => setMode('online')}>
            Play with Friends
          </button>
          <button onClick={onPuzzleMode}>
            Puzzle Mode
          </button>
        </div>
      )}

      {mode === 'solo' && (
        <div className="mode-panel">
          <button className="link-button" onClick={() => setMode('menu')}>&larr; Back</button>

          <div className="field">
            <span>Opponents</span>
            <div className="option-row">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  className={botCount === n ? 'option selected' : 'option'}
                  onClick={() => setBotCount(n)}
                >
                  {n} bot{n > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Difficulty</span>
            <div className="option-row">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.value}
                  className={difficulty === d.value ? 'option selected' : 'option'}
                  onClick={() => setDifficulty(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="hint">{DIFFICULTIES.find((d) => d.value === difficulty)!.blurb}</p>
          </div>

          <button type="button" className="link-button" onClick={() => setShowRules((v) => !v)}>
            {showRules ? '−' : '+'} Game settings
          </button>
          {showRules && <GameRulesEditor rules={rules} onChange={setRules} />}

          <button
            className="primary"
            disabled={busy || !nameReady}
            onClick={() => onCreateSolo(name.trim(), botCount, difficulty, rules)}
          >
            Start Game
          </button>
        </div>
      )}

      {mode === 'online' && (
        <div className="mode-panel">
          <button className="link-button" onClick={() => setMode('menu')}>&larr; Back</button>

          <form className="home-form" onSubmit={handleJoin}>
            <label className="field">
              <span>Room code</span>
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
                placeholder="ABCD"
                className="room-code-input"
              />
            </label>
            <button type="submit" disabled={busy || !nameReady || !roomCode.trim()}>
              Join Room
            </button>
          </form>

          <div className="divider">or</div>

          <button className="primary" disabled={busy || !nameReady} onClick={() => onCreate(name.trim())}>
            Create New Room
          </button>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

/**
 * A short zig-zag strip of real board cells (up, down, up, down), so this is pixel-for-
 * pixel the same triangle shape and rendering as the actual board -- just a few tiles
 * of it. The lattice points are given consistent values so each shared edge matches,
 * the same constraint the real board enforces.
 */
const HERO_CELLS: CellCoord[] = [
  { q: 0, r: 0, orient: 'up' },
  { q: 0, r: 0, orient: 'down' },
  { q: 1, r: 0, orient: 'up' },
  { q: 1, r: 0, orient: 'down' },
];
const HERO_VALUES: [number, number, number][] = [
  [5, 3, 4],
  [3, 4, 5],
  [3, 1, 5],
  [1, 5, 2],
];

/** Decorative rosette of tiles on the menu; doubles as a live preview of the chosen palette. */
function HeroTiles({ themePrefs, gamePrefs }: { themePrefs: ThemePrefs; gamePrefs: GamePrefs }) {
  const splitByNumber = themePrefs.tileThemeId === 'coded';

  const viewBox = useMemo(() => {
    const pad = 8;
    const allVerts = HERO_CELLS.flatMap((c) => cellPixelVertices(c));
    const xs = allVerts.map((p) => p.x);
    const ys = allVerts.map((p) => p.y);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) - Math.min(...xs) + pad * 2;
    const h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    return `${minX} ${minY} ${w} ${h}`;
  }, []);

  return (
    <svg className="hero-tiles" viewBox={viewBox} aria-hidden="true">
      {HERO_CELLS.map((cell, i) => (
        <g key={i} className="hero-tile" style={{ animationDelay: `${i * 0.09}s` }}>
          <TileFace
            vertices={cellPixelVertices(cell)}
            values={HERO_VALUES[i]}
            splitByNumber={splitByNumber}
            pointFacingNumbers={gamePrefs.pointFacingNumbers}
          />
        </g>
      ))}
    </svg>
  );
}
