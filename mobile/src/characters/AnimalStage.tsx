import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import type { AnimalCharacterHandle, CharacterDef } from './types';

type Props = {
  character: CharacterDef;
  onHandleReady?: (handle: AnimalCharacterHandle) => void;
};

/**
 * Default (native) stub — keeps Three/drei out of the Expo Go Android bundle.
 * Web builds resolve `AnimalStage.web.tsx` instead.
 */
export function AnimalStage(_props: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>3D needs web</Text>
      <Text style={styles.body}>
        Talking Tom GLB playback uses WebGL2. On phone Expo Go, open the project with Expo web, or
        use a custom dev build.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 280,
    borderRadius: 24,
    backgroundColor: colors.sageWash,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
