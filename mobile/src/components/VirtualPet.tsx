/**
 * VirtualPet.tsx
 *
 * Self-contained animated SVG companion — no WebView, no native-only modules.
 * Works on iOS · Android · Web (react-native-svg + Animated API).
 *
 * Props
 * ─────
 *   appearance   PetAppearance   Full cosmetic config (type, color, accessories …)
 *   mood         CompanionExpression   Current emotional state
 *   onTap?       () => void      Called when the user taps the pet
 *   size?        number          Canvas edge length (default 300)
 *   reducedMotion? boolean       Skip animations when true
 *
 * States handled
 * ──────────────
 *   happy     → bright eyes, gentle float + breathing
 *   resting   → half-closed eyes, slow breathing, tilted pose
 *   sleepy    → Z-symbols, ultra-slow breathing, max tilt
 *   waving    → animated arm wave
 *   excited   → bounce + scale pulse
 *   curious   → head tilt, looking-around eyes
 *
 * Idle micro-animations (always running unless reducedMotion)
 * ─────────────────────────────────────────────────────────
 *   · Breathing scale (body scale ±2 %)
 *   · Hover float (translateY ±4 px)
 *   · Periodic eye blink (every ~4 s)
 *
 * Tap interactions
 * ────────────────
 *   · Bounce (scale up → spring back)
 *   · Heart particle burst (5 hearts fly outward, fade)
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import type { PetAppearance } from '../pets';
import {
  PET_COLORS,
  PET_SCENES,
  resolveColor,
  resolveScene,
} from '../pets';
import type { CompanionExpression } from '../companionMood';

// ─── Types ───────────────────────────────────────────────────────────────────

export type VirtualPetProps = {
  appearance: PetAppearance;
  mood: CompanionExpression;
  vitalityState?: 'healthy' | 'fatigued' | 'dimmed' | 'dormant';
  onTap?: () => void;
  size?: number;
  reducedMotion?: boolean;
};

type Particle = {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const BLINK_INTERVAL = 4200;   // ms between blinks
const BLINK_DURATION = 120;    // ms close + open
const BREATHE_DURATION = 2800; // ms one breath cycle
const FLOAT_DURATION  = 2200;  // ms one hover cycle

// How much to tilt (rotate) the whole pet for calm/quiet states
const TILT_BY_MOOD: Record<CompanionExpression, number> = {
  happy:   0,
  resting: -12,
  sleepy:  -20,
  curious:  8,
  waving:   0,
  excited:  0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Animated.loop helper — creates a looping sequence cleanly */
function loop(anim: Animated.CompositeAnimation) {
  return Animated.loop(anim);
}

/** Convert hex color to slightly darkened version (for outlines/shadows) */
function darken(hex: string, amount = 24): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color */
function lighten(hex: string, amount = 20): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// ─── Sub-components: Pet Silhouettes ─────────────────────────────────────────

/**
 * Each pet type has its own SVG path set.
 * All drawn in a 200×200 viewBox, centered around (100,120).
 */

type PetBodyProps = {
  bodyColor: string;
  cheekColor: string;
  eyeStyle: string;
  patternId: string;
  isSleepy: boolean;
  isResting: boolean;
  isExcited: boolean;
  isWaving: boolean;
  isCurious: boolean;
  eyesOpen: boolean;      // controlled by blink animation driver
  armAnim: Animated.Value;
  size: number;
};

// --- Fox ---
function FoxBody({
  bodyColor, cheekColor, eyeStyle, patternId,
  isSleepy, isResting, eyesOpen, isExcited, isWaving, isCurious,
}: PetBodyProps) {
  const outline = darken(bodyColor, 28);
  const belly   = lighten(bodyColor, 30);
  const blink   = !eyesOpen || isSleepy || isResting;
  const eyeY    = isCurious ? 95 : 98;

  return (
    <G>
      {/* Tail */}
      <Ellipse cx={140} cy={160} rx={22} ry={14} fill={bodyColor} stroke={outline} strokeWidth={1.5} transform="rotate(-30,140,160)" />
      <Ellipse cx={148} cy={155} rx={10} ry={7} fill="#FFFFFF" opacity={0.6} transform="rotate(-30,148,155)" />

      {/* Body */}
      <Ellipse cx={100} cy={145} rx={42} ry={48} fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      {/* Belly patch */}
      <Ellipse cx={100} cy={155} rx={22} ry={28} fill={belly} opacity={0.7} />

      {/* Pattern overlay */}
      {patternId === 'freckles' && (
        <>
          <Circle cx={86} cy={148} r={3} fill={cheekColor} opacity={0.5} />
          <Circle cx={93} cy={155} r={2.5} fill={cheekColor} opacity={0.5} />
          <Circle cx={110} cy={145} r={3} fill={cheekColor} opacity={0.5} />
          <Circle cx={118} cy={153} r={2.5} fill={cheekColor} opacity={0.5} />
        </>
      )}
      {patternId === 'soft_stripes' && (
        <>
          <Path d="M82,130 Q100,125 118,130" stroke={darken(bodyColor, 15)} strokeWidth={2.5} fill="none" opacity={0.4} />
          <Path d="M80,143 Q100,138 120,143" stroke={darken(bodyColor, 15)} strokeWidth={2.5} fill="none" opacity={0.4} />
        </>
      )}
      {patternId === 'belly_heart' && (
        <Path
          d="M100,158 C100,158 93,152 93,148 C93,145 100,144 100,148 C100,144 107,145 107,148 C107,152 100,158 100,158 Z"
          fill={cheekColor} opacity={0.5}
        />
      )}

      {/* Ears */}
      <Polygon points="72,108 62,80 88,100" fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Polygon points="75,106 67,85 87,100" fill={cheekColor} opacity={0.6} />
      <Polygon points="128,108 138,80 112,100" fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Polygon points="125,106 133,85 113,100" fill={cheekColor} opacity={0.6} />

      {/* Head */}
      <Ellipse cx={100} cy={105} rx={38} ry={34} fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Muzzle */}
      <Ellipse cx={100} cy={118} rx={16} ry={12} fill={belly} opacity={0.85} />
      {/* Nose */}
      <Ellipse cx={100} cy={114} rx={5} ry={3.5} fill={outline} />
      {/* Mouth */}
      <Path d="M95,120 Q100,124 105,120" stroke={outline} strokeWidth={1.5} fill="none" strokeLinecap="round" />

      {/* Cheeks */}
      <Ellipse cx={80}  cy={eyeY + 12} rx={9} ry={6} fill={cheekColor} opacity={0.45} />
      <Ellipse cx={120} cy={eyeY + 12} rx={9} ry={6} fill={cheekColor} opacity={0.45} />

      {/* Eyes */}
      <EyePair
        lx={86} rx={114} y={eyeY}
        style={eyeStyle} blink={blink} excited={isExcited}
        outline={outline}
      />

      {/* Arms */}
      {isWaving ? (
        <>
          <Ellipse cx={58} cy={148} rx={10} ry={16} fill={bodyColor} stroke={outline} strokeWidth={1.5} transform="rotate(20,58,148)" />
          {/* Waving arm raised */}
          <Ellipse cx={62} cy={118} rx={9} ry={16} fill={bodyColor} stroke={outline} strokeWidth={1.5} transform="rotate(-45,62,118)" />
        </>
      ) : (
        <>
          <Ellipse cx={60}  cy={152} rx={10} ry={18} fill={bodyColor} stroke={outline} strokeWidth={1.5} transform="rotate(15,60,152)" />
          <Ellipse cx={140} cy={152} rx={10} ry={18} fill={bodyColor} stroke={outline} strokeWidth={1.5} transform="rotate(-15,140,152)" />
        </>
      )}

      {/* Sleepy Z's */}
      {isSleepy && (
        <>
          <SvgText x={128} y={92} fontSize={13} fill="#8FA396" fontWeight="bold" opacity={0.7}>z</SvgText>
          <SvgText x={138} y={80} fontSize={10} fill="#8FA396" fontWeight="bold" opacity={0.5}>z</SvgText>
        </>
      )}

      {/* Excited sparkles */}
      {isExcited && (
        <>
          <SvgText x={60} y={88} fontSize={14} fill="#F5E6A8" opacity={0.9}>✦</SvgText>
          <SvgText x={136} y={84} fontSize={11} fill="#F5E6A8" opacity={0.8}>✦</SvgText>
        </>
      )}
    </G>
  );
}

