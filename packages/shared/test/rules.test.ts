import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GAME_RULES,
  GAME_RULES_PRESETS,
  matchingPresetId,
  sanitizeGameRules,
  summarizeGameRules,
} from '../src/rules.js';

describe('sanitizeGameRules', () => {
  it('keeps hardcore mode when a client asks for it', () => {
    expect(sanitizeGameRules({ hardcoreMode: true }).hardcoreMode).toBe(true);
  });

  it('treats anything but a literal true as off', () => {
    // A tampered payload can carry a truthy non-boolean; hardcore is opt-in, so it stays off.
    expect(sanitizeGameRules({ hardcoreMode: 'yes' as unknown as boolean }).hardcoreMode).toBe(false);
    expect(sanitizeGameRules({}).hardcoreMode).toBe(false);
    expect(sanitizeGameRules(undefined).hardcoreMode).toBe(false);
  });
});

describe('rules presets', () => {
  it('every preset survives sanitizing unchanged, so the host really gets what they picked', () => {
    for (const preset of GAME_RULES_PRESETS) {
      expect(sanitizeGameRules(preset.rules)).toEqual(preset.rules);
    }
  });

  it('identifies the preset a rules object matches, and nothing once it is tweaked', () => {
    expect(matchingPresetId(DEFAULT_GAME_RULES)).toBe('classic');
    expect(matchingPresetId({ ...DEFAULT_GAME_RULES, winningScore: 600 })).toBe(null);
    const hardcore = GAME_RULES_PRESETS.find((p) => p.id === 'hardcore')!;
    expect(matchingPresetId(hardcore.rules)).toBe('hardcore');
  });
});

describe('summarizeGameRules', () => {
  it('recaps the standard setup without mentioning the optional extras', () => {
    const summary = summarizeGameRules(DEFAULT_GAME_RULES);
    expect(summary).toBe('Playing to 400 · 1x tile set · draw up to 3 a turn');
  });

  it('calls out freestyle tiles and hardcore when they are on', () => {
    const summary = summarizeGameRules({
      winningScore: 200,
      tileSets: 2,
      maxDrawsPerTurn: 5,
      freestyleTiles: 8,
      hardcoreMode: true,
    });
    expect(summary).toBe('Playing to 200 · 2x tile sets · draw up to 5 a turn · 8 freestyle tiles · Hardcore');
  });
});
