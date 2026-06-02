const MUTE_KEY = "vd-muted";

export type SoundName = "shuffle" | "deal" | "celebrate";

let mutedCache: boolean | null = null;
const audioCache = new Map<SoundName, HTMLAudioElement>();

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getMuted(): boolean {
  if (mutedCache === null) mutedCache = loadMuted();
  return mutedCache;
}

export function setMuted(value: boolean): void {
  mutedCache = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* localStorage unavailable — keep in-memory only */
  }
}

function getAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  let el = audioCache.get(name);
  if (!el) {
    const base = import.meta.env.BASE_URL || "/";
    el = new Audio(`${base}sounds/${name}.mp3`);
    el.preload = "auto";
    audioCache.set(name, el);
  }
  return el;
}

export function playSound(name: SoundName): void {
  if (getMuted()) return;
  const el = getAudio(name);
  if (!el) return;
  el.currentTime = 0;
  void el.play().catch(() => {
    /* autoplay blocked or file missing — ignore */
  });
}

// Test-only: clear module-level caches between tests.
export function __resetSoundForTests(): void {
  mutedCache = null;
  audioCache.clear();
}