// --- Horse ---
function HorseBody({
  bodyColor, cheekColor, eyeStyle, patternId,
  isSleepy, isResting, eyesOpen, isExcited, isWaving, isCurious,
}: PetBodyProps) {
  const outline = darken(bodyColor, 28);
  const belly   = lighten(bodyColor, 25);
  const blink   = !eyesOpen || isSleepy || isResting;
  const eyeY    = isCurious ? 92 : 95;

  return (
    <G>
      {/* Body */}
      <Ellipse cx={100} cy={150} rx={44} ry={40} fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Ellipse cx={100} cy={160} rx={24} ry={22} fill={belly} opacity={0.6} />

      {/* Pattern */}
      {patternId === 'patches' && (
        <>
          <Ellipse cx={88} cy={142} rx={12} ry={9} fill={darken(bodyColor, 18)} opacity={0.35} />
          <Ellipse cx={113} cy={155} rx={10} ry={8} fill={darken(bodyColor, 18)} opacity={0.35} />
        </>
      )}

      {/* Neck + Head */}
      <Rect x={88} y={100} width={24} height={36} rx={12} fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Ellipse cx={100} cy={98} rx={30} ry={26} fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Snout (elongated) */}
      <Ellipse cx={100} cy={115} rx={14} ry={10} fill={belly} opacity={0.85} />
      <Ellipse cx={100} cy={112} rx={4.5} ry={3} fill={outline} />
      <Path d="M95,117 Q100,121 105,117" stroke={outline} strokeWidth={1.5} fill="none" strokeLinecap="round" />

      {/* Ears */}
      <Polygon points="82,84 76,64 92,78" fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Polygon points="85,83 80,67 90,78" fill={cheekColor} opacity={0.55} />
      <Polygon points="118,84 124,64 108,78" fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Polygon points="115,83 120,67 110,78" fill={cheekColor} opacity={0.55} />

      {/* Mane */}
      <Path d="M82,72 Q78,88 80,104" stroke={darken(bodyColor, 30)} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.7} />
      <Path d="M88,68 Q84,84 85,100" stroke={darken(bodyColor, 20)} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.5} />

      {/* Cheeks */}
      <Ellipse cx={78}  cy={eyeY + 14} rx={8}  ry={5.5} fill={cheekColor} opacity={0.4} />
      <Ellipse cx={122} cy={eyeY + 14} rx={8}  ry={5.5} fill={cheekColor} opacity={0.4} />

      {/* Eyes */}
      <EyePair lx={85} rx={115} y={eyeY} style={eyeStyle} blink={blink} excited={isExcited} outline={outline} />

      {/* Legs */}
      <Rect x={74} y={186} width={14} height={26} rx={7} fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Rect x={90} y={188} width={14} height={24} rx={7} fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Rect x={96} y={188} width={14} height={24} rx={7} fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Rect x={112} y={186} width={14} height={26} rx={7} fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Waving front leg */}
      {isWaving && (
        <Ellipse cx={66} cy={155} rx={8} ry={15} fill={bodyColor} stroke={outline} strokeWidth={1.5} transform="rotate(-50,66,155)" />
      )}

      {isSleepy && (
        <>
          <SvgText x={125} y={86} fontSize={12} fill="#8FA396" fontWeight="bold" opacity={0.7}>z</SvgText>
          <SvgText x={135} y={75} fontSize={10} fill="#8FA396" fontWeight="bold" opacity={0.5}>z</SvgText>
        </>
      )}
      {isExcited && (
        <>
          <SvgText x={58} y={82} fontSize={13} fill="#F5E6A8" opacity={0.9}>✦</SvgText>
          <SvgText x={135} y={78} fontSize={10} fill="#F5E6A8" opacity={0.8}>✦</SvgText>
        </>
      )}
    </G>
  );
}

