import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { applyAppearancePatch, appearanceFromUser, DEFAULT_APPEARANCE, isAllowedPetType } from './appearance.js';

describe('appearance independence', () => {
  it('accepts onboarding species and rejects unknown species', () => {
    for (const species of ['panda', 'dog', 'cat', 'capybara', 'cow', 'chipmunk', 'monkey', 'rabbit', 'penguin', 'otter']) {
      assert.equal(isAllowedPetType(species), true);
    }
    assert.equal(isAllowedPetType('dragon'), false);
  });
  it('stores animal and outfit fields separately', () => {
    const user = { ...DEFAULT_APPEARANCE };
    applyAppearancePatch(user, { petType: 'fox' });
    applyAppearancePatch(user, { hat: 'beanie', neck: 'scarf', scene: 'sunny_meadow' });

    const a = appearanceFromUser(user);
    assert.equal(a.petType, 'fox');
    assert.equal(a.hat, 'beanie');
    assert.equal(a.neck, 'scarf');
    assert.equal(a.scene, 'sunny_meadow');
  });

  it('changing animal does not clear outfit', () => {
    const user = {
      ...DEFAULT_APPEARANCE,
      petType: 'flamingo',
      hat: 'flower',
      neck: 'scarf',
    };
    applyAppearancePatch(user, { petType: 'parrot' });
    const a = appearanceFromUser(user);
    assert.equal(a.petType, 'parrot');
    assert.equal(a.hat, 'flower');
    assert.equal(a.neck, 'scarf');
  });

  it('defaults unset petType to a selectable species', () => {
    assert.equal(DEFAULT_APPEARANCE.petType, 'panda');
    const a = appearanceFromUser({});
    assert.equal(a.petType, 'panda');
  });

  it('maps legacy Bun/Pup ids to low-poly animals', () => {
    const a = appearanceFromUser({ petType: 'bun', hat: 'bow' });
    assert.equal(a.petType, 'flamingo');
    assert.equal(a.hat, 'bow');
  });

  it('rejects unknown ids without clobbering existing look', () => {
    const user = { ...DEFAULT_APPEARANCE, petType: 'fox', hat: 'bow' };
    applyAppearancePatch(user, { petType: 'dragon', hat: 'top_hat' });
    const a = appearanceFromUser(user);
    assert.equal(a.petType, 'fox');
    assert.equal(a.hat, 'bow');
  });
});
