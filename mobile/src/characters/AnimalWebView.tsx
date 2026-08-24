import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { AnimalCharacterHandle, CharacterDef } from './types';
import { createAnimalIntent } from './animalCapabilities';
import { choreographyForSpecies } from './animalChoreography';
import {
  getSpeciesGrowthStagePresentation,
  type GrowthStage,
} from './growthStage';
import { animalPresentationFor } from './animalPresentation';
import { RABBIT_PROCEDURAL_MODEL } from './rabbitProceduralModel';
import { CAT_PROCEDURAL_MODEL } from './catProceduralModel';
import { colors } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  expressionA11yLabel,
  isQuietBand,
  type CompanionExpression,
} from '../companionMood';
import { PET_SCENES, type PetSceneId } from '../pets';

// Renderer selection is keyed by the declarative spec id; adding another
// procedural species only extends this registry and does not alter the build path.
const PROCEDURAL_MODEL_SPECS = [RABBIT_PROCEDURAL_MODEL, CAT_PROCEDURAL_MODEL] as const;

export type AnimalOutfit = {
  hat?: string;
  face?: string;
  neck?: string;
  held?: string;
  scene?: string;
};

type PendingAnimalCommand = {
  type: string;
  payload?: object;
};

type Props = {
  character: CharacterDef;
  /** Patient-safe visual chapter from the clinic backend. */
  growthStage?: GrowthStage;
  /** Presentation expression (positive–neutral only) */
  expression?: CompanionExpression;
  /** @deprecated prefer expression — maps happy|resting */
  mood?: CompanionExpression;
  style?: ViewStyle;
  onReady?: (handle: AnimalWebHandle) => void;
  muted?: boolean;
  accessibilityLabel?: string;
  /** Decorative outfit — bone-parented when the GLB has head/neck/hand bones */
  outfit?: AnimalOutfit;
};

export type AnimalWebHandle = AnimalCharacterHandle & {
  sleep: () => void;
  wake: () => void;
  wave: () => void;
  vocalize: () => void;
  setExpression: (expression: CompanionExpression) => void;
};

/**
 * Expo Go–friendly 3D viewer. Expressions: happy, resting, waving, excited, curious, sleepy.
 * Outfit meshes parent to Fox skeleton bones when present — never body-size changes.
 */
export const AnimalWebView = forwardRef<AnimalWebHandle, Props>(function AnimalWebView(
  {
    character,
    growthStage = 'baby',
    expression,
    mood = 'happy',
    style,
    onReady,
    muted = true,
    accessibilityLabel = 'Companion character',
    outfit,
  },
  ref
) {
  const webRef = useRef<WebView>(null);
  const reducedMotion = useReducedMotion();
  const active: CompanionExpression = expression || mood;
  const startQuiet = isQuietBand(active);
  const readyRef = useRef(false);
  const pendingCommandsRef = useRef<PendingAnimalCommand[]>([]);

  const html = useMemo(
    () => buildHtml(character, startQuiet, reducedMotion, growthStage),
    [
      character.id,
      character.modelPath,
      character.proceduralModel,
      character.clips.idle,
      character.clips.talk,
      character.clips.react,
      character.actions,
      character.rig,
      character.scale,
      growthStage,
      reducedMotion,
    ]
  );

  const send = (type: string, payload?: object) => {
    webRef.current?.injectJavaScript(
      `window.__kpCmd && window.__kpCmd(${JSON.stringify({ type, ...payload })}); true;`
    );
  };

  const post = (type: string, payload?: object) => {
    if (!readyRef.current) {
      pendingCommandsRef.current.push({ type, payload });
      return;
    }
    send(type, payload);
  };

  const markReady = () => {
    readyRef.current = true;
    const pending = pendingCommandsRef.current.splice(0);
    pending.forEach(({ type, payload }) => send(type, payload));
  };

  const handle: AnimalWebHandle = useMemo(
    () => ({
      dispatch: (intent) => post('dispatch', { intent }),
      speak: (audioUrl: string) => {
        // Legacy bridge: the React Native audio adapter owns playback.
        post('speak', { audioUrl: audioUrl || '' });
      },
      stopSpeaking: () => post('stop'),
      react: () =>
        post('dispatch', {
          intent: createAnimalIntent(reducedMotion ? 'gentle' : 'play'),
        }),
      sleep: () => post('setExpression', { expression: 'sleepy' }),
      wake: () => post('setExpression', { expression: 'happy' }),
      wave: () => post('dispatch', { intent: createAnimalIntent('wave') }),
      vocalize: () => post('dispatch', { intent: createAnimalIntent('talk') }),
      setExpression: (next: CompanionExpression) => post('setExpression', { expression: next }),
    }),
    [muted, reducedMotion]
  );

  useImperativeHandle(ref, () => handle, [handle]);

  useEffect(() => {
    readyRef.current = false;
    pendingCommandsRef.current = [];
    return () => {
      readyRef.current = false;
      pendingCommandsRef.current = [];
    };
  }, [character.id, character.modelPath, character.proceduralModel, growthStage, reducedMotion]);

  useEffect(() => {
    onReady?.(handle);
  }, [handle, onReady, character.id]);

  useEffect(() => {
    post('setMuted', { muted: Boolean(muted) });
  }, [muted, character.id]);

  useEffect(() => {
    post('setReducedMotion', { on: Boolean(reducedMotion) });
  }, [reducedMotion, character.id]);

  useEffect(() => {
    post('setExpression', { expression: active });
  }, [active, character.id]);

  useEffect(() => {
    post('setOutfit', {
      hat: outfit?.hat || 'none',
      face: outfit?.face || 'none',
      neck: outfit?.neck || 'none',
      held: outfit?.held || 'none',
      scene: outfit?.scene || 'sky',
    });
  }, [
    outfit?.hat,
    outfit?.face,
    outfit?.neck,
    outfit?.held,
    outfit?.scene,
    character.id,
  ]);

  const onMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg?.type === 'ready') {
        markReady();
        post('setOutfit', {
          hat: outfit?.hat || 'none',
          face: outfit?.face || 'none',
          neck: outfit?.neck || 'none',
          held: outfit?.held || 'none',
          scene: outfit?.scene || 'sky',
        });
        post('setExpression', { expression: active });
      }
    } catch {
      /* ignore */
    }
  };

  if (!character.modelPath && !character.proceduralModel) {
    return (
      <View
        style={[styles.wrap, style, styles.empty]}
        accessible
        accessibilityLabel={`${accessibilityLabel}, model unavailable`}
      />
    );
  }

  return (
    <View
      style={[styles.wrap, style]}
      accessible
      accessibilityLabel={expressionA11yLabel(accessibilityLabel, active)}
      accessibilityRole="image"
    >
      <WebView
        key={`${character.proceduralModel || character.modelPath}-${growthStage}`}
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://cdn.jsdelivr.net/' }}
        style={styles.web}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </View>
  );
});

function sceneFill(sceneId?: string) {
  const hit = PET_SCENES.find((s) => s.id === (sceneId as PetSceneId));
  return hit?.fill || '#F7F4EF';
}

