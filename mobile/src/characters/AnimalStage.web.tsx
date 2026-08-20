import React, { Suspense, useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { AnimalCharacter } from './AnimalCharacter';
import type { AnimalCharacterHandle, AnimalClipMap, CharacterDef } from './types';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = {
  character: CharacterDef;
  onHandleReady?: (handle: AnimalCharacterHandle) => void;
  muted?: boolean;
};

/**
 * Web-only R3F stage (WebGL2). Native uses AnimalStage stub + AnimalWebView.
 */
export function AnimalStage({ character, onHandleReady, muted = true }: Props) {
  const [key, setKey] = useState(character.id);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    setKey(character.id);
  }, [character.id, character.modelPath]);

  const onReady = useCallback(
    (handle: AnimalCharacterHandle) => {
      onHandleReady?.(handle);
    },
    [onHandleReady]
  );

  const clips: AnimalClipMap = useMemo(() => character.clips, [character.clips]);

  if (!character.modelPath) {
    return <View style={styles.empty} accessibilityLabel="Companion unavailable" />;
  }

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel="3D companion. Use the buttons below to interact."
      accessibilityRole="image"
    >
      <Canvas
        key={key}
        camera={{ position: [0, 1.1, 3.2], fov: 40 }}
        gl={{ antialias: true }}
        style={StyleSheet.absoluteFill}
        onCreated={({ gl }) => {
          gl.setClearColor('#F7F4EF');
        }}
      >
        <ambientLight intensity={0.65} />
        <directionalLight position={[4, 6, 3]} intensity={1.0} castShadow />
        <directionalLight position={[-3, 2, -2]} intensity={0.35} />
        <Suspense fallback={null}>
          <AnimalCharacter
            modelPath={character.modelPath}
            clips={clips}
            scale={character.scale ?? 1}
            position={character.position ?? [0, -0.8, 0]}
            rotation={character.rotation ?? [0, 0.4, 0]}
            onReady={onReady}
            reducedMotion={reducedMotion}
            muted={muted}
          />
          <Environment preset="city" />
          <ContactShadows position={[0, -0.85, 0]} opacity={0.28} scale={8} blur={2.8} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={!reducedMotion}
          minPolarAngle={0.8}
          maxPolarAngle={1.55}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 280, borderRadius: 24, overflow: 'hidden' },
  empty: { flex: 1, minHeight: 280, backgroundColor: '#E8EEF0', borderRadius: 24 },
});
