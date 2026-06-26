import { describe, it, expect } from "vitest";
import CanvasZoneSrc from "../src/components/CanvasZone.tsx?raw";

describe("Canvas overflow detection (1005)", () => {
  it("destructures contentMaxX and contentMaxY from the canvas size useMemo", () => {
    expect(CanvasZoneSrc).toMatch(/\{\s*innerW,\s*innerH,\s*contentMaxX,\s*contentMaxY\s*\}/);
  });

  it("useMemo returns contentMaxX: 0 and contentMaxY: 0 in the empty-canvas branch", () => {
    expect(CanvasZoneSrc).toMatch(/contentMaxX:\s*0/);
    expect(CanvasZoneSrc).toMatch(/contentMaxY:\s*0/);
  });

  it("hasOverflow.right uses contentMaxX instead of innerW", () => {
    expect(CanvasZoneSrc).toMatch(/right:\s*contentMaxX\s*>/);
    expect(CanvasZoneSrc).not.toMatch(/right:\s*scroll\.x\s*<\s*innerW/);
  });

  it("hasOverflow.down uses contentMaxY instead of innerH", () => {
    expect(CanvasZoneSrc).toMatch(/down:\s*contentMaxY\s*>/);
    expect(CanvasZoneSrc).not.toMatch(/down:\s*scroll\.y\s*<\s*innerH/);
  });
});
