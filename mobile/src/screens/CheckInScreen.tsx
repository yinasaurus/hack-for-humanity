import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import { API_BASE, submitCheckIn, submitCheckInPhoto } from '../api';
import { SupportChip } from '../components/SupportChip';

type Props = {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: object) => void;
  };
};

/**
 * Live camera capture only — no gallery picker.
 */
export function CheckInScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.sageDeep} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.body}>
          KindPlate needs the camera so you can take a photo of your meal. Photos
          are not chosen from your library — only a live photo from this screen.
        </Text>
        <Pressable
          style={styles.cta}
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Allow camera access"
        >
          <Text style={styles.ctaText}>Allow camera</Text>
        </Pressable>
        {permission.canAskAgain === false && (
          <Pressable
            style={styles.linkBtn}
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Open device settings"
          >
            <Text style={styles.linkText}>Open settings</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back without taking a photo"
          style={styles.backHit}
        >
          <Text style={styles.back}>Not now — that’s okay</Text>
        </Pressable>
        <SupportChip />
      </View>
    );
  }

  const capture = async () => {
    if (!cameraRef.current || !user || busy) return;
    if (!cameraReady) {
      setError('Camera is still starting — wait a second, then try again.');
      return;
    }

    setBusy(true);
    setError(null);
    setDoneMessage(null);
    setStatus('Capturing…');

    try {
      // skipProcessing:true often drops base64 on Android — avoid it
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.45,
        base64: true,
        exif: false,
        shutterSound: false,
      });

      if (!photo?.uri && !photo?.base64) {
        throw new Error('Camera did not return a photo. Try again.');
      }

      setStatus('Saving to KindPlate…');

      let result: Awaited<ReturnType<typeof submitCheckInPhoto>>;
      try {
        if (photo.uri) {
          result = await submitCheckInPhoto(user.id, photo.uri, 'image/jpeg');
        } else {
          throw new Error('no uri');
        }
      } catch (uploadErr) {
        // Fallback: base64 JSON (or read file if base64 missing)
        let b64 = photo.base64;
        if (!b64 && photo.uri) {
          b64 = await FileSystem.readAsStringAsync(photo.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        if (!b64) {
          throw uploadErr instanceof Error
            ? uploadErr
            : new Error('Could not read photo data');
        }
        setStatus('Saving (backup path)…');
        result = await submitCheckIn(user.id, b64, 'image/jpeg');
      }

      setStatus(null);
      setDoneMessage('Saved — your companion noticed you stopped by.');
      const unlocks = result.companion?.newlyUnlocked || [];
      setTimeout(() => {
        navigation.navigate('Home', {
          celebrate: true,
          newUnlocks: unlocks,
        });
      }, 700);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save photo';
      const hint =
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('fetch') ||
        msg.toLowerCase().includes('connect')
          ? `\n\nCheck Wi‑Fi/hotspot and API ${API_BASE}`
          : '';
      setError(`${msg}${hint}`);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 12) + 8,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
        },
      ]}
    >
      <Text style={styles.header} accessibilityRole="header">
        Take a photo of your meal
      </Text>
      <Text style={styles.sub}>
        One gentle moment if you want — or leave anytime. Skipping is always okay.
      </Text>

      <View style={styles.cameraWrap}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode="picture"
          onCameraReady={() => setCameraReady(true)}
          onMountError={(err) => {
            setError(err.message || 'Camera failed to start');
            setCameraReady(false);
          }}
        />
        {!cameraReady ? (
          <View style={styles.cameraBusy}>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.cameraBusyText}>Starting camera…</Text>
          </View>
        ) : null}
      </View>

      {status ? <Text style={styles.status}>{status}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {doneMessage ? <Text style={styles.done}>{doneMessage}</Text> : null}

      <Pressable
        style={[styles.shutter, (!cameraReady || busy) && styles.shutterDisabled]}
        onPress={capture}
        disabled={busy || !cameraReady}
        accessibilityRole="button"
        accessibilityLabel={cameraReady ? 'Capture meal photo' : 'Wait for camera'}
        accessibilityState={{ disabled: busy || !cameraReady }}
      >
        {busy ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.shutterText}>
            {cameraReady ? 'Capture' : 'Wait for camera…'}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => navigation.goBack()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Skip check-in for now"
        style={styles.backHit}
      >
        <Text style={styles.back}>Not now — that’s okay</Text>
      </Pressable>

      {Platform.OS === 'android' ? (
        <Text style={styles.hint}>Tip: hold steady for a second after tapping Capture.</Text>
      ) : null}
      <SupportChip />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
    paddingHorizontal: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.cream,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: colors.ink,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  sub: {
    marginTop: 6,
    marginBottom: spacing.md,
    fontFamily: 'Nunito_400Regular',
    color: colors.inkSoft,
    fontSize: 15,
  },
  body: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 24,
    color: colors.inkSoft,
    marginBottom: spacing.lg,
  },
  cameraWrap: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.ink,
    minHeight: 320,
  },
  camera: { flex: 1 },
  cameraBusy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 8,
  },
  cameraBusyText: {
    color: '#fff',
    fontFamily: 'Nunito_600SemiBold',
  },
  shutter: {
    marginTop: spacing.lg,
    backgroundColor: colors.coral,
    borderRadius: 22,
    minHeight: tapTarget.min,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: { opacity: 0.55 },
  shutterText: {
    color: colors.white,
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
  },
  cta: {
    backgroundColor: colors.coral,
    borderRadius: 18,
    minHeight: tapTarget.min,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  ctaText: {
    color: colors.white,
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  linkBtn: {
    alignItems: 'center',
    marginBottom: spacing.md,
    minHeight: tapTarget.min,
    justifyContent: 'center',
  },
  linkText: { color: colors.sageDeep, fontFamily: 'Nunito_700Bold' },
  backHit: {
    minHeight: tapTarget.min,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  back: {
    textAlign: 'center',
    color: colors.inkSoft,
    fontSize: 15,
    fontFamily: 'Nunito_600SemiBold',
  },
  status: {
    marginTop: spacing.sm,
    color: colors.inkSoft,
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
  },
  error: {
    marginTop: spacing.sm,
    color: '#B85C38',
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 20,
  },
  done: {
    marginTop: spacing.sm,
    color: colors.sage,
    textAlign: 'center',
    fontFamily: 'Nunito_700Bold',
  },
  hint: {
    marginTop: 10,
    textAlign: 'center',
    fontSize: 12,
    color: colors.inkSoft,
    fontFamily: 'Nunito_400Regular',
  },
});
