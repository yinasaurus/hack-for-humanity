import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import { colors, tapTarget } from '../theme';
import type { Unlock } from '../api';
import {
  FACE_IMAGES,
  HAT_IMAGES,
  HELD_IMAGES,
  NECK_IMAGES,
  faceStyle,
  hatStyle,
  heldStyle,
  neckStyle,
} from '../accessoryAssets';
import {
  DEFAULT_APPEARANCE,
  PET_TYPES,
  resolveScene,
  type PetAppearance,
  type PetSceneId,
  type PetTypeId,
} from '../pets';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = Partial<PetAppearance> & {
  mood: 'happy' | 'resting';
  unlocks?: Unlock[];
  celebrate?: boolean;
  size?: number;
  showCaption?: boolean;
  flashy?: boolean;
  interactive?: boolean;
  /** Block Speech.speak — default true (no auto voice) */
  muted?: boolean;
};

const PET_TYPE_IDS = new Set(PET_TYPES.map((p) => p.id));

const PET_IMAGES: Record<PetTypeId, ImageSourcePropType> = {
  bun: require('../../assets/pets/bun.png'),
  pup: require('../../assets/pets/pup.png'),
  kit: require('../../assets/pets/kit.png'),
  bean: require('../../assets/pets/bean.png'),
  fox: require('../../assets/pets/fox.png'),
  chick: require('../../assets/pets/chick.png'),
  panda: require('../../assets/pets/panda.png'),
  otter: require('../../assets/pets/otter.png'),
};

const LINES = {
  hello: (n: string) => `Hi. I'm ${n}. I'm glad you're here.`,
  pet: (n: string) => `${n} likes your company.`,
  check: (n: string) => `${n} is here with you. No rush.`,
  sleep: (n: string) => `${n} is resting quietly. A soft hello photo is welcome whenever you want.`,
};

type IdleBeat = 'center' | 'lookLeft' | 'lookRight' | 'lean' | 'talk';

/**
 * 2D companion — gentle breathing idle; voice only on explicit Talk when unmuted.
 */
