import { describe, it, expect } from "vitest";
import { resolveTokenDrop, TOKEN_SIZE } from "../src/lib/tokenDrag";

const geometry = { canvasW: 800, canvasH: 600, tokenSize: TOKEN_SIZE };

describe("resolveTokenDrop", () => {
  it("returns none when dropped over nothing", () => {
    expect(resolveTokenDrop({ overId: null, fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });

  it("returns a placed token to the tray when dropped on it", () => {
    expect(resolveTokenDrop({ overId: "token-tray", fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "return" });
  });

  it("tray-to-tray drop is a no-op", () => {
    expect(resolveTokenDrop({ overId: "token-tray", fromTray: true, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });

  it("places on canvas with coordinates clamped to bounds", () => {
    expect(resolveTokenDrop({ overId: "canvas", fromTray: true, base: { x: -20, y: 9999 }, ...geometry }))
      .toEqual({ kind: "place", x: 0, y: 600 - TOKEN_SIZE });
    expect(resolveTokenDrop({ overId: "canvas", fromTray: false, base: { x: 100, y: 200 }, ...geometry }))
      .toEqual({ kind: "place", x: 100, y: 200 });
  });

  it("any other drop target snaps back", () => {
    expect(resolveTokenDrop({ overId: "pile-draw", fromTray: false, base: { x: 0, y: 0 }, ...geometry }))
      .toEqual({ kind: "none" });
  });
});
