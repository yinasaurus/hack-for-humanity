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
};

export type AnimalWebHandle = AnimalCharacterHandle & {
  sleep: () => void;
  wake: () => void;
  wave: () => void;
  setExpression: (expression: CompanionExpression) => void;
};

/**
 * Expo Go–friendly 3D viewer. Expressions: happy, resting, waving, excited, curious, sleepy.
 * Never sadness / hunger / neediness.
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
  },
  ref
) {
  const webRef = useRef<WebView>(null);
  const reducedMotion = useReducedMotion();
  const active: CompanionExpression = expression || mood;
  const startQuiet = isQuietBand(active);

  const html = useMemo(
    () => buildHtml(character, startQuiet, reducedMotion),
    [
      character.id,
      character.modelPath,
      character.clips.idle,
      character.clips.talk,
      character.clips.react,
      character.scale,
      // Remount only when character changes — expressions inject via postMessage
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

  const onMessage = (_e: WebViewMessageEvent) => {};

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
  #hud{position:absolute;left:10px;top:8px;right:10px;font:500 11px/1.35 system-ui,sans-serif;color:#4F5B57;z-index:2;pointer-events:none;opacity:0.45}
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
    hud.textContent = '';
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
  // Greeting overlay — never guilt-coded; works in quiet band as a soft sway
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
  // Soft look-around / "paw at something" — survey clip or talk at slow speed
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
  // Soft yawn: gentle scale pulse, cozy not needy
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
  hud.textContent = '';
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
  const midY = size2.y * 0.45;

  ground.position.y = 0.01;
  ground.scale.setScalar(Math.max(size2.x, size2.z) * 0.9 + 1.2);

  const fit = Math.max(size2.x, size2.y, size2.z, 0.5);
  const dist = fit * 2.35;
  camera.position.set(dist * 0.85, midY + fit * 0.35, dist * 1.05);
  camera.near = fit / 100;
  camera.far = fit * 100;
  camera.updateProjectionMatrix();
  controls.target.set(0, midY, 0);
  controls.minDistance = fit * 0.8;
  controls.maxDistance = fit * 8;
  controls.update();
}

const loader = new GLTFLoader();
loader.load(
  MODEL,
  (gltf) => {
    root = gltf.scene;
    root.scale.setScalar(MODEL_SCALE);
    scene.add(root);

    mixer = new THREE.AnimationMixer(root);
    actions = {};
    clipNames = [];
    (gltf.animations || []).forEach((clip) => {
      clipNames.push(clip.name);
      actions[clip.name] = mixer.clipAction(clip);
    });

    frameFullBody(root);
    baseQuat.copy(root.quaternion);
    basePos.copy(root.position);

    setExpression(expression);

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', clips: clipNames }));
    }
  },
  undefined,
  () => { hud.textContent = 'Could not load companion'; }
);

renderer.domElement.addEventListener('click', () => {});

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
  empty: { backgroundColor: colors.sageWash },
});
