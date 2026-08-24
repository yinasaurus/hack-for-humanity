export type LoadableAnimalAudioPlayer = {
  isLoaded: boolean;
  replace(source: number | string): void;
  seekTo(seconds: number): Promise<void>;
  play(): void;
};

const LOAD_POLL_MS = 20;
const LOAD_TIMEOUT_MS = 2500;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Small playback seam around Expo Audio. This mirrors the existing dynamic
 * replace → seek → play sequence so browser loading behavior can be tested
 * without a real speaker or device.
 */
export async function replaceAndPlayAnimalCall(
  player: LoadableAnimalAudioPlayer,
  source: number | string,
  isCancelled: () => boolean
): Promise<boolean> {
  player.replace(source);

  // replace() is synchronous but loading is not, especially from Expo CLI's
  // localhost asset server. Yield once so isLoaded can leave its stale value,
  // then wait for the new local recording with a bounded timeout.
  await wait(LOAD_POLL_MS);
  const deadline = Date.now() + LOAD_TIMEOUT_MS;
  while (!player.isLoaded && Date.now() < deadline) {
    if (isCancelled()) return false;
    await wait(LOAD_POLL_MS);
  }
  if (!player.isLoaded || isCancelled()) return false;

  await player.seekTo(0);
  if (isCancelled()) return false;
  player.play();
  return true;
}
