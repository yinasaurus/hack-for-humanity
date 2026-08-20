/**
 * Prints where to get free rigged animals + expected local paths.
 * Run: node scripts/print-animal-sources.js
 */
const sites = [
  {
    name: 'Quaternius',
    url: 'https://quaternius.com/',
    notes: 'Best CC0 animated animals (Idle/Walk/Run/Jump/Eat). Convert FBX→GLB in Blender if needed.',
    talk: 'Often no Talk — map Talk→Eat/Idle; React→Jump/Attack',
  },
  {
    name: 'Kenney.nl',
    url: 'https://kenney.nl/assets',
    notes: 'CC0; animals often lightly animated. Good placeholders.',
    talk: 'May need Blender clips for Talk/React',
  },
  {
    name: 'Mixamo',
    url: 'https://www.mixamo.com/',
    notes: 'Free Adobe account. Best for biped / chibi. Download FBX+skin → GLB.',
    talk: 'Has Talking / Gesture clips for humanoids',
  },
  {
    name: 'Sketchfab (CC0/CC-BY downloadable)',
    url: 'https://sketchfab.com/search?features=downloadable&type=models&q=low+poly+animal+animated',
    notes: 'Filter downloadable + license. Prefer glTF.',
    talk: 'Inspect animations per model',
  },
  {
    name: 'Poly Pizza',
    url: 'https://poly.pizza/',
    notes: 'CC0 low-poly. Animation quality varies.',
    talk: 'Inspect before shipping',
  },
  {
    name: 'OpenGameArt',
    url: 'https://opengameart.org/',
    notes: 'Mixed licenses — read each page.',
    talk: 'Varies',
  },
];

console.log('\n=== Free rigged animal sources ===\n');
for (const s of sites) {
  console.log(`• ${s.name}`);
  console.log(`  ${s.url}`);
  console.log(`  ${s.notes}`);
  console.log(`  Clips: ${s.talk}\n`);
}
console.log('Drop files into: mobile/assets/characters/{id}.glb');
console.log('Register in: mobile/src/characters/characterCatalog.ts');
console.log('Full guide: mobile/docs/SOURCE_ANIMAL_MODELS.md\n');
