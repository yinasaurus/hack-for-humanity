import assert from 'node:assert/strict';
import test from 'node:test';
import {
  companionTalkFrame,
  companionTalkWords,
  selectCompanionTalk,
} from './companionTalk.ts';

const RANDOM_GRID = Array.from({ length: 101 }, (_, index) => index / 100);

function selectionsAcrossGrid(previousId = undefined) {
  return RANDOM_GRID.map((value) =>
    selectCompanionTalk({ petName: 'Maple', previousId, random: () => value })
  );
}

test('talk bubbles reveal complete words in order', () => {
  const line = 'Woof-woof! Hi, I’m Maple.';
  assert.deepEqual(companionTalkWords(line), ['Woof-woof!', 'Hi,', 'I’m', 'Maple.']);
  assert.equal(companionTalkFrame(line, 1), 'Woof-woof!');
  assert.equal(companionTalkFrame(line, 3), 'Woof-woof! Hi, I’m');
  assert.equal(companionTalkFrame(line, 99), line);
});

test('selector exposes a stable, distinct, safety-reviewed catalog across every tone', () => {
  const selections = selectionsAcrossGrid();
  const byId = new Map(selections.map(({ id, text }) => [id, text]));
  assert.ok(byId.size >= 18);
  for (const id of byId.keys()) assert.match(id, /^[a-z]+(?:_[a-z]+)+$/);

  // Keep this intentionally conservative: numeric, body, diet, clinical,
  // urgency, guilt, and dependency language should never reach the bubble.
  const forbidden = /\b(?:calor(?:ie|ies)|weight|weigh|body|shape|diet|deficit|streak|punish(?:ment)?|guilt|guilty|fail(?:ed|ure)?|should|must|urgent|medical|doctor|harm(?:ed)?|hurt|alone|need me)\b/i;
  const petAsListener = /(?:^|[,;.!?]\s*)Maple(?:\s*[,;.!?]|$)|\b(?:hi|hey|hello|welcome)\s+Maple\b/i;
  const speakerIntro = /\b(?:I['’]m|It['’]s)\s+Maple\b/i;
  for (const [id, rendered] of byId) {
    assert.ok(rendered.trim(), `${id} must render non-empty text`);
    assert.match(rendered, /Maple/);
    assert.equal(rendered.split('Maple').length - 1, 1, `${id} should name the pet once`);
    assert.match(rendered, speakerIntro, `${id} should introduce Maple as the speaker`);
    assert.doesNotMatch(rendered, petAsListener, `${id} addresses Maple as the listener`);
    assert.doesNotMatch(rendered, forbidden, `${id} contains forbidden copy`);
    assert.ok(companionTalkWords(rendered).length <= 18, `${id} is too long for reveal timing`);
  }

  // The public selector is the only test seam; these markers cover all five
  // tone groups without exporting the phrase catalog itself.
  const toneMarkers = [
    /glad you['’]re here|glad to share|happy you stopped|little time together/i,
    /small steps|take your time|gentle moment|cheering softly/i,
    /sit quietly|words are needed|calm pause|keep you company/i,
    /little brighter|tiny bit of fun|lovely spark|smiling because/i,
    /gentle with yourself|patience and kindness|pace is welcome|thank yourself/i,
  ];
  for (const marker of toneMarkers) {
    assert.ok([...byId.values()].some((text) => marker.test(text)), `${marker} tone is unreachable`);
  }
});

test('injected RNG selects deterministic catalog entries', () => {
  const first = selectCompanionTalk({ petName: 'Maple', random: () => 0 });
  const last = selectCompanionTalk({ petName: 'Maple', random: () => 0.999999999 });
  assert.notEqual(first.id, last.id);
  assert.deepEqual(first, selectCompanionTalk({ petName: 'Maple', random: () => 0 }));
  assert.deepEqual(last, selectCompanionTalk({ petName: 'Maple', random: () => 0.999999999 }));
  assert.match(first.text, /Maple/);
  assert.match(last.text, /Maple/);
});

test('selection maps uniformly across every non-previous phrase', () => {
  const first = selectCompanionTalk({ petName: 'Maple', random: () => 0 });
  const middle = selectCompanionTalk({ petName: 'Maple', random: () => 0.5 });
  const last = selectCompanionTalk({ petName: 'Maple', random: () => 1 });
  const allIds = new Set(selectionsAcrossGrid().map(({ id }) => id));

  for (const previous of [first, middle, last]) {
    const candidates = new Set(selectionsAcrossGrid(previous.id).map(({ id }) => id));
    assert.equal(candidates.size, allIds.size - 1);
    assert.equal(candidates.has(previous.id), false);
  }

  // First, middle, and last previous indices all use the same bounded map.
  const noPrevious = selectionsAcrossGrid();
  const firstOther = noPrevious.find(({ id }) => id !== first.id);
  const lastOther = [...noPrevious].reverse().find(({ id }) => id !== last.id);
  assert.equal(
    selectCompanionTalk({ petName: 'Maple', previousId: first.id, random: () => 0 }).id,
    firstOther.id
  );
  assert.equal(
    selectCompanionTalk({ petName: 'Maple', previousId: middle.id, random: () => 0 }).id,
    first.id
  );
  assert.equal(
    selectCompanionTalk({ petName: 'Maple', previousId: last.id, random: () => 1 }).id,
    lastOther.id
  );
});

test('arbitrary RNG values are bounded without throwing or escaping the catalog', () => {
  for (const value of [0, 0.000001, 0.999999, 1, -1, -Infinity, Number.NaN, Infinity]) {
    const result = selectCompanionTalk({ petName: 'Maple', random: () => value });
    assert.ok(selectionsAcrossGrid().some((phrase) => phrase.id === result.id), String(value));
    assert.match(result.text, /Maple/);
  }
  assert.doesNotThrow(() => selectCompanionTalk({ petName: 'Maple', random: () => { throw new Error('rng'); } }));
});

test('blank or non-string names use the safe companion fallback', () => {
  for (const petName of ['', '   ', null, undefined, 42]) {
    const result = selectCompanionTalk({ petName, random: () => 0 });
    assert.match(result.text, /your companion/);
    assert.doesNotMatch(result.text, /\s{2,}/);
  }
  const trimmed = selectCompanionTalk({ petName: '  Maple  ', random: () => 0 });
  assert.match(trimmed.text, /Maple/);
  assert.doesNotMatch(trimmed.text, / {2,}/);
});
