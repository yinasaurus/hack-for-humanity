import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const HOME_SOURCE = fs.readFileSync(new URL('./HomeScreen.tsx', import.meta.url), 'utf8');

test('Home Talk remembers the selected phrase for the mounted session', () => {
  assert.match(HOME_SOURCE, /companionTalkFrame, selectCompanionTalk/);
  assert.match(HOME_SOURCE, /const previousTalkPhraseIdRef = useRef<string \| null>\(null\);/);
  assert.match(
    HOME_SOURCE,
    /const selectedTalk = selectCompanionTalk\(\{\s*petName: companion\.petName,\s*previousId: previousTalkPhraseIdRef\.current,\s*\}\);/
  );
  assert.match(HOME_SOURCE, /previousTalkPhraseIdRef\.current = selectedTalk\.id;/);
  assert.match(
    HOME_SOURCE,
    /animalTalkBubble\(\s*animalPresentationFor\(renderedSpecies\)\.voice\.caption,\s*selectedTalk\.text\s*\)/
  );
  assert.doesNotMatch(HOME_SOURCE, /nextCompanionTalk\(/);

  const selection = HOME_SOURCE.indexOf('const selectedTalk = selectCompanionTalk');
  const remember = HOME_SOURCE.indexOf('previousTalkPhraseIdRef.current = selectedTalk.id;', selection);
  const bubble = HOME_SOURCE.indexOf('const line = animalTalkBubble(', remember);
  assert.ok(selection >= 0 && remember > selection && bubble > remember);
});