// --- Parrot ---
function ParrotBody({
  bodyColor, cheekColor, eyeStyle, patternId,
  isSleepy, isResting, eyesOpen, isExcited, isWaving, isCurious,
}: PetBodyProps) {
  const outline = darken(bodyColor, 28);
  const wing    = darken(bodyColor, 12);
  const blink   = !eyesOpen || isSleepy || isResting;
  const eyeY    = isCurious ? 96 : 99;

  return (
    <G>
      {/* Tail feathers */}
      <Ellipse cx={100} cy={178} rx={10} ry={22} fill={wing} stroke={outline} strokeWidth={1} transform="rotate(-10,100,178)" />
      <Ellipse cx={100} cy={180} rx={8}  ry={18} fill={darken(bodyColor, 5)} opacity={0.6} transform="rotate(5,100,180)" />
      <Ellipse cx={100} cy={178} rx={8}  ry={20} fill={wing} opacity={0.5} transform="rotate(12,100,178)" />

      {/* Body */}
      <Ellipse cx={100} cy={148} rx={36} ry={38} fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Wing left */}
      <Ellipse
        cx={68} cy={148} rx={18} ry={30}
        fill={wing} stroke={outline} strokeWidth={1.2}
        transform={isWaving ? 'rotate(-50,68,148)' : 'rotate(-15,68,148)'}
        opacity={0.9}
      />
      {/* Wing right */}
      <Ellipse cx={132} cy={148} rx={18} ry={30} fill={wing} stroke={outline} strokeWidth={1.2} transform="rotate(15,132,148)" opacity={0.9} />

      {/* Pattern */}
      {patternId === 'freckles' && (
        <>
          <Circle cx={90} cy={150} r={3} fill={cheekColor} opacity={0.5} />
          <Circle cx={110} cy={145} r={3} fill={cheekColor} opacity={0.5} />
        </>
      )}

      {/* Head */}
      <Ellipse cx={100} cy={104} rx={32} ry={30} fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Beak */}
      <Path d="M94,117 Q100,130 106,117" fill={darken(cheekColor, 10)} stroke={outline} strokeWidth={1} strokeLinejoin="round" />

      {/* Crest feathers */}
      <Ellipse cx={100} cy={80} rx={5} ry={14} fill={wing} opacity={0.7} transform="rotate(-8,100,80)" />
      <Ellipse cx={100} cy={78} rx={4} ry={12} fill={lighten(bodyColor, 20)} opacity={0.6} transform="rotate(5,100,78)" />
      <Ellipse cx={100} cy={80} rx={4} ry={12} fill={wing} opacity={0.5} transform="rotate(18,100,80)" />

      {/* Cheeks */}
      <Ellipse cx={80} cy={eyeY + 12} rx={8} ry={5} fill={cheekColor} opacity={0.45} />
      <Ellipse cx={120} cy={eyeY + 12} rx={8} ry={5} fill={cheekColor} opacity={0.45} />

      {/* Eyes */}
      <EyePair lx={87} rx={113} y={eyeY} style={eyeStyle} blink={blink} excited={isExcited} outline={outline} />

      {isSleepy && (
        <>
          <SvgText x={126} y={88} fontSize={12} fill="#8FA396" fontWeight="bold" opacity={0.7}>z</SvgText>
          <SvgText x={135} y={78} fontSize={9} fill="#8FA396" fontWeight="bold" opacity={0.5}>z</SvgText>
        </>
      )}
      {isExcited && (
        <>
          <SvgText x={62} y={84} fontSize={12} fill="#F5E6A8" opacity={0.9}>✦</SvgText>
          <SvgText x={130} y={80} fontSize={10} fill="#F5E6A8" opacity={0.8}>✦</SvgText>
        </>
      )}
    </G>
  );
}

// --- Flamingo ---
function FlamingoBody({
  bodyColor, cheekColor, eyeStyle, patternId,
  isSleepy, isResting, eyesOpen, isExcited, isWaving, isCurious,
}: PetBodyProps) {
  const outline = darken(bodyColor, 28);
  const belly   = lighten(bodyColor, 28);
  const blink   = !eyesOpen || isSleepy || isResting;
  const eyeY    = isCurious ? 88 : 91;

  return (
    <G>
      {/* One leg (flamingo style) */}
      <Rect x={94} y={182} width={8} height={26} rx={4} fill={bodyColor} stroke={outline} strokeWidth={1.2} />
      <Rect x={86} y={204} width={16} height={6} rx={3} fill={bodyColor} stroke={outline} strokeWidth={1} />

      {/* Body — tall egg */}
      <Ellipse cx={100} cy={145} rx={34} ry={42} fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Ellipse cx={100} cy={152} rx={18} ry={26} fill={belly} opacity={0.55} />

      {/* Pattern */}
      {patternId === 'patches' && (
        <Ellipse cx={110} cy={138} rx={10} ry={8} fill={darken(bodyColor, 16)} opacity={0.3} />
      )}

      {/* Long neck */}
      <Path d="M100,108 Q88,96 94,80 Q100,68 110,72 Q118,76 114,88 Q108,100 100,108"
        fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Head */}
      <Ellipse cx={108} cy={74} rx={22} ry={20} fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Bill */}
      <Path d="M118,80 Q132,82 128,88 Q124,90 114,86 Z" fill={darken(cheekColor, 5)} stroke={outline} strokeWidth={1} />
      <Path d="M118,80 Q130,82 128,84" stroke={outline} strokeWidth={1} fill="none" />

      {/* Cheeks */}
      <Ellipse cx={98}  cy={eyeY + 10} rx={7} ry={4.5} fill={cheekColor} opacity={0.45} />
      <Ellipse cx={120} cy={eyeY + 10} rx={7} ry={4.5} fill={cheekColor} opacity={0.45} />

      {/* Eyes */}
      <EyePair lx={104} rx={120} y={eyeY} style={eyeStyle} blink={blink} excited={isExcited} outline={outline} />

      {/* Wing */}
      {isWaving ? (
        <Ellipse cx={68} cy={136} rx={16} ry={28} fill={darken(bodyColor, 10)} stroke={outline} strokeWidth={1.2} transform="rotate(-60,68,136)" opacity={0.85} />
      ) : (
        <Ellipse cx={70} cy={145} rx={14} ry={26} fill={darken(bodyColor, 10)} stroke={outline} strokeWidth={1.2} transform="rotate(-10,70,145)" opacity={0.75} />
      )}

      {isSleepy && (
        <>
          <SvgText x={126} y={64} fontSize={11} fill="#8FA396" fontWeight="bold" opacity={0.7}>z</SvgText>
          <SvgText x={136} y={55} fontSize={9} fill="#8FA396" fontWeight="bold" opacity={0.5}>z</SvgText>
        </>
      )}
      {isExcited && (
        <>
          <SvgText x={60} y={128} fontSize={12} fill="#F5E6A8" opacity={0.9}>✦</SvgText>
          <SvgText x={130} y={60} fontSize={10} fill="#F5E6A8" opacity={0.8}>✦</SvgText>
        </>
      )}
    </G>
  );
}

