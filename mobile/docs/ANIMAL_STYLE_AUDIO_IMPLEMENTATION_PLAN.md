# Buddi audible, smooth, grounded companion implementation plan

## Delivery status — 24 August 2026

- Complete: exact licensed Talk recordings for all ten species, local/offline playback, replay, mute migration, interruption cleanup, and duration-synced Talk motion.
- Complete: shared smooth/toy-like presentation profiles, safer normals/material handling, eye polish where identifiable, improved lighting/grounding, and subtle idle micro-motion.
- Complete: centered species-aware Wave with anticipation, two beats, follow-through, and tested root-motion invariants.
- Complete: resting/sleepy states keep the planted companion root upright; calmness is expressed through face, head/ear/tail motion, and slower clips instead of whole-body tilt.
- Complete: bounded heart feedback for petting, Talk, Wave, Play steps, and a larger Play-completion celebration, including reduced-motion behavior.
- Complete: localhost web accepts Expo's URL-string asset form, preloads each short call, and starts playback synchronously from the Talk gesture; native waits for dynamic source loading.
- Complete: reference-driven renderer polish uses softer organic materials, modestly larger identifiable eyes, reduced perspective distortion, texture anisotropy, constrained upright orbit, and soft contact shadows. Fox and Horse use the smoother textured companion-model family.
- Not started: bespoke high-detail all-species GLBs. Runtime polish and the Fox/Horse swaps improve the current set, but the remaining source topology and rigs still set the realism ceiling.

## Outcome

Every selectable Buddi animal must:

1. play an exact, licensed species recording after the user explicitly presses Talk;
2. have a cohesive smooth, cute creature-collecting-game presentation without copying any existing character;
3. perform a grounded, species-appropriate Wave with readable limb, wing, flipper, head, ear, or tail movement;
4. keep the whole body centered during Wave—no sideways translation, yaw spin, or roll;
5. reward direct bonding actions with lightweight heart feedback and a happy reaction;
6. retain accessible mute, reduced-motion, interruption, and fallback behavior.

## Confirmed causes

- Every Talk entry in `src/audio/animalSounds.ts` currently has `source: null`, so Expo Audio has nothing to play.
- Companion audio defaults to muted in `SettingsContext`, and an existing saved mute preference also blocks playback.
- Current GLBs come from several low-poly demo packs with inconsistent topology, texture detail, eyes, rigs, and materials.
- Material tuning changes color and roughness but does not consistently smooth normals or polish eye materials.
- Wave uses a useful limb/wing/tail overlay when a matching rig bone exists, but the missing-rig fallback still rotates the whole root object.

## Relevant skills and tools

- `threejs-3d-generator`: strongest discovered optional model-production workflow; 1.7K installs and 1.3K GitHub stars. It uses a credentialed Tripo pipeline for text/image-to-3D, stylization, rigging, and downloadable GLB output.
- `blender-web-pipeline`: use for final GLB export, compression, texture atlas, and Three.js delivery rules.
- `blender-motion-state-inspection`: use as the acceptance gate for bones, transforms, contacts, bounds, and facing direction.
- `codebase-design`: preserve small semantic seams for audio, visual profiles, and motion policies.
- `diagnosing-bugs`: keep deterministic tests for audible Talk and grounded Wave.

External model generation is optional for this pass. Runtime improvements and asset contracts must work with current models and future replacement GLBs.

## Art direction

Use an original, friendly creature-collecting-game aesthetic:

- rounded, readable silhouette;
- smooth normals and soft PBR/toy-like material response;
- large expressive eyes with a controlled glossy highlight where eye meshes exist;
- species-recognizable anatomy and markings;
- warm rim light, soft fill, subtle contact shadow, and stable camera framing;
- no direct copying of Pokémon characters, colors, markings, proportions, or silhouettes;
- baby stages may be cuter, but anatomy remains within the established proportion bounds.

## Deep modules and interfaces

### Animal sound catalog

The existing sound manifest remains the single source of truth. A ready Talk entry requires:

```ts
type ReadyAnimalSound = {
  status: 'ready';
  source: number; // static Metro require()
  durationMs: number;
  byteSize: number;
  provenance: {
    sourceUrl: string;
    author: string;
    license: 'CC0' | 'CC-BY' | 'Public-Domain';
    modifications: string;
    sha256: string;
    downloadDate: string;
  };
};
```

