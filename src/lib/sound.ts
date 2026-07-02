const MUTE_KEY = "vd-muted";

export type SoundName = "shuffle" | "shuffle-flourish" | "deal" | "celebrate" | "chip-bet" | "chip-collect" | "jeer" | "attract";

let mutedCache: boolean | null = null;
const audioCache = new Map<string, HTMLAudioElement>(); // keyed by resolved filename

// Number of celebrate variants in public/sounds/ (celebrate1.mp3 .. celebrateN.mp3).
// A random one plays on each celebration. Set this to match the files you add.
export const CELEBRATE_VARIANT_COUNT = 4;

// Number of numbered variants per sound. When > 1, files are named e.g.
// celebrate1.mp3 .. celebrateN.mp3; when 1, the file is the bare name (shuffle.mp3).
const VARIANT_COUNTS: Record<SoundName, number> = {
  shuffle: 1,
  "shuffle-flourish": 1,
  deal: 1,
  celebrate: CELEBRATE_VARIANT_COUNT,
  "chip-bet": 1,
  "chip-collect": 1,
  jeer: 1,
  attract: 2,
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

// Eagerly fetch + decode every sound file. Call once inside a user gesture (e.g. joining a
// room) so the first shuffle/deal/celebrate doesn't pay fetch/decode latency on first play.
export function preloadSounds(): void {
  if (typeof Audio === "undefined") return;
  const files = ["shuffle.mp3", "deal.mp3", "chip-bet.mp3", "chip-collect.mp3"];
  for (let i = 1; i <= CELEBRATE_VARIANT_COUNT; i++) files.push(`celebrate${i}.mp3`);
  for (const file of files) {
    getAudio(file)?.load();
  }
}

// Test-only: clear module-level caches between tests.
export function __resetSoundForTests(): void {
  mutedCache = null;
  audioCache.clear();
}
