# Buddi animal immersiveness implementation plan

## Outcome

Buddi's companion should read as a living animal rather than a rotating model. Every selectable species must have a recognizable silhouette, clear age progression, species-appropriate movement, and a short recorded animal call synchronized with the Talk interaction.

This plan keeps the current Expo SDK 57 + Three.js host for the prototype. It introduces stable seams for animation, audio, and asset replacement so a future renderer migration does not leak into screens.

## Current causes

1. All character models are remote demo assets with inconsistent rigs, materials, clip names, and visual styles.
2. The catalog describes only `idle`, `talk`, and `react`; most Talk entries point to Idle.
3. Missing clips silently fall back to an arbitrary first animation.
4. Wave, Talk, and Play add whole-model bob/yaw/roll, so actions look like rotation.
5. Play begins in a quiet state and then routes target taps through the gentle bob instead of the real reaction clip.
6. Animal calls are Web Audio oscillator notes. No recorded animal sounds are present.
7. Growth is mainly global/an-isotropic scaling, which makes animals look chunky without producing an authored baby, juvenile, or young-adult silhouette.
8. The native and web Three.js runtimes are duplicated, making fixes likely to drift.

## Skills and workflow

- Use `blender-web-pipeline` for glTF/GLB export, compression, texture, and web/mobile delivery practices. It is the strongest discovered 3D pipeline skill: 2.2K installs, 769 GitHub stars, and passing listed security audits.
- Use `blender-motion-state-inspection` as the rig/contact QA method. It requires structured inspection of bones, transforms, facing vectors, bounds, and contacts before visual approval.
- Use `animation-quality-gate` only as a review checklist, not as the main implementation skill; its source has lower adoption.
- Do not use humanoid motion-capture skills for these quadruped/bird/rodent rigs.
- Keep `codebase-design` principles: screens send semantic intents across one small interface; model-specific clip, bone, morph, timing, and fallback knowledge stays inside the presentation module.

No external skill should be installed globally until its repository and requested permissions have been reviewed.

## Target architecture

### 1. Asset manifest module

The manifest is the authoritative record of what an animal can do. It replaces best-effort clip guessing.

```ts
type AnimalAction = 'idle' | 'talk' | 'wave' | 'play' | 'curious' | 'gentle';

type AnimalAssetManifest = {
  species: PetTypeId;
  source: number | string;
  integrity?: string;
  license: { id: string; author: string; sourceUrl: string };
  clips: Partial<Record<AnimalAction, readonly string[]>>;
  rig: {
    jaw?: readonly string[];
    head?: readonly string[];
    leftFront?: readonly string[];
    rightFront?: readonly string[];
    leftWing?: readonly string[];
    rightWing?: readonly string[];
    tail?: readonly string[];
  };
  morphs?: { talk?: readonly string[]; baby?: readonly string[]; juvenile?: readonly string[] };
  framing: { targetHeight: number; padding: number; groundRadius: number };
};
```

At load time, the capability resolver compares the manifest with actual clips, bones, and morph targets. It returns explicit warnings. A semantic action never falls back to an unrelated first clip.

### 2. Semantic presentation module

Home and Style dispatch intent only:

```ts
type AnimalIntent =
  | { type: 'idle' }
  | { type: 'greeting' }
  | { type: 'talk'; durationMs: number }
  | { type: 'playStep'; step: number }
  | { type: 'rest' };

type AnimalPresentationHandle = {
  dispatch(intent: AnimalIntent): void;
  stop(): void;
  setExpression(expression: CompanionExpression): void;
};
```

The implementation chooses an authored clip first, then a species rig overlay, then a restrained accessible fallback. Legacy `wave()`, `react()`, and `vocalize()` methods remain temporary adapters until callers migrate.

### 3. Recorded-audio module

Audio plays in the React Native layer through the already-installed `expo-audio` package, not inside the WebView:

```ts
type AnimalCallResult = { durationMs: number };

type AnimalAudioHandle = {
  play(species: PetTypeId, kind: 'talk' | 'play'): Promise<AnimalCallResult>;
  stop(): void;
};
```

The audio module owns mute behavior, replay, cleanup, and duration. It dispatches Talk motion with the actual clip duration. The Three.js renderer owns no oscillator or user-audio policy.

### 4. Renderer adapters

- One shared Three.js runtime implements loading, capability discovery, animation mixing, rig overlays, morphs, framing, and command handling.
- Native WebView and web iframe files are thin adapters around that runtime.
- Commands are queued until the runtime sends `ready`; readiness includes capabilities and warnings.

## Per-species action direction

