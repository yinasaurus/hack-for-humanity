import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCompanionTalkSchedule,
  startCompanionTalkReveal,
} from './companionTalkTimeline.ts';

test('talk schedule uses the recording duration while keeping every word observable', () => {
  const schedule = buildCompanionTalkSchedule('Woof! Hi, I am Maple.', 2_000);

  assert.deepEqual(schedule.words, ['Woof!', 'Hi,', 'I', 'am', 'Maple.']);
  assert.equal(schedule.revealAtMs[0], 0);
  assert.equal(schedule.intervalMs, 500);
  assert.equal(schedule.revealAtMs.at(-1), 2_000);
  assert.ok(schedule.intervalMs >= 140);
});

test('short calls use a readable cadence instead of revealing the whole bubble instantly', () => {
  const schedule = buildCompanionTalkSchedule('Chirp! Hello from Pip.', 464);

  assert.equal(schedule.intervalMs, 155);
  assert.deepEqual(schedule.revealAtMs, [0, 155, 310, 465]);
});

test('cancelled Talk runs cannot publish stale word frames after a replay', () => {
  const pending = new Map();
  const cleared = [];
  let nextId = 0;
  const timers = {
    setTimeout(callback, delay) {
      const id = ++nextId;
      pending.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      cleared.push(id);
      pending.delete(id);
    },
  };
  const firstFrames = [];
  const firstRun = startCompanionTalkReveal('Old line', 800, (frame) => firstFrames.push(frame), timers);
  assert.deepEqual(firstFrames, ['Old']);
  firstRun.cancel();
  assert.ok(cleared.length > 0);
  for (const timer of pending.values()) timer.callback();
  assert.deepEqual(firstFrames, ['Old']);

  const replayFrames = [];
  const replay = startCompanionTalkReveal('New line now', 800, (frame) => replayFrames.push(frame), timers);
  assert.deepEqual(replayFrames, ['New']);
  for (const timer of [...pending.values()]) timer.callback();
  replay.cancel();
  assert.deepEqual(replayFrames, ['New', 'New line', 'New line now']);
});