// --- Stork ---
function StorkBody({
  bodyColor, cheekColor, eyeStyle, patternId,
  isSleepy, isResting, eyesOpen, isExcited, isWaving, isCurious,
}: PetBodyProps) {
  const outline = darken(bodyColor, 28);
  const belly   = lighten(bodyColor, 30);
  const blink   = !eyesOpen || isSleepy || isResting;
  const eyeY    = isCurious ? 85 : 88;

  return (
    <G>
      {/* Legs */}
      <Rect x={88}  y={182} width={7} height={28} rx={3.5} fill={darken(bodyColor, 10)} stroke={outline} strokeWidth={1} />
      <Rect x={105} y={182} width={7} height={28} rx={3.5} fill={darken(bodyColor, 10)} stroke={outline} strokeWidth={1} />
      {/* Feet */}
      <Path d="M82,208 L98,210" stroke={outline} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M105,208 L120,210" stroke={outline} strokeWidth={2.5} strokeLinecap="round" />

      {/* Body */}
      <Ellipse cx={100} cy={148} rx={36} ry={38} fill={bodyColor} stroke={outline} strokeWidth={1.5} />
      <Ellipse cx={100} cy={158} rx={20} ry={24} fill={belly} opacity={0.6} />

      {/* Pattern */}
      {patternId === 'soft_stripes' && (
        <>
          <Path d="M82,140 Q100,136 118,140" stroke={darken(bodyColor, 14)} strokeWidth={2.5} fill="none" opacity={0.4} />
          <Path d="M80,152 Q100,148 120,152" stroke={darken(bodyColor, 14)} strokeWidth={2.5} fill="none" opacity={0.4} />
        </>
      )}

      {/* Wings */}
      {isWaving ? (
        <Ellipse cx={64} cy={138} rx={14} ry={28} fill={darken(bodyColor, 12)} stroke={outline} strokeWidth={1.2} transform="rotate(-55,64,138)" opacity={0.8} />
      ) : (
        <Ellipse cx={66} cy={148} rx={14} ry={28} fill={darken(bodyColor, 12)} stroke={outline} strokeWidth={1.2} transform="rotate(-8,66,148)" opacity={0.75} />
      )}
      <Ellipse cx={134} cy={148} rx={14} ry={28} fill={darken(bodyColor, 12)} stroke={outline} strokeWidth={1.2} transform="rotate(8,134,148)" opacity={0.75} />

      {/* Neck */}
      <Rect x={90} y={105} width={20} height={44} rx={10} fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Head */}
      <Ellipse cx={100} cy={98} rx={28} ry={24} fill={bodyColor} stroke={outline} strokeWidth={1.5} />

      {/* Long beak */}
      <Path d="M112,100 L148,96 L112,104 Z" fill={darken(cheekColor, 5)} stroke={outline} strokeWidth={1} />

      {/* Black eye ring (stork look) */}
      <Ellipse cx={86} cy={eyeY} rx={7} ry={7} fill="#2F3634" opacity={0.12} />
      <Ellipse cx={114} cy={eyeY} rx={7} ry={7} fill="#2F3634" opacity={0.12} />

      {/* Cheeks */}
      <Ellipse cx={80}  cy={eyeY + 9} rx={7} ry={4.5} fill={cheekColor} opacity={0.4} />
      <Ellipse cx={118} cy={eyeY + 9} rx={7} ry={4.5} fill={cheekColor} opacity={0.4} />

      {/* Eyes */}
      <EyePair lx={86} rx={114} y={eyeY} style={eyeStyle} blink={blink} excited={isExcited} outline={outline} />

      {isSleepy && (
        <>
          <SvgText x={124} y={78} fontSize={12} fill="#8FA396" fontWeight="bold" opacity={0.7}>z</SvgText>
          <SvgText x={134} y={68} fontSize={9} fill="#8FA396" fontWeight="bold" opacity={0.5}>z</SvgText>
        </>
      )}
      {isExcited && (
        <>
          <SvgText x={58} y={128} fontSize={13} fill="#F5E6A8" opacity={0.9}>✦</SvgText>
          <SvgText x={138} y={80} fontSize={10} fill="#F5E6A8" opacity={0.8}>✦</SvgText>
        </>
      )}
    </G>
  );
}

// ─── Eye Pair ─────────────────────────────────────────────────────────────────

type EyePairProps = {
  lx: number; rx: number; y: number;
  style: string;
  blink: boolean;
  excited: boolean;
  outline: string;
};