export function CompanionPet({
  mood,
  size = 300,
  petType = DEFAULT_APPEARANCE.petType,
  petName = DEFAULT_APPEARANCE.petName,
  scene = DEFAULT_APPEARANCE.scene,
  hat = DEFAULT_APPEARANCE.hat,
  face = DEFAULT_APPEARANCE.face,
  neck = DEFAULT_APPEARANCE.neck,
  held = DEFAULT_APPEARANCE.held,
  showCaption = true,
  celebrate = false,
  interactive = false,
  muted = true,
}: Props) {
  const reducedMotion = useReducedMotion();
  const isSleep = mood === 'resting';
  const [talking, setTalking] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);

  const lookX = useRef(new Animated.Value(0)).current;
  const lookY = useRef(new Animated.Value(0)).current;
  const tilt = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const zzz = useRef(new Animated.Value(0)).current;
  const bubbleOpacity = useRef(new Animated.Value(0)).current;
  const beatRef = useRef<IdleBeat>('center');

  const type = (PET_TYPE_IDS.has(petType as PetTypeId) ? petType : 'bun') as PetTypeId;
  const name = petName || 'Companion';
  const sceneMeta = resolveScene(scene as PetSceneId);
  const imgSize = size * 0.78;

  const showSpeech = (line: string, speakAloud = true) => {
    setBubble(line);
    Animated.sequence([
      Animated.timing(bubbleOpacity, {
        toValue: 1,
        duration: reducedMotion ? 0 : 280,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.delay(Math.min(4500, 1600 + line.length * 35)),
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: reducedMotion ? 0 : 360,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => setBubble(null));
    if (speakAloud && !muted) {
      try {
        Speech.stop();
        Speech.speak(line, { rate: 0.82, pitch: 1.0 });
      } catch {
        /* ignore */
      }
    }
  };

  const reactSoft = () => {
    if (reducedMotion) return;
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.02,
        duration: 320,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 420,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const talk = (line?: string) => {
    if (isSleep) {
      showSpeech(LINES.sleep(name), true);
      return;
    }
    setTalking(true);
    beatRef.current = 'talk';
    reactSoft();
    showSpeech(line || LINES.hello(name));
    setTimeout(() => {
      setTalking(false);
      beatRef.current = 'center';
    }, 2800);
  };

  const onTapPet = () => {
    if (!interactive) return;
    if (isSleep) {
      showSpeech(LINES.sleep(name), true);
      return;
    }
    talk(LINES.pet(name));
  };

  // Soft breathing (sleep = slower). Reduced motion → still.
  useEffect(() => {
    if (reducedMotion) {
      breath.setValue(0);
      return;
    }
    const half = isSleep ? 3600 : 2800;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: half,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    breath.setValue(0);
    loop.start();
    return () => loop.stop();
  }, [isSleep, breath, reducedMotion]);

  // Sleep tip + zzz
  useEffect(() => {
    if (!isSleep) {
      Animated.timing(tilt, {
        toValue: 0,
        duration: reducedMotion ? 0 : 600,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start();
      zzz.setValue(0);
      return;
    }
    Animated.timing(tilt, {
      toValue: 1,
      duration: reducedMotion ? 0 : 900,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start();
    if (reducedMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(zzz, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(zzz, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isSleep, tilt, zzz, reducedMotion]);

  // Idle look-around when awake — slow, infrequent (skipped if reduced motion)
  useEffect(() => {
    if (isSleep || reducedMotion) {
      Animated.parallel([
        Animated.timing(lookX, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(lookY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
      return;
    }

    let cancelled = false;
    const beats: IdleBeat[] = ['lookLeft', 'center', 'lookRight', 'center', 'lean', 'center'];
    let i = 0;

    const runBeat = () => {
      if (cancelled || beatRef.current === 'talk') {
        schedule();
        return;
      }
      const beat = beats[i % beats.length];
      i += 1;
      beatRef.current = beat;

      const tx =
        beat === 'lookLeft' ? -0.55 : beat === 'lookRight' ? 0.55 : beat === 'lean' ? 0.2 : 0;
      const ty = beat === 'lean' ? 0.25 : beat === 'center' ? 0 : -0.08;
      const rot = beat === 'lookLeft' ? -0.45 : beat === 'lookRight' ? 0.45 : beat === 'lean' ? 0.3 : 0;

      Animated.parallel([
        Animated.timing(lookX, {
          toValue: tx,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(lookY, {
          toValue: ty,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(tilt, {
          toValue: rot,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]).start();

      schedule();
    };

    const schedule = () => {
      const delay = talking ? 1600 : 2800 + Math.random() * 1600;
      timer = setTimeout(runBeat, delay);
    };

    let timer = setTimeout(runBeat, 1200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isSleep, talking, lookX, lookY, tilt, reducedMotion]);

  // Celebrate: bubble only — never auto-speak
  useEffect(() => {
    if (!celebrate || isSleep) return;
    showSpeech(`${name} is glad you stopped by.`, false);
  }, [celebrate]);

  const translateX = lookX.interpolate({
    inputRange: [-1, 1],
    outputRange: [-10, 10],
  });
  const translateY = Animated.add(
    lookY.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }),
    breath.interpolate({
      inputRange: [0, 1],
      outputRange: [0, isSleep ? -2 : -4],
    })
  );
  const rotate = tilt.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: isSleep ? ['-2deg', '-6deg', '-10deg'] : ['-5deg', '0deg', '5deg'],
  });
  const breathScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, isSleep ? 1.01 : 1.018],
  });
  const shadowScale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });
  const zzzY = zzz.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const zzzOp = zzz.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.2, 0.85, 0.2] });

  const hatSrc = hat && hat !== 'none' ? HAT_IMAGES[hat] : null;
  const faceSrc = face && face !== 'none' ? FACE_IMAGES[face] : null;
  const neckSrc = neck && neck !== 'none' ? NECK_IMAGES[neck] : null;
  const heldSrc = held && held !== 'none' ? HELD_IMAGES[held] : null;

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.stage,
          {
            width: size,
            height: size * 0.92,
            backgroundColor: isSleep ? '#E4EBF2' : sceneMeta.fill,
          },
        ]}
        accessible
        accessibilityLabel={
          isSleep
            ? `${name} is resting quietly`
            : `${name}, your companion${interactive ? '. Double tap to say hello' : ''}`
        }
        accessibilityRole="image"
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            isSleep
              ? ['rgba(255,255,255,0.2)', 'rgba(160,180,200,0.32)']
              : ['rgba(255,255,255,0.7)', 'rgba(255,220,190,0.18)']
          }
          style={StyleSheet.absoluteFill}
        />

        {isSleep ? <Text style={styles.sleepBadge}>☾ resting</Text> : null}

        {bubble ? (
          <Animated.View
            style={[styles.bubble, { opacity: bubbleOpacity }]}
            accessibilityLiveRegion="polite"
          >
            <Text style={styles.bubbleText}>{bubble}</Text>
          </Animated.View>
        ) : null}

        <Animated.View
          style={[
            styles.groundShadow,
            { width: imgSize * 0.55, transform: [{ scaleX: shadowScale }] },
          ]}
        />

        <Pressable
          onPress={onTapPet}
          disabled={!interactive}
          accessibilityRole={interactive ? 'button' : undefined}
          accessibilityLabel={interactive ? `Say hello to ${name}` : undefined}
          style={{ minWidth: tapTarget.min, minHeight: tapTarget.min }}
        >
          <Animated.View
            style={[
              styles.petLayer,
              {
                width: imgSize,
                height: imgSize,
                opacity: isSleep ? 0.92 : 1,
                transform: [
                  { translateX },
                  { translateY },
                  { rotate },
                  { scale: Animated.multiply(scale, breathScale) },
                ],
              },
            ]}
          >
            <Image
              source={PET_IMAGES[type]}
              style={{ width: imgSize, height: imgSize }}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            {neckSrc ? (
              <Image source={neckSrc} style={neckStyle(type, imgSize)} resizeMode="contain" />
            ) : null}
            {hatSrc ? (
              <Image source={hatSrc} style={hatStyle(type, imgSize)} resizeMode="contain" />
            ) : null}
            {faceSrc ? (
              <Image source={faceSrc} style={faceStyle(type, imgSize)} resizeMode="contain" />
            ) : null}
            {heldSrc ? (
              <Image source={heldSrc} style={heldStyle(type, imgSize)} resizeMode="contain" />
            ) : null}

            {isSleep ? (
              <Animated.Text
                style={[styles.zzz, { opacity: zzzOp, transform: [{ translateY: zzzY }] }]}
                accessibilityElementsHidden
              >
                zzz
              </Animated.Text>
            ) : null}
          </Animated.View>
        </Pressable>
      </View>

      {interactive && !isSleep ? (
        <View style={styles.actions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => talk(LINES.hello(name))}
            accessibilityRole="button"
            accessibilityLabel={`Talk with ${name}`}
          >
            <Text style={styles.actionText}>Talk</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => talk(LINES.check(name))}
            accessibilityRole="button"
            accessibilityLabel={`Quiet chat with ${name}`}
          >
            <Text style={styles.actionText}>Chat</Text>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              try {
                Speech.stop();
              } catch {
                /* ignore */
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Stop companion voice"
          >
            <Text style={styles.actionText}>Pause voice</Text>
          </Pressable>
        </View>
      ) : null}

      {showCaption ? (
        <View style={styles.captionBlock}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.caption}>
            {isSleep
              ? `${name} is resting — a meal hello is welcome when you are ready`
              : interactive
                ? `${name} is here · Talk when you like`
                : `${name} is glad you are here`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  stage: {
    borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepBadge: {
    position: 'absolute',
    top: 14,
    left: 16,
    zIndex: 2,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.teal,
  },
  bubble: {
    position: 'absolute',
    top: 18,
    right: 14,
    left: 14,
    zIndex: 8,
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 20,
  },
  groundShadow: {
    position: 'absolute',
    bottom: '12%',
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(45,40,35,0.18)',
  },
  petLayer: { alignItems: 'center', justifyContent: 'center' },
  zzz: {
    position: 'absolute',
    top: '8%',
    right: '10%',
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: '#7A8FA3',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, justifyContent: 'center' },
  actionBtn: {
    backgroundColor: colors.card,
    borderRadius: 14,
    minHeight: tapTarget.min,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  captionBlock: { alignItems: 'center', gap: 4, paddingHorizontal: 16 },
  name: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: colors.ink,
  },
  caption: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
