import { describe, it, expect } from "vitest";
import CanvasTokenSrc from "../src/components/CanvasToken.tsx?raw";
import CanvasZoneSrc from "../src/components/CanvasZone.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("CanvasToken", () => {
  it("is a draggable carrying type token data with the shared token id", () => {
    expect(CanvasTokenSrc).toMatch(/useDraggable/);
    expect(CanvasTokenSrc).toMatch(/type:\s*'token'/);
    expect(CanvasTokenSrc).toMatch(/`token-\$\{token\.id\}`/);
  });

  it("positions absolutely at the canvas placement and hides while dragging", () => {
    expect(CanvasTokenSrc).toMatch(/position:\s*'absolute'/);
    expect(CanvasTokenSrc).toMatch(/left:\s*token\.placement\.x/);
    expect(CanvasTokenSrc).toMatch(/zIndex:\s*token\.placement\.z/);
    expect(CanvasTokenSrc).toMatch(/isDragging\s*\?\s*0\s*:\s*1/);
  });

  it("carries data-token and a canvas-token testid", () => {
    expect(CanvasTokenSrc).toMatch(/data-token=""/);
    expect(CanvasTokenSrc).toMatch(/canvas-token-/);
  });

  it("renders nothing for a non-canvas placement", () => {
    expect(CanvasTokenSrc).toMatch(/placement\.kind !== 'canvas'/);
  });
});

describe("CanvasZone token integration", () => {
  it("renders CanvasToken for each canvasTokens entry", () => {
    expect(CanvasZoneSrc).toMatch(/canvasTokens\.map/);
    expect(CanvasZoneSrc).toMatch(/<CanvasToken/);
  });

  it("includes token extents in the inner canvas bounds", () => {
    expect(CanvasZoneSrc).toMatch(/TOKEN_SIZE/);
  });

  it("excludes tokens from drag-to-pan", () => {
    expect(CanvasZoneSrc).toMatch(/\[data-token\]/);
  });
});

describe("BoardView passes canvasTokens", () => {
  it("filters to canvas-placement tokens only", () => {
    expect(BoardViewSrc).toMatch(/tokensEnabled\s*\?\s*gameState\.tokens\.filter\(t => t\.placement\.kind === 'canvas'\)\s*:\s*\[\]/);
  });
});
