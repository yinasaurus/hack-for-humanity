import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import {
  bondingHeartDurationMs,
  bondingHeartParticles,
  type BondingHeartIntensity,
} from '../companionBonding';
import { colors } from '../theme';

type Props = {
  burstId: number;
  intensity: BondingHeartIntensity;
  reducedMotion: boolean;
  onFinished: (burstId: number) => void;
};

export function BondingHeartBurst({ burstId, intensity, reducedMotion, onFinished }: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const particles = useMemo(() => bondingHeartParticles(intensity), [intensity]);

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: bondingHeartDurationMs(reducedMotion),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onFinished(burstId);
    });
    return () => animation.stop();
  }, [burstId, onFinished, progress, reducedMotion]);

  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.72, 1],
    outputRange: [0, 1, 0.9, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.18, 1],
    outputRange: [0.65, 1.08, reducedMotion ? 1 : 0.9],
  });

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.layer}
    >
      {particles.map((particle, index) => {
        const translateX = reducedMotion
          ? 0
          : progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.driftX] });
        const translateY = reducedMotion
          ? 0
          : progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.driftY] });
        return (
          <Animated.View
            key={`${burstId}-${index}`}
            style={[
              styles.particle,
              {
                left: `${particle.xPercent}%`,
                top: `${particle.yPercent}%`,
                opacity,
                transform: [
                  { translateX },
                  { translateY },
                  { scale },
                  { rotate: `${particle.rotate}deg` },
                ],
              },
            ]}
          >
            <Text style={[styles.heart, { fontSize: particle.size }]}>♥</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 9,
  },
  particle: { position: 'absolute' },
  heart: {
    color: colors.coral,
    lineHeight: 38,
    textShadowColor: colors.white,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
});
