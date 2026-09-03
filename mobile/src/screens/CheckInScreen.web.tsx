/**
 * CheckInScreen.web.tsx — web (Chrome / Safari on desktop) implementation.
 *
 * expo-camera's CameraView does not work in a browser context.  This file
 * uses the standard browser MediaStream / getUserMedia API instead so the
 * MacBook's built-in camera works in Expo Web / Chrome without any extra
 * native modules.
 *
 * Metro picks this file automatically on the `web` platform thanks to the
 * `.web.tsx` suffix (same pattern used by AnimalWebView.web.tsx).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import {
  API_BASE,
  submitCheckIn,
  submitVisitNote,
  type Unlock,
} from '../api';
import { SupportChip } from '../components/SupportChip';

/** After this, reassure the patient that analysis is still running. */
const STILL_CHECKING_AFTER_MS = 9_000;

type Props = {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: object) => void;
  };
};

type CamState = 'idle' | 'requesting' | 'denied' | 'active' | 'error';

export function CheckInScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { width, height } = useWindowDimensions();
  // Keep the complete check-in action visible on a desktop browser. The
  // preview remains square, but never expands to the full browser width.
  const cameraSize = Math.min(
    width - spacing.lg * 2,
    Math.max(192, Math.min(260, height - 520))
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stillCheckingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [camState, setCamState] = useState<CamState>('idle');
  const [camError, setCamError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);
  const [pendingUnlocks, setPendingUnlocks] = useState<Unlock[]>([]);
  const [visitNote, setVisitNote] = useState('');
  const [noteSentWithCheckIn, setNoteSentWithCheckIn] = useState(false);
  const [postNoteBusy, setPostNoteBusy] = useState(false);
  const [postNoteSaved, setPostNoteSaved] = useState(false);

  const clearStillCheckingTimer = () => {
    if (stillCheckingTimer.current) {
      clearTimeout(stillCheckingTimer.current);
      stillCheckingTimer.current = null;
    }
  };

  const beginPhotoCheckStatus = (initial: string) => {
    clearStillCheckingTimer();
    setStatus(initial);
    stillCheckingTimer.current = setTimeout(() => {
      setStatus('Still checking your photo…');
    }, STILL_CHECKING_AFTER_MS);
  };

  /** Stop all tracks and drop the MediaStream reference. */
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    return () => {
      clearStillCheckingTimer();
    };
  }, []);

  /** Ask for camera permission and start the live preview. */
  const startCamera = useCallback(async () => {
    setCamState('requesting');
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // prefer rear/built-in on Mac
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCamState('active');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'Camera permission denied. Allow access in your browser and try again.'
            : err.name === 'NotFoundError'
              ? 'No camera found on this device.'
              : err.message
          : 'Could not start camera.';
      setCamError(msg);
      setCamState(err instanceof Error && err.name === 'NotAllowedError' ? 'denied' : 'error');
    }
  }, []);

  /** Start camera on mount; stop on unmount. */
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      startCamera();
    } else {
      setCamState('error');
      setCamError('Camera is not available in this environment.');
    }
    return () => {
      stopStream();
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, [startCamera, stopStream]);

  const goHomeSaved = useCallback(
    (unlocks: Unlock[]) => {
      if (leaveTimer.current) {
        clearTimeout(leaveTimer.current);
        leaveTimer.current = null;
      }
      stopStream();
      navigation.navigate('Home', { celebrate: true, newUnlocks: unlocks });
    },
    [navigation, stopStream]
  );

  /** Snapshot the live video onto an offscreen canvas → base64 JPEG → upload. */
  const capture = async () => {
    if (camState !== 'active' || busy || !user) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    setBusy(true);
    setError(null);
    setStatus('Capturing…');

    try {
      // The preview is a square with `objectFit: cover`, so save that same
      // center-cropped square rather than the full camera frame. This means
      // the user sees exactly the area that will be sent to the app.
      const sourceWidth = video.videoWidth || 640;
      const sourceHeight = video.videoHeight || 480;
      const cropSize = Math.min(sourceWidth, sourceHeight);
      const cropX = Math.round((sourceWidth - cropSize) / 2);
      const cropY = Math.round((sourceHeight - cropSize) / 2);
      canvas.width = cropSize;
      canvas.height = cropSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable.');
      ctx.drawImage(
        video,
        cropX,
        cropY,
        cropSize,
        cropSize,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Export as JPEG base64 (quality ~28 % mirrors native config).
      const dataUrl = canvas.toDataURL('image/jpeg', 0.28);
      if (!dataUrl || dataUrl === 'data:,') throw new Error('Snapshot failed — try again.');

      // Replace the live feed immediately. The photo has already been taken;
      // only the upload and food check are still in progress.
      setCapturedPhoto(dataUrl);
      stopStream();
      beginPhotoCheckStatus('Checking your photo…');
      const noteForCareTeam = visitNote.trim();
      const result = await submitCheckIn(user.id, dataUrl, 'image/jpeg', noteForCareTeam || undefined);

      clearStillCheckingTimer();
      setStatus(null);
      const unlocks = (result.companion as { newlyUnlocked?: Unlock[] })?.newlyUnlocked || [];
      setPendingUnlocks(unlocks);
      setNoteSentWithCheckIn(Boolean(result.visitNoteSaved) || Boolean(noteForCareTeam));
      setDoneMessage('Your companion noticed you.');
      stopStream();
      leaveTimer.current = setTimeout(() => goHomeSaved(unlocks), 3200);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save photo';
      const softMeal =
        /not (appear to be )?a meal|doesn't look like a meal|doesn't look like food|food or a drink/i.test(msg);
      const hint =
        msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')
          ? `\n\nCheck Wi‑Fi and API ${API_BASE}`
          : softMeal
            ? '\n\nTry a food or drink photo, or skip.'
            : '';
      setError(`${msg}${hint}`);
      clearStillCheckingTimer();
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const retakePhoto = () => {
    if (busy) return;
    setCapturedPhoto(null);
    setError(null);
    clearStillCheckingTimer();
    setStatus(null);
    startCamera();
  };

  const sendPostNote = async () => {
    if (!user || postNoteBusy || !visitNote.trim()) return;
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setPostNoteBusy(true);
    setError(null);
    try {
      await submitVisitNote(user.id, visitNote.trim());
      setPostNoteSaved(true);
      setVisitNote('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save note');
    } finally {
      setPostNoteBusy(false);
    }
  };

  // ─── Done screen ───────────────────────────────────────────────────────────
  if (doneMessage) {
    const showOptionalNote = !noteSentWithCheckIn && !postNoteSaved;
    return (
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[
            styles.root,
            styles.savedRoot,
            {
              paddingTop: Math.max(insets.top, 12) + 8,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
              flexGrow: 1,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.header} accessibilityRole="header">Saved</Text>
          <Text style={styles.doneBig}>{doneMessage}</Text>
          {postNoteSaved ? (
            <Text style={styles.noteAck}>Note shared with your care team.</Text>
          ) : null}
          {showOptionalNote ? (
            <View style={styles.noteBlock}>
              <Text style={styles.noteLabel}>
                Anything you'd like your care team to know before your next visit? Optional.
              </Text>
              <TextInput
                style={styles.noteInput}
                value={visitNote}
                onChangeText={setVisitNote}
                placeholder="Write in your own words…"
                placeholderTextColor={colors.inkSoft}
                multiline
                textAlignVertical="top"
                editable={!postNoteBusy}
                accessibilityLabel="Optional note for your care team"
              />
              <Pressable
                style={[styles.ghostBtn, (!visitNote.trim() || postNoteBusy) && styles.shutterDisabled]}
                onPress={sendPostNote}
                disabled={!visitNote.trim() || postNoteBusy}
                accessibilityRole="button"
                accessibilityLabel="Send note to care team"
              >
                {postNoteBusy ? (
                  <ActivityIndicator color={colors.sageDeep} />
                ) : (
                  <Text style={styles.ghostBtnText}>Send note</Text>
                )}
              </Pressable>
            </View>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={styles.shutter}
            onPress={() => goHomeSaved(pendingUnlocks)}
            accessibilityRole="button"
            accessibilityLabel="Back to companion"
          >
            <Text style={styles.shutterText}>Back to companion</Text>
          </Pressable>
          <SupportChip />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── Permission denied / no camera ────────────────────────────────────────
  if (camState === 'denied' || camState === 'error') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Camera access</Text>
        <Text style={styles.body}>
          {camError ||
            'Buddi needs your camera to take a photo of your meal or drink.'}
        </Text>
        {camState === 'denied' ? (
          <Text style={styles.body}>
            Click the camera icon in your browser's address bar and allow access,
            then tap retry below.
          </Text>
        ) : null}
        <Pressable
          style={styles.cta}
          onPress={startCamera}
          accessibilityRole="button"
          accessibilityLabel="Retry camera"
        >
          <Text style={styles.ctaText}>Retry</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Skip check-in for now"
          style={styles.backHit}
        >
          <Text style={styles.back}>Skip</Text>
        </Pressable>
        <SupportChip />
      </View>
    );
  }

  // ─── Main camera screen ────────────────────────────────────────────────────
  const cameraReady = camState === 'active';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[
          styles.root,
          {
            paddingTop: Math.max(insets.top, 12) + 8,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            flexGrow: 1,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header} accessibilityRole="header">Check-in photo</Text>
        <Text style={styles.sub}>Food or drink · live camera · skip anytime</Text>

        {/* The live feed is replaced by the captured square while it is checked. */}
        <View style={[styles.cameraWrap, { width: cameraSize, height: cameraSize }]}>
          {capturedPhoto ? (
            // @ts-ignore — web-only <img> element inside React Native View
            <img
              src={capturedPhoto}
              style={styles.capturedImage as React.CSSProperties}
              alt="Captured check-in photo"
            />
          ) : (
            // @ts-ignore — web-only <video> element inside React Native View
            <video
              ref={videoRef}
              style={styles.videoEl as React.CSSProperties}
              autoPlay
              muted
              playsInline
              aria-label="Live camera preview"
            />
          )}
          {/* Hidden canvas for snapshot */}
          {/* @ts-ignore */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {busy && capturedPhoto ? (
            <View style={styles.cameraBusy} accessibilityLiveRegion="polite">
              <ActivityIndicator color={colors.white} />
              <Text style={styles.cameraBusyText}>Photo taken — checking…</Text>
            </View>
          ) : !cameraReady && !capturedPhoto ? (
            <View style={styles.cameraBusy}>
              <ActivityIndicator color={colors.white} />
              <Text style={styles.cameraBusyText}>
                {camState === 'requesting' ? 'Starting camera…' : 'Starting…'}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.noteBlock}>
          <Text style={styles.noteLabel}>
            Anything you'd like your care team to know before your next visit?
            Optional — skip anytime.
          </Text>
          <TextInput
            style={styles.noteInput}
            value={visitNote}
            onChangeText={setVisitNote}
            placeholder="Write in your own words…"
            placeholderTextColor={colors.inkSoft}
            multiline
            textAlignVertical="top"
            editable={!busy}
            accessibilityLabel="Optional note for your care team"
          />
        </View>

        {status ? (
          <View style={styles.statusRow} accessibilityLiveRegion="polite">
            {busy ? <ActivityIndicator color={colors.sageDeep} style={styles.statusSpin} /> : null}
            <Text style={styles.status}>{status}</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.shutter, (busy || (!cameraReady && !capturedPhoto)) && styles.shutterDisabled]}
          onPress={capturedPhoto ? retakePhoto : capture}
          disabled={busy || (!cameraReady && !capturedPhoto)}
          accessibilityRole="button"
          accessibilityLabel={
            busy ? 'Checking captured photo' : capturedPhoto ? 'Retake check-in photo' : cameraReady ? 'Capture check-in photo' : 'Wait for camera'
          }
          accessibilityState={{ disabled: busy || (!cameraReady && !capturedPhoto) }}
        >
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.shutterText}>
              {capturedPhoto ? 'Retake photo' : cameraReady ? 'Capture' : 'Starting camera…'}
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
          <Text style={styles.back}>Not now — that's okay</Text>
        </Pressable>

        <SupportChip />
      </ScrollView>
    </KeyboardAvoidingView>
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
    alignSelf: 'center',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.ink,
  },
  videoEl: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as object,
  capturedImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as object,
  cameraBusy: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    gap: 8,
  },
  cameraBusyText: {
    color: '#fff',
    fontFamily: 'Nunito_600SemiBold',
  },
  noteBlock: { marginTop: spacing.md },
  noteLabel: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
    marginBottom: 8,
  },
  noteInput: {
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D5D0C6',
    backgroundColor: '#FFFEFA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
  noteAck: {
    marginTop: spacing.sm,
    fontFamily: 'Nunito_600SemiBold',
    color: colors.sageDeep,
    fontSize: 15,
  },
  ghostBtn: {
    marginTop: 10,
    borderRadius: 18,
    minHeight: tapTarget.min,
    borderWidth: 1.5,
    borderColor: colors.sageDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  ghostBtnText: {
    color: colors.sageDeep,
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
  },
  shutter: {
    marginTop: spacing.md,
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
    marginTop: 0,
    color: colors.inkSoft,
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
    flexShrink: 1,
  },
  statusRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusSpin: {
    marginRight: 2,
  },
  error: {
    marginTop: spacing.sm,
    color: '#B85C38',
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
    lineHeight: 20,
  },
  doneBig: {
    marginTop: spacing.lg,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    lineHeight: 30,
    color: colors.sageDeep,
  },
  savedRoot: { justifyContent: 'center' },
});
