import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getMuted, setMuted, playSound, __resetSoundForTests, CELEBRATE_VARIANT_COUNT } from "../src/lib/sound";

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
