import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNotAMeal, normalizeAnalysis, NOT_A_MEAL_ERROR } from './ai.js';

describe('meal photo rejection', () => {
  it('marks non-meal analysis and zeros nutrition', () => {
    const a = normalizeAnalysis({
      isMeal: false,
      foodType: 'laptop screen',
      estimatedCalories: 999,
      confidence: 'medium',
    });
    assert.equal(a.isMeal, false);
    assert.equal(a.foodType, 'Not a meal photo');
    assert.equal(a.estimatedCalories, 0);
    assert.equal(isNotAMeal(a), true);
  });

  it('keeps real meals', () => {
    const a = normalizeAnalysis({
      isMeal: true,
      foodType: 'Rice bowl',
      estimatedCalories: 450,
      confidence: 'medium',
    });
    assert.equal(a.isMeal, true);
    assert.equal(a.foodType, 'Rice bowl');
    assert.equal(a.estimatedCalories, 450);
    assert.equal(a.possibleScreenPhoto, false);
    assert.equal(isNotAMeal(a), false);
  });

  it('flags possible screen photos without rejecting the meal', () => {
    const a = normalizeAnalysis({
      isMeal: true,
      possibleScreenPhoto: true,
      foodType: 'Chicken rice',
      estimatedCalories: 520,
      confidence: 'medium',
    });
    assert.equal(a.isMeal, true);
    assert.equal(a.possibleScreenPhoto, true);
    assert.equal(isNotAMeal(a), false);
  });

  it('fails closed when isMeal is missing', () => {
    const a = normalizeAnalysis({
      foodType: 'Something',
      estimatedCalories: 100,
    });
    assert.equal(a.isMeal, false);
    assert.equal(isNotAMeal(a), true);
  });

  it('exports a gentle patient error string', () => {
    assert.match(NOT_A_MEAL_ERROR, /food|drink/i);
    assert.doesNotMatch(NOT_A_MEAL_ERROR, /calorie|score|fail/i);
  });
});
