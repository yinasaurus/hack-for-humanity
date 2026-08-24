# Random Encouraging Talk — Implementation Plan

## Outcome

Every user-initiated **Talk** tap keeps the animal's species sound and word-by-word speech bubble, while choosing a fresh, gentle encouragement from a larger curated phrase set. Consecutive taps must not repeat the same phrase.

## Product and safety rules

- Talk remains user-initiated; it never auto-plays.
- Copy is warm, brief, age-neutral, and non-clinical.
- Never mention calories, weight, body shape, deficits, adherence, streak loss, punishment, or guilt.
- Never imply that the pet is harmed when the user does not log food.
- Avoid medical advice, promises, urgency, and emotional dependency language.
- Keep the animal call caption first so the concurrent sound still reads as the pet speaking.
- Preserve muted and audio-failure guidance exactly as functional system feedback.

## Deep module seam

Keep phrase policy inside `src/companionTalk.ts` behind one small interface:

```ts
selectCompanionTalk({ petName, previousId, random? })
  -> { id, text }
```

The module owns:

- the curated phrase catalog and stable phrase IDs;
- pet-name normalization and interpolation;
- random index selection;
- immediate-repeat avoidance;
- an injectable random source for deterministic tests;
- a safe fallback if the catalog is ever reduced to one entry.

`HomeScreen` owns only the previous selected ID for the current mounted session. It must not know the catalog length or retry random selection itself.

## Phrase catalog

Provide at least 18 distinct phrases spread across these tones:

1. Warm welcome — glad the user stopped by.
2. Gentle encouragement — small steps and taking one's time are okay.
3. Quiet companionship — resting or sitting together is welcome.
4. Playful optimism — the pet is happy to share the moment.
5. Self-kindness — encourage patience without clinical or dietary direction.

Keep most rendered phrases under roughly 16 words so their word-by-word reveal remains concurrent with the short animal recording.

## Home integration

1. Add a `useRef` for the previous phrase ID.
2. On every Talk tap, call the selector once and immediately store its ID.
3. Combine the species call caption with the selected encouragement using the existing `animalTalkBubble` function.
4. Preserve audio playback, mute behavior, cancellation, replay safety, 3D Talk intent, hearts, and expression timing.
5. Do not persist phrase history to the backend or device storage; avoiding the immediate repeat within the current screen session is sufficient.

## Tests

- Catalog contains at least 18 non-empty, uniquely identified phrases.
- Every phrase renders the normalized pet name safely.
- Injected random values select deterministic entries.
- A second selection never returns `previousId` when multiple phrases exist, including when random points at the previous entry.
- Random values at `0`, near `1`, negative, `NaN`, and infinity are safely bounded.
- Blank pet names use `your companion`.
- All phrases pass forbidden-copy checks for numeric/body/diet/guilt language.
- Existing complete-word reveal and audio-duration scheduling tests remain green.

## Acceptance checklist

- Repeated Talk taps visibly rotate through different encouragements without immediate duplicates.
- The animal call still plays once per tap when sound is available.
- Text still appears one complete word at a time.
- Rapid repeat taps cancel stale text frames and start the new phrase cleanly.
- Muted mode and failed-audio messages remain understandable.
- TypeScript, mobile tests, Expo SDK 57 config, and web export pass.
- Localhost verification covers at least three consecutive Talk taps.
