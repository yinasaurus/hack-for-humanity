# Sourcing free rigged animal `.glb` models (Talking Tom–style)

You need **low-poly animals in `.glb`**, preferably with animation clips you can map to:

| Role   | Typical clip names you’ll map |
|--------|-------------------------------|
| Idle   | `Idle`, `idle`, `Idle_Loop`, `Standing` |
| Talk   | `Talk`, `Bark`, `Eat`, `Idle_Head`, or mouth morphs |
| React  | `Hit`, `Jump`, `Spin`, `Yes`, `Happy`, `Attack` |

**Honest note:** most free animal packs have **Idle / Walk / Run / Jump**, not a dedicated “Talk” clip. That’s fine — map `Talk` → closest mouth/head motion (`Eat`, `Bark`, `Idle`) and/or use **morph targets** for mouth. Our `<AnimalCharacter />` accepts a per-model `clips` map for this.

## Models currently used by Buddi

- Fox, dog, and panda: the smoother textured Mesh2Motion model-variation family,
  bundled locally as CC0 assets under `assets/characters/` (see `ATTRIBUTION.md`).
- Horse: Jungle Jim's CC-BY 4.0 cartoon horse, bundled locally with original
  `Run` plus Buddi-authored `Idle`, `Talk`, `Wave`, `Play`, `Curious`, and `Gentle` clips.
- Penguin: Quaternius / FreeModels, CC0, bundled with Buddi-authored flipper joints and `Wave`.
- Rabbit: majkel's CC-BY 4.0 Sketchfab Rabbit, optimized and bundled locally.
- Seal: Kugatsu Tsukai 3D Models Hub's CC-BY 4.0 dotted white seal, optimized and bundled locally.
- Cat, sloth, capybara, hamster, koala, bear, raccoon, duck, and sheep:
  Animals by molochdadev [CC-BY] via Poly Pizza — converted OBJ/FBX packs bundled
  under `assets/characters/` (see `ATTRIBUTION.md`). Static meshes; Buddi drives
  motion with the procedural choreography overlay.
- Parrot, flamingo, and stork: Three.js example models.

Rabbit replaces Hamster in onboarding; Hamster remains readable for existing
saved profiles. The older `rabbit-v2` procedural spec and legacy `cat-v2` remain
in `src/characters/catProceduralModel.ts` for the procedural build seam/tests;
the catalog points Cat at `bundled:cat`.

---

## Best free sources (rigged / animated animals)

### 1. [Quaternius](https://quaternius.com/) — **best starting point (CC0)**
- Packs: **Ultimate Animated Animals**, **Cute Animated Animals**, farm/fantasy animals.
- Format: often FBX/GLTF; convert to `.glb` in Blender if needed (File → Export → glTF Binary).
- Clips: usually Idle, Walk, Run, Jump, Attack, sometimes Eat/Emote.
- License: **CC0** (public domain) — free for commercial use, no attribution required (still nice to credit).
- Tip: download the **GLTF** variant when offered.

### 2. [Kenney.nl](https://kenney.nl/assets) — **great props/env; animals often simpler**
- Search “animal”, “pet”, “nature”.
- Many Kenney packs are **static or lightly animated**. Good for placeholders; less ideal for Talk/React unless you add clips in Blender.
- License: **CC0**.

### 3. [Mixamo](https://www.mixamo.com/) — **animation library (Adobe free account)**
- Best for **biped** characters. True quadruped animals are limited.
- Workflow: upload a biped mascot → download FBX with skin → convert to `.glb`.
- Clips: huge set (Idle, Talking, Gesture, etc.).
- Use for **humanoid companions** or biped “chibi” animals; not ideal for realistic cats/dogs.

### 4. [Sketchfab](https://sketchfab.com/search?features=downloadable&licenses=322a749bcfa841b29dff1e8a1bb74b0b&type=models) — filter **Downloadable + CC0 / CC-BY**
- Search: `low poly cat animated`, `low poly dog idle gltf`.
- Prefer models tagged **rigged** / **animated** / **gltf**.
- Check each license (CC-BY needs attribution).

### 5. [Poly Pizza](https://poly.pizza/) — low-poly CC0 library
- Quick finds for stylized animals; animation quality varies — inspect clips in Blender before shipping.

### 6. [OpenGameArt](https://opengameart.org/) — mixed licenses
- Search “animated animal gltf/glb”. Double-check license per asset.

### 7. itch.io (Quaternius mirrors & indie packs)
- Search “quaternius animals” or “low poly animal animated glb”.
- Confirm license on each page.

---

## What to download (checklist per animal)

For each character (cat, dog, fox, …) put a file here:

```text
mobile/assets/characters/
  cat.glb
  dog.glb
  fox.glb
```

Then register it in `src/characters/characterCatalog.ts` with **exact** clip names from the file.

### Inspect clip names (required)

**Blender**
1. Import `.glb`
2. Dope Sheet → Action Editor / Nonlinear Animation — list actions  
   or check the Animation panel after selecting the armature.

**Online**
- [gltf.report](https://gltf.report/) — drop the `.glb`, read animation names.

Write those names into the catalog:

```ts
clips: {
  idle: 'Idle',
  talk: 'Eat',   // fallback if no Talk
  react: 'Jump',
}
```

---

## Talk animation strategy (when there’s no “Talk” clip)

1. **Map** `talk` → `Eat` / `Bark` / `Idle` (best free-pack option).
2. **Morph targets** — if the mesh has `mouthOpen`, `Mouth`, `jaw`, `viseme_*`, our component auto-drives them while audio plays.
3. **Blender 10-minute Talk clip** — keyframe jaw bone or shape key open/close on a 1s loop; export `.glb` with the new action named `Talk`.

---

## Convert FBX → GLB (Blender)

1. File → Import → FBX  
2. File → Export → glTF 2.0  
3. Format: **glTF Binary (.glb)**  
4. Enable **Animation**  
5. Save under `mobile/assets/characters/`

---

## Suggested starter set

| Animal | Where to look first | Likely clips to map |
|--------|---------------------|---------------------|
| Dog / Cat / Fox / Rabbit | Quaternius Ultimate Animated Animals | Idle → Idle, Talk → Eat/Idle, React → Jump |
| Bird / Chick | Quaternius / Poly Pizza | Idle, Fly/Jump as React |
| Bear / Deer | Quaternius | Idle, Attack/Jump as React |

---

## After you drop files in

1. Add an entry in `characterCatalog.ts`  
2. Reload the **Character** screen in the app  
3. No need to edit `AnimalCharacter.tsx` animation logic — only the catalog

### Expo note
Realtime Three.js needs **WebGL2**. Prefer **`npx expo start --web`** or a **dev build**. Expo Go on many Android devices is WebGL1-only and can fail with modern Three.js.
