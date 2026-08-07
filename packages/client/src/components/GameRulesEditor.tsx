import { GameRules, MAX_DRAWS_OPTIONS, TILE_SET_OPTIONS, WINNING_SCORE_OPTIONS, maxFreestyleTiles } from '@triominos/shared';

interface GameRulesEditorProps {
  rules: GameRules;
  onChange: (rules: GameRules) => void;
  /** Read-only mode for guests watching the host configure the lobby. */
  disabled?: boolean;
}

/**
 * Shared by the solo setup panel and the multiplayer lobby (host-only there) -- both just
 * hold a GameRules value and hand back the next one on any change.
 */
export function GameRulesEditor({ rules, onChange, disabled }: GameRulesEditorProps) {
  const freestyleCap = maxFreestyleTiles(rules.tileSets);

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
        <p className="hint">How many tiles you may draw before being forced to pass with no legal move.</p>
      </div>
    </div>
  );
}
