# Character model attribution

## Mesh2Motion animal variations (CC0)

`fox.glb`, `dog.glb`, and `panda.glb` are the Mesh2Motion model variations
from the [`mesh2motion-app` repository](https://github.com/Mesh2Motion/mesh2motion-app),
downloaded from its `static/models-variation/fox/` directory:

- [`fox.glb`](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/static/models-variation/fox/fox.glb)
- [`dog.glb`](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/static/models-variation/fox/dog.glb)
- [`panda.glb`](https://github.com/Mesh2Motion/mesh2motion-app/blob/main/static/models-variation/fox/panda.glb)

The upstream project states that its art assets (3D models, rigs, and
animations) are released under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
Buddi uses the models unchanged and drives its companion actions through the
catalog's semantic/procedural overlay.

## Cartoon Horse with animations by Jungle Jim (CC-BY 4.0)

`horse.glb` is derived from **Cartoon Horse with animations** by
[Jungle Jim](https://sketchfab.com/jungle_jim), downloaded from
[Sketchfab](https://sketchfab.com/3d-models/cartoon-horse-with-animations-1210663c398745cb9898e7d66fa51500)
under the [Creative Commons Attribution 4.0 license](https://creativecommons.org/licenses/by/4.0/).

**Modifications:** removed scene-lighting helpers; preserved the original textured
mesh, quadruped rig, and run cycle; added smooth looping `Idle`, `Talk`, `Wave`,
`Play`, `Curious`, and `Gentle` companion clips; renamed the original full-body action
to `Run`; exported as a mobile-ready binary glTF.

## Rabbit (rigged low-poly) — attribution pending confirmation

`rabbit.glb` is the bundled `low_poly_rabbit.glb` drop-in (Idle / Run / Die clips,
skinned with `fleg*` front-leg joints). Previous majkel static mesh is preserved as
`rabbit-old.glb` for revert.

**Buddi wiring:** catalog path stays `bundled:rabbit`; Wave uses the left front-leg
shoulder (`fleg01.L`); Talk audio is unchanged (`rabbit-talk.wav`).

**License:** please confirm Sketchfab / author / license so this section can be
completed the same way as the other character entries.

## Rabbit by majkel (CC-BY 4.0) — previous static mesh

`rabbit-old.glb` is derived from **Rabbit** by
[majkel](https://sketchfab.com/majkel20), downloaded from
[Sketchfab](https://sketchfab.com/3d-models/rabbit-c5fdc23b56334f21a7f6edea4ebbfe69)
under the [Creative Commons Attribution 4.0 license](https://creativecommons.org/licenses/by/4.0/).

**Modifications:** removed unused scene helpers, resized the base-color texture,
reduced the dense static mesh to about 30,000 polygons, and exported a mobile-ready
binary glTF. Buddi previously supplied a centered whole-body greeting because that
source had no rig.

## Dotted White Seal - Free Giveaway by Kugatsu Tsukai 3D Models Hub (CC-BY 4.0)

`seal.glb` is derived from **Dotted White Seal - Free Giveaway** by
[Kugatsu Tsukai 3D Models Hub](https://sketchfab.com/3d-models/dotted-white-seal-free-giveaway-676115a924214e8289b9e03fb9b9a4ab)
under the [Creative Commons Attribution 4.0 license](https://creativecommons.org/licenses/by/4.0/).

**Modifications:** removed unused scene helpers, capped textures for mobile use, and
exported a mobile-ready binary glTF. Buddi supplies a centered whole-body greeting.

## Penguin by Quaternius (CC0)

`penguin.glb` comes from Quaternius' free animated animal collection, released
under [CC0](https://creativecommons.org/publicdomain/zero/1.0/).

**Modifications:** added left and right deforming flipper joints, painted smooth
flipper weights, authored a looping `Wave` action, and exported a mobile-ready GLB
while preserving the source animation actions.

## Animals by molochdadev (CC-BY) via Poly Pizza

The following bundled `.glb` companions are derived from:

**Animals** by [molochdadev](https://poly.pizza/u/molochdadev) — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) — via [Poly Pizza](https://poly.pizza/).

| File | Source folder |
|------|----------------|
| `capybara.glb` | Capybara |
| `hamster.glb` | Hamster |
| `koala.glb` | Koala |
| `bear.glb` | Bear |
| `raccoon.glb` | Raccoon |
| `duck.glb` | Duck |
| `sheep.glb` | Sheep |
| `cat.glb` | Cat |
| `sloth.glb` | Sloth |

**Modifications:** OBJ/MTL/PNG packs (and the Sloth FBX) converted to binary glTF (`.glb`); large base-color textures resized to 512×512 before export to keep the mobile bundle small. Models are static (no animation clips); Buddi drives idle/talk/play via its procedural choreography overlay. The Hamster remains bundled only so older saved companions keep rendering.
