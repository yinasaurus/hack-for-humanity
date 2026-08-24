# Animal motion, growth, and rabbit implementation plan

## Outcome

Wave and Play Together should read as intentional animal behavior rather than rigid model rotation. Growth must be obvious from silhouette and age cues, not only a global scale change. The selectable Hamster is replaced by Rabbit without breaking older prototype records.

## Product and safety rules

- Preserve the current approved overall proportions and smooth companion art direction.
- Keep every animal upright, grounded, centered, and inside the viewer during actions.
- Never animate the entire model sideways as a substitute for limb, wing, head, spine, or tail motion.
- Keep action motion joyful but calm: no aggressive attacks, frantic loops, startling camera moves, or harsh audio.
- Reduced-motion mode keeps a short, centered alternative and disables repeated limb/wing beats.
- New audio must be a local, reviewed, open-licensed animal recording with provenance; never synthesize an imitation.
- Existing `hamster` records remain readable and render safely, while new onboarding offers `rabbit`.

## Deep modules and seams

### 1. Species choreography module

Add a pure, testable choreography module whose interface is the species ID plus semantic action (`wave` or `play`). It returns bounded phases and rig-channel intent, while the Three.js renderer adapters apply those values to discovered bones.

Each action uses anticipation, primary movement, secondary movement, and settle:

- Quadruped Wave: weight shift, head greeting, one forepaw lift when available, ear response, and tail wag for tailed species.
- Quadruped Play: crouch, spring/hop or play-bow, head tracking, alternating forelimbs, stronger tail wag, and soft landing.
- Bird Wave: two or three visible wing beats with a head greeting; flamingo and stork use both wings where the rig exposes them.
- Bird Play: crouch/leg compression, energetic wing flap, small centered hop, and settle.
- Panda Play: compact bounce and two-paw reach rather than a sideways slide.
- Penguin Wave/Play: restrained flipper beats and a small upright bounce.
- Rabbit Wave/Play: ear perk, forepaw greeting, centered hop, and short tail/ear follow-through.

Rig discovery must support multiple matching bones (left/right wings, segmented tails) and preserve each bone's base transform. Missing rig channels degrade to safe head/body motion without throwing.

### 2. Species growth presentation module

Extend the current growth interface with bounded species-specific cues. Each stage remains compatible with the same source model but may adjust named head/body/neck/leg/wing/ear/tail channels and framing.

- Baby: smallest overall scale, shorter limbs/neck, rounder torso, modestly larger head/eyes, softer posture.
- Little/Growing: intermediate silhouettes with monotonic scale and gradually lengthening limbs/neck.
- Playful/Adventurer: juvenile and young-adult proportions.
- Grown: full silhouette and mature posture.

Required emphasis:

- Horse: dark readable eyes; foal has shorter legs/muzzle, rounder torso, and a clearly smaller silhouette.
- Parrot: chick has compact body, shorter tail/wing reach, and larger head/eye cue.
- Flamingo/Stork: chicks have substantially shorter necks and legs, smaller wing reach, rounder bodies; framing brings them closer without clipping; mature stages lengthen neck/legs visibly.
- Panda: cub is smaller, rounder, shorter-limbed, and visibly distinct from grown.
- Rabbit: kit has shorter ears/limbs, rounder torso, and a distinct small silhouette.
- Cat: retain feline proportions while improving face readability with restrained eye, muzzle, nose, ear, and material polish.
- Penguin: slightly smaller eyes at every stage while preserving the otherwise approved model.

Every transform is bounded and testable. Growth scale remains strictly increasing from Baby through Grown, and no species-specific cue may tip the root or distort the model beyond safe limits.

### 3. Rabbit catalog and compatibility migration

- Replace `hamster` with `rabbit` in the selectable patient list, labels, tests, backend selectable validation, and default appearance paths.
- Add a real Rabbit catalog definition with explicit rig aliases and semantic clip candidates.
- Preserve `hamster` as a legacy accepted value. Map existing Hamster records to the Rabbit renderer or a safe legacy renderer while keeping the stored record readable.
- Remove the old `rabbit -> flamingo` legacy mapping.
- Update accessory anchors for Rabbit.
- Add a verified local rabbit Talk recording and replace Hamster manifest coverage with Rabbit. Keep the old Hamster file/provenance only if it is still required for legacy playback; otherwise leave it unreferenced rather than deleting user-owned assets.
- Replace the current cat Talk recording only if a more recognisable gentle meow/purr recording can be verified under CC0, CC-BY, or public-domain terms. Record exact URL, author, license, processing, duration, byte size, and SHA-256.

## Renderer integration

The web, native, and shared WebView renderer adapters must stay behaviorally identical:

1. Resolve the authored semantic clip.
2. Snapshot root and discovered rig-channel base transforms.
3. Apply choreography overlays each frame without accumulated drift.
4. Apply tail wag to all available tail segments and wing flap to both available wings.
5. Restore transforms and blend to Idle at settle.
6. Apply growth and eye/material presentation once after model load.

Avoid three divergent hand-edited implementations. If full extraction is unsafe in this prototype, keep a parity test that hashes or checks the generated renderer behavior across the three adapters.

## Acceptance criteria

- Wave and Play visibly differ in anticipation, rhythm, secondary motion, and settle.
- Dog, Cat, Fox, Horse, Panda, and Rabbit tails visibly respond when the rig exposes a tail; Play uses a stronger/faster wag than Wave.
- Parrot, Flamingo, and Stork wings visibly flap for Wave and Play; Penguin flippers move more subtly.
- Root X/Z and yaw/roll remain at the base pose; there is no whole-model sideways sweep.
- Horse eyes read dark, Penguin eyes are slightly smaller, Cat face reads softer and more feline.
- Horse, Parrot, Flamingo, Stork, Panda, and Rabbit Baby silhouettes are visually unmistakable from Grown.
- Flamingo and Stork occupy more of the viewer while remaining fully visible.
- Onboarding offers Rabbit and no longer offers Hamster; stored Hamster values do not crash.
- Rabbit Talk is species-correct; Cat Talk is a recognisable gentle meow/purr.
- All species/action/growth combinations complete without JavaScript errors on localhost.

## Verification

1. Focused choreography tests: phase continuity, tail/wing channel policy, root constraints, reduced motion, and cancellation.
2. Growth tests: strictly increasing scale, bounded anatomy transforms, required baby/adult deltas per species, eye/framing values.
3. Identity tests: ten selectable species with Rabbit, one-to-one catalog mapping, Hamster legacy fallback.
4. Audio tests: ten selectable Talk tracks ready, Rabbit/Cat provenance and hashes match bundled files.
5. Backend appearance tests for selectable and legacy IDs.
6. Full mobile tests, TypeScript, Expo SDK 57 config, web export, and `git diff --check`.
7. Localhost browser matrix: exercise Wave and Play for representative quadruped/bird/panda/penguin/rabbit; inspect Baby and Grown for each required species; check console errors and framing.
