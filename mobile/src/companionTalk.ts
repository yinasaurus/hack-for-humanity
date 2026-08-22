/**
 * Gentle companion Talk lines — short, never guilt / scores / body talk.
 * User-initiated only (never auto-play).
 */

const SCRIPTS: ((name: string) => string)[] = [
  (n) => `Hi, I’m ${n}. Glad you’re here — no rush.`,
  (n) => `Hey, it’s ${n}. We can just sit together for a bit.`,
  (n) => `Hello from ${n}. A meal photo is optional — always.`,
  (n) => `It’s ${n}. Talk, wave, or rest — whatever feels right.`,
  (n) => `Hi again — ${n} here. Showing up is enough.`,
  (n) => `Hey. I’m ${n}. Quiet company is welcome anytime.`,
];

/** Pick a stable-ish rotating script (not random-guilt tied to streaks). */
export function nextCompanionTalk(petName: string, salt = Date.now()): string {
  const name = (petName || 'your companion').trim() || 'your companion';
  const idx = Math.abs(Math.floor(salt / 1000)) % SCRIPTS.length;
  return SCRIPTS[idx](name);
}
