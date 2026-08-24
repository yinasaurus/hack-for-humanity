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

test('all renderer adapters serialize and apply the same growth channel seam', () => {
  const sources = ADAPTERS.map(read);
  for (const source of sources) {
    assert.match(source, /const GROWTH_CHANNELS = \$\{JSON\.stringify\(growthChannels\)\}/);
    assert.match(source, /const GROWTH_BODY_SCALE = \$\{JSON\.stringify\(growthChannels\.body\)\}/);
    assert.match(source, /GROWTH_CHANNELS\?\.eyes/);
    assert.match(source, /source\.clone/);
    assert.match(source, /eyes\.color/);
    assert.match(source, /GROWTH_CHANNELS\?\.muzzle/);
    assert.match(source, /GROWTH_CHANNELS\?\.neck/);
    assert.match(source, /GROWTH_CHANNELS\?\.legs/);
    assert.match(source, /GROWTH_CHANNELS\?\.wings/);
    assert.match(source, /GROWTH_CHANNELS\?\.ears/);
    assert.match(source, /GROWTH_CHANNELS\?\.tail/);
    assert.match(source, /isBoneDescendant/);
  }

  const growthBodies = sources.map((source) => {
    const start = source.indexOf('function applyGrowthProportions()');
    const end = source.indexOf('function softMat(', start);
    assert.ok(start >= 0 && end > start);
    const body = source.slice(start, end).replace(/\s+/g, ' ');
    assert.doesNotMatch(body, /root\.(position|rotation)/, 'growth channels must not tip the planted root');
    return body;
  });
  assert.deepEqual(growthBodies[1], growthBodies[0], 'native growth seam drifted from shared adapter');
  assert.deepEqual(growthBodies[2], growthBodies[0], 'web growth seam drifted from shared adapter');
});

test('renderer growth application occurs once after model indexing', () => {
  for (const adapter of ADAPTERS) {
    const source = read(adapter);
    const index = source.indexOf('indexBones(root);');
    const apply = source.indexOf('applyGrowthProportions();', index);
    const frame = source.indexOf('frameFullBody(root', apply);
    assert.ok(index >= 0 && apply > index && frame > apply, `${adapter} growth ordering changed`);
    assert.equal(source.slice(apply).match(/applyGrowthProportions\(\);/g)?.length, 1);
  }
});
