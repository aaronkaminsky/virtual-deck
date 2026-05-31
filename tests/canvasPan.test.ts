import { describe, it, expect } from "vitest";
import {
  clampScroll,
  touchActionForOverflow,
  nudgeDelta,
  PAN_TAP_THRESHOLD_PX,
  NUDGE_FRACTION,
} from "@/lib/canvas-utils";

describe("clampScroll", () => {
  it("clamps to [0, inner - viewport] on both axes", () => {
    // inner 1000x800, viewport 400x300 → max scroll 600x500
    expect(clampScroll(700, 900, 1000, 800, 400, 300)).toEqual({ x: 600, y: 500 });
    expect(clampScroll(-50, -10, 1000, 800, 400, 300)).toEqual({ x: 0, y: 0 });
    expect(clampScroll(123, 45, 1000, 800, 400, 300)).toEqual({ x: 123, y: 45 });
  });

  it("clamps to 0 when content is not larger than the viewport", () => {
    expect(clampScroll(50, 50, 300, 200, 400, 300)).toEqual({ x: 0, y: 0 });
  });
});

describe("touchActionForOverflow", () => {
  it("returns auto when nothing overflows", () => {
    expect(touchActionForOverflow({ left: false, right: false, up: false, down: false })).toBe("auto");
  });
  it("returns pan-y when only horizontal overflows (browser keeps vertical page scroll)", () => {
    expect(touchActionForOverflow({ left: false, right: true, up: false, down: false })).toBe("pan-y");
  });
  it("returns pan-x when only vertical overflows", () => {
    expect(touchActionForOverflow({ left: false, right: false, up: false, down: true })).toBe("pan-x");
  });
  it("returns none when both axes overflow", () => {
    expect(touchActionForOverflow({ left: true, right: false, up: false, down: true })).toBe("none");
  });
});

describe("nudgeDelta", () => {
  it("moves half a viewport in the arrow's direction", () => {
    expect(nudgeDelta("right", 400, 300)).toEqual({ dx: 200, dy: 0 });
    expect(nudgeDelta("left", 400, 300)).toEqual({ dx: -200, dy: 0 });
    expect(nudgeDelta("down", 400, 300)).toEqual({ dx: 0, dy: 150 });
    expect(nudgeDelta("up", 400, 300)).toEqual({ dx: 0, dy: -150 });
  });
});

describe("constants", () => {
  it("exposes a small tap threshold and a half-viewport nudge fraction", () => {
    expect(PAN_TAP_THRESHOLD_PX).toBe(6);
    expect(NUDGE_FRACTION).toBe(0.5);
  });
});