No remote runtime audio URLs, synthetic oscillator substitutes, human TTS, or wrong-species stand-ins.

### Animal visual profile

```ts
type AnimalVisualProfile = {
  surface: {
    smoothNormals: boolean;
    roughness: number;
    metalness: number;
    clearcoat: number;
  };
  eyes: {
    scale: number;
    roughness: number;
    highlight: number;
  };
  lighting: {
    key: number;
    fill: number;
    rim: number;
  };
};
```

The renderer applies this profile centrally. It must preserve textures, vertex colors, skinning, morph targets, and existing eye placement. If the asset has no safely identifiable eye mesh, skip eye enlargement rather than add floating eyes.

### Grounded motion policy

```ts
type RootMotionPolicy = {
  allowX: boolean;
  allowY: boolean;
  allowZ: boolean;
  allowYaw: boolean;
  allowPitch: boolean;
  allowRoll: boolean;
};
```

Wave policy:

- X/Z translation: forbidden;
- yaw/roll: forbidden;
- Y lift: optional and limited to 0.01 normalized units;
- primary motion: species appendage;
- secondary motion: head tilt, ears, tail, or blink;
- fallback: centered head/ear/tail gesture, never whole-root rotation.

## Audio implementation

### Source and licensing gate

For Fox, Horse, Parrot, Flamingo, Stork, Dog, Cat, Panda, Penguin, and Hamster:

1. identify an exact species recording from Wikimedia Commons, a verified CC0/CC-BY archive, or an explicitly licensed source;
2. verify the exact media page, author, and license—not only the host site's general terms;
3. reject NC, ND, unknown, attribution-impossible, distress/alarm, human-background, or ambiguous-species recordings;
4. trim to a calm 0.4–2.5 second call;
5. convert to mono MP3 or M4A/AAC, 44.1 kHz, 64–96 kbps, with short fades;
6. record final duration, byte size, SHA-256, modifications, and attribution;
7. bundle using a static `require()` and make the manifest test pass.

Preferred cues:

| Species | Talk cue |
| --- | --- |
| Fox | short yip/bark |
| Horse | gentle neigh or whinny |
| Parrot | chirp/squawk |
| Flamingo | soft honk/grunt |
| Stork | bill clatter |
| Dog | one or two friendly barks |
| Cat | meow or short purr-meow |
| Panda | bleat/huff/grunt |
| Penguin | bray/honk |
| Hamster | squeak/chirp |

### Playback behavior

- Talk is the only trigger for the Talk call.
- Never autoplay on app open, reminders, growth, or clinic alerts.
- An explicit Talk press should make sound available; the UI must not silently remain muted because of an old default.
- Preserve a user-controlled sound-off setting and show clear feedback when it suppresses audio.
- Preload/replace the local asset before play, seek to zero on replay, and stop on Wave, Play, navigation, mute, or repeated Talk.
- Dispatch measured audio duration to the semantic Talk animation so mouth/beak/head motion ends with the call.

## Visual implementation

### Immediate runtime pass

1. Enable smooth shading and recompute normals only where safe for skinned/morphed geometry.
2. Preserve texture maps and vertex colors; avoid strong blanket tints.
3. Use soft roughness, zero metalness, restrained clearcoat, and color-space-correct textures.
4. Detect eye meshes conservatively by exact/case-insensitive aliases. Slightly enlarge and polish those meshes only.
5. Improve contact shadow and rim/fill lighting without increasing draw calls excessively.
6. Add slow breathing, blink, ear/tail/wing micro-motion where rig capabilities exist.
7. Keep current species proportion bounds and recompute framing after stage transforms.

### Replacement-model pilot

Create original Dog, Cat, and Horse GLBs first:

- cohesive smooth creature-collecting aesthetic;
- 30K–60K triangles;
- one 1024px atlas where possible;
- embedded textures and buffers;
- one stable armature;
- named Idle, Talk, Wave, Play, Curious, and Rest clips;
- jaw/beak/mouth morph or bone;
- accessory anchors;
- Baby/Juvenile/Young Adult morphs or compatible meshes;
- compressed target 2–4 MB, hard cap 6 MB.