| Species | Talk motion | Wave motion | Play sequence |
| --- | --- | --- | --- |
| Fox | muzzle/jaw, small head arc, ear reaction | front paw plus tail sweep | crouch, pounce, land, recover |
| Horse | jaw, nostril/head movement | lifted foreleg and head nod | paw, short rear/trot, settle |
| Parrot | beak open/close and head bob | one wing flap | hop, double flap, perch |
| Flamingo | beak and curved neck motion | wing fan | two steps, hop, balanced landing |
| Stork | beak clack and head movement | broad wing lift | stalk, hop, wing-assisted landing |
| Dog | jaw, head tilt, tail response | raised forepaw | play bow, pounce, tail-wag recover |
| Cat | jaw, ear swivel, head tilt | forepaw and tail curl | crouch, pounce, bat, recover |
| Panda | jaw and head nod | forepaw | bounce/half-roll, reach, sit |
| Penguin | beak and head bob | flipper flap | waddle, hop, balanced landing |
| Hamster | jaw/nose/head movement | tiny forepaw | rear up, scurry, turn, settle |

All sequences need anticipation, a readable primary action, follow-through, and a clean return to idle. Root translation may support an authored action but cannot be the only visible movement.

## Growth design

Use three authored silhouettes on one compatible rig per species:

- Baby: larger cranium/eyes, shorter limbs and muzzle/beak, compact torso, softer idle timing.
- Juvenile/teen: longer limbs, narrower torso, more energetic timing.
- Young adult: mature limb/muzzle/beak proportions, confident stance, calmer weight.

Prefer one GLB with `AgeBaby` and `AgeJuvenile` morph targets plus the adult base mesh. Map Buddi's six chapters onto interpolation points:

| Chapter | Age presentation |
| --- | --- |
| baby | 100% baby |
| little | 75% baby, 25% juvenile |
| growing | 25% baby, 75% juvenile |
| playful | 100% juvenile |
| adventurer | 50% juvenile, 50% young adult |
| grown | 100% young adult |

If morph-compatible models are unavailable, use three meshes sharing one armature. Do not simulate age primarily through non-uniform whole-body scale. Recompute bounds and camera framing after applying age presentation.

## Asset production and acceptance gate

### Visual specification

- Cohesive semi-realistic, friendly style across all ten species; avoid photoreal uncanny detail and faceted demo-pack geometry.
- Recognizable real anatomy while keeping gentle expressions suitable for clinical use.
- One consistent forward axis, meter scale, origin at grounded feet, and neutral bind pose.
- PBR materials with preserved source texture detail; no blanket tint strong enough to erase vertex colors or markings.
- Accessories attach through named head, neck, and held-item anchors independent of source bone names.

### Runtime budget per species

- 30K–60K rendered triangles at the young-adult stage.
- One 1024px material atlas where practical; maximum two 1024px atlases.
- Draco or Meshopt-compressed GLB, target 2–4 MB, hard limit 6 MB.
- Animation clips sampled at 30 fps and keyframe-compressed.
- Load on demand and cache. Do not eagerly bundle all ten models in the first screen.
- Maintain 30 fps on a representative mid-range Android device; target 60 fps on current iOS hardware.

### Required clips/capabilities

- Required: Idle, Talk, Wave, Play, Curious, Rest.
- Optional: Blink, Look, Walk, Run, Sleep, Eat.
- Talk must include a jaw/beak morph or bone motion.
- Wave must move a species-appropriate appendage.
- Play must include at least three phases and visible translation or limb motion.
- Validate bounds, bone names, morph targets, clip duration, foot contact, and return-to-idle before accepting an asset.

### Licensing

- Accept CC0, public-domain, or commercially compatible CC-BY assets only.
- Store source URL, author, exact license, modifications, and download date in `mobile/assets/characters/LICENSES.md`.
- Do not use assets with editorial, non-commercial, attribution-unclear, or redistribution-prohibited terms.

## Audio production and acceptance gate

- Use real field/studio animal recordings, not oscillator synthesis or TTS pretending to be an animal.
- One calm Talk call and, where appropriate, one energetic Play call per species.
- Trim silence and background speech; mono; normalize gently; add 8–15 ms fades to avoid clicks.
- MP3 or M4A/AAC for cross-platform playback, 44.1 kHz, 64–96 kbps, normally 0.4–2.5 seconds and under 80 KB per call.
- Avoid distress, aggression, mating, or alarm calls. The tone must be friendly and low-trigger.
- Keep recorded calls silent until a direct user action and respect the existing mute setting.
- Record source, author, license, and modifications in `mobile/assets/audio/animal-calls/LICENSES.md`.

## Implementation phases

### Phase 0 — baseline and inventory

1. Capture current screenshots/video for all ten species and three representative growth chapters.
2. Inspect current GLBs for actual clip, bone, morph, material, and bounds metadata.
3. Record baseline load time, model size, frame rate, and action timing.
4. Mark every catalog action as supported, procedural, or unavailable.