function buildHtml(
  character: CharacterDef,
  startQuiet: boolean,
  reducedMotion: boolean,
  growthStage: GrowthStage = 'baby'
) {
  const proceduralModel = character.proceduralModel
    ? PROCEDURAL_MODEL_SPECS.find(({ id }) => id === character.proceduralModel) || null
    : null;
  const modelPath = JSON.stringify(character.modelPath || '');
  const idle = JSON.stringify(character.clips.idle);
  const talk = JSON.stringify(character.clips.talk);
  const react = JSON.stringify(character.clips.react);
  const actionCandidates = JSON.stringify(character.actions || {});
  const rigHints = JSON.stringify(character.rig || {});
  const choreography = JSON.stringify(choreographyForSpecies(character.id));
  const scale = character.scale ?? 1;
  const growth = getSpeciesGrowthStagePresentation(growthStage, character.id);
  const growthChannels = growth.channels || {
    body: growth.proportions.bodyScale,
    head: growth.proportions.headScale,
    muzzle: growth.proportions.headScale,
    neck: 1,
    legs: 1,
    wings: 1,
    ears: 1,
    tail: 1,
    eyes: 1,
  };
  const animal = animalPresentationFor(character.id);
  const bgAwake = proceduralModel?.framing.background || '#F7F4EF';
  const bgSleep = proceduralModel ? '#D5E1E5' : '#E4EBF2';
  const bgExcited = proceduralModel ? '#E1E7D9' : '#E8E4D8';
  const bgCurious = proceduralModel ? '#E3ECEF' : '#EEF2F0';
  const groundColor = proceduralModel?.framing.ground || '#D6DDE2';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html,body{margin:0;height:100%;background:${startQuiet ? bgSleep : bgAwake};overflow:hidden;touch-action:none}
  canvas{display:block;width:100%;height:100%}
  #hud{position:absolute;left:10px;top:8px;right:10px;font:500 11px/1.35 system-ui,sans-serif;color:#4F5B57;z-index:2;pointer-events:none;opacity:0.55}
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.152.2/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.152.2/examples/jsm/"
  }
}
</script>
</head>
<body>
<div id="hud" aria-hidden="true"></div>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const MODEL = ${modelPath};
const SPECIES_ID = ${JSON.stringify(character.id)};
const WANT_IDLE = ${idle};
const WANT_TALK = ${talk};
const WANT_REACT = ${react};
const ACTION_CANDIDATES = ${actionCandidates};
const RIG_HINTS = ${rigHints};
const CHOREOGRAPHY = ${choreography};
const MODEL_SCALE = ${scale};
const GROWTH_SCALE = ${growth.scale};
const GROWTH_POSITION = ${JSON.stringify(growth.position)};
const GROWTH_BODY_SCALE = ${JSON.stringify(growthChannels.body)};
const GROWTH_HEAD_SCALE = ${growthChannels.head};
const GROWTH_CHANNELS = ${JSON.stringify(growthChannels)};
const ANIMAL = ${JSON.stringify(animal)};
const PROCEDURAL_MODEL = ${JSON.stringify(proceduralModel)};
const IS_PROCEDURAL = Boolean(PROCEDURAL_MODEL);
const GROUND_COLOR = ${JSON.stringify(groundColor)};
let expression = ${startQuiet ? "'resting'" : "'happy'"};
let quiet = ${startQuiet ? 'true' : 'false'};
let reducedMotion = ${reducedMotion ? 'true' : 'false'};
let muted = true;
let animToken = 0;
const hud = document.getElementById('hud');