Approve the pilot on web, iOS, and Android before producing the remaining seven.

## Wave implementation

Per-species cute Wave:

| Species | Primary gesture | Secondary gesture |
| --- | --- | --- |
| Fox | front paw lift | ear perk and tail wag |
| Horse | gentle foreleg lift | head nod and ear turn |
| Parrot | one-wing flap | head tilt |
| Flamingo | wing fan | small neck curve |
| Stork | wing lift | beak/head nod |
| Dog | bent forepaw wave | ear perk and tail wag |
| Cat | soft forepaw wave | slow tail curl |
| Panda | two-beat forepaw wave | head tilt |
| Penguin | flipper wave | tiny head bob |
| Hamster | tiny forepaw wave | ear twitch |

Timing should use anticipation → two soft beats → follow-through → idle. The planted body and ground contact remain stable throughout.

## Bonding feedback

Use an original AR-pet-style response rather than copying another game's assets, exact motion, timing, or interface:

- Petting/rubbing, Talk, and Wave produce a small burst of 3–5 soft hearts plus the animal's happy reaction.
- Each successful Play step produces a small heart burst at the interaction point.
- Completing Play produces a fuller 7–9-heart celebration and a more readable happy reaction before returning to idle.
- Heart particles are presentation-only. They never indicate meal compliance, clinical safety, streak status, or alert resolution.
- Only one bounded burst controller may be active at a time; a new action replaces or extends the current burst rather than stacking unbounded views/timers.
- Normal motion uses short upward drift, gentle scale-in, and fade-out. Reduced motion shows a centered static/fading heart cluster without travel.
- Decorative hearts are hidden from screen readers; the action result is announced once through the existing status text.

## Phases and ownership

### Luna-max audio agent

- Own exact recording research, download/conversion, attribution, manifest entries, Expo playback behavior, mute migration/feedback, and audio tests.
- Do not edit renderer motion or visual styling.

### Luna-max visual/motion agent

- Own smooth material/eye/lighting profiles, grounded Wave, removal of root sideways rotation, platform parity, and motion/visual tests.
- Extend the existing heart-burst seam for Talk, Wave, petting, Play steps, and Play completion without duplicating particle systems.
- Do not edit audio manifests or binaries.

### Integration

- Resolve the Talk-duration seam and any Home screen overlap.
- Run TypeScript, all mobile tests, Expo configuration, production web export, browser interaction checks, and change hygiene.
- Document any replacement-model work blocked by unavailable 3D-provider credentials or Blender.

## Acceptance criteria

### Audio

- All ten Talk manifest entries are `ready`, locally bundled, exact-species, and license-complete.
- Pressing Talk produces audible sound when companion sounds are enabled.
- Repeated Talk replays from the beginning.
- Mute and navigation stop playback.
- No sound autoplays.
- Talk motion duration matches recording duration.

### Visual

- Materials are visibly smoother and less faceted where source topology permits.
- Existing textures/markings remain recognizable.
- Safely detected eyes read as glossy and expressive without floating or clipping.
- No animal becomes grey, overexposed, metallic, or plastic-looking.
- Growth proportions remain inside tested bounds.

### Wave

- Wave visibly moves a species appendage or grounded fallback feature.
- Root X/Z, yaw, and roll remain unchanged throughout Wave.
- Gesture includes anticipation and follow-through.
- Reduced-motion Wave remains centered and distinguishable.

### Bonding feedback

- Talk, Wave, and petting each trigger a small visible heart response.
- Play steps trigger small bursts; Play completion triggers a larger bounded celebration.
- Reduced motion uses a static/fade treatment, with no drifting particles.
- Hearts are decorative, screen-reader silent, and never presented as clinical or streak feedback.
- Repeated taps cannot create unbounded particle views or timers.

### Performance and safety

- Target at least 30 fps on representative mid-range Android hardware.
- No more than one additional material clone per source material.
- No unbounded geometry subdivision at runtime.
- Web/native renderer variants remain behaviorally identical.
- Tests, TypeScript, Expo web export, and `git diff --check` pass.