function EyePair({ lx, rx, y, style, blink, excited, outline }: EyePairProps) {
  if (blink) {
    // Closed eye = thin horizontal line
    return (
      <G>
        <Path d={`M${lx - 5},${y} Q${lx},${y - 3} ${lx + 5},${y}`} stroke={outline} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d={`M${rx - 5},${y} Q${rx},${y - 3} ${rx + 5},${y}`} stroke={outline} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </G>
    );
  }

  if (excited) {
    // Crescent / happy eyes
    return (
      <G>
        <Path d={`M${lx - 6},${y + 2} Q${lx},${y - 7} ${lx + 6},${y + 2}`} stroke={outline} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        <Path d={`M${rx - 6},${y + 2} Q${rx},${y - 7} ${rx + 6},${y + 2}`} stroke={outline} strokeWidth={2.5} fill="none" strokeLinecap="round" />
      </G>
    );
  }

  // Standard eyes by style
  switch (style) {
    case 'dot':
      return (
        <G>
          <Circle cx={lx} cy={y} r={3.5} fill={outline} />
          <Circle cx={rx} cy={y} r={3.5} fill={outline} />
          <Circle cx={lx - 1} cy={y - 1} r={1.2} fill="white" opacity={0.9} />
          <Circle cx={rx - 1} cy={y - 1} r={1.2} fill="white" opacity={0.9} />
        </G>
      );

    case 'lash':
      return (
        <G>
          <Circle cx={lx} cy={y} r={6} fill={outline} />
          <Circle cx={lx} cy={y} r={3.5} fill="white" />
          <Circle cx={lx} cy={y} r={2.2} fill={outline} />
          <Circle cx={lx - 1.5} cy={y - 1.5} r={1} fill="white" opacity={0.9} />
          {/* Lashes */}
          <Path d={`M${lx - 6},${y - 2} L${lx - 9},${y - 6}`} stroke={outline} strokeWidth={1.5} strokeLinecap="round" />
          <Path d={`M${lx - 3},${y - 6} L${lx - 4},${y - 10}`} stroke={outline} strokeWidth={1.5} strokeLinecap="round" />
          <Path d={`M${lx + 2},${y - 6} L${lx + 2},${y - 10}`} stroke={outline} strokeWidth={1.5} strokeLinecap="round" />
          <Circle cx={rx} cy={y} r={6} fill={outline} />
          <Circle cx={rx} cy={y} r={3.5} fill="white" />
          <Circle cx={rx} cy={y} r={2.2} fill={outline} />
          <Circle cx={rx - 1.5} cy={y - 1.5} r={1} fill="white" opacity={0.9} />
          <Path d={`M${rx - 6},${y - 2} L${rx - 9},${y - 6}`} stroke={outline} strokeWidth={1.5} strokeLinecap="round" />
          <Path d={`M${rx - 3},${y - 6} L${rx - 4},${y - 10}`} stroke={outline} strokeWidth={1.5} strokeLinecap="round" />
          <Path d={`M${rx + 2},${y - 6} L${rx + 2},${y - 10}`} stroke={outline} strokeWidth={1.5} strokeLinecap="round" />
        </G>
      );

    case 'sparkle':
      return (
        <G>
          <Circle cx={lx} cy={y} r={7} fill={outline} />
          <Circle cx={lx} cy={y} r={4.5} fill="white" />
          <Circle cx={lx} cy={y} r={2.8} fill={outline} />
          {/* Sparkle highlights */}
          <Circle cx={lx - 2} cy={y - 2} r={1.3} fill="white" opacity={0.95} />
          <Circle cx={lx + 2} cy={y + 1} r={0.7} fill="white" opacity={0.7} />
          <Circle cx={rx} cy={y} r={7} fill={outline} />
          <Circle cx={rx} cy={y} r={4.5} fill="white" />
          <Circle cx={rx} cy={y} r={2.8} fill={outline} />
          <Circle cx={rx - 2} cy={y - 2} r={1.3} fill="white" opacity={0.95} />
          <Circle cx={rx + 2} cy={y + 1} r={0.7} fill="white" opacity={0.7} />
        </G>
      );

    case 'round':
    default:
      return (
        <G>
          <Circle cx={lx} cy={y} r={6} fill={outline} />
          <Circle cx={lx} cy={y} r={3.8} fill="white" />
          <Circle cx={lx} cy={y} r={2.2} fill={outline} />
          <Circle cx={lx - 1.2} cy={y - 1.2} r={1} fill="white" opacity={0.85} />
          <Circle cx={rx} cy={y} r={6} fill={outline} />
          <Circle cx={rx} cy={y} r={3.8} fill="white" />
          <Circle cx={rx} cy={y} r={2.2} fill={outline} />
          <Circle cx={rx - 1.2} cy={y - 1.2} r={1} fill="white" opacity={0.85} />
        </G>
      );
  }
}

// ─── Accessory Overlays ───────────────────────────────────────────────────────

function HatOverlay({ hatId, bodyColor }: { hatId: string; bodyColor: string }) {
  const c1 = '#6fae8f';
  const c2 = '#E8A0A8';
  const c3 = '#E8C48A';
  switch (hatId) {
    case 'bow':
      return (
        <G transform="translate(78, 66)">
          <Ellipse cx={-10} cy={0} rx={11} ry={7} fill={c2} opacity={0.9} />
          <Ellipse cx={10}  cy={0} rx={11} ry={7} fill={c2} opacity={0.9} />
          <Circle cx={0} cy={0} r={5} fill={darken(c2, 12)} opacity={0.9} />
        </G>
      );
    case 'flower':
      return (
        <G transform="translate(100, 70)">
          {[0,1,2,3,4].map(i => {
            const a = (i / 5) * Math.PI * 2;
            return <Circle key={i} cx={Math.cos(a) * 11} cy={Math.sin(a) * 11} r={6} fill={c2} opacity={0.9} />;
          })}
          <Circle cx={0} cy={0} r={5} fill={c3} opacity={0.95} />
        </G>
      );
    case 'beanie':
      return (
        <G transform="translate(100, 76)">
          <Ellipse cx={0} cy={0} rx={22} ry={16} fill={c1} opacity={0.9} />
          <Ellipse cx={0} cy={6} rx={24} ry={7} fill={darken(c1, 12)} opacity={0.8} />
          <Circle cx={0} cy={-14} r={5} fill={darken(c1, 8)} opacity={0.85} />
        </G>
      );
    case 'crown_soft':
      return (
        <G transform="translate(100, 74)">
          <Rect x={-20} y={0} width={40} height={10} rx={5} fill={c3} opacity={0.9} />
          {[-16, -8, 0, 8, 16].map((x, i) => (
            <Polygon key={i} points={`${x},-2 ${x + 5},0 ${x + 5},10 ${x - 5},10 ${x - 5},0`}
              fill={lighten(c3, 15)} opacity={0.85} />
          ))}
        </G>
      );
    case 'leaf':
      return (
        <G transform="translate(100, 70)">
          <Ellipse cx={0} cy={0} rx={14} ry={9} fill="#8DC48A" opacity={0.9} transform="rotate(-25)" />
          <Path d="M0,-8 L0,8" stroke="#6A9E6A" strokeWidth={1.5} strokeLinecap="round" />
        </G>
      );
    case 'beret':
      return (
        <G transform="translate(96, 72)">
          <Ellipse cx={0} cy={0} rx={24} ry={14} fill={c2} opacity={0.88} transform="rotate(-15)" />
          <Circle cx={-8} cy={-10} r={4} fill={darken(c2, 10)} opacity={0.9} />
        </G>
      );
    case 'headband':
      return (
        <G transform="translate(100, 82)">
          <Rect x={-26} y={-5} width={52} height={10} rx={5} fill={c2} opacity={0.85} />
          <Circle cx={0} cy={-4} r={5} fill={darken(c2, 8)} opacity={0.85} />
        </G>
      );
    case 'cloud_hat':
      return (
        <G transform="translate(100, 72)">
          <Ellipse cx={0} cy={0} rx={20} ry={11} fill="#E8EEF4" opacity={0.92} />
          <Circle cx={-10} cy={-3} r={9} fill="#E8EEF4" opacity={0.92} />
          <Circle cx={10} cy={-3} r={9} fill="#E8EEF4" opacity={0.92} />
          <Circle cx={0} cy={-6} r={10} fill="#E8EEF4" opacity={0.92} />
        </G>
      );
    default:
      return null;
  }
}

