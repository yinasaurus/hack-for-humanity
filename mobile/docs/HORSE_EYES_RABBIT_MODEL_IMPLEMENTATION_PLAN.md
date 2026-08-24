# Horse Eyes + Original Rabbit Model — Implementation Plan

## Outcome

1. The Horse always has clearly black, glossy eyes comparable in readability to the Fox.
2. Rabbit uses an original, smooth, semi-realistic seated-rabbit model inspired by the supplied reference photos without copying any single image.
3. Rabbit remains easy to see against every normal Home background, and continues to support growth stages, Talk, Wave, Play Together, idle motion, vitality dimming, and unlocked accessories.

## Reference interpretation

Use the supplied photos only for broad anatomical cues:

- compact pear-shaped torso with rounded haunches;
- small front paws held/planted close together and larger grounded hind feet;
- upright tapered ears with soft pink inner ears;
- rounded cheeks, short muzzle, small pink nose, and dark glossy eyes;
- soft, smooth fur impression rather than a faceted, blocky surface.

Create an original three-quarter seated silhouette. Do not reproduce the exact pose, markings, crop, or proportions of a specific photo.

## Visual system

### Rabbit palette

- Main fur: warm cinnamon/apricot (`#C88968`) so the body separates from Buddi's cream and mist backgrounds.
- Secondary fur: pale warm cream (`#F2DDC7`) for muzzle, chest, and paw accents.
- Inner ears: muted rose (`#DEA29B`).
- Nose: dusty pink (`#B96F73`).
- Eyes/pupils: near-black (`#111317`) with small off-white catchlights.
- Default rabbit backdrop: cool blue-grey (`#E3ECEF`) with a slightly darker neutral ground shadow.

Do not use pure white as the dominant fur color because Buddi's default canvas is warm ivory. Maintain visible silhouette contrast in happy, resting, curious, and excited states.

### Surface and lighting

- Smooth normals and 32+ segments on face/body feature surfaces.
- Matte PBR fur response: roughness around `0.78–0.88`, metalness `0`, restrained clearcoat.
- Gloss is reserved for eyes and the nose.
- Preserve the existing soft studio key/fill/rim lighting; tune Rabbit only if the silhouette loses separation.

## Deep module seam

Add one declarative procedural-model interface owned by the character system rather than embedding unrelated Rabbit geometry throughout the screen:

```ts
type ProceduralCharacterId = 'rabbit-v2';

type CharacterDef = {
  // existing fields
  proceduralModel?: ProceduralCharacterId;
};
```

The Rabbit catalog entry selects `rabbit-v2`. A shared Rabbit model specification owns its named materials, primitive parts, hierarchy, pivots, and default palette. Each renderer adapter serializes the same specification and builds the same Three.js hierarchy.

No Home/Customize screen should know how Rabbit geometry is constructed.

## Rabbit hierarchy and motion pivots

Build a y-up, origin-centred `THREE.Group` resting on the ground. Use named smooth primitives and named shared materials. At minimum expose:

- `RabbitRoot`
- `Body`, `Chest`, `Haunch_L`, `Haunch_R`
- `Neck`, `Head`, `Muzzle_L`, `Muzzle_R`, `Nose`
- `Eye_L`, `Eye_R`, `EyeHighlight_L`, `EyeHighlight_R`
- `Ear_L`, `Ear_R`, `InnerEar_L`, `InnerEar_R`
- `Forelimb_L`, `Forelimb_R`, `ForePaw_L`, `ForePaw_R`
- `Hindlimb_L`, `Hindlimb_R`, `HindFoot_L`, `HindFoot_R`
- `Tail`

Animated parts use pivot nodes discoverable through the existing rig-hint system. A lightweight Bone hierarchy is acceptable even when the visible meshes are rigid children; a skinned surface is not required for this prototype.

## Growth compatibility

Keep Rabbit's existing six growth chapters. The new hierarchy must respond visibly and monotonically to existing growth channels:

- Baby: rounder torso/head, shorter ears, shorter limbs, larger readable eyes.
- Little/Growing: ears and limbs lengthen progressively.
- Playful/Adventurer: torso becomes slightly taller and less round.
- Grown: full ear/limb length and calmer adult proportions.

Never accumulate scaling after rerenders or actions. Growth transforms must apply once from the authored baseline.

## Action compatibility

- Idle: subtle head, ear, and tail micro-motion.
- Talk: head nod plus small muzzle/jaw movement while the Rabbit call plays.
- Wave: one forepaw lifts toward the user, ears perk, tail gives a small response; root remains upright and centred.
- Play Together: alternating forepaws, light bounded hop, ear follow-through, and tail response.
- Reduced motion: retain the centred static pose with only the established minimal fallback.

Accessories attach through the existing head/neck/forelimb anchors. Missing anchors must fail safely without moving the model.

## Horse eye fix

1. Inspect the Horse asset's actual eye mesh/material/node names.
2. Add explicit eye aliases to the Horse rig definition if needed.
3. Extend the shared eye-indexing seam to honor declared aliases before conservative name fallbacks.
4. Clone eye materials before changing them.
5. Force the Horse eye material to near-black (`#080A0C`), low roughness, and a restrained catchlight/clearcoat.
6. Do not recolor the Horse coat, mane, nostrils, or unrelated dark materials.

## Renderer and catalog migration

- Remove Rabbit's runtime dependency on the remote `human-bunny.glb` model.
- Preserve `rabbit`, legacy `hamster`, and legacy `bun` identity mappings.
- Keep a non-empty model-path fallback only if the current renderer contract requires it; document that the procedural model is authoritative.
- Apply the same builder, colors, framing, and background logic in native, generic, and web renderer adapters.
- Update source documentation so it no longer claims the Mesh2Motion bunny is the live Rabbit.

## Tests

- Rabbit catalog selects `rabbit-v2` and no longer identifies `human-bunny.glb` as authoritative.
- Rabbit spec has unique named parts/materials and all required motion anchors.
- Rabbit palette has sufficient relative luminance separation from its default background and ground.
- Eyes are near-black; highlights are lighter; nose and inner ears remain distinct.
- Growth channels resolve for Rabbit anchors at every chapter without double scaling.
- Horse eye aliases resolve and the presentation requests `#080A0C`.
- All three renderer files serialize/use the same procedural-model and eye-alias seams in the same order.
- Existing identity, choreography, appearance, wardrobe, Talk, and audio tests remain green.

## Acceptance checklist

- Rabbit reads immediately as a seated rabbit at phone size: ears, cheeks, small nose, forepaws, haunches, hind feet, and tail are recognizable.
- Rabbit is visibly separated from the default canvas in bright and dim vitality states.
- Rabbit has no blocky/faceted feature silhouette at normal Home scale.
- Wave and Play move Rabbit appendages without sideways root drift.
- Baby and Grown Rabbit screenshots show an obvious age difference.
- Horse eyes are visibly black from the default Home camera.
- TypeScript, mobile tests, Expo SDK 57 config, web export, and localhost visual checks pass.
