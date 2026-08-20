import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { AnimalCharacterHandle, CharacterDef } from './types';
import { colors } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';
import {
  expressionA11yLabel,
  isQuietBand,
  type CompanionExpression,
} from '../companionMood';
import { PET_SCENES, type PetSceneId } from '../pets';

export type AnimalOutfit = {
  hat?: string;
  face?: string;
  neck?: string;
  held?: string;
  scene?: string;
};

type Props = {
  character: CharacterDef;
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
  setExpression: (expression: CompanionExpression) => void;
};

/**
 * Expo Go–friendly 3D viewer. Expressions: happy, resting, waving, excited, curious, sleepy.
 * Outfit meshes parent to Fox skeleton bones when present — never body-size changes.
 */
export const AnimalWebView = forwardRef<AnimalWebHandle, Props>(function AnimalWebView(
  {
    character,
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

  const html = useMemo(
    () => buildHtml(character, startQuiet, reducedMotion),
    [
      character.id,
      character.modelPath,
      character.clips.idle,
      character.clips.talk,
      character.clips.react,
      character.scale,
      reducedMotion,
    ]
  );

  const post = (type: string, payload?: object) => {
    webRef.current?.injectJavaScript(
      `window.__kpCmd && window.__kpCmd(${JSON.stringify({ type, ...payload })}); true;`
    );
  };

  const handle: AnimalWebHandle = useMemo(
    () => ({
      speak: (audioUrl: string) => {
        if (muted) {
          post('reactGentle');
          return;
        }
        post('speak', { audioUrl });
      },
      stopSpeaking: () => post('stop'),
      react: () => post(reducedMotion ? 'reactGentle' : 'react'),
      sleep: () => post('setExpression', { expression: 'sleepy' }),
      wake: () => post('setExpression', { expression: 'happy' }),
      wave: () => post('setExpression', { expression: 'waving' }),
      setExpression: (next: CompanionExpression) => post('setExpression', { expression: next }),
    }),
    [muted, reducedMotion]
  );

  useImperativeHandle(ref, () => handle, [handle]);

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
        readyRef.current = true;
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

  if (!character.modelPath) {
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
        key={character.modelPath}
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

function buildHtml(character: CharacterDef, startQuiet: boolean, reducedMotion: boolean) {
  const modelPath = JSON.stringify(character.modelPath);
  const idle = JSON.stringify(character.clips.idle);
  const talk = JSON.stringify(character.clips.talk);
  const react = JSON.stringify(character.clips.react);
  const scale = character.scale ?? 1;
  const bgAwake = '#F7F4EF';
  const bgSleep = '#E4EBF2';
  const bgExcited = '#E8E4D8';
  const bgCurious = '#EEF2F0';

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
const WANT_IDLE = ${idle};
const WANT_TALK = ${talk};
const WANT_REACT = ${react};
const MODEL_SCALE = ${scale};
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

const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0xa8b8b0, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 1.0);
key.position.set(5, 8, 4);
scene.add(key);
scene.add(new THREE.DirectionalLight(0xb7c9d1, 0.4).translateX(-4));

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(2.5, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.1 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 0.5;
controls.maxDistance = 40;
controls.enableZoom = !reducedMotion;

let mixer = null;
let actions = {};
let current = null;
let talking = false;
let root = null;
let audioEl = null;
let modelSize = new THREE.Vector3(1, 1, 1);
const clock = new THREE.Clock();
let clipNames = [];
let baseQuat = new THREE.Quaternion();
let basePos = new THREE.Vector3();
let boneByName = {};
let hasSkeleton = false;
let outfitState = { hat: 'none', face: 'none', neck: 'none', held: 'none', scene: 'sky' };
const acc = { hat: null, face: null, neck: null, held: null };

function easeSoft(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function isQuietExpr(e) {
  return e === 'resting' || e === 'sleepy' || e === 'curious';
}

function resolveName(wanted) {
  if (!wanted) return null;
  if (actions[wanted]) return wanted;
  const lower = String(wanted).toLowerCase();
  return (
    clipNames.find((n) => n.toLowerCase() === lower) ||
    clipNames.find((n) => n.toLowerCase().includes(lower) || lower.includes(n.toLowerCase())) ||
    null
  );
}

function pickFallback(prefer) {
  const order = [prefer, WANT_IDLE, WANT_TALK, WANT_REACT, 'Walk', 'Survey', 'Idle', 'idle', 'fly', 'Flap'];
  for (const n of order) {
    const hit = resolveName(n);
    if (hit) return hit;
  }
  return clipNames[0] || null;
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

function applyQuietPose(on, cozy = false) {
  if (!root) return;
  root.quaternion.copy(baseQuat);
  if (on) {
    root.rotateZ(cozy ? -0.48 : -0.4);
    root.rotateX(cozy ? 0.14 : 0.1);
  }
}

function goBaseIdle() {
  talking = false;
  quiet = isQuietExpr(expression);
  setBackground(expression);
  applyQuietPose(quiet, expression === 'sleepy');
  if (reducedMotion) {
    playClip(WANT_IDLE, { loop: true, speed: 0, fade: 0.8 });
    if (current) { current.paused = true; current.setEffectiveTimeScale(0); }
    return;
  }
  playClip(WANT_IDLE, { loop: true, speed: idleSpeed(), fade: 0.7 });
}

function softBob({ amp = 0.035, dur = 1600, yaw = 0, scalePulse = 0 } = {}) {
  if (!root) return;
  const token = ++animToken;
  const start = performance.now();
  const startY = root.position.y;
  const startYaw = root.rotation.y;
  const startScale = root.scale.x;
  function step(now) {
    if (token !== animToken || !root) return;
    const t = Math.min(1, (now - start) / dur);
    const e = easeSoft(t);
    root.position.y = startY + Math.sin(e * Math.PI) * amp;
    if (yaw) root.rotation.y = startYaw + Math.sin(e * Math.PI * 2) * yaw;
    if (scalePulse) {
      const s = startScale * (1 + Math.sin(e * Math.PI) * scalePulse);
      root.scale.setScalar(s);
    }
    if (t < 1) requestAnimationFrame(step);
    else {
      root.position.y = startY;
      root.rotation.y = startYaw;
      root.scale.setScalar(startScale);
    }
  }
  requestAnimationFrame(step);
}

function doReactGentle() {
  softBob({ amp: quiet ? 0.02 : 0.035, dur: 1600 });
}

function doWaveGreeting() {
  if (reducedMotion) return doReactGentle();
  playClip(WANT_TALK, { loop: false, speed: 0.5, fade: 0.65 });
  softBob({ amp: 0.04, dur: 2000, yaw: quiet ? 0.14 : 0.24 });
  setTimeout(() => {
    if (expression === 'waving') goBaseIdle();
  }, 2100);
}

function doExcited() {
  quiet = false;
  applyQuietPose(false);
  setBackground('excited');
  if (reducedMotion) return softBob({ amp: 0.03, dur: 1800, scalePulse: 0.02 });
  const a = playClip(WANT_REACT, { loop: false, speed: 0.68, fade: 0.5 });
  softBob({ amp: 0.055, dur: 2200, scalePulse: 0.035 });
  if (!a || !mixer) return;
  const onFin = (e) => {
    if (e.action !== a) return;
    mixer.removeEventListener('finished', onFin);
    if (expression === 'excited') goBaseIdle();
  };
  mixer.addEventListener('finished', onFin);
}

function doCurious() {
  quiet = true;
  applyQuietPose(true, false);
  setBackground('curious');
  if (reducedMotion) return;
  playClip(WANT_TALK, { loop: true, speed: 0.4, fade: 0.7 });
  softBob({ amp: 0.025, dur: 2800, yaw: 0.32 });
  setTimeout(() => {
    if (expression === 'curious') playClip(WANT_IDLE, { loop: true, speed: idleSpeed(), fade: 0.7 });
  }, 3000);
}

function doSleepy() {
  quiet = true;
  talking = false;
  if (audioEl) { try { audioEl.pause(); } catch {} audioEl = null; }
  applyQuietPose(true, true);
  setBackground('sleepy');
  playClip(WANT_IDLE, { loop: true, speed: reducedMotion ? 0 : 0.22, fade: 0.8 });
  softBob({ amp: 0.018, dur: 2400, scalePulse: 0.025 });
}

function doResting() {
  quiet = true;
  talking = false;
  if (audioEl) { try { audioEl.pause(); } catch {} audioEl = null; }
  applyQuietPose(true, false);
  setBackground('resting');
  playClip(WANT_IDLE, { loop: true, speed: reducedMotion ? 0 : 0.28, fade: 0.8 });
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
  if (talking || quiet || reducedMotion) return doReactGentle();
  const a = playClip(WANT_REACT, { loop: false, speed: 0.62, fade: 0.6 });
  if (!a || !mixer) return goBaseIdle();
  const onFin = (e) => {
    if (e.action !== a) return;
    mixer.removeEventListener('finished', onFin);
    goBaseIdle();
  };
  mixer.addEventListener('finished', onFin);
}

function doSpeak(url) {
  if (quiet) return;
  if (muted) {
    doReactGentle();
    return;
  }
  talking = true;
  playClip(WANT_TALK, { loop: true, speed: reducedMotion ? 0 : 0.58, fade: 0.6 });
  try {
    if (audioEl) { audioEl.pause(); audioEl = null; }
    if (url) {
      audioEl = new Audio(url);
      audioEl.onended = () => { audioEl = null; goBaseIdle(); };
      audioEl.onerror = () => { audioEl = null; setTimeout(goBaseIdle, 1800); };
      audioEl.play().catch(() => setTimeout(goBaseIdle, 1800));
    } else setTimeout(goBaseIdle, 2600);
  } catch { setTimeout(goBaseIdle, 2600); }
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

function findBone(candidates) {
  for (const n of candidates) {
    if (boneByName[n]) return boneByName[n];
  }
  return null;
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

  const head = findBone(['b_Head_05']);
  const neck = findBone(['b_Neck_04']);
  const hand = findBone(['b_RightHand_08']);

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
  if (msg.type === 'speak') doSpeak(msg.audioUrl || '');
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
    if (audioEl) { try { audioEl.pause(); } catch {} audioEl = null; }
    goBaseIdle();
  }
};

function frameFullBody(object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  modelSize.copy(size);

  object.position.x += -center.x;
  object.position.z += -center.z;
  object.position.y += -box.min.y;

  object.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(object);
  const size2 = box2.getSize(new THREE.Vector3());
  const midY = size2.y * 0.42;

  // CircleGeometry radius is 2.5 — scale so the pad matches the animal, not a huge fixed floor
  const desiredR = Math.max(size2.x, size2.z, size2.y * 0.45) * 0.95 + 0.15;
  ground.position.y = 0.01;
  ground.scale.setScalar(desiredR / 2.5);

  const fit = Math.max(size2.x, size2.y, size2.z, 0.35);
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

const loader = new GLTFLoader();
loader.load(
  MODEL,
  (gltf) => {
    root = gltf.scene;
    // Normalize every GLB to ~same on-screen height (Fox / Flamingo / Horse differ wildly in raw units)
    root.scale.setScalar(1);
    scene.add(root);
    root.updateMatrixWorld(true);
    const rawBox = new THREE.Box3().setFromObject(root);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const TARGET_H = 1.55;
    const norm = TARGET_H / Math.max(rawSize.y, 1e-4);
    root.scale.setScalar(norm * (MODEL_SCALE || 1));

    mixer = new THREE.AnimationMixer(root);
    actions = {};
    clipNames = [];
    (gltf.animations || []).forEach((clip) => {
      clipNames.push(clip.name);
      actions[clip.name] = mixer.clipAction(clip);
    });

    indexBones(root);
    frameFullBody(root);
    baseQuat.copy(root.quaternion);
    basePos.copy(root.position);

    setExpression(expression);
    applyOutfit(outfitState);

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ready',
        clips: clipNames,
        bones: Object.keys(boneByName),
        hasSkeleton,
      }));
    }
  },
  undefined,
  () => { hud.textContent = 'Could not load companion'; }
);

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
