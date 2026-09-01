# Drop `.glb` characters here

See `../docs/SOURCE_ANIMAL_MODELS.md` for free sources (Quaternius, Kenney, Mixamo, Sketchfab, Poly Pizza).

Bundled Poly Pizza companions (CC-BY, molochdadev) — see `ATTRIBUTION.md`:
- `capybara.glb`, `hamster.glb`, `koala.glb`, `bear.glb`
- `raccoon.glb`, `duck.glb`, `sheep.glb`
- `cat.glb`, `sloth.glb`

Bundled Mesh2Motion companions (CC0, see `ATTRIBUTION.md`):
- `fox.glb`, `dog.glb`, `panda.glb`

Other bundled companions — see `ATTRIBUTION.md`:
- `horse.glb` — Jungle Jim cartoon horse (CC-BY 4.0), with Buddi animation clips
- `penguin.glb` — Quaternius penguin (CC0), with Buddi flipper rig and Wave clip
- `rabbit.glb` — rigged low-poly rabbit (Idle/Run); previous majkel mesh as `rabbit-old.glb`
- `seal.glb` — Kugatsu Tsukai dotted white seal (CC-BY 4.0), optimized for mobile

Then register each in `src/characters/characterCatalog.ts` with a `bundled:<id>` modelPath.
