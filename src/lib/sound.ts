const MUTE_KEY = "vd-muted";

export type SoundName = "shuffle" | "deal" | "celebrate";

let mutedCache: boolean | null = null;
const audioCache = new Map<string, HTMLAudioElement>(); // keyed by resolved filename

// Number of celebrate variants in public/sounds/ (celebrate1.mp3 .. celebrateN.mp3).
// A random one plays on each celebration. Set this to match the files you add.
export const CELEBRATE_VARIANT_COUNT = 4;

// Number of numbered variants per sound. When > 1, files are named e.g.
// celebrate1.mp3 .. celebrateN.mp3; when 1, the file is the bare name (shuffle.mp3).
const VARIANT_COUNTS: Record<SoundName, number> = {
  shuffle: 1,
  deal: 1,
  celebrate: CELEBRATE_VARIANT_COUNT,
};

function resolveFile(name: SoundName): string {
  const count = VARIANT_COUNTS[name];
  if (count <= 1) return `${name}.mp3`;
  const n = Math.floor(Math.random() * count) + 1;
  return `${name}${n}.mp3`;
}

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

function getAudio(file: string): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  let el = audioCache.get(file);
  if (!el) {
    const base = import.meta.env.BASE_URL || "/";
    el = new Audio(`${base}sounds/${file}`);
    el.preload = "auto";
    audioCache.set(file, el);
  }
  return el;
}

export function playSound(name: SoundName): void {
  if (getMuted()) return;
  const el = getAudio(resolveFile(name));
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