const BG = {
  happy: '${bgAwake}',
  resting: '${bgSleep}',
  sleepy: '${bgSleep}',
  curious: '${bgCurious}',
  waving: '${bgAwake}',
  excited: '${bgExcited}',
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(BG[expression] || '${bgAwake}');

const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = !reducedMotion;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const LIGHTING = ANIMAL.visual?.lighting || { key: 1.4, fill: 0.72, rim: 0.48 };
scene.add(new THREE.HemisphereLight(0xfff8ee, 0x8fa39c, 1.35));
const key = new THREE.DirectionalLight(0xfff2df, LIGHTING.key);
key.position.set(4.5, 7, 5);
key.castShadow = !reducedMotion;
key.shadow.mapSize.set(768, 768);
key.shadow.bias = -0.0008;
scene.add(key);
const fill = new THREE.DirectionalLight(0xc9dce3, LIGHTING.fill);
fill.position.set(-4, 3, 2);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xffd8bd, LIGHTING.rim);
rim.position.set(1, 4, -5);
scene.add(rim);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.5, 96),
  new THREE.MeshStandardMaterial({ color: GROUND_COLOR, transparent: true, opacity: 0.34, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minPolarAngle = Math.PI * 0.3;
controls.maxPolarAngle = Math.PI * 0.62;
controls.minDistance = 0.5;
controls.maxDistance = 40;
controls.enableZoom = !reducedMotion;

let mixer = null;
let actions = {};
let current = null;
let talking = false;
let root = null;
let modelSize = new THREE.Vector3(1, 1, 1);
const clock = new THREE.Clock();
let clipNames = [];
let baseQuat = new THREE.Quaternion();
let basePos = new THREE.Vector3();
let boneByName = {};
let morphByName = {};
let eyeMeshes = [];
let hasSkeleton = false;
let outfitState = { hat: 'none', face: 'none', neck: 'none', held: 'none', scene: 'sky' };
const acc = { hat: null, face: null, neck: null, held: null };
let proceduralOverlay = null;
let proceduralSequence = 0;
let idleOffsets = {};

function easeSoft(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function isQuietExpr(e) {
  return e === 'resting' || e === 'sleepy' || e === 'curious';
}

function applySpeciesMaterial(object) {
  if (IS_PROCEDURAL) {
    object.traverse((mesh) => {
      if (!mesh.isMesh) return;
      mesh.castShadow = !reducedMotion;
      mesh.receiveShadow = true;
    });
    return;
  }
  const direction = ANIMAL.material;
  const visual = ANIMAL.visual?.surface || {};
  if (!direction?.tint) return;
  const tint = new THREE.Color(direction.tint);
  object.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.material) return;
    mesh.castShadow = !reducedMotion;
    mesh.receiveShadow = true;
    const geometry = mesh.geometry;
    if (visual.smoothNormals && geometry?.isBufferGeometry && geometry.attributes?.position) {
      geometry.computeVertexNormals();
      geometry.normalizeNormals();
    }
    const tune = (source) => {
      const material = source.clone();
      if (material.color && !material.vertexColors) {
        material.color.lerp(tint, Math.min(direction.strength || 0, 0.18));
      }
      if ('roughness' in material) material.roughness = visual.roughness ?? direction.roughness;
      if ('metalness' in material) material.metalness = visual.metalness ?? 0;
      if ('clearcoat' in material) material.clearcoat = visual.clearcoat ?? 0;
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.32;
      if ('flatShading' in material) material.flatShading = false;
      if (material.map) {
        material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
      }
      material.needsUpdate = true;
      return material;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(tune)
      : tune(mesh.material);
  });
}

function eyeAliasKey(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function indexEyeMeshes(object) {
  const aliases = new Set([
    'eye', 'eyes', 'eyel', 'eyer', 'leye', 'reye',
    'left-eye', 'right-eye', 'left_eye', 'right_eye',
    'pupil', 'pupill', 'pupilr',
  ].map(eyeAliasKey));
  const declared = new Set([
    ...(Array.isArray(RIG_HINTS.eye) ? RIG_HINTS.eye : []),
    ...(Array.isArray(PROCEDURAL_MODEL?.parts)
      ? PROCEDURAL_MODEL.parts.filter((part) => part.material === 'eye').map((part) => part.name)
      : []),
  ].map(eyeAliasKey));
  eyeMeshes = [];
  object.traverse((mesh) => {
    if (!mesh.isMesh || !mesh.name) return;
    const normalized = eyeAliasKey(mesh.name);
    if (aliases.has(normalized) || declared.has(normalized)) eyeMeshes.push(mesh);
  });
}

function applyEyeProfile() {
  const eyes = ANIMAL.visual?.eyes;
  if (!eyes) return;
  const growthScale = Number(GROWTH_CHANNELS?.eyes || 1);
  const totalScale = Number(eyes.scale || 1) * growthScale;
  eyeMeshes.forEach((mesh) => {
    if (totalScale !== 1) mesh.scale.multiplyScalar(totalScale);
    const polish = (source) => {
      if (!source) return source;
      const material = source.clone ? source.clone() : source;
      if (eyes.color && material.color) material.color.set(eyes.color);
      if ('roughness' in material) material.roughness = eyes.roughness;
      if ('clearcoat' in material) material.clearcoat = eyes.highlight;
      if ('clearcoatRoughness' in material) material.clearcoatRoughness = 0.12;
      material.needsUpdate = true;
      return material;
    };
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map(polish)
      : polish(mesh.material);
  });
}

function proceduralMaterial(spec) {
  return new THREE.MeshPhysicalMaterial({
    color: spec.color,
    roughness: spec.roughness,
    metalness: spec.metalness,
    clearcoat: spec.clearcoat,
    clearcoatRoughness: 0.28,
    flatShading: Boolean(spec.flatShading),
  });
}

function proceduralGeometry(part) {
  const segments = Math.max(6, Number(part.segments) || 32);
  const rings = Math.max(4, Math.floor(segments * 0.72));
  const primitive = String(part.primitive);
  if (primitive === 'capsule') {
    return new THREE.CapsuleGeometry(0.5, 1, Math.max(6, Math.floor(segments / 8)), segments);
  }
  if (primitive === 'cylinder') {
    return new THREE.CylinderGeometry(1, 1, 2, segments, 1, false);
  }
  if (primitive === 'cone') {
    return new THREE.ConeGeometry(1, 2, segments, 1);
  }
  if (primitive === 'polyhedron') {
    return new THREE.DodecahedronGeometry(1, 0);
  }
  if (primitive === 'box') {
    return new THREE.BoxGeometry(2, 2, 2);
  }
  if (primitive === 'wedge') {
    const geometry = new THREE.CylinderGeometry(0.46, 1, 2, 4, 1, false, Math.PI / 4);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }
  return new THREE.SphereGeometry(1, segments, rings);
}

/** Turn any renderer-neutral procedural spec into named smooth pivot nodes. */
function buildProceduralModel(spec) {
  const nodes = {};
  (spec?.parts || []).forEach((part) => {
    const node = part.primitive === 'group' ? new THREE.Group() : new THREE.Bone();
    node.name = part.name;
    node.position.set(
      Number(part.position?.[0] || 0) + Number(part.pivot?.[0] || 0),
      Number(part.position?.[1] || 0) + Number(part.pivot?.[1] || 0),
      Number(part.position?.[2] || 0) + Number(part.pivot?.[2] || 0)
    );
    node.rotation.set(
      Number(part.rotation?.[0] || 0),
      Number(part.rotation?.[1] || 0),
      Number(part.rotation?.[2] || 0)
    );
    node.userData.proceduralPart = part.name;
    node.userData.pivot = [...(part.pivot || [0, 0, 0])];
    nodes[part.name] = node;
  });
  (spec?.parts || []).forEach((part) => {
    const node = nodes[part.name];
    const parent = part.parent ? nodes[part.parent] : null;
    if (node && parent) parent.add(node);
  });
  (spec?.parts || []).forEach((part) => {
    if (!part.material || !nodes[part.name]) return;
    const mesh = new THREE.Mesh(proceduralGeometry(part), proceduralMaterial(spec.materials[part.material]));
    mesh.name = part.name;
    mesh.position.set(
      -Number(part.pivot?.[0] || 0),
      -Number(part.pivot?.[1] || 0),
      -Number(part.pivot?.[2] || 0)
    );
    mesh.scale.set(
      Number(part.scale?.[0] || 1),
      Number(part.scale?.[1] || 1),
      Number(part.scale?.[2] || 1)
    );
    mesh.castShadow = !reducedMotion;
    mesh.receiveShadow = true;
    nodes[part.name].add(mesh);
  });
  return nodes[spec?.root] || nodes.RabbitRoot || new THREE.Group();
}

function resolveName(wanted) {
  if (!wanted) return null;
  if (actions[wanted]) return wanted;
  const lower = String(wanted).toLowerCase();
  return clipNames.find((n) => n.toLowerCase() === lower) || null;
}

function actionCandidates(action) {
  const legacy = {
    idle: WANT_IDLE,
    talk: WANT_TALK,
    wave: WANT_TALK,
    play: WANT_REACT,
    curious: WANT_TALK,
    gentle: WANT_IDLE,
  }[action];
  const defaults = {
    idle: ['Idle', 'idle', 'Standing'],
    talk: ['Talk', 'talk', 'Eat', 'Bark'],
    wave: ['Wave', 'wave', 'Gesture'],
    play: ['Play', 'play', 'Jump', 'Run', 'Attack'],
    curious: ['Curious', 'curious', 'Survey'],
    gentle: ['Gentle', 'gentle', 'Idle', 'Standing'],
  }[action] || [];
  return [...new Set([...(ACTION_CANDIDATES[action] || []), legacy, ...defaults].filter(Boolean))];
}

function resolveSemanticClip(action) {
  for (const candidate of actionCandidates(action)) {
    const resolved = resolveName(candidate);
    if (resolved) return resolved;
  }
  return null;
}

function pickFallback(prefer) {
  return resolveName(prefer);
}

function playClip(wanted, { loop = true, fade = 0.55, speed = 1 } = {}) {
  const name = pickFallback(wanted);
  if (!name || !actions[name]) {
    return null;
  }
  const next = actions[name];
  Object.values(actions).forEach((a) => {
    if (a !== next) a.fadeOut(fade);
  });
  next.reset();
  next.enabled = true;
  next.setEffectiveWeight(1);
  next.setEffectiveTimeScale(speed);
  next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
  next.clampWhenFinished = !loop;
  next.fadeIn(fade).play();
  current = next;
  return next;
}

function playSemanticClip(action, options = {}) {
  const name = resolveSemanticClip(action);
  return name ? playClip(name, options) : null;
}

function idleSpeed() {
  if (reducedMotion) return 0;
  if (expression === 'sleepy') return 0.22;
  if (expression === 'curious') return 0.38;
  if (expression === 'excited') return 0.55;
  if (quiet) return 0.28;
  return 0.48;
}

function setBackground(e) {
  const c = BG[e] || BG.happy;
  scene.background = new THREE.Color(c);
  document.body.style.background = c;
}

function applyQuietPose() {
  if (!root) return;
  // Rest belongs in the face, head, ears, tail, and animation speed. Rotating
  // the planted root made every sleepy companion look as if it were falling.
  root.quaternion.copy(baseQuat);
}

function goBaseIdle() {
  cancelProcedural();
  talking = false;
  quiet = isQuietExpr(expression);
  setBackground(expression);
  applyQuietPose(quiet, expression === 'sleepy');
  if (reducedMotion) {
    playSemanticClip('idle', { loop: true, speed: 0, fade: 0.8 });
    if (current) { current.paused = true; current.setEffectiveTimeScale(0); }
    return;
  }
  playSemanticClip('idle', { loop: true, speed: idleSpeed(), fade: 0.7 });
}

function softBob({ amp = 0.035, dur = 1600, yaw = 0, roll = 0, scalePulse = 0 } = {}) {
  if (!root) return;
  cancelProcedural();
  const token = ++animToken;
  const start = performance.now();
  const startY = root.position.y;
  const startYaw = root.rotation.y;
  const startRoll = root.rotation.z;
  const startScale = root.scale.clone();
  function step(now) {
    if (token !== animToken || !root) return;
    const t = Math.min(1, (now - start) / dur);
    const e = easeSoft(t);
    root.position.y = startY + Math.sin(e * Math.PI) * amp;
    if (yaw) root.rotation.y = startYaw + Math.sin(e * Math.PI * 2) * yaw;
    if (roll) root.rotation.z = startRoll + Math.sin(e * Math.PI * 2) * roll;
    if (scalePulse) {
      const pulse = 1 + Math.sin(e * Math.PI) * scalePulse;
      root.scale.copy(startScale).multiplyScalar(pulse);
    }
    if (t < 1) requestAnimationFrame(step);
    else {
      root.position.y = startY;
      root.rotation.y = startYaw;
      root.rotation.z = startRoll;
      root.scale.copy(startScale);
    }
  }
  requestAnimationFrame(step);
}

function doReactGentle() {
  const m = ANIMAL.actions.gentle;
  if (reducedMotion) {
    return softBob({ amp: 0.01, dur: m.durationMs, yaw: 0, roll: 0, scalePulse: 0 });
  }
  const state = beginProcedural('gentle', m.durationMs);
  if (!state || !Object.keys(state.bones).length) {
    return softBob({ amp: m.amp, dur: m.durationMs, yaw: 0, roll: 0, scalePulse: m.scalePulse });
  }
  scheduleProceduralIdle(state, m.durationMs + 80);
}

function doWaveGreeting() {
  if (reducedMotion) return doReactGentle();
  const m = ANIMAL.actions.wave;
  const state = beginProcedural('wave', m.durationMs);
  playSemanticClip('wave', { loop: false, speed: m.clipSpeed, fade: 0.65 });
  if (!state) return;
  scheduleProceduralIdle(state, m.durationMs + 100, () => {
    if (expression === 'waving') goBaseIdle();
  });
}

function doExcited() {
  quiet = false;
  applyQuietPose(false);
  setBackground('excited');
  if (reducedMotion) return softBob({ amp: 0.03, dur: 1800, scalePulse: 0.02 });
  const m = ANIMAL.actions.play;
  const state = beginProcedural('play', m.durationMs);
  playSemanticClip('play', { loop: false, speed: m.clipSpeed, fade: 0.5 });
  if (!state) return;
  scheduleProceduralIdle(state, m.durationMs + 100, () => {
    if (expression === 'excited') goBaseIdle();
  });
}

function doCurious() {
  quiet = true;
  applyQuietPose(true, false);
  setBackground('curious');
  if (reducedMotion) return;
  const m = ANIMAL.actions.curious;
  const state = beginProcedural('curious', m.durationMs);
  playSemanticClip('curious', { loop: true, speed: m.clipSpeed, fade: 0.7 });
  if (!state || !Object.keys(state.bones).length) {
    softBob({ amp: m.amp, dur: m.durationMs, yaw: 0, roll: 0, scalePulse: m.scalePulse });
    return;
  }
  scheduleProceduralIdle(state, m.durationMs + 100, () => {
    if (expression === 'curious') playSemanticClip('idle', { loop: true, speed: idleSpeed(), fade: 0.7 });
  });
}

function doSleepy() {
  cancelProcedural();
  quiet = true;
  talking = false;
  applyQuietPose(true, true);
  setBackground('sleepy');
  playSemanticClip('idle', { loop: true, speed: reducedMotion ? 0 : 0.22, fade: 0.8 });
  softBob({ amp: 0.018, dur: 2400, scalePulse: 0.025 });
}

function doResting() {
  cancelProcedural();
  quiet = true;
  talking = false;
  applyQuietPose(true, false);
  setBackground('resting');
  playSemanticClip('idle', { loop: true, speed: reducedMotion ? 0 : 0.28, fade: 0.8 });
}

function doHappy() {
  quiet = false;
  applyQuietPose(false);
  setBackground('happy');
  goBaseIdle();
}

function setExpression(next) {
  const allowed = ['happy','resting','waving','excited','curious','sleepy'];
  if (!allowed.includes(next)) return;
  expression = next;
  if (next === 'waving') return doWaveGreeting();
  if (next === 'excited') return doExcited();
  if (next === 'curious') return doCurious();
  if (next === 'sleepy') return doSleepy();
  if (next === 'resting') return doResting();
  return doHappy();
}

function doReact() {
  if (talking || reducedMotion) return doReactGentle();
  quiet = false;
  applyQuietPose(false);
  setBackground('excited');
  const m = ANIMAL.actions.play;
  const state = beginProcedural('play', m.durationMs);
  playSemanticClip('play', { loop: false, speed: m.clipSpeed, fade: 0.6 });
  if (!state) return doReactGentle();
  scheduleProceduralIdle(state, m.durationMs + 100);
}

function doAnimalTalk(durationMs = 0) {
  const m = ANIMAL.actions.gentle;
  const duration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : m.durationMs;
  talking = true;
  quiet = false;
  applyQuietPose(false);
  setBackground('happy');
  const state = beginProcedural('talk', duration);
  playSemanticClip('talk', { loop: false, speed: m.clipSpeed, fade: 0.55 });
  if (!reducedMotion) {
    if (!state || (!Object.keys(state.bones).length && !state.morph)) {
      softBob({ amp: m.amp, dur: duration, yaw: 0, roll: 0, scalePulse: m.scalePulse });
    } else {
      scheduleProceduralIdle(state, duration + 180, () => {
        talking = false;
        goBaseIdle();
      });
    }
  }
  if (!state || (!Object.keys(state.bones).length && !state.morph)) setTimeout(() => {
    talking = false;
    goBaseIdle();
  }, duration + 180);
}

function doSpeak(durationMs = 0) {
  // Legacy bridge only: Expo Audio owns playback in the React Native layer.
  doAnimalTalk(durationMs);
}

/* ——— Bone-attached decorative accessories (Fox skeleton) ——— */
function indexBones(object) {
  boneByName = {};
  hasSkeleton = false;
  object.traverse((o) => {
    if (o.isSkinnedMesh && o.skeleton) {
      o.skeleton.bones.forEach((b) => {
        boneByName[b.name] = b;
        hasSkeleton = true;
      });
    }
    if (o.isBone) {
      boneByName[o.name] = o;
      hasSkeleton = true;
    }
  });
}

function indexMorphs(object) {
  morphByName = {};
  object.traverse((o) => {
    if (!o.isMesh || !o.morphTargetDictionary || !o.morphTargetInfluences) return;
    Object.entries(o.morphTargetDictionary).forEach(([name, index]) => {
      morphByName[name] = { mesh: o, index: Number(index) };
    });
  });
}

function findBone(candidates) {
  const names = Array.isArray(candidates) ? candidates : [];
  for (const n of names) {
    if (boneByName[n]) return boneByName[n];
  }
  for (const n of names) {
    const lower = String(n).toLowerCase();
    const exact = Object.entries(boneByName).find(([name]) => name.toLowerCase() === lower);
    if (exact) return exact[1];
  }
  for (const n of names) {
    const lower = String(n).toLowerCase();
    const loose = Object.entries(boneByName).find(([name]) => name.toLowerCase().includes(lower));
    if (loose) return loose[1];
  }
  return null;
}

function findRigBone(slot, fallbackPattern) {
  return findRigBones(slot, fallbackPattern)[0] || null;
}

/** Resolve every matching channel so both wings and every tail segment move. */
function findRigBones(slot, fallbackPattern) {
  const names = Array.isArray(RIG_HINTS[slot]) ? RIG_HINTS[slot] : [];
  const hits = [];
  const add = (bone) => {
    if (bone && !hits.includes(bone)) hits.push(bone);
  };
  names.forEach((wanted) => {
    add(boneByName[wanted]);
    const lower = String(wanted).toLowerCase();
    Object.entries(boneByName).forEach(([name, bone]) => {
      if (name.toLowerCase() === lower) add(bone);
    });
  });
  names.forEach((wanted) => {
    const lower = String(wanted).toLowerCase();
    Object.entries(boneByName).forEach(([name, bone]) => {
      if (name.toLowerCase().includes(lower)) add(bone);
    });
  });
  Object.entries(boneByName).forEach(([name, bone]) => {
    if (fallbackPattern.test(name)) add(bone);
  });
  return hits;
}

function findMorph(candidates, fallbackPattern) {
  const names = Array.isArray(candidates) ? candidates : [];
  for (const n of names) {
    if (morphByName[n]) return morphByName[n];
  }
  for (const n of names) {
    const lower = String(n).toLowerCase();
    const exact = Object.entries(morphByName).find(([name]) => name.toLowerCase() === lower);
    if (exact) return exact[1];
  }
  return Object.entries(morphByName).find(([name]) => fallbackPattern.test(name))?.[1] || null;
}

function findProceduralActionBones(action, slot) {
  const actionNames = PROCEDURAL_MODEL?.actionTargets?.[action];
  const anchorNames = PROCEDURAL_MODEL?.motionAnchors?.[slot];
  if (!Array.isArray(actionNames) || !Array.isArray(anchorNames)) return [];
  const anchorSet = new Set(anchorNames);
  return [...new Set(
    actionNames
      .filter((name) => anchorSet.has(name))
      .map((name) => boneByName[name])
      .filter(Boolean)
  )];
}

function proceduralTargets(action) {
  const slots = {};
  const add = (slot, pattern, limit = Infinity) => {
    const named = findProceduralActionBones(action, slot);
    const bones = (named.length ? named : findRigBones(slot, pattern)).slice(0, limit);
    if (bones.length) slots[slot] = bones;
  };
  if (action === 'talk') {
    add('head', /head|neck/i);
    add('jaw', /jaw|mouth/i);
    add('beak', /beak|bill|mouth/i);
  } else if (action === 'wave') {
    add('forelimb', /fore|front|arm|leg/i, 1);
    if (CHOREOGRAPHY.wave?.channels.some((intent) => intent.target === 'wing')) {
      add('wing', /wing|flap|arm/i);
    }
    if (CHOREOGRAPHY.wave?.channels.some((intent) => intent.target === 'flipper')) {
      add('flipper', /flipper|wing|flap|arm/i);
    }
    add('head', /head|neck/i);
    add('ear', /ear/i);
    add('tail', /tail/i);
  } else if (action === 'play') {
    add('head', /head|neck/i);
    add('forelimb', /fore|front|arm|leg/i);
    if (CHOREOGRAPHY.play?.channels.some((intent) => intent.target === 'wing')) {
      add('wing', /wing|flap|arm/i);
    }
    if (CHOREOGRAPHY.play?.channels.some((intent) => intent.target === 'flipper')) {
      add('flipper', /flipper|wing|flap|arm/i);
    }
    add('tail', /tail/i);
  } else if (action === 'curious' || action === 'gentle') {
    add('head', /head|neck/i);
    add('tail', /tail/i);
  }
  const morph = action === 'talk'
    ? findMorph(RIG_HINTS.talkMorphs, /mouth|jaw|beak|viseme/i)
    : null;
  return { slots, morph };
}

function restoreProcedural(state) {
  if (!state) return;
  Object.values(state.bones).flat().forEach((entry) => {
    entry.bone.position.copy(entry.position);
    entry.bone.rotation.copy(entry.rotation);
    entry.bone.scale.copy(entry.scale);
  });
  if (state.morph) {
    state.morph.mesh.morphTargetInfluences[state.morph.index] = state.morph.influence;
  }
  if (root) {
    root.position.copy(state.rootPosition);
    root.scale.copy(state.rootScale);
    root.quaternion.copy(state.rootQuaternion);
  }
}

function cancelProcedural() {
  restoreProcedural(proceduralOverlay);
  proceduralOverlay = null;
}

function beginProcedural(action, durationMs, loop = false) {
  cancelProcedural();
  if (reducedMotion || !root) return null;
  const targets = proceduralTargets(action);
  const bones = {};
  Object.entries(targets.slots).forEach(([slot, targetBones]) => {
    bones[slot] = targetBones.map((bone) => ({
      bone,
      position: bone.position.clone(),
      rotation: bone.rotation.clone(),
      scale: bone.scale.clone(),
    }));
  });
  const state = {
    token: ++proceduralSequence,
    action,
    startedAt: performance.now(),
    durationMs: Math.max(1, durationMs || 1),
    loop,
    bones,
    morph: targets.morph
      ? {
          ...targets.morph,
          influence: targets.morph.mesh.morphTargetInfluences[targets.morph.index] || 0,
        }
      : null,
    rootPosition: root.position.clone(),
    rootScale: root.scale.clone(),
    rootQuaternion: root.quaternion.clone(),
  };
  proceduralOverlay = state;
  return state;
}

function setProceduralRotation(entry, x = 0, y = 0, z = 0) {
  if (!entry) return;
  entry.bone.rotation.copy(entry.rotation);
  entry.bone.rotation.x += x;
  entry.bone.rotation.y += y;
  entry.bone.rotation.z += z;
}

function setProceduralChannel(state, target, vector, intent) {
  const entries = state.bones[target] || [];
  entries.forEach((entry, index) => {
    let multiplier = 1;
    if (intent?.mirrored && entries.length > 1 && index % 2 === 1) multiplier = -1;
    // A segmented tail follows the lead segment with a slightly softer reach.
    if (target === 'tail') multiplier *= Math.max(0.58, 1 - index * 0.11);
    setProceduralRotation(
      entry,
      vector.x * multiplier,
      vector.y * multiplier,
      vector.z * multiplier
    );
  });
}

function interpolateChoreography(profile, t) {
  const samples = Array.isArray(profile?.samples) ? profile.samples : [];
  if (!samples.length) {
    return { root: { x: 0, y: 0, z: 0, lift: 0, yaw: 0, roll: 0, scaleY: 1 }, channels: {} };
  }
  const scaled = Math.max(0, Math.min(1, t)) * (samples.length - 1);
  const lowIndex = Math.floor(scaled);
  const highIndex = Math.min(samples.length - 1, lowIndex + 1);
  const amount = scaled - lowIndex;
  const low = samples[lowIndex] || samples[0];
  const high = samples[highIndex] || low;
  const lerp = (a, b) => a + (b - a) * amount;
  const rootSample = {};
  ['x', 'y', 'z', 'lift', 'yaw', 'roll', 'scaleY'].forEach((key) => {
    rootSample[key] = lerp(Number(low.root?.[key] || 0), Number(high.root?.[key] || 0));
  });
  const channels = {};
  const names = new Set([
    ...Object.keys(low.channels || {}),
    ...Object.keys(high.channels || {}),
  ]);
  names.forEach((name) => {
    const a = low.channels?.[name] || { x: 0, y: 0, z: 0 };
    const b = high.channels?.[name] || a;
    channels[name] = {
      x: lerp(Number(a.x || 0), Number(b.x || 0)),
      y: lerp(Number(a.y || 0), Number(b.y || 0)),
      z: lerp(Number(a.z || 0), Number(b.z || 0)),
    };
  });
  return { root: rootSample, channels };
}

function applyProceduralOverlay(now) {
  const state = proceduralOverlay;
  if (!state || !root) return;
  const elapsed = now - state.startedAt;
  if (!state.loop && elapsed >= state.durationMs) {
    if (!state.finished) {
      restoreProcedural(state);
      state.finished = true;
    }
    return;
  }
  const t = state.loop
    ? (elapsed % state.durationMs) / state.durationMs
    : Math.max(0, Math.min(1, elapsed / state.durationMs));
  Object.values(state.bones).flat().forEach((entry) => {
    entry.bone.position.copy(entry.position);
    entry.bone.rotation.copy(entry.rotation);
    entry.bone.scale.copy(entry.scale);
  });

  if (state.action === 'wave' || state.action === 'play') {
    // Authored clips are allowed to animate appendages, never the planted root.
    // Restore the snapshot every frame so no clip or gesture can accumulate
    // sideways translation, yaw, or roll.
    const profile = CHOREOGRAPHY[state.action];
    const sample = reducedMotion
      ? { root: { x: 0, y: 0, z: 0, lift: 0, yaw: 0, roll: 0, scaleY: 1 }, channels: {} }
      : interpolateChoreography(profile, t);
    root.position.copy(state.rootPosition);
    root.position.y += Math.max(-profile.root.maxLift, Math.min(profile.root.maxLift, sample.root.lift || 0));
    root.scale.copy(state.rootScale);
    root.scale.y *= sample.root.scaleY || 1;
    root.quaternion.copy(state.rootQuaternion);
    profile.channels.forEach((intent) => {
      const vector = sample.channels[intent.target];
      if (vector) setProceduralChannel(state, intent.target, vector, intent);
    });
  }

  if (state.action === 'talk') {
    const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * 3);
    setProceduralChannel(state, 'jaw', { x: -0.04 - pulse * 0.14, y: 0, z: 0 });
    setProceduralChannel(state, 'beak', { x: -0.03 - pulse * 0.17, y: 0, z: 0 });
    setProceduralChannel(state, 'head', { x: Math.sin(t * Math.PI * 2 * 3) * 0.045, y: 0, z: 0 });
    if (state.morph) {
      state.morph.mesh.morphTargetInfluences[state.morph.index] = Math.min(
        1,
        state.morph.influence + pulse * 0.72
      );
    }
  } else if (state.action === 'curious') {
    const tilt = Math.sin(t * Math.PI * 2) * 0.2;
    setProceduralChannel(state, 'head', { x: 0, y: 0, z: tilt });
  } else if (state.action === 'gentle') {
    const nod = Math.sin(t * Math.PI * 2) * 0.06;
    setProceduralChannel(state, 'head', { x: nod, y: 0, z: nod * 0.35 });
    setProceduralChannel(state, 'tail', { x: 0, y: nod * 0.55, z: 0 });
  }
}

function applyIdleMicroMotion(now) {
  Object.values(idleOffsets).forEach((entry) => {
    entry.bone.rotation.x -= entry.x;
    entry.bone.rotation.y -= entry.y;
    entry.bone.rotation.z -= entry.z;
  });
  idleOffsets = {};
  if (reducedMotion || proceduralOverlay || talking || !root) return;
  const t = now * 0.001;
  const targets = {
    head: findRigBone('head', /head|neck/i),
    ear: findRigBone('ear', /ear/i),
    tail: findRigBone('tail', /tail/i),
  };
  const offsets = {
    head: { x: Math.sin(t * 1.6) * 0.012, y: 0, z: Math.cos(t * 1.1) * 0.008 },
    ear: { x: 0, y: 0, z: Math.sin(t * 1.8) * 0.018 },
    tail: { x: 0, y: Math.sin(t * 1.2) * 0.028, z: 0 },
  };
  Object.entries(targets).forEach(([slot, bone]) => {
    if (!bone) return;
    const offset = offsets[slot];
    bone.rotation.x += offset.x;
    bone.rotation.y += offset.y;
    bone.rotation.z += offset.z;
    idleOffsets[slot] = { bone, ...offset };
  });
}

function scheduleProceduralIdle(state, delayMs, callback = goBaseIdle) {
  if (!state) return;
  setTimeout(() => {
    if (proceduralOverlay?.token !== state.token) return;
    cancelProcedural();
    callback();
  }, delayMs);
}

function findProceduralBones(channel) {
  const names = PROCEDURAL_MODEL?.growthTargets?.[channel];
  if (!Array.isArray(names)) return [];
  return names.map((name) => boneByName[name]).filter(Boolean);
}

function growthChannelBones(channel, slot, fallbackPattern) {
  const procedural = findProceduralBones(channel);
  return procedural.length ? procedural : findRigBones(slot, fallbackPattern);
}

function applyGrowthProportions() {
  const roots = (bones) => {
    const unique = [];
    bones.forEach((bone) => {
      if (bone && !unique.includes(bone)) unique.push(bone);
    });
    return unique.filter((bone) => !unique.some((other) => other !== bone && isBoneDescendant(bone, other)));
  };
  const scaleRoots = (bones, multiplier) => {
    const raw = Number(multiplier);
    const value = Number.isFinite(raw) ? Math.min(1.12, Math.max(0.45, raw)) : 1;
    if (!Number.isFinite(value) || value === 1) return;
    roots(bones).forEach((bone) => bone.scale.multiplyScalar(value));
  };
  const head = findProceduralBones('head')[0] ||
    findBone(['Head', 'head', 'HeadBone', 'b_Head_05']) ||
    findRigBones('head', /^(head|b_head)/i)[0];
  if (head) scaleRoots([head], GROWTH_CHANNELS?.head ?? GROWTH_HEAD_SCALE);
  scaleRoots(growthChannelBones('muzzle', 'jaw', /jaw|muzzle|snout|mouth|bill|beak/i), GROWTH_CHANNELS?.muzzle);
  scaleRoots(growthChannelBones('neck', 'neck', /neck/i), GROWTH_CHANNELS?.neck);
  scaleRoots(growthChannelBones('legs', 'legs', /leg|thigh|shin|calf|hock|ankle|foot/i), GROWTH_CHANNELS?.legs);
  scaleRoots(growthChannelBones('wings', 'wing', /wing|flap/i), GROWTH_CHANNELS?.wings);
  scaleRoots(growthChannelBones('ears', 'ear', /ear/i), GROWTH_CHANNELS?.ears);
  scaleRoots(growthChannelBones('tail', 'tail', /tail/i), GROWTH_CHANNELS?.tail);
}

function isBoneDescendant(candidate, ancestor) {
  let current = candidate?.parent;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }
  return false;
}

