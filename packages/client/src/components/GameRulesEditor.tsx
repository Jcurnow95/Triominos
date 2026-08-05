import { GameRules, MAX_DRAWS_OPTIONS, TILE_SET_OPTIONS, WINNING_SCORE_OPTIONS } from '@triominos/shared';

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
              onClick={() => onChange({ ...rules, tileSets: value })}
            >
              {value}&times;
              <span className="btn-sub">{value * 56} tiles</span>
            </button>
          ))}
        </div>
        <p className="hint">Combine multiple standard sets for a bigger well -- handy with more players.</p>
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