function NeckOverlay({ neckId }: { neckId: string }) {
  switch (neckId) {
    case 'scarf':
      return (
        <G transform="translate(100, 128)">
          <Ellipse cx={0} cy={0} rx={26} ry={10} fill="#6fae8f" opacity={0.88} />
          <Rect x={8} y={4} width={12} height={20} rx={4} fill="#6fae8f" opacity={0.8} />
        </G>
      );
    case 'ribbon':
      return (
        <G transform="translate(100, 128)">
          <Ellipse cx={0} cy={0} rx={22} ry={8} fill="#E8A0A8" opacity={0.85} />
          <Ellipse cx={-8} cy={2} rx={7} ry={5} fill="#E8A0A8" opacity={0.8} />
          <Ellipse cx={8}  cy={2} rx={7} ry={5} fill="#E8A0A8" opacity={0.8} />
        </G>
      );
    case 'bell':
      return (
        <G transform="translate(100, 128)">
          <Ellipse cx={0} cy={0} rx={20} ry={7} fill="#E8C48A" opacity={0.8} />
          <Ellipse cx={0} cy={8} rx={6} ry={8} fill="#E8C48A" opacity={0.9} />
          <Circle cx={0} cy={14} r={2.5} fill={darken('#E8C48A', 20)} opacity={0.9} />
        </G>
      );
    case 'pearls':
      return (
        <G transform="translate(100, 126)">
          {[-20,-14,-8,0,8,14,20].map((x, i) => (
            <Circle key={i} cx={x} cy={0} r={4.5} fill="#F3E6D4" stroke="#D4C0A0" strokeWidth={0.8} opacity={0.9} />
          ))}
        </G>
      );
    case 'bandana':
      return (
        <G transform="translate(100, 128)">
          <Ellipse cx={0} cy={0} rx={26} ry={10} fill="#B8D9C4" opacity={0.85} />
          <Polygon points="0,8 -8,22 8,22" fill="#8FBF9A" opacity={0.8} />
        </G>
      );
    default:
      return null;
  }
}

function FaceOverlay({ faceId }: { faceId: string }) {
  switch (faceId) {
    case 'glasses':
      return (
        <G transform="translate(100, 100)">
          <Circle cx={-15} cy={0} r={10} fill="none" stroke="#445566" strokeWidth={2.5} opacity={0.8} />
          <Circle cx={15}  cy={0} r={10} fill="none" stroke="#445566" strokeWidth={2.5} opacity={0.8} />
          <Path d="M-5,0 L5,0" stroke="#445566" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
          <Path d="M-32,0 L-25,0" stroke="#445566" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
          <Path d="M25,0 L32,0" stroke="#445566" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
        </G>
      );
    case 'blush':
      return (
        <G>
          <Ellipse cx={77} cy={113} rx={12} ry={8} fill="#E8A0A8" opacity={0.35} />
          <Ellipse cx={123} cy={113} rx={12} ry={8} fill="#E8A0A8" opacity={0.35} />
        </G>
      );
    case 'freckle_face':
      return (
        <G>
          {[-3, 0, 3].map((ox, i) => (
            <Circle key={`l${i}`} cx={80 + ox * 2} cy={110 + (i % 2) * 3} r={1.8} fill="#C4A892" opacity={0.55} />
          ))}
          {[-3, 0, 3].map((ox, i) => (
            <Circle key={`r${i}`} cx={120 + ox * 2} cy={110 + (i % 2) * 3} r={1.8} fill="#C4A892" opacity={0.55} />
          ))}
        </G>
      );
    case 'star_mark':
      return (
        <G transform="translate(115, 88)">
          <SvgText fontSize={12} fill="#F5E6A8" textAnchor="middle" opacity={0.9}>★</SvgText>
        </G>
      );
    default:
      return null;
  }
}

function HeldOverlay({ heldId }: { heldId: string }) {
  switch (heldId) {
    case 'star':
      return (
        <G transform="translate(148, 155)">
          <SvgText fontSize={20} fill="#F5E6A8" textAnchor="middle" opacity={0.9}>★</SvgText>
        </G>
      );
    case 'heart':
      return (
        <G transform="translate(148, 155)">
          <Path d="M0,-8 C0,-8 -10,-16 -10,-6 C-10,4 0,14 0,14 C0,14 10,4 10,-6 C10,-16 0,-8 0,-8 Z"
            fill="#E8A0A8" opacity={0.9} />
        </G>
      );
    case 'flower_stem':
      return (
        <G transform="translate(148, 148)">
          <Rect x={-2} y={0} width={4} height={18} rx={2} fill="#6fae8f" opacity={0.85} />
          <Circle cx={0} cy={-4} r={7} fill="#F0C4C8" opacity={0.88} />
          <Circle cx={0} cy={-4} r={3.5} fill="#F5E6A8" opacity={0.9} />
        </G>
      );
    case 'yarn':
      return (
        <G transform="translate(148, 155)">
          <Circle cx={0} cy={0} r={10} fill="#D4C2E0" opacity={0.88} />
          <Path d="M-8,-2 Q0,-8 8,-2" stroke="#C4A8D4" strokeWidth={2} fill="none" opacity={0.7} />
          <Path d="M-9,2 Q0,8 9,2" stroke="#C4A8D4" strokeWidth={2} fill="none" opacity={0.7} />
        </G>
      );
    case 'tea':
      return (
        <G transform="translate(148, 153)">
          <Rect x={-8} y={-6} width={16} height={14} rx={4} fill="#E8EEF0" stroke="#B0C0C8" strokeWidth={1.2} opacity={0.9} />
          <Path d="M8,0 Q14,0 14,6 Q14,10 8,8" fill="none" stroke="#B0C0C8" strokeWidth={1.5} opacity={0.85} />
          <Ellipse cx={0} cy={-5} rx={6} ry={2} fill="#C8D4E0" opacity={0.7} />
        </G>
      );
    case 'book':
      return (
        <G transform="translate(145, 152)">
          <Rect x={-10} y={-8} width={20} height={18} rx={2} fill="#8FBF9A" opacity={0.88} />
          <Rect x={-10} y={-8} width={4}  height={18} rx={2} fill="#6A9E6A" opacity={0.88} />
          <Path d="M-3,-4 L8,-4 M-3,0 L8,0 M-3,4 L8,4" stroke="white" strokeWidth={1} opacity={0.6} />
        </G>
      );
    default:
      return null;
  }
}