function softMat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.05,
  });
}

function makeHat(kind) {
  const g = new THREE.Group();
  if (kind === 'beanie') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.58),
      softMat(0x6fae8f)
    );
    cap.rotation.x = Math.PI;
    cap.position.y = 0.35;
    const brim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.12, 10, 24), softMat(0x5F7A6B));
    brim.rotation.x = Math.PI / 2;
    brim.position.y = 0.2;
    g.add(cap, brim);
  } else if (kind === 'bow') {
    const m = softMat(0xE8A0A8);
    const L = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), m);
    const R = L.clone();
    L.position.x = -0.55; R.position.x = 0.55;
    L.scale.set(1, 0.7, 0.45); R.scale.set(1, 0.7, 0.45);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), softMat(0xD4848C));
    g.add(L, R, knot);
  } else if (kind === 'flower') {
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), softMat(0xF5E6A8));
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), softMat(0xF0C4C8));
      const a = (i / 5) * Math.PI * 2;
      p.position.set(Math.cos(a) * 0.55, 0.05, Math.sin(a) * 0.55);
      p.scale.set(1, 0.45, 1);
      g.add(p);
    }
    g.add(center);
  } else if (kind === 'crown_soft') {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.1, 8, 24), softMat(0xE8C48A));
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.15;
    g.add(band);
    for (let i = 0; i < 5; i++) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 6), softMat(0xF5E6A8));
      const a = (i / 5) * Math.PI * 2;
      tip.position.set(Math.cos(a) * 0.85, 0.4, Math.sin(a) * 0.85);
      g.add(tip);
    }
  } else {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.9, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), softMat(0xB8D9C4));
    cap.rotation.x = Math.PI;
    g.add(cap);
  }
  return g;
}

