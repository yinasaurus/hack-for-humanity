import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const ADAPTERS = [
  './AnimalWebView.tsx',
  './AnimalWebView.native.tsx',
  './AnimalWebView.web.tsx',
];

function read(name) {
  return fs.readFileSync(new URL(name, import.meta.url), 'utf8');
}

test('all renderer adapters use the shared Rabbit spec and procedural build seam', () => {
  for (const adapter of ADAPTERS) {
    const source = read(adapter);
    assert.match(source, /import \{ RABBIT_PROCEDURAL_MODEL \} from '\.\/rabbitProceduralModel'/);
    assert.match(source, /import \{ CAT_PROCEDURAL_MODEL \} from '\.\/catProceduralModel'/);
    assert.match(source, /PROCEDURAL_MODEL_SPECS = \[RABBIT_PROCEDURAL_MODEL, CAT_PROCEDURAL_MODEL\]/);
    assert.match(source, /PROCEDURAL_MODEL_SPECS\.find\(\(\{ id \}\) => id === character\.proceduralModel\)/);
    assert.doesNotMatch(source, /character\.proceduralModel === 'rabbit-v2'/);
    assert.match(source, /const PROCEDURAL_MODEL = \$\{JSON\.stringify\(proceduralModel\)\}/);
    assert.match(source, /const IS_PROCEDURAL = Boolean\(PROCEDURAL_MODEL\)/);
    assert.match(source, /function buildProceduralModel\(spec\)/);
    assert.match(source, /new THREE\.CapsuleGeometry/);
    assert.match(source, /new THREE\.CylinderGeometry/);
    assert.match(source, /new THREE\.DodecahedronGeometry\(1, 0\)/);
    assert.match(source, /new THREE\.BoxGeometry\(2, 2, 2\)/);
    assert.match(source, /new THREE\.CylinderGeometry\(0\.46, 1, 2, 4, 1, false, Math\.PI \/ 4\)/);
    assert.match(source, /geometry\.rotateX\(Math\.PI \/ 2\)/);
    assert.match(source, /String\(part\.primitive\)/);
    assert.match(source, /function proceduralGeometry\(part\)/);
    assert.match(source, /Math\.max\(6, Number\(part\.segments\) \|\| 32\)/);
    assert.match(source, /flatShading: Boolean\(spec\.flatShading\)/);
    assert.match(source, /new THREE\.MeshPhysicalMaterial/);
    assert.match(source, /initializeRoot\(buildProceduralModel\(PROCEDURAL_MODEL\), \[\]\)/);
    assert.match(source, /proceduralModel\?\.framing\.background/);
    assert.match(source, /const GROUND_COLOR = \$\{JSON\.stringify\(groundColor\)\}/);
    assert.match(source, /PROCEDURAL_MODEL\?\.growthTargets/);
    assert.match(source, /RIG_HINTS\.eye/);
    assert.match(source, /source\.clone\(\)/);
    assert.match(source, /const controls = new OrbitControls\(camera, renderer\.domElement\)/);
    assert.doesNotMatch(source, /controls\.enableRotate\s*=\s*false/);
  }
});

test('Cat action targets resolve named jaw, paw, ear, and single-tail pivots', () => {
  const spec = fs.readFileSync(new URL('./catProceduralModel.ts', import.meta.url), 'utf8');
  assert.match(spec, /id: 'cat-v2'/);
  assert.match(spec, /primitive: ProceduralPrimitive/);
  assert.match(spec, /'Whisker_L_1'.*'cylinder'/s);
  assert.match(spec, /actionTargets: \{/);
  assert.match(spec, /wave: \['Forelimb_L'\]/);
  assert.match(spec, /play: \['Forelimb_L', 'Forelimb_R'/);
  assert.doesNotMatch(spec, /TailBase|TailMid/);
  for (const adapter of ADAPTERS) {
    const source = read(adapter);
    assert.match(source, /function findProceduralActionBones\(action, slot\)/);
    assert.match(source, /PROCEDURAL_MODEL\?\.actionTargets\?\.\[action\]/);
    assert.match(source, /anchorSet\.has\(name\)/);
  }
});

test('Horse preserves its original GLB without synthetic eye overlays', () => {
  for (const adapter of ADAPTERS) {
    const source = read(adapter);
    assert.doesNotMatch(source, /HorseEyeOverlays|HorseEye_|applyHorseEyeOverlays|disposeHorseEyeOverlay/);
  }
});

test('procedural growth, eye styling, and framing happen after indexing in every adapter', () => {
  const bodies = ADAPTERS.map((adapter) => {
    const source = read(adapter);
    const index = source.indexOf('indexBones(root);');
    const eyes = source.indexOf('applyEyeProfile();', index);
    const growth = source.indexOf('applyGrowthProportions();', eyes);
    const frame = source.indexOf('frameFullBody(root, GROWTH_POSITION);', growth);
    assert.ok(index >= 0 && eyes > index && growth > eyes && frame > growth, `${adapter} setup order changed`);
    return source
      .slice(source.indexOf('function buildProceduralModel'), source.indexOf('function onResize'))
      .replace(/\/\*[^]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\s+/g, ' ')
      .replace(/if \(window\.parent[^\n]+\n?/g, '');
  });
  // Native + web are the live platform entry points; keep their procedural seam locked.
  assert.equal(bodies[2], bodies[1], 'web adapter procedural seam drifted from native');
  assert.match(bodies[0], /function buildProceduralModel/);
  assert.match(bodies[0], /ACCESSORY_FIT/);
  assert.match(bodies[1], /ACCESSORY_FIT/);
  assert.match(bodies[1], /party_hat/);
  assert.match(bodies[1], /isCosmetic/);
});

test('Horse no longer declares synthetic eye aliases or a forced eye color', () => {
  const catalog = fs.readFileSync(new URL('./characterCatalog.ts', import.meta.url), 'utf8');
  const presentation = fs.readFileSync(new URL('./animalPresentation.ts', import.meta.url), 'utf8');
  const horse = catalog.slice(catalog.indexOf("id: 'horse'"), catalog.indexOf("id: 'parrot'"));
  const horsePresentation = presentation.slice(presentation.indexOf('  horse: {'), presentation.indexOf('  parrot: {'));
  assert.doesNotMatch(horse, /\n\s+eye:/);
  assert.match(horsePresentation, /visual: smoothToyVisual\(\)/);
  assert.doesNotMatch(horsePresentation, /#080A0C/);
});