function AccentOverlay({ accentId, size }: { accentId: string; size: number }) {
  const half = size / 2;
  switch (accentId) {
    case 'sparkles':
      return (
        <G>
          <SvgText x={half * 0.2} y={half * 0.3} fontSize={14} fill="#F5E6A8" opacity={0.75}>✦</SvgText>
          <SvgText x={half * 1.6} y={half * 0.4} fontSize={10} fill="#F5E6A8" opacity={0.65}>✦</SvgText>
          <SvgText x={half * 0.15} y={half * 1.6} fontSize={9}  fill="#F5E6A8" opacity={0.55}>✦</SvgText>
        </G>
      );
    case 'tiny_hearts':
      return (
        <G>
          <SvgText x={half * 0.2} y={half * 0.35} fontSize={13} fill="#E8A0A8" opacity={0.7}>♥</SvgText>
          <SvgText x={half * 1.6} y={half * 0.4}  fontSize={10} fill="#E8A0A8" opacity={0.6}>♥</SvgText>
        </G>
      );
    case 'warm_glow':
      return (
        <G>
          <Circle cx={half} cy={half} r={half * 0.96} fill="#FFF0E0" opacity={0.12} />
        </G>
      );
    case 'petals':
      return (
        <G>
          <SvgText x={half * 0.2}  y={half * 0.3}  fontSize={12} fill="#F0C4C8" opacity={0.7}>✿</SvgText>
          <SvgText x={half * 1.62} y={half * 0.4}  fontSize={9}  fill="#F0C4C8" opacity={0.6}>✿</SvgText>
          <SvgText x={half * 0.18} y={half * 1.65} fontSize={8}  fill="#F0C4C8" opacity={0.55}>✿</SvgText>
        </G>
      );
    default:
      return null;
  }
}

// ─── Heart Particle ───────────────────────────────────────────────────────────