function makeFace(kind) {
  const g = new THREE.Group();
  if (kind === 'glasses') {
    const m = softMat(0x445566);
    const L = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 8, 16), m);
    const R = L.clone();
    L.position.x = -0.42; R.position.x = 0.42;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.06), m);
    g.add(L, R, bridge);
  }
  return g;
}

function makeScarf(kind) {
  const g = new THREE.Group();
  const color = kind === 'ribbon' ? 0xE8A0A8 : 0x6fae8f;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.22, 12, 28), softMat(color));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  if (kind === 'scarf') {
    const drape = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.9, 0.14), softMat(color));
    drape.position.set(0.55, -0.55, 0.1);
    drape.rotation.z = 0.2;
    g.add(drape);
  }
  return g;
}

function makeHeld(kind) {
  const g = new THREE.Group();
  if (kind === 'star') {
    g.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.45), softMat(0xF5E6A8)));
  } else if (kind === 'heart') {
    const m = softMat(0xE8A0A8);
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), m);
    const b = a.clone();
    a.position.set(-0.18, 0.12, 0); b.position.set(0.18, 0.12, 0);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.55, 8), m);
    tip.rotation.z = Math.PI; tip.position.y = -0.2;
    g.add(a, b, tip);
  } else if (kind === 'flower_stem') {
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), softMat(0x6fae8f));
    stem.position.y = 0.15;
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), softMat(0xF0C4C8));
    bloom.position.y = 0.65;
    g.add(stem, bloom);
  } else {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), softMat(0xE8C48A)));
  }
  return g;
}

