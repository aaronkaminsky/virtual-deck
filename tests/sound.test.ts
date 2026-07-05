import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getMuted, setMuted, playSound, preloadSounds, __resetSoundForTests, CELEBRATE_VARIANT_COUNT } from "../src/lib/sound";

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
}

class MockAudio {
  static instances: MockAudio[] = [];
  src: string;
  preload = "";
  currentTime = 0;
  play = vi.fn().mockResolvedValue(undefined);
  load = vi.fn();
  constructor(src: string) { this.src = src; MockAudio.instances.push(this); }
}

beforeEach(() => {
  __resetSoundForTests();
  MockAudio.instances = [];
  vi.stubGlobal("localStorage", makeStorage());
  vi.stubGlobal("Audio", MockAudio);
});

afterEach(() => {
  vi.unstubAllGlobals();
  __resetSoundForTests();
});

describe("sound mute policy", () => {
  it("defaults to unmuted when nothing is stored", () => {
    expect(getMuted()).toBe(false);
  });

  it("setMuted persists to localStorage and is reflected by getMuted", () => {
    setMuted(true);
    expect(getMuted()).toBe(true);
    expect(localStorage.getItem("vd-muted")).toBe("1");
  });

  it("initializes muted from an existing localStorage value", () => {
    localStorage.setItem("vd-muted", "1");
    expect(getMuted()).toBe(true);
  });
});

describe("playSound gating", () => {
  it("plays when unmuted and resets currentTime", () => {
    setMuted(false);
    playSound("shuffle");
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(1);
    expect(MockAudio.instances[0].currentTime).toBe(0);
  });

  it("does not play when muted", () => {
    setMuted(true);
    playSound("shuffle");
    expect(MockAudio.instances).toHaveLength(0);
  });
});

describe("celebrate variant selection", () => {
  it("plays the numbered celebrate variant chosen by Math.random", () => {
    setMuted(false);
    const randSpy = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      playSound("celebrate");
    } finally {
      randSpy.mockRestore();
    }
    const expected = Math.floor(0.5 * CELEBRATE_VARIANT_COUNT) + 1;
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toMatch(new RegExp(`sounds/celebrate${expected}\\.mp3$`));
  });

  it("only ever selects variants within 1..N", () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      __resetSoundForTests();
      MockAudio.instances = [];
      setMuted(false);
      const randSpy = vi.spyOn(Math, "random").mockReturnValue(r);
      try {
        playSound("celebrate");
      } finally {
        randSpy.mockRestore();
      }
      const match = MockAudio.instances[0].src.match(/sounds\/celebrate(\d+)\.mp3$/);
      expect(match).not.toBeNull();
      const n = Number(match![1]);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(CELEBRATE_VARIANT_COUNT);
    }
  });

  it("uses a bare filename (no number) for single-variant sounds", () => {
    setMuted(false);
    playSound("shuffle");
    expect(MockAudio.instances[0].src).toMatch(/sounds\/shuffle\.mp3$/);
  });
});

describe("preloadSounds", () => {
  it("warms shuffle, deal, and every celebrate variant", () => {
    preloadSounds();
    expect(MockAudio.instances).toHaveLength(4 + CELEBRATE_VARIANT_COUNT);
    for (const a of MockAudio.instances) {
      expect(a.load).toHaveBeenCalledTimes(1);
    }
    const srcs = MockAudio.instances.map(a => a.src);
    expect(srcs.some(s => s.endsWith("sounds/shuffle.mp3"))).toBe(true);
    expect(srcs.some(s => s.endsWith("sounds/deal.mp3"))).toBe(true);
    expect(srcs.some(s => s.endsWith("sounds/chip-bet.mp3"))).toBe(true);
    expect(srcs.some(s => s.endsWith("sounds/chip-collect.mp3"))).toBe(true);
    for (let i = 1; i <= CELEBRATE_VARIANT_COUNT; i++) {
      expect(srcs.some(s => s.endsWith(`sounds/celebrate${i}.mp3`))).toBe(true);
    }
  });

  it("reuses a warmed element on play instead of creating a new one", () => {
    setMuted(false);
    preloadSounds();
    const countAfterPreload = MockAudio.instances.length;
    playSound("shuffle");
    expect(MockAudio.instances).toHaveLength(countAfterPreload); // reused, not recreated
    const shuffleEl = MockAudio.instances.find(a => a.src.endsWith("sounds/shuffle.mp3"))!;
    expect(shuffleEl.play).toHaveBeenCalledTimes(1);
  });
});

describe("chip sounds", () => {
  it("playSound('chip-bet') resolves to chip-bet.mp3", () => {
    setMuted(false);
    playSound("chip-bet");
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toMatch(/sounds\/chip-bet\.mp3$/);
  });

  it("playSound('chip-collect') resolves to chip-collect.mp3", () => {
    setMuted(false);
    playSound("chip-collect");
    expect(MockAudio.instances).toHaveLength(1);
    expect(MockAudio.instances[0].src).toMatch(/sounds\/chip-collect\.mp3$/);
  });

  it("preloadSounds loads chip-bet.mp3 and chip-collect.mp3", () => {
    preloadSounds();
    const srcs = MockAudio.instances.map(a => a.src);
    expect(srcs.some(s => s.endsWith("chip-bet.mp3"))).toBe(true);
    expect(srcs.some(s => s.endsWith("chip-collect.mp3"))).toBe(true);
  });
});

describe("attract sound", () => {
  it("plays a random numbered attract variant", () => {
    const rand = vi.spyOn(Math, "random");
    rand.mockReturnValue(0);
    playSound("attract");
    expect(MockAudio.instances[0].src).toMatch(/sounds\/attract1\.mp3$/);
    expect(MockAudio.instances[0].play).toHaveBeenCalled();
    rand.mockReturnValue(0.999);
    playSound("attract");
    expect(MockAudio.instances[1].src).toMatch(/sounds\/attract2\.mp3$/);
    rand.mockRestore();
  });

  it("does not preload attract.mp3 (it fires minutes into a session)", () => {
    preloadSounds();
    expect(MockAudio.instances.some(a => a.src.includes("attract"))).toBe(false);
  });
});
