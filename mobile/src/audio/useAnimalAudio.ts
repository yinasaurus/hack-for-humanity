import { useAudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import {
  ANIMAL_SOUND_MANIFEST,
  animalSoundIsPlayable,
  getAnimalSoundEntry,
  type AnimalSoundKind,
} from './animalSounds';
import { replaceAndPlayAnimalCall } from './animalAudioPlayback';
import { playWebAnimalCall } from './webAnimalAudioPlayback';

export type AnimalCallResult = {
  /** Exact duration recorded in the manifest; zero means no call was played. */
  durationMs: number;
  /** False for mute, missing provenance, interruption, or native playback error. */
  played: boolean;
  warning?: string;
};

export type AnimalAudioHandle = {
  play(species: string, kind: AnimalSoundKind): Promise<AnimalCallResult>;
  stop(): void;
};

/**
 * Expo Audio boundary for short, user-triggered animal calls.
 *
 * The player starts with a null source and is replaced only after a manifest
 * entry has passed the ready/provenance gate. This keeps WebView/iframe code
 * free of audio policy and makes a missing recording a silent, inspectable
 * result instead of a synthesized substitute.
 */
export function useAnimalAudio(muted: boolean): AnimalAudioHandle {
  const player = useAudioPlayer(null, { updateInterval: 100 });
  const mutedRef = useRef(muted);
  const requestRef = useRef(0);
  const webSounds = useRef(new Map<string, HTMLAudioElement>());
  const webCurrent = useRef<HTMLAudioElement | null>(null);

  const getOrCreateWebSound = useCallback((species: string, kind: AnimalSoundKind) => {
    if (Platform.OS !== 'web') return null;
    const key = `${species}:${kind}`;
    const cached = webSounds.current.get(key);
    if (cached) return cached;
    const entry = getAnimalSoundEntry(species, kind);
    if (!animalSoundIsPlayable(entry)) return null;
    const asset = Asset.fromModule(entry.source);
    const audio = new Audio(asset.uri);
    audio.preload = 'auto';
    audio.volume = mutedRef.current ? 0 : 1;
    audio.load();
    webSounds.current.set(key, audio);
    return audio;
  }, []);

  const stop = useCallback(() => {
    requestRef.current += 1;
    const webAudio = webCurrent.current;
    if (webAudio) {
      webAudio.pause();
      try { webAudio.currentTime = 0; } catch { /* Source may still be loading. */ }
      webCurrent.current = null;
    }
    try {
      player.pause();
      void player.seekTo(0).catch(() => {
        /* A player that has not loaded a source has nothing to seek. */
      });
    } catch {
      /* Native teardown is best effort during navigation/interruption. */
    }
  }, [player]);

  useEffect(() => {
    mutedRef.current = muted;
    webSounds.current.forEach((audio) => { audio.volume = muted ? 0 : 1; });
    try {
      player.volume = muted ? 0 : 1;
    } catch {
      /* A player may be releasing while settings are restored. */
    }
    if (muted) stop();
  }, [muted, player, stop]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    Object.keys(ANIMAL_SOUND_MANIFEST).forEach((species) => {
      getOrCreateWebSound(species, 'talk');
    });
    return () => {
      webSounds.current.forEach((audio) => audio.pause());
      webSounds.current.clear();
    };
  }, [getOrCreateWebSound]);

  const play = useCallback(
    async (species: string, kind: AnimalSoundKind): Promise<AnimalCallResult> => {
      stop();
      const request = ++requestRef.current;

      if (mutedRef.current) {
        return {
          durationMs: 0,
          played: false,
          warning: 'Companion voice is muted.',
        };
      }

      const entry = getAnimalSoundEntry(species, kind);
      if (!animalSoundIsPlayable(entry)) {
        return {
          durationMs: 0,
          played: false,
          warning: entry?.warnings[0] || `No verified ${kind} recording for ${species}.`,
        };
      }

      if (Platform.OS === 'web') {
        const audio = getOrCreateWebSound(species, kind);
        if (!audio) {
          return { durationMs: 0, played: false, warning: 'Could not prepare the animal call.' };
        }
        webCurrent.current = audio;
        audio.volume = 1;
        try {
          const played = await playWebAnimalCall(
            audio,
            () => request !== requestRef.current || mutedRef.current
          );
          return played
            ? { durationMs: entry.durationMs, played: true }
            : { durationMs: 0, played: false, warning: 'Animal call interrupted before playback.' };
        } catch {
          return {
            durationMs: 0,
            played: false,
            warning: 'The browser blocked the animal call. Check site sound and device volume.',
          };
        }
      }

      try {
        player.volume = 1;
        const played = await replaceAndPlayAnimalCall(
          player,
          entry.source,
          () => request !== requestRef.current || mutedRef.current
        );
        if (!played) {
          player.pause();
          return {
            durationMs: 0,
            played: false,
            warning: request !== requestRef.current || mutedRef.current
              ? 'Animal call interrupted before playback.'
              : 'The animal call did not finish loading. Please try Talk again.',
          };
        }
        return { durationMs: entry.durationMs, played: true };
      } catch {
        return {
          durationMs: 0,
          played: false,
          warning: `Could not play the verified ${species} ${kind} recording.`,
        };
      }
    },
    [getOrCreateWebSound, player, stop]
  );

  useEffect(() => () => stop(), [stop]);

  return useMemo(() => ({ play, stop }), [play, stop]);
}
