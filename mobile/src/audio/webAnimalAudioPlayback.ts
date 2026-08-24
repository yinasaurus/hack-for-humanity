export type WebAnimalAudioElement = {
  currentTime: number;
  volume: number;
  play(): Promise<void> | void;
  pause(): void;
};

/**
 * Call play() before the first await so a localhost browser keeps the direct
 * Talk tap as its user-activation gesture. Awaiting asset/player state first
 * can cause browsers to reject an otherwise valid animal call as autoplay.
 */
export async function playWebAnimalCall(
  audio: WebAnimalAudioElement,
  isCancelled: () => boolean
): Promise<boolean> {
  if (isCancelled()) return false;
  audio.currentTime = 0;
  const playback = audio.play();
  await playback;
  if (isCancelled()) {
    audio.pause();
    audio.currentTime = 0;
    return false;
  }
  return true;
}
