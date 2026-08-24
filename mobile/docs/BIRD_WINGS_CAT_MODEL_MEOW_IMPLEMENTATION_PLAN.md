# Buddi bird wings, Cat v2, and real meow implementation plan

## Outcome

Wave and Play Together make Flamingo and Stork visibly flap their wings, Cat
uses an original smooth kitten model with a believable face, and Talk plays a
clear real-cat meow while the existing word-by-word encouragement remains in
sync. These changes must work in the localhost web build and native Expo build
without sideways root drift or breaking growth, vitality, or accessories.

## Reference interpretation and originality boundary

The supplied kitten photos are visual references, not assets to reproduce.
The implementation should preserve the useful real-kitten cues: a round but
not spherical skull, short compact muzzle, small triangular nose, separated
cheek pads, upright triangular ears with visible inner-ear planes, glossy eyes
at a natural kitten scale, and readable whiskers. It must not trace a supplied
photo, copy coat markings exactly, or imitate an existing game character.

The original Buddi Cat v2 direction is a seated silver-tabby kitten:

- mid-grey fur `#8E9698`, warm cream muzzle/chest/paws `#E9E2D7`;
- restrained charcoal tabby accents `#3F4549`;
- rose inner ears and nose `#C98E91`;
- near-black glossy eyes `#17191C` with small warm-white catchlights;
- warm cream-peach background `#F3E7DA` and a darker neutral ground shadow so
  the silhouette never disappears into the scene.

The face must remain legible at the size shown on a phone. Eyes may be cute,
but must not dominate the skull. Materials are smooth matte fur, not faceted
low-poly shading; only the eyes and nose receive a mild clearcoat.

## Slice A — make the procedural-model seam support Cat v2

1. Extend `ProceduralCharacterId` from the single Rabbit id to
   `'rabbit-v2' | 'cat-v2'`.
2. Add a renderer-neutral `catProceduralModel.ts` next to the Rabbit spec. It
   should use the same shape contract the renderer already consumes so models
   are data, not special-case renderer branches.
3. Use named hierarchy/pivots such as `CatRoot`, `Body`, `Chest`, `Neck`,
   `Head`, `Jaw`, `Muzzle_L/R`, `Nose`, `Eye_L/R`, `Ear_L/R`,
   `InnerEar_L/R`, forelimbs and paws, hind limbs and feet, and a three-link
   `TailBase/TailMid/TailTip`. Optional stripe and whisker parts may be visual
   children, but action pivots remain stable.
4. Prefer smooth spheres/ellipsoids/capsules/cones with at least 32 radial
   segments. Add a cylinder primitive only if needed for thin whiskers; keep
   the renderer adapter generic.
5. Declare motion anchors, shared growth targets, action targets, accessory
   anchors, fit, background, and ground in the spec. Wave must lift one paw,
   soften the head/ear response, and wag the tail without translating the root.
   Play must alternate forepaws, add a bounded crouch/spring, tail swish, ear
   perk, and recovery.
6. Point the Cat catalog entry at `proceduralModel: 'cat-v2'`, leave its remote
   model path empty, and keep legacy `cat` identity mappings unchanged.
7. Add source-level tests for palette contrast, required face anatomy, smooth
   segment counts, hierarchy validity, motion/growth/accessory anchors, catalog
   identity, and legacy mappings.

## Slice B — one generic renderer adapter for Rabbit and Cat

1. Select a serialized model spec by `character.proceduralModel`; do not add a
   second copy of the Three.js/WebView renderer.
2. Build each declared part beneath a named `THREE.Bone` pivot so existing
   rig indexing, bounded growth channels, and choreography can drive it. Apply
   base position/rotation/scale once, then cache the neutral pose.
3. Keep the root x/z position and yaw locked during Wave and Play Together.
   All character movement must come from limbs, head, ears, jaw, tail, and a
   small vertical crouch/spring—not whole-model sideways sliding.
4. Run the same adapter in `AnimalWebView.tsx`, `.native.tsx`, and `.web.tsx`.
   Centralize or generate the injected renderer block if practical; parity is
   mandatory even if the existing files cannot yet be consolidated safely.
5. Preserve the current heart burst, word-by-word Talk message, audio playback,
   vitality dimming, growth stages, camera controls, and outfit anchors.

## Slice C — Flamingo and Stork authored wing flaps

The exact three.js r152 sample GLBs are morph-animated rather than exposing
named wing bones. Direct GLB inspection shows their single authored clips are
`flamingo_flyA_` and `storkFly_B_`; invented candidates such as
`flamingo_A_flap` do not resolve.

1. Inspect the loaded GLB animation names and make Wave and Play Together try
   the real authored `*_A_` clip. Keep any future explicit flap/fly aliases,
   but ensure the known actual clip is a candidate.
2. For these birds, prefer the authored morph clip over a bone-only overlay.
   Restart it on each action and use the action duration/loop mode consistently
   with Parrot so a tap always produces an obvious wing cycle.
3. Retain a bounded body bob and head reaction as secondary motion, but never
   substitute a rotation-only animation when the authored flap exists.
4. Add tests proving Flamingo and Stork Wave/Play candidates include their
   real authored clips and that the renderer does not require wing bones before
   playing a resolved semantic clip.

## Slice D — replace Cat Talk with a real meow

1. Select a clearly identifiable, friendly domestic-cat meow from a CC0,
   CC-BY, or public-domain source. Reject human speech, synthesized tones,
   other species, distress/aggression calls, and recordings dominated by room
   noise or purring if the meow itself is unclear.
2. Keep the exact source page, author/uploader, license, acquisition URL,
   processing notes, retrieval date, duration, byte size, and SHA-256 beside
   the asset in `animalSounds.ts` and `assets/audio/animal-calls/LICENSES.md`.
3. Trim to one friendly call (target roughly 0.6–1.8 seconds), convert to mono
   44.1 kHz AAC-LC M4A with short fades, and replace `cat-talk.m4a`. Keep the
   same static Metro `require()` path for reliable Expo web/native bundling.
4. Update manifest tests so the file metadata and hash match the bundled asset.
   Do not add a remote runtime URL or synthetic fallback.
5. Confirm a fresh localhost web export serves the audio, Talk restarts it on
   every tap, and the existing typed encouragement starts concurrently.

## Verification and acceptance gates

- Focused procedural-model, catalog, choreography, and animal-audio tests pass.
- `npx tsc --noEmit` passes for the whole mobile package.
- `npx expo export --platform web` succeeds and includes the replacement meow.
- `npx expo config --type public` succeeds.
- `git diff --check` is clean.
- In localhost visual QA:
  - Cat reads immediately as a kitten from front and three-quarter views;
  - facial planes remain rounded and natural rather than blocky or mask-like;
  - Cat differs clearly from its warm background;
  - Cat Wave is a paw wave with tail/ear secondary motion and no side slide;
  - Cat Play is a varied crouch/pounce/recover loop with hearts;
  - Flamingo and Stork show unmistakable wing flapping for both actions;
  - Talk plays one recognizable cat meow while words appear progressively;
  - all three renderer entry points behave the same.

## Ownership / handoff

- Luna model/audio agent: Cat v2 spec, catalog/type integration, real meow asset,
  provenance, and focused model/audio tests.
- Luna motion agent: shared procedural renderer adapter, Cat choreography,
  Flamingo/Stork authored-clip resolution, and renderer/action tests.
- Root integrator: conflict resolution, cross-platform validation, localhost
  visual/audio QA, and final product-facing summary.
