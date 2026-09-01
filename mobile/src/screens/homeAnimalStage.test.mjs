import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const HOME_SOURCE = fs.readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8');

test('Home wraps the companion viewer in a calm, clipped stage', () => {
  assert.doesNotMatch(
    HOME_SOURCE,
    /styles\.hero3d,\s*\n\s*\{\s*opacity:\s*companionVitalityOpacity\(companion\.vitality\)/
  );
  assert.match(HOME_SOURCE, /style=\{styles\.hero3dContent\}/);
  assert.match(HOME_SOURCE, /hero3d:\s*\{[\s\S]*?overflow:\s*'hidden'/);
  assert.match(HOME_SOURCE, /hero3d:\s*\{[\s\S]*?backgroundColor:\s*colors\.mist/);
  assert.match(HOME_SOURCE, /hero3d:\s*\{[\s\S]*?borderWidth:\s*1/);
  assert.match(HOME_SOURCE, /hero3d:\s*\{[\s\S]*?borderColor:\s*colors\.border/);
});
