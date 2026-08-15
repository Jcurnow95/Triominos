import {
  GAME_RULES_PRESETS,
  GameRules,
  MAX_DRAWS_OPTIONS,
  TILE_SET_OPTIONS,
  WINNING_SCORE_OPTIONS,
  matchingPresetId,
  maxFreestyleTiles,
  summarizeGameRules,
} from '@triominos/shared';

interface GameRulesEditorProps {
  rules: GameRules;
  onChange: (rules: GameRules) => void;
  /** Read-only mode for guests watching the host configure the lobby. */
  disabled?: boolean;
}

/**
 * Shared by the solo setup panel and the multiplayer lobby (host-only there) -- both just
 * hold a GameRules value and hand back the next one on any change. Laid out as a preset row
 * (whole setups in one click), then the individual controls grouped into the two things a
 * player actually tunes -- how long the match runs, and how hard it plays -- with a live
 * recap at the foot so the game you're about to start is readable at a glance.
 */
export function GameRulesEditor({ rules, onChange, disabled }: GameRulesEditorProps) {
  const freestyleCap = maxFreestyleTiles(rules.tileSets);
  const activePreset = matchingPresetId(rules);

  /** Shrinking the deck can strand an allotment above the new cap, so re-clamp on change. */
  function setTileSets(tileSets: number) {
    onChange({
      ...rules,
      tileSets,
      freestyleTiles: Math.min(rules.freestyleTiles, maxFreestyleTiles(tileSets)),
    });
  }

  return (
    <div className="rules-editor">
      <div className="field">
        <span>Presets</span>
        <div className="option-row preset-row">
          {GAME_RULES_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={activePreset === preset.id ? 'option selected' : 'option'}
              disabled={disabled}
              title={preset.blurb}
              onClick={() => onChange(preset.rules)}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <p className="hint">
          {activePreset
            ? GAME_RULES_PRESETS.find((p) => p.id === activePreset)!.blurb
            : 'Custom setup. Pick a preset to start from, then tweak anything below.'}
        </p>
      </div>

      <div className="rules-group">
        <span className="rules-group-label">Match</span>

        <div className="field">
          <span>Score to win</span>
          <div className="option-row">
            {WINNING_SCORE_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={rules.winningScore === value ? 'option selected' : 'option'}
                disabled={disabled}
                onClick={() => onChange({ ...rules, winningScore: value })}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="hint">Rounds keep dealing until someone crosses this total.</p>
        </div>

        <div className="field">
          <span>Tile sets</span>
          <div className="option-row">
            {TILE_SET_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={rules.tileSets === value ? 'option selected' : 'option'}
                disabled={disabled}
                onClick={() => setTileSets(value)}
              >
                {value}&times;
                <span className="btn-sub">{value * 56} tiles</span>
              </button>
            ))}
          </div>
          <p className="hint">Combine multiple standard sets for a bigger well -- handy with more players.</p>
        </div>
      </div>

      <div className="rules-group">
        <span className="rules-group-label">Challenge</span>

        <div className="field">
          <span>Freestyle tiles</span>
          <div className="slider-row">
            <input
              type="range"
              min={0}
              max={freestyleCap}
              step={1}
              value={rules.freestyleTiles}
              disabled={disabled}
              aria-label="Number of freestyle tiles"
              onChange={(e) => onChange({ ...rules, freestyleTiles: Number(e.target.value) })}
            />
            <span className="slider-value">
              {rules.freestyleTiles === 0 ? 'Off' : rules.freestyleTiles}
            </span>
          </div>
          <p className="hint">
            Wildcard tiles with one or two printed numbers; the rest match anything, so they
            make bridges and hexagons far easier to close. Blank corners score nothing. Up to{' '}
            {freestyleCap} -- half the {rules.tileSets * 56}-tile deck.
          </p>
        </div>

        <div className="field">
          <span>Max draws per turn</span>
          <div className="option-row">
            {MAX_DRAWS_OPTIONS.map((value) => (
              <button
                key={value}
                type="button"
                className={rules.maxDrawsPerTurn === value ? 'option selected' : 'option'}
                disabled={disabled}
                onClick={() => onChange({ ...rules, maxDrawsPerTurn: value })}
              >
                {value}
              </button>
            ))}
          </div>
          <p className="hint">
            {rules.hardcoreMode
              ? 'How many tiles you may draw before you have to take the -10 and pass.'
              : 'How many tiles you may draw before being forced to pass with no legal move.'}
          </p>
        </div>

        <label className={disabled ? 'setting-row hardcore-row disabled' : 'setting-row hardcore-row'}>
          <input
            type="checkbox"
            checked={rules.hardcoreMode}
            disabled={disabled}
            onChange={(e) => onChange({ ...rules, hardcoreMode: e.target.checked })}
          />
          <span>
            <span className="setting-name">
              Hardcore mode
              {rules.hardcoreMode && <span className="badge hardcore">On</span>}
            </span>
            <span className="setting-hint">
              {rules.hardcoreMode
                ? "Nothing is marked for you -- no playable tiles, no legal cells -- and the game never tells you a move exists. Can't see one? Draw anyway (-5 each, up to your limit), then pass for -10."
                : 'Play it blind: no hints at all, and you may draw from the well even when a move exists -- because nobody is there to tell you it does.'}
            </span>
          </span>
        </label>
      </div>

      <p className="rules-recap">{summarizeGameRules(rules)}</p>
    </div>
  );
}
