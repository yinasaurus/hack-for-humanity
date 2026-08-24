# Buddi brand lockup and Talk synchronization plan

## Outcome

Every patient-facing screen that uses `Buddi` as a top-left brand heading will render the same transparent logo immediately before the wordmark. Pressing **Talk** will start the selected animal's licensed local call and reveal its message one complete word at a time from the same user gesture.

## Product rules

- Keep the product name exactly **Buddi**.
- Reuse `assets/buddi-logo.png`; do not redraw, tint, or add a background to it.
- Apply the lockup only to brand headings, not ordinary copy such as “Choose your Buddi” or notification titles.
- Preserve the current calm, non-triggering copy and the existing animal-specific recordings.
- Word reveal is content sequencing, not character-by-character typing and not spatial motion.
- A second Talk press restarts both the call and message cleanly. No stale timer may continue writing an earlier line.
- Muted or failed audio must not make the message appear all at once; the progressive text remains useful while existing feedback explains the sound state.

## Implementation seams

### 1. `BuddiBrandLockup`

Create one shared React Native module with a deliberately small interface:

- `size`: a small set of named presentation variants rather than arbitrary per-screen numbers.
- optional `style`: container placement only; logo-to-word spacing and proportions stay owned by the module.
- one accessible brand label so screen readers do not announce the image and text redundantly.

The module owns the logo source, aspect ratio, spacing, font, and color. Replace qualifying headings on Login/Signup (`WelcomeScreen`), Home, Onboarding, Settings, and Transparency after an exact code audit.

### 2. Talk reveal timeline

Move schedule math out of `HomeScreen` into a pure, testable module. Its interface accepts the line and the verified recording duration, then returns a bounded word cadence/timeline. The implementation must:

- show the first word immediately;
- reveal only complete words;
- spread the remaining words across the animal call when possible;
- enforce a readable minimum interval and a non-sluggish maximum interval;
- use a calm fallback duration for muted/failed playback;
- expose deterministic frames for tests.

`HomeScreen` remains the orchestrator: it cancels the previous Talk request, begins audio from the tap, starts the reveal sequence, dispatches the semantic 3D Talk intent, and clears timers on replay or unmount. Reduced-motion continues to limit pet movement but does not collapse text sequencing.

## Detailed work plan

1. Audit all exact `Buddi` headings and classify each occurrence as brand lockup or ordinary content.
2. Add focused tests that fail before the changes:
   - each intended header consumes the shared lockup;
   - word frames contain 1..N complete words in order;
   - short and long recordings produce bounded, observable cadence;
   - replay/cancellation cannot apply stale frames.
3. Implement `BuddiBrandLockup` and migrate each qualifying screen without changing page hierarchy or unrelated spacing.
4. Implement the duration-aware Talk timeline and integrate it with the existing Expo Audio result.
5. Confirm the animal call still begins only after a user tap and that every supported species resolves to a local licensed recording.
6. Verify Login and Signup modes, each branded page, Talk replay, muted Talk, audio failure fallback, and reduced-motion behavior on localhost web.

## Acceptance criteria

- Logo appears directly left of `Buddi` on Login, Signup, and every other qualifying top-left brand header.
- Logo has transparent surroundings and remains crisp without stretching at mobile and web widths.
- There are no duplicated hand-built logo/word rows on migrated screens.
- On Talk press, the first word appears immediately and subsequent words visibly advance one word at a time while the animal call plays.
- A quick second press cannot mix two calls or two text sequences.
- Reduced-motion users still receive word-by-word text.
- Existing mute setting, sound-error feedback, 3D Talk intent, and greeting copy continue to work.
- Focused tests, all mobile tests, TypeScript, Expo SDK 57 config, web export, and diff whitespace checks pass.

## Validation commands

Run from `mobile/` unless noted:

1. `node --experimental-strip-types --test src/**/*.test.mjs`
2. `npx tsc --noEmit`
3. `npx expo config --type public`
4. `npx expo export --platform web`
5. `git diff --check`
6. Localhost browser smoke test for Login, Signup, other branded headers, and repeated Talk presses.
