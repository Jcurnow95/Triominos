import { useEffect, useRef, useState } from 'react';
import { BOARD_THEMES, TILE_THEMES, ThemePrefs, getTileTheme } from '../theme';
import { GamePrefs } from '../preferences';

interface SettingsMenuProps {
  themePrefs: ThemePrefs;
  gamePrefs: GamePrefs;
  onThemeChange: (prefs: ThemePrefs) => void;
  onGamePrefsChange: (prefs: GamePrefs) => void;
}

export function SettingsMenu({ themePrefs, gamePrefs, onThemeChange, onGamePrefsChange }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="theme-picker" ref={containerRef}>
      <button
        className="theme-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Settings"
        title="Settings"
      >
        <GearIcon />
      </button>

      {open && (
        <div className="theme-panel" role="dialog" aria-label="Settings">
          <div className="theme-section">
            <span className="theme-label">Assist</span>
            <label className="setting-row">
              <input
                type="checkbox"
                checked={gamePrefs.markPlayableTiles}
                onChange={(e) => onGamePrefsChange({ ...gamePrefs, markPlayableTiles: e.target.checked })}
              />
              <span>
                <span className="setting-name">Mark playable tiles</span>
                <span className="setting-hint">
                  {gamePrefs.markPlayableTiles
                    ? 'Tiles you cannot play are dimmed.'
                    : 'All tiles look the same -- read the board yourself.'}
                </span>
              </span>
            </label>

            <label className="setting-row">
              <input
                type="checkbox"
                checked={gamePrefs.fastAiMoves}
                onChange={(e) => onGamePrefsChange({ ...gamePrefs, fastAiMoves: e.target.checked })}
              />
              <span>
                <span className="setting-name">Fast AI moves</span>
                <span className="setting-hint">
                  {gamePrefs.fastAiMoves
                    ? 'Bots move almost instantly. Takes effect in your next solo game.'
                    : 'Bots pause between moves so they are easier to follow.'}
                </span>
              </span>
            </label>

            <VolumeSetting
              name="Sound effects"
              hint="Tile placement, shuffle, win/lose sounds."
              enabled={gamePrefs.sfxEnabled}
              volume={gamePrefs.sfxVolume}
              onEnabledChange={(sfxEnabled) => onGamePrefsChange({ ...gamePrefs, sfxEnabled })}
              onVolumeChange={(sfxVolume) => onGamePrefsChange({ ...gamePrefs, sfxVolume })}
            />

            <VolumeSetting
              name="Music"
              hint="Background music while a game is in progress."
              enabled={gamePrefs.musicEnabled}
              volume={gamePrefs.musicVolume}
              onEnabledChange={(musicEnabled) => onGamePrefsChange({ ...gamePrefs, musicEnabled })}
              onVolumeChange={(musicVolume) => onGamePrefsChange({ ...gamePrefs, musicVolume })}
            />
          </div>

          <div className="theme-section">
            <span className="theme-label">Tiles</span>

            <label className="setting-row">
              <input
                type="checkbox"
                checked={gamePrefs.pointFacingNumbers}
                onChange={(e) => onGamePrefsChange({ ...gamePrefs, pointFacingNumbers: e.target.checked })}
              />
              <span>
                <span className="setting-name">Real tile orientation</span>
                <span className="setting-hint">
                  {gamePrefs.pointFacingNumbers
                    ? 'Numbers face their corner point, like a real piece.'
                    : 'Numbers stay upright for easier reading.'}
                </span>
              </span>
            </label>

            <div className="swatch-grid">
              {TILE_THEMES.map((t) => (
                <button
                  key={t.id}
                  className={t.id === themePrefs.tileThemeId ? 'swatch selected' : 'swatch'}
                  onClick={() => onThemeChange({ ...themePrefs, tileThemeId: t.id })}
                  title={t.name}
                  aria-label={`Tile colour: ${t.name}`}
                  aria-pressed={t.id === themePrefs.tileThemeId}
                >
                  <svg viewBox="0 0 100 88" className="swatch-tile">
                    <polygon points="50,6 95,82 5,82" fill={t.fill} stroke={t.stroke} strokeWidth={6} />
                    <text x="50" y="58" textAnchor="middle" fill={t.text} fontSize="34" fontWeight="700">5</text>
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="theme-section">
            <span className="theme-label">Background</span>
            <div className="swatch-grid">
              {BOARD_THEMES.map((b) => (
                <button
                  key={b.id}
                  className={b.id === themePrefs.boardThemeId ? 'swatch selected' : 'swatch'}
                  onClick={() => onThemeChange({ ...themePrefs, boardThemeId: b.id })}
                  title={b.name}
                  aria-label={`Background: ${b.name}`}
                  aria-pressed={b.id === themePrefs.boardThemeId}
                >
                  <span className="swatch-bg" style={{ background: b.bg, borderColor: b.panelBorder }}>
                    <span className="swatch-bg-dot" style={{ background: b.accent }} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="theme-preview">
            <span className="theme-label">Preview</span>
            <PreviewTiles tileThemeId={themePrefs.tileThemeId} />
          </div>
        </div>
      )}
    </div>
  );
}

/** A checkbox (on/off) paired with a 0-100 volume slider, e.g. for SFX or music. */
function VolumeSetting({
  name,
  hint,
  enabled,
  volume,
  onEnabledChange,
  onVolumeChange,
}: {
  name: string;
  hint: string;
  enabled: boolean;
  volume: number;
  onEnabledChange: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
}) {
  return (
    <div className="volume-setting">
      <label className="setting-row">
        <input type="checkbox" checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} />
        <span>
          <span className="setting-name">{name}</span>
          <span className="setting-hint">{hint}</span>
        </span>
      </label>
      <div className="volume-slider-row">
        <input
          type="range"
          min={0}
          max={100}
          value={volume}
          disabled={!enabled}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          aria-label={`${name} volume`}
        />
        <span className="volume-value">{volume}</span>
      </div>
    </div>
  );
}

function PreviewTiles({ tileThemeId }: { tileThemeId: string }) {
  const t = getTileTheme(tileThemeId);
  return (
    <svg viewBox="0 0 150 80" className="preview-svg" aria-hidden="true">
      <polygon points="40,8 76,70 4,70" fill={t.fill} stroke={t.stroke} strokeWidth={2.5} />
      <text x="40" y="32" textAnchor="middle" fill={t.text} fontSize="13" fontWeight="700">3</text>
      <text x="57" y="58" textAnchor="middle" fill={t.text} fontSize="13" fontWeight="700">4</text>
      <text x="23" y="58" textAnchor="middle" fill={t.text} fontSize="13" fontWeight="700">5</text>

      <polygon points="76,70 40,8 112,8" fill={t.fillRecent} stroke={t.stroke} strokeWidth={2.5} />
      <text x="76" y="46" textAnchor="middle" fill={t.text} fontSize="13" fontWeight="700">4</text>
      <text x="57" y="20" textAnchor="middle" fill={t.text} fontSize="13" fontWeight="700">3</text>
      <text x="95" y="20" textAnchor="middle" fill={t.text} fontSize="13" fontWeight="700">1</text>
    </svg>
  );
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9.1a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.07a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1.03Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