function clearAcc(slot) {
  if (acc[slot]) {
    if (acc[slot].parent) acc[slot].parent.remove(acc[slot]);
    acc[slot] = null;
  }
}

/** Place accessory using small WORLD offsets so Fox root scale does not fling props into orbit. */
function attachWorld(slot, bone, mesh, worldOffset, worldSize) {
  clearAcc(slot);
  if (!bone || !mesh) return;
  bone.updateWorldMatrix(true, false);
  bone.add(mesh);

  const inv = new THREE.Matrix4().copy(bone.matrixWorld).invert();
  const bonePos = new THREE.Vector3();
  const boneQuat = new THREE.Quaternion();
  const boneScale = new THREE.Vector3();
  bone.matrixWorld.decompose(bonePos, boneQuat, boneScale);

  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(boneQuat).normalize();
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(boneQuat).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(boneQuat).normalize();

  const target = bonePos.clone()
    .addScaledVector(up, worldOffset.up || 0)
    .addScaledVector(forward, worldOffset.forward || 0)
    .addScaledVector(right, worldOffset.right || 0);

  mesh.position.copy(target).applyMatrix4(inv);
  const s = (worldSize || 0.12) / Math.max(boneScale.x, 1e-4);
  mesh.scale.setScalar(s);
  mesh.quaternion.identity();
  acc[slot] = mesh;
}

