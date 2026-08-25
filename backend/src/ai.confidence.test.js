import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOCK_MEAL_SAMPLES,
  formatApproxKcal,
  normalizeAnalysis,
  mockAnalyze,
} from './ai.js';

describe('visual-first confidence calibration', () => {
  it('formats clinician calories as approximate, never exact', () => {
    assert.equal(formatApproxKcal(130), '~130 kcal (estimated)');
    assert.equal(formatApproxKcal(129.6), '~130 kcal (estimated)');
  });

  it('promotes confidence to high when a nutrition label was used', () => {
    const a = normalizeAnalysis({
      isMeal: true,
      foodType: 'Yogurt cup',
      estimatedCalories: 150,
      confidence: 'medium',
      usedNutritionLabel: true,
    });
    assert.equal(a.usedNutritionLabel, true);
    assert.equal(a.confidence, 'high');
  });

  it('keeps visual branded estimates high without requiring a label', () => {
    const a = normalizeAnalysis({
      isMeal: true,
      foodType: 'Monster Energy green can',
      estimatedCalories: 210,
      confidence: 'high',
      usedNutritionLabel: false,
    });
    assert.equal(a.usedNutritionLabel, false);
    assert.equal(a.confidence, 'high');
  });

  it('does not invent high confidence for variable dishes when model says medium', () => {
    const a = normalizeAnalysis({
      isMeal: true,
      foodType: 'Pan-fried dumplings on a plate',
      estimatedCalories: 420,
      confidence: 'medium',
      usedNutritionLabel: false,
    });
    assert.equal(a.confidence, 'medium');
  });

  it('mock samples follow visual-first bands (branded high, dishes medium, unclear low)', () => {
    const high = MOCK_MEAL_SAMPLES.filter((s) => s.confidence === 'high');
    const medium = MOCK_MEAL_SAMPLES.filter((s) => s.confidence === 'medium');
    const low = MOCK_MEAL_SAMPLES.filter((s) => s.confidence === 'low');
    assert.ok(high.length >= 2, 'expect branded/standardized high samples');
    assert.ok(medium.length >= 4, 'expect variable dishes as medium');
    assert.ok(low.length >= 1, 'expect unclear/low samples');
    assert.ok(
      high.every((s) => /monster|coca|mcmuffin|mcdonald/i.test(s.foodType)),
      'high mocks should be recognizable branded items'
    );
    assert.ok(
      medium.some((s) => /dumpling|bowl|pasta|sandwich|oatmeal/i.test(s.foodType)),
      'medium mocks should include portion-variable dishes'
    );
    // Sanity: mock path never pretends labels were read by default
    for (const seed of ['plate-photo', 'can-photo', 'snack-bag', 'cup-drink', 'bread-loaf']) {
      const m = mockAnalyze(seed);
      assert.equal(m.isMeal, true);
      assert.equal(m.usedNutritionLabel, false);
      assert.ok(['high', 'medium', 'low'].includes(m.confidence));
      if (m.confidence === 'high') {
        assert.match(m.foodType, /monster|coca|mcmuffin|mcdonald/i);
      }
    }
  });
});