Exit: the asset/capability report is committed and current tests remain green.

### Phase 1 — semantic motion foundation

1. Add manifest and pure capability resolver.
2. Expand catalog action candidates; remove arbitrary semantic fallbacks.
3. Add semantic `dispatch(intent)` while retaining legacy adapters.
4. Add rig/morph discovery and reusable layered action phases.
5. Fix Play so target taps use Play even after Curious.
6. Add action interruption, cancellation, and deterministic return-to-idle.
7. Keep reduced-motion behavior calm but still semantically distinguishable.

Exit: current assets visibly Talk, Wave, and Play differently wherever their rigs allow; tests prove missing capabilities do not become unrelated clips.

### Phase 2 — recorded calls

1. Curate and document licensed, calm recordings for ten species.
2. Add a local audio manifest and Expo Audio adapter.
3. Remove Web Audio oscillator calls.
4. Start Talk animation with actual recording duration; stop both on interruption/navigation.
5. Keep captions and word-by-word greeting text concurrent with the call.

Exit: every Talk tap plays the correct real species call when unmuted, no sound occurs automatically, and playback cleans up on screen exit.

### Phase 3 — model pilot

1. Produce or license a cohesive rigged Dog, Cat, and Horse pilot set.
2. Author Baby/Juvenile/Young Adult morphs or compatible meshes.
3. Author the six required action clips and accessory anchors.
4. Export, compress, inspect, and run the acceptance gate.
5. Replace those three catalog entries behind the manifest seam.

Exit: the pilot demonstrates the target quality on web, iOS, and Android before purchasing or producing seven more animals.

### Phase 4 — complete species set

1. Apply the validated pilot pipeline to Fox, Parrot, Flamingo, Stork, Panda, Penguin, and Hamster.
2. Tune per-species framing, lighting, material exposure, action timing, and accessory placement.
3. Run the full species × age × action matrix.

Exit: all ten animals meet the same asset and motion gate.

### Phase 5 — runtime consolidation and polish

1. Extract one shared Three.js runtime and thin platform adapters.
2. Add cache/preload rules and graceful offline/model-failure states.
3. Add subtle eye tracking, blink variation, breathing, ear/tail/wing secondary motion, and action cooldown variation.
4. Add performance telemetry in development builds.

Exit: web and native behavior no longer drift and the home screen meets the performance budget.

## Test plan

### Automated

- Capability resolver: exact/alias matching, missing clip warnings, no first-clip semantic fallback.
- Intent controller: action priority, interruption, duration, play-step phases, return-to-idle.
- Growth mapping: all six chapters produce valid age weights summing to one and remain within framing rules.
- Audio manifest: all ten species have Talk sources, valid duration metadata, and license entries.
- Bridge: commands queue before ready and flush in order; stop clears motion and sound.
- Regression: existing appearance, pet identity, growth, onboarding, and backend tests remain green.

### Manual visual/audio matrix

For every species, check Baby, Playful/Juvenile, and Grown × Idle, Talk, Wave, Play, Rest on web, one iOS device/simulator, and one mid-range Android device.

Approve only when:

- Talk visibly moves the mouth/jaw/beak/face and matches the recorded call timing.
- Wave moves a limb, wing, flipper, forepaw, or tail—not only the root.
- Play has anticipation, action, and recovery and responds to each glow target.
- Baby, juvenile, and young-adult silhouettes are obvious without a label.
- No model clips, sinks, foot-slides excessively, turns grey, loses texture detail, or exits frame.
- Mute, reduced motion, interruption, background/foreground, and navigation cleanup work.

## Agent handoff

### Luna-max A — motion and capability foundation

- Own the manifest/capability resolver, semantic intent interface, rig/morph overlays, Play-state fix, and automated tests.
- Avoid animal audio and Home UI ownership except for the minimal handle contract.

### Luna-max B — recorded audio and asset provenance

- Own the audio manifest/adapter, licensed recordings and attribution, Talk timing integration, oscillator removal, and audio tests.
- Avoid renderer motion internals except passing measured duration through the semantic intent.

### Integration review

- Review both slices against this plan, resolve bridge/type conflicts, run the complete validation matrix available in the prototype, and document any model-production work that cannot be completed without Blender or licensed source assets.

## Definition of done for this implementation pass

This pass is complete when the semantic motion foundation and recorded-audio seam are merged, current assets produce meaningfully distinct actions, oscillator calls are removed or unreachable, tests pass, and the repository contains a production-ready specification for replacing the models. The full visual-quality goal is complete only after all ten accepted rigged assets and their authored growth presentations are delivered.