function applyOutfit(next) {
  outfitState = { ...outfitState, ...next };
  const fills = {
    sky: '#E8F0F6',
    sunny_meadow: '#C8E6D0',
    cozy_nook: '#E8D9F0',
    quiet_garden: '#D6E8F5',
    dusk: '#F0D8D0',
    cloudscape: '#F4F7FB',
    window: '#FFF0E0',
    lavender_field: '#E4D8F0',
  };
  if (outfitState.scene && fills[outfitState.scene]) {
    const c = fills[outfitState.scene];
    if (!isQuietExpr(expression)) {
      scene.background = new THREE.Color(c);
      document.body.style.background = c;
    }
  }

  if (!root) return;

  if (!hasSkeleton) {
    hud.textContent = '';
    clearAcc('hat'); clearAcc('face'); clearAcc('neck'); clearAcc('held');
    return;
  }
  hud.textContent = '';

  const head = findBone([
    ...(PROCEDURAL_MODEL?.accessoryAnchors?.head ? [PROCEDURAL_MODEL.accessoryAnchors.head] : []),
    'b_Head_05',
    ...(RIG_HINTS.head || []),
  ]);
  const neck = findBone([
    ...(PROCEDURAL_MODEL?.accessoryAnchors?.neck ? [PROCEDURAL_MODEL.accessoryAnchors.neck] : []),
    'b_Neck_04',
    ...(RIG_HINTS.neck || []),
  ]);
  const hand = findBone([
    ...(PROCEDURAL_MODEL?.accessoryAnchors?.forelimb ? [PROCEDURAL_MODEL.accessoryAnchors.forelimb] : []),
    'b_RightHand_08',
    ...(RIG_HINTS.forelimb || []),
  ]);

  if (outfitState.hat && outfitState.hat !== 'none' && head) {
    attachWorld('hat', head, makeHat(outfitState.hat), { up: 0.11, forward: 0.02 }, 0.13);
  } else clearAcc('hat');

  if (outfitState.face && outfitState.face !== 'none' && head) {
    attachWorld('face', head, makeFace(outfitState.face), { up: 0.02, forward: 0.1 }, 0.09);
  } else clearAcc('face');

  if (outfitState.neck && outfitState.neck !== 'none' && neck) {
    attachWorld('neck', neck, makeScarf(outfitState.neck), { up: -0.02, forward: 0.04 }, 0.11);
  } else clearAcc('neck');

  if (outfitState.held && outfitState.held !== 'none' && hand) {
    attachWorld('held', hand, makeHeld(outfitState.held), { up: 0.02, forward: 0.06 }, 0.08);
  } else clearAcc('held');
}