/** One animated heart particle for the tap burst */
function HeartParticle({ particle, size }: { particle: Particle; size: number }) {
  const translateX = particle.x as Animated.AnimatedValue;
  const translateY = particle.y as Animated.AnimatedValue;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: size / 2 - 10,
          top:  size / 2 - 10,
          opacity: particle.opacity,
          transform: [
            { translateX },
            { translateY },
            { scale: particle.scale },
          ],
        },
      ]}
    >
      {/* Small inline SVG heart */}
      <Svg width={20} height={20} viewBox="0 0 20 20">
        <Path
          d="M10,16 C10,16 2,10 2,5 C2,2.5 4,1 6,1 C7.6,1 9,2 10,3 C11,2 12.4,1 14,1 C16,1 18,2.5 18,5 C18,10 10,16 10,16 Z"
          fill="#E8A0A8"
        />
      </Svg>
    </Animated.View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function VirtualPet({
  appearance,
  mood,
  vitalityState = 'healthy',
  onTap,
  size = 300,
  reducedMotion = false,
}: VirtualPetProps) {
  // ── Resolve colors & scene ──
  const colorDef = useMemo(
    () => resolveColor(appearance.petColor),
    [appearance.petColor],
  );
  const sceneDef = useMemo(
    () => resolveScene(appearance.scene),
    [appearance.scene],
  );
  const bodyColor  = colorDef.body;
  const cheekColor = colorDef.cheek;

  // ── Mood flags ──
  const isSleepy   = mood === 'sleepy';
  const isResting  = mood === 'resting';
  const isExcited  = mood === 'excited';
  const isWaving   = mood === 'waving';
  const isCurious  = mood === 'curious';
  const isHappy    = mood === 'happy';

  // ── Animated values ──
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const floatAnim   = useRef(new Animated.Value(0)).current;
  const bounceAnim  = useRef(new Animated.Value(1)).current;
  const tiltAnim    = useRef(new Animated.Value(TILT_BY_MOOD[mood] ?? 0)).current;
  const armAnim     = useRef(new Animated.Value(0)).current;

  // ── Blink state (drives SVG re-render) ──
  const [eyesOpen, setEyesOpen] = useState(true);

  // ── Particle state ──
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleCounter = useRef(0);

  // ─── Breathing loop ───
  useEffect(() => {
    if (reducedMotion) return;
    const speed = isSleepy ? 0.35 : isResting ? 0.55 : isExcited ? 1.4 : 1;
    const dur   = BREATHE_DURATION / speed;
    const scaleMin = 0.98;
    const scaleMax = isSleepy ? 1.012 : isExcited ? 1.03 : 1.02;

    const breathe = loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: scaleMax, duration: dur / 2,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: scaleMin, duration: dur / 2,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    );
    breathe.start();
    return () => breathe.stop();
  }, [reducedMotion, mood, breatheAnim, isSleepy, isResting, isExcited]);

  // ─── Float / hover loop ───
  useEffect(() => {
    if (reducedMotion) { floatAnim.setValue(0); return; }
    const amp  = isSleepy ? 1.5 : isResting ? 2 : isExcited ? 5 : 4;
    const dur  = FLOAT_DURATION * (isSleepy ? 1.8 : isResting ? 1.4 : 1);

    const float = loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -amp, duration: dur / 2,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: amp, duration: dur / 2,
          easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ]),
    );
    float.start();
    return () => float.stop();
  }, [reducedMotion, mood, floatAnim, isSleepy, isResting, isExcited]);

  // ─── Tilt to target mood ───
  useEffect(() => {
    Animated.spring(tiltAnim, {
      toValue: TILT_BY_MOOD[mood] ?? 0,
      tension: 60, friction: 10,
      useNativeDriver: true,
    }).start();
  }, [mood, tiltAnim]);

  // ─── Arm wave animation ───
  useEffect(() => {
    if (!isWaving || reducedMotion) { armAnim.setValue(0); return; }
    const wave = loop(
      Animated.sequence([
        Animated.timing(armAnim, {
          toValue: 1, duration: 350,
          easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
        Animated.timing(armAnim, {
          toValue: 0, duration: 350,
          easing: Easing.inOut(Easing.quad), useNativeDriver: true,
        }),
      ]),
    );
    wave.start();
    return () => wave.stop();
  }, [isWaving, reducedMotion, armAnim]);

  // ─── Excited bounce on state entry ───
  useEffect(() => {
    if (!isExcited || reducedMotion) return;
    Animated.sequence([
      Animated.timing(bounceAnim, {
        toValue: 1.15, duration: 160,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1, friction: 4, tension: 120, useNativeDriver: true,
      }),
    ]).start();
  }, [isExcited, reducedMotion, bounceAnim]);

  // ─── Blink timer ───
  useEffect(() => {
    if (reducedMotion) return;
    const doBlink = () => {
      setEyesOpen(false);
      setTimeout(() => setEyesOpen(true), BLINK_DURATION);
    };
    // Randomise first blink offset so multiple pets don't sync
    const first = BLINK_INTERVAL + Math.random() * 1500;
    const timeout = setTimeout(() => {
      doBlink();
      const interval = setInterval(doBlink, BLINK_INTERVAL + Math.random() * 800);
      return interval;
    }, first);
    return () => clearTimeout(timeout);
  }, [reducedMotion]);

  // ─── Tap handler ───
  const handleTap = useCallback(() => {
    onTap?.();

    // Bounce
    if (!reducedMotion) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.14, duration: 120,
          easing: Easing.out(Easing.quad), useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1, friction: 5, tension: 100, useNativeDriver: true,
        }),
      ]).start();
    }

    // Heart particle burst (5 hearts)
    if (!reducedMotion) {
      const newParticles: Particle[] = [];
      for (let i = 0; i < 5; i++) {
        const id     = ++particleCounter.current;
        const angle  = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const dist   = 55 + Math.random() * 30;
        const px = new Animated.Value(0);
        const py = new Animated.Value(0);
        const op = new Animated.Value(1);
        const sc = new Animated.Value(0.4 + Math.random() * 0.4);

        const dur = 700 + Math.random() * 300;
        Animated.parallel([
          Animated.timing(px, {
            toValue: Math.cos(angle) * dist, duration: dur,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(py, {
            toValue: Math.sin(angle) * dist - 20, duration: dur,
            easing: Easing.out(Easing.quad), useNativeDriver: true,
          }),
          Animated.timing(op, {
            toValue: 0, duration: dur,
            easing: Easing.in(Easing.quad), useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(sc, {
              toValue: 1.2, duration: dur * 0.3,
              easing: Easing.out(Easing.quad), useNativeDriver: true,
            }),
            Animated.timing(sc, {
              toValue: 0.6, duration: dur * 0.7,
              easing: Easing.in(Easing.quad), useNativeDriver: true,
            }),
          ]),
        ]).start(() => {
          setParticles(prev => prev.filter(p => p.id !== id));
        });

        newParticles.push({ id, x: px, y: py, opacity: op, scale: sc });
      }
      setParticles(prev => [...prev, ...newParticles]);
    }
  }, [onTap, reducedMotion, bounceAnim]);

  // ─── Choose pet body component ───
  const bodyProps: PetBodyProps = {
    bodyColor,
    cheekColor,
    eyeStyle:  appearance.eyes,
    patternId: appearance.pattern,
    isSleepy, isResting, isExcited, isWaving, isCurious,
    eyesOpen,
    armAnim,
    size,
  };

  const PetBodyComponent = useMemo(() => {
    switch (appearance.petType) {
      case 'horse':    return HorseBody;
      case 'parrot':   return ParrotBody;
      case 'flamingo': return FlamingoBody;
      case 'stork':    return StorkBody;
      case 'fox':
      default:         return FoxBody;
    }
  }, [appearance.petType]);

  // ─── Vitality dimming & recovery styling ───
  const isDormant = vitalityState === 'dormant';
  const isDimmed = vitalityState === 'dimmed';
  const isFatigued = vitalityState === 'fatigued';
  const vitalityOpacity = isDormant ? 0.58 : isDimmed ? 0.74 : isFatigued ? 0.88 : 1.0;

  // ─── Scene background colour ───
  const bgColor = isDormant || isSleepy || isResting ? '#E4EBF2' : isDimmed ? '#EFECE6' : sceneDef.fill;

  // ─── Render ───
  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${appearance.petName}, ${mood}, vitality: ${vitalityState}`}
    >
      {/* Tap wrapper */}
      <Pressable
        onPress={handleTap}
        style={[styles.pressable, { borderRadius: size * 0.18 }]}
        accessibilityRole="button"
        accessibilityLabel={`Tap ${appearance.petName}`}
        hitSlop={8}
      >
        {/* Scene background */}
        <View
          style={[
            styles.bg,
            { backgroundColor: bgColor, borderRadius: size * 0.18, width: size, height: size },
          ]}
        >
          {/* Shadow ellipse */}
          <View
            style={[
              styles.shadow,
              {
                width: size * 0.55,
                height: size * 0.08,
                borderRadius: size * 0.04,
                bottom: size * 0.04,
                left: size * 0.22,
                opacity: vitalityOpacity * 0.9,
              },
            ]}
          />

          {/* The animated pet */}
          <Animated.View
            style={[
              styles.petWrapper,
              {
                opacity: vitalityOpacity,
                transform: [
                  { translateY: floatAnim },
                  { scale: Animated.multiply(breatheAnim, bounceAnim) },
                  {
                    rotate: tiltAnim.interpolate({
                      inputRange: [-30, 30],
                      outputRange: ['-30deg', '30deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            <Svg
              width={size}
              height={size}
              viewBox="0 0 200 200"
            >
              {/* Pet body */}
              <PetBodyComponent {...bodyProps} />

              {/* Accessory overlays (drawn in SVG space) */}
              {appearance.hat  !== 'none' && <HatOverlay  hatId={appearance.hat}   bodyColor={bodyColor} />}
              {appearance.neck !== 'none' && <NeckOverlay neckId={appearance.neck} />}
              {appearance.face !== 'none' && <FaceOverlay faceId={appearance.face} />}
              {appearance.held !== 'none' && <HeldOverlay heldId={appearance.held} />}
              {appearance.accent !== 'none' && <AccentOverlay accentId={appearance.accent} size={200} />}
            </Svg>
          </Animated.View>
        </View>

        {/* Heart particles (absolute-positioned over the view) */}
        {particles.map(p => (
          <HeartParticle key={p.id} particle={p} size={size} />
        ))}
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  pressable: {
    overflow: 'visible',
  },
  bg: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.10)',
  },
  petWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  particle: {
    position: 'absolute',
    width: 20,
    height: 20,
    pointerEvents: 'none',
  },
});
