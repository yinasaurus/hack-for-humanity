import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import type { AnimalClipMap, AnimalCharacterHandle } from './types';

const MOUTH_MORPH_HINTS = [
  'mouth',
  'mouthopen',
  'mouth_open',
  'jaw',
  'jawopen',
  'viseme',
  'aa',
  'oh',
  'ou',
  'lips',
];

/** Soft, unhurried clip speeds — breathing idle, not attention-seeking */
const SPEED = {
  idle: 0.48,
  talk: 0.58,
  react: 0.62,
} as const;

const FADE = 0.55;

type MouthTarget = {
  mesh: THREE.Mesh;
  index: number;
};

function collectMouthMorphs(root: THREE.Object3D): MouthTarget[] {
  const found: MouthTarget[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
    for (const [name, index] of Object.entries(mesh.morphTargetDictionary)) {
      const key = name.toLowerCase();
      if (MOUTH_MORPH_HINTS.some((h) => key.includes(h))) {
        found.push({ mesh, index: index as number });
      }
    }
  });
  return found;
}

function resolveClipName(
  actions: Record<string, THREE.AnimationAction | null>,
  wanted: string
): string | null {
  if (actions[wanted]) return wanted;
  const lower = wanted.toLowerCase();
  const hit = Object.keys(actions).find((k) => k.toLowerCase() === lower);
  return hit || null;
}

export type AnimalCharacterProps = {
  modelPath: string;
  clips: AnimalClipMap;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  onReady?: (handle: AnimalCharacterHandle) => void;
  reducedMotion?: boolean;
  muted?: boolean;
};

/**
 * Web R3F character — calm pacing; speech only when speak() is called and not muted.
 */
