import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const HOME_SOURCE = fs.readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8');

test('Home maps lower vitality to resting presentation (no opacity fade)', () => {
  assert.match(HOME_SOURCE, /isEngagementResting/);
  assert.match(HOME_SOURCE, /calmExpressionForVitality/);
  assert.match(HOME_SOURCE, /companion\?\.vitality/);
  assert.doesNotMatch(HOME_SOURCE, /companionVitalityOpacity/);
  assert.doesNotMatch(
    HOME_SOURCE,
    /opacity:\s*companionVitalityOpacity/
  );
});
