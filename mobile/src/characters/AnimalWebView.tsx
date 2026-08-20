import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { AnimalCharacterHandle, CharacterDef } from './types';
import { colors } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = {
  character: CharacterDef;
  mood?: 'happy' | 'resting';
  style?: ViewStyle;
  onReady?: (handle: AnimalWebHandle) => void;
  /** When true, companion voice clips inside the WebView stay silent */
  muted?: boolean;
  accessibilityLabel?: string;
};

export type AnimalWebHandle = AnimalCharacterHandle & {
  sleep: () => void;
  wake: () => void;
  wave: () => void;
};

/**
 * Expo Go–friendly 3D GLB viewer (WebView + Three r152).
 * Calm pacing by default; respects reduced motion; no auto-play audio.
 */
export const AnimalWebView = forwardRef<AnimalWebHandle, Props>(function AnimalWebView(
  {
    character,
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

  const html = useMemo(
    () => buildHtml(character, mood === 'resting', reducedMotion),
    [
      character.id,
      character.modelPath,
      character.clips.idle,
      character.clips.talk,
      character.clips.react,
      character.scale,
      mood,
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
      sleep: () => post('sleep'),
      wake: () => post('wake'),
      wave: () => post(reducedMotion ? 'reactGentle' : 'wave'),
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
      accessibilityLabel={
        mood === 'resting'
          ? `${accessibilityLabel}, resting quietly`
          : `${accessibilityLabel}. Use Talk, Wave, or Play buttons to interact.`
      }
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

function buildHtml(character: CharacterDef, startSleeping: boolean, reducedMotion: boolean) {
  const modelPath = JSON.stringify(character.modelPath);
  const idle = JSON.stringify(character.clips.idle);
  const talk = JSON.stringify(character.clips.talk);
  const react = JSON.stringify(character.clips.react);
  const scale = character.scale ?? 1;
  const bgAwake = '#F7F4EF';
  const bgSleep = '#E4EBF2';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html,body{margin:0;height:100%;background:${startSleeping ? bgSleep : bgAwake};overflow:hidden;touch-action:none}
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
let sleeping = ${startSleeping ? 'true' : 'false'};
let reducedMotion = ${reducedMotion ? 'true' : 'false'};
let muted = true;
const hud = document.getElementById('hud');

const scene = new THREE.Scene();
scene.background = new THREE.Color(sleeping ? '${bgSleep}' : '${bgAwake}');

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

function easeSoft(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
  hud.textContent = sleeping ? 'resting' : '';
  return next;
}

function idleSpeed() {
  if (reducedMotion) return 0;
  return sleeping ? 0.28 : 0.48;
}

function goIdle() {
  talking = false;
  if (reducedMotion) {
    if (current) {
      current.paused = true;
      current.setEffectiveTimeScale(0);
    } else {
      playClip(WANT_IDLE, { loop: true, speed: 0, fade: 0.8 });
      if (current) {
        current.paused = true;
        current.setEffectiveTimeScale(0);
      }
    }
    applySleepPose(sleeping);
    return;
  }
  playClip(WANT_IDLE, { loop: true, speed: idleSpeed(), fade: 0.7 });
  applySleepPose(sleeping);
}

function applySleepPose(on) {
  if (!root) return;
  if (on) {
    root.quaternion.copy(baseQuat);
    root.rotateZ(-0.4);
    root.rotateX(0.1);
    scene.background = new THREE.Color('${bgSleep}');
    document.body.style.background = '${bgSleep}';
  } else {
    root.quaternion.copy(baseQuat);
    scene.background = new THREE.Color('${bgAwake}');
    document.body.style.background = '${bgAwake}';
  }
}

function doReact() {
  if (talking || sleeping || reducedMotion) return doReactGentle();
  const a = playClip(WANT_REACT, { loop: false, speed: 0.62, fade: 0.6 });
  if (!a || !mixer) return goIdle();
  const onFin = (e) => {
    if (e.action !== a) return;
    mixer.removeEventListener('finished', onFin);
    goIdle();
  };
  mixer.addEventListener('finished', onFin);
}

function doReactGentle() {
  if (!root || sleeping) return;
  const start = performance.now();
  const startY = root.position.y;
  const dur = 1600;
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const e = easeSoft(t);
    root.position.y = startY + Math.sin(e * Math.PI) * 0.035;
    if (t < 1) requestAnimationFrame(step);
    else root.position.y = startY;
  }
  requestAnimationFrame(step);
}

function doWave() {
  if (sleeping) return;
  if (reducedMotion) return doReactGentle();
  playClip(WANT_TALK, { loop: false, speed: 0.55, fade: 0.65 });
  const startY = root ? root.rotation.y : 0;
  const start = performance.now();
  const dur = 1800;
  function bob(now) {
    if (!root) return;
    const t = Math.min(1, (now - start) / dur);
    const e = easeSoft(t);
    root.rotation.y = startY + Math.sin(e * Math.PI * 2) * 0.22;
    if (t < 1) requestAnimationFrame(bob);
    else {
      root.rotation.y = startY;
      goIdle();
    }
  }
  requestAnimationFrame(bob);
}

function doSpeak(url) {
  if (sleeping) return;
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
      audioEl.onended = () => { audioEl = null; goIdle(); };
      audioEl.onerror = () => { audioEl = null; setTimeout(goIdle, 1800); };
      audioEl.play().catch(() => setTimeout(goIdle, 1800));
    } else setTimeout(goIdle, 2600);
  } catch { setTimeout(goIdle, 2600); }
}

function doSleep() {
  sleeping = true;
  talking = false;
  if (audioEl) { try { audioEl.pause(); } catch {} audioEl = null; }
  playClip(WANT_IDLE, { loop: true, speed: reducedMotion ? 0 : 0.25, fade: 0.8 });
  applySleepPose(true);
  hud.textContent = 'resting';
}

function doWake() {
  sleeping = false;
  applySleepPose(false);
  goIdle();
}

window.__kpCmd = (msg) => {
  if (!msg || !msg.type) return;
  if (msg.type === 'react') doReact();
  if (msg.type === 'reactGentle') doReactGentle();
  if (msg.type === 'wave') doWave();
  if (msg.type === 'speak') doSpeak(msg.audioUrl || '');
  if (msg.type === 'sleep') doSleep();
  if (msg.type === 'wake') doWake();
  if (msg.type === 'setMuted') muted = Boolean(msg.muted);
  if (msg.type === 'setReducedMotion') {
    reducedMotion = Boolean(msg.on);
    controls.enableZoom = !reducedMotion;
    goIdle();
  }
  if (msg.type === 'stop') {
    if (audioEl) { try { audioEl.pause(); } catch {} audioEl = null; }
    goIdle();
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

    if (sleeping) doSleep();
    else goIdle();

    if (!current && clipNames[0]) playClip(clipNames[0], { loop: true, speed: idleSpeed() });

    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', clips: clipNames }));
    }
  },
  undefined,
  () => { hud.textContent = 'Could not load companion'; }
);

// Explicit buttons drive interaction — canvas tap does not surprise-trigger motion
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