export const AnimalCharacter = forwardRef<AnimalCharacterHandle, AnimalCharacterProps>(
  function AnimalCharacter(
    {
      modelPath,
      clips,
      scale = 1,
      position = [0, -0.8, 0],
      rotation = [0, 0.4, 0],
      onReady,
      reducedMotion = false,
      muted = true,
    },
    ref
  ) {
    const group = useRef<THREE.Group>(null);
    const { scene, animations } = useGLTF(modelPath);
    const { actions, mixer } = useAnimations(animations, group);

    const mouthMorphs = useMemo(() => collectMouthMorphs(scene), [scene]);
    const talkingRef = useRef(false);
    const mouthPhase = useRef(0);
    const audioCleanup = useRef<(() => void) | null>(null);
    const currentAction = useRef<string | null>(null);
    const mutedRef = useRef(muted);
    mutedRef.current = muted;
    const reducedRef = useRef(reducedMotion);
    reducedRef.current = reducedMotion;

    const fadeTo = useCallback(
      (
        clipKey: keyof AnimalClipMap,
        opts?: { loop?: THREE.AnimationActionLoopStyles; fade?: number; speed?: number }
      ) => {
        const name = resolveClipName(
          actions as Record<string, THREE.AnimationAction | null>,
          clips[clipKey]
        );
        if (!name || !actions[name]) {
          console.warn(`[AnimalCharacter] Missing clip "${clips[clipKey]}" for role ${clipKey}`);
          return null;
        }
        const next = actions[name]!;
        const fade = opts?.fade ?? FADE;
        const speed = reducedRef.current ? 0 : opts?.speed ?? SPEED[clipKey] ?? 0.5;
        if (currentAction.current && currentAction.current !== name && actions[currentAction.current]) {
          actions[currentAction.current]!.fadeOut(fade);
        }
        next.reset().setEffectiveTimeScale(speed).setEffectiveWeight(1).fadeIn(fade);
        next.setLoop(opts?.loop ?? THREE.LoopRepeat, Infinity);
        if (reducedRef.current) next.paused = true;
        next.play();
        currentAction.current = name;
        return next;
      },
      [actions, clips]
    );

    const returnToIdle = useCallback(() => {
      talkingRef.current = false;
      for (const t of mouthMorphs) {
        if (t.mesh.morphTargetInfluences) t.mesh.morphTargetInfluences[t.index] = 0;
      }
      fadeTo('idle', { loop: THREE.LoopRepeat, speed: SPEED.idle });
    }, [fadeTo, mouthMorphs]);

    const stopSpeaking = useCallback(() => {
      audioCleanup.current?.();
      audioCleanup.current = null;
      returnToIdle();
    }, [returnToIdle]);

    const speak = useCallback(
      (audioUrl: string) => {
        if (mutedRef.current) {
          fadeTo('talk', { loop: THREE.LoopOnce, fade: 0.6, speed: SPEED.talk });
          setTimeout(returnToIdle, 1200);
          return;
        }
        audioCleanup.current?.();
        talkingRef.current = true;
        fadeTo('talk', { loop: THREE.LoopRepeat, fade: 0.5, speed: SPEED.talk });

        const onEnd = () => {
          audioCleanup.current = null;
          returnToIdle();
        };

        if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
          const audio = new Audio(audioUrl);
          audio.onended = onEnd;
          audio.onerror = onEnd;
          void audio.play().catch(onEnd);
          audioCleanup.current = () => {
            audio.pause();
            audio.src = '';
          };
          return;
        }

        void import('expo-audio')
          .then(({ createAudioPlayer }) => {
            const player = createAudioPlayer({ uri: audioUrl });
            player.play();
            const timeout = setTimeout(() => {
              try {
                player.pause();
                player.remove();
              } catch {
                /* ignore */
              }
              onEnd();
            }, 5000);
            audioCleanup.current = () => {
              clearTimeout(timeout);
              try {
                player.pause();
                player.remove();
              } catch {
                /* ignore */
              }
            };
          })
          .catch(onEnd);
      },
      [fadeTo, returnToIdle]
    );

    const react = useCallback(() => {
      if (talkingRef.current) return;
      if (reducedRef.current) {
        returnToIdle();
        return;
      }
      const name = resolveClipName(
        actions as Record<string, THREE.AnimationAction | null>,
        clips.react
      );
      if (!name || !actions[name]) {
        fadeTo('react', { loop: THREE.LoopOnce, speed: SPEED.react });
        return;
      }
      const action = actions[name]!;
      if (currentAction.current && actions[currentAction.current]) {
        actions[currentAction.current]!.fadeOut(FADE);
      }
      action.reset();
      action.setEffectiveTimeScale(SPEED.react);
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.fadeIn(FADE).play();
      currentAction.current = name;

      const onFinished = (e: { action: THREE.AnimationAction }) => {
        if (e.action !== action) return;
        mixer.removeEventListener('finished', onFinished);
        returnToIdle();
      };
      mixer.addEventListener('finished', onFinished);
    }, [actions, clips.react, fadeTo, mixer, returnToIdle]);

    useImperativeHandle(ref, () => ({ speak, stopSpeaking, react }), [
      speak,
      stopSpeaking,
      react,
    ]);

    useEffect(() => {
      fadeTo('idle', { loop: THREE.LoopRepeat, speed: SPEED.idle });
      const handle: AnimalCharacterHandle = { speak, stopSpeaking, react };
      onReady?.(handle);
      return () => {
        audioCleanup.current?.();
      };
    }, [fadeTo, speak, stopSpeaking, react, onReady, modelPath]);

    useEffect(() => {
      returnToIdle();
    }, [reducedMotion, returnToIdle]);

    useFrame((_, delta) => {
      if (!talkingRef.current || mouthMorphs.length === 0 || reducedRef.current) return;
      mouthPhase.current += delta * 4.2;
      const open = (Math.sin(mouthPhase.current) + 1) * 0.5 * 0.55;
      for (const t of mouthMorphs) {
        if (t.mesh.morphTargetInfluences) t.mesh.morphTargetInfluences[t.index] = open;
      }
    });

    return (
      <group ref={group} position={position} rotation={rotation} scale={scale}>
        <primitive object={scene} />
      </group>
    );
  }
);

export function preloadAnimal(modelPath: string) {
  if (modelPath) useGLTF.preload(modelPath);
}
