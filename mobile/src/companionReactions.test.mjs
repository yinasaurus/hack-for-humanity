import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REACTION_MS,
  reactionSettleMs,
  shouldAutoPlayCompanionVoice,
  talkVisualDurationMs,
} from './companionReactions.ts';

test('talk visuals keep a warm fallback when audio is muted or missing', () => {
  assert.equal(talkVisualDurationMs(0, false), REACTION_MS.talkVisualFallback);
  assert.equal(talkVisualDurationMs(0, true), REACTION_MS.talkVisualFallbackReduced);
  assert.equal(talkVisualDurationMs(1762, false), 1762);
});

test('reaction settle windows stay short and affectionate', () => {
  assert.equal(reactionSettleMs('wave', 0), REACTION_MS.wave);
  assert.ok(reactionSettleMs('play', 500) >= REACTION_MS.play);
  assert.ok(reactionSettleMs('talk', 1000) > 1000);
});

test('auto voice respects mute; unmuted companions may chirp on hello', () => {
  assert.equal(
    shouldAutoPlayCompanionVoice({ companionMuted: true, companionMuteIntentional: true }),
    false
  );
  assert.equal(
    shouldAutoPlayCompanionVoice({ companionMuted: true, companionMuteIntentional: false }),
    false
  );
  assert.equal(
    shouldAutoPlayCompanionVoice({ companionMuted: false, companionMuteIntentional: true }),
    true
  );
});
