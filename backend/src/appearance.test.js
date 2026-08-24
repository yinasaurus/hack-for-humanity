import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAppearancePatch,
  appearanceFromUser,
  DEFAULT_APPEARANCE,
  isAllowedPetType,
  findLockedWardrobeChange,
  LEGACY_PET_TYPES,
  SELECTABLE_PET_TYPES,
} from './appearance.js';

describe('appearance independence', () => {
  it('accepts every one-to-one rendered catalog species for new onboarding', () => {
    assert.deepEqual(SELECTABLE_PET_TYPES, [
      'fox', 'horse', 'parrot', 'flamingo', 'stork',
      'dog', 'cat', 'panda', 'penguin', 'rabbit',
    ]);
    for (const species of SELECTABLE_PET_TYPES) {
      assert.equal(isAllowedPetType(species), true);
    }
    for (const species of LEGACY_PET_TYPES) {
      assert.equal(isAllowedPetType(species), false);
      // Existing records still resolve to a readable legacy id.
      assert.equal(appearanceFromUser({ petType: species }).petType, species);
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
    assert.equal(DEFAULT_APPEARANCE.petType, 'fox');
    const a = appearanceFromUser({});
    assert.equal(a.petType, 'fox');
  });

  it('maps legacy Bun/Pup ids to low-poly animals', () => {
    const a = appearanceFromUser({ petType: 'bun', hat: 'bow' });
    assert.equal(a.petType, 'rabbit');
    assert.equal(a.hat, 'bow');
  });

  it('keeps Hamster records readable without offering Hamster for onboarding', () => {
    assert.equal(isAllowedPetType('hamster'), false);
    assert.equal(appearanceFromUser({ petType: 'hamster' }).petType, 'hamster');
    const user = { ...DEFAULT_APPEARANCE, petType: 'fox' };
    applyAppearancePatch(user, { petType: 'hamster' });
    assert.equal(user.petType, 'hamster');
  });

  it('rejects unknown ids without clobbering existing look', () => {
    const user = { ...DEFAULT_APPEARANCE, petType: 'fox', hat: 'bow' };
    applyAppearancePatch(user, { petType: 'dragon', hat: 'top_hat' });
    const a = appearanceFromUser(user);
    assert.equal(a.petType, 'fox');
    assert.equal(a.hat, 'bow');
  });

  it('only allows wardrobe changes backed by a permanent unlock', () => {
    const current = { ...DEFAULT_APPEARANCE };
    assert.deepEqual(
      findLockedWardrobeChange({ hat: 'flower' }, current, new Set()),
      { field: 'hat', value: 'flower', required: 'flower_crown' }
    );
    assert.equal(
      findLockedWardrobeChange({ hat: 'flower' }, current, new Set(['flower_crown'])),
      null
    );
    assert.equal(findLockedWardrobeChange({ hat: 'none' }, current, new Set()), null);
  });
});