window.__kpCmd = (msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'react') doReact();
  if (msg.type === 'reactGentle') doReactGentle();
  if (msg.type === 'wave') setExpression('waving');
  if (msg.type === 'call') doAnimalTalk(msg.durationMs);
  if (msg.type === 'speak') doSpeak(msg.durationMs);
  if (msg.type === 'dispatch') {
    const intent = msg.intent;
    if (intent?.type === 'action') {
      if (intent.action === 'talk') doAnimalTalk(intent.durationMs);
      if (intent.action === 'play') doReact();
      if (intent.action === 'wave') setExpression('waving');
      if (intent.action === 'gentle') doReactGentle();
      if (intent.action === 'curious') setExpression('curious');
      if (intent.action === 'idle') goBaseIdle();
    }
  }
  if (msg.type === 'sleep') setExpression('sleepy');
  if (msg.type === 'wake') setExpression('happy');
  if (msg.type === 'setExpression') setExpression(msg.expression || 'happy');
  if (msg.type === 'setMuted') muted = Boolean(msg.muted);
  if (msg.type === 'setReducedMotion') {
    reducedMotion = Boolean(msg.on);
    controls.enableZoom = !reducedMotion;
    goBaseIdle();
  }
  if (msg.type === 'setOutfit') applyOutfit(msg);
  if (msg.type === 'stop') {
    animToken += 1;
    goBaseIdle();
  }
};

function frameFullBody(object, position = [0, 0, 0]) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  modelSize.copy(size);

  object.position.x += -center.x + (position[0] || 0);
  object.position.z += -center.z + (position[2] || 0);
  object.position.y += -box.min.y + (position[1] || 0);

  object.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(object);
  const size2 = box2.getSize(new THREE.Vector3());
  const midY = size2.y * 0.42 + (position[1] || 0);

  // CircleGeometry radius is 2.5 — scale so the pad matches the animal, not a huge fixed floor
  const desiredR = ANIMAL.framing?.groundRadius || Math.max(size2.x, size2.z, size2.y * 0.45) * 0.95 + 0.15;
  ground.position.y = 0.01;
  ground.scale.setScalar(desiredR / 2.5);

  const fit = ANIMAL.framing?.fit || Math.max(size2.x, size2.y, size2.z, 0.35);
  const dist = fit * 2.15;
  camera.position.set(dist * 0.9, midY + fit * 0.28, dist * 1.05);
  camera.near = Math.max(fit / 200, 0.01);
  camera.far = Math.max(fit * 80, 20);
  camera.updateProjectionMatrix();
  controls.target.set(0, midY, 0);
  controls.minDistance = fit * 0.7;
  controls.maxDistance = fit * 6;
  controls.update();
}

function initializeRoot(nextRoot, animations = []) {
  root = nextRoot;
  applySpeciesMaterial(root);
  root.scale.setScalar(1);
  scene.add(root);
  root.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(root);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const TARGET_H = 1.55;
  const norm = TARGET_H / Math.max(rawSize.y, 1e-4);
  const uniformScale = norm * (MODEL_SCALE || 1) * GROWTH_SCALE;
  root.scale.set(
    uniformScale * GROWTH_BODY_SCALE[0],
    uniformScale * GROWTH_BODY_SCALE[1],
    uniformScale * GROWTH_BODY_SCALE[2]
  );

  mixer = new THREE.AnimationMixer(root);
  actions = {};
  clipNames = [];
  (animations || []).forEach((clip) => {
    clipNames.push(clip.name);
    actions[clip.name] = mixer.clipAction(clip);
  });

  indexBones(root);
  indexMorphs(root);
  indexEyeMeshes(root);
  applyEyeProfile();
  applyGrowthProportions();
  frameFullBody(root, GROWTH_POSITION);
  baseQuat.copy(root.quaternion);
  basePos.copy(root.position);

  setExpression(expression);
  applyOutfit(outfitState);

  const readyPayload = JSON.stringify({
    type: 'ready',
    clips: clipNames,
    bones: Object.keys(boneByName),
    hasSkeleton,
  });
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(readyPayload);
  if (window.parent && window.parent !== window) window.parent.postMessage(readyPayload, '*');
}

if (IS_PROCEDURAL) {
  initializeRoot(buildProceduralModel(PROCEDURAL_MODEL), []);
} else {
  const loader = new GLTFLoader();
  loader.load(
    MODEL,
    (gltf) => initializeRoot(gltf.scene, gltf.animations || []),
    undefined,
    () => { hud.textContent = 'Could not load companion'; }
  );
}

function onResize() {
  const w = window.innerWidth, h = Math.max(window.innerHeight, 1);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', onResize);
onResize();

(function tick() {
  requestAnimationFrame(tick);
  const dt = clock.getDelta();
  if (mixer && !reducedMotion) mixer.update(dt);
  else if (mixer && reducedMotion) mixer.update(0);
  const now = performance.now();
  applyProceduralOverlay(now);
  applyIdleMicroMotion(now);
  controls.update();
  renderer.render(scene, camera);
})();
</script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    height: 360,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.cream,
  },
  web: { flex: 1, backgroundColor: 'transparent' },
  empty: { backgroundColor: colors.mist },
});
