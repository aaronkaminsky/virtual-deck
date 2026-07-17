import { describe, it, expect } from "vitest";
import TokenDiscSrc from "../src/components/TokenDisc.tsx?raw";
import TokenTraySrc from "../src/components/TokenTray.tsx?raw";
import ControlsBarSrc from "../src/components/ControlsBar.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("TokenDisc", () => {
  it("renders a fixed-size disc per TokenId with a D on the dealer puck", () => {
    expect(TokenDiscSrc).toMatch(/TOKEN_SIZE/);
    expect(TokenDiscSrc).toMatch(/dealer/);
    expect(TokenDiscSrc).toMatch(/rounded-full/);
    expect(TokenDiscSrc).toMatch(/'D'/);
  });
});

describe("TokenTray", () => {
  it("is a droppable with id token-tray", () => {
    expect(TokenTraySrc).toMatch(/useDroppable\(\{\s*id:\s*'token-tray'\s*\}\)/);
  });

  it("tray tokens are draggables carrying type token data", () => {
    expect(TokenTraySrc).toMatch(/useDraggable/);
    expect(TokenTraySrc).toMatch(/type:\s*'token'/);
    expect(TokenTraySrc).toMatch(/`token-\$\{tokenId\}`/);
  });

  it("renders a draggable for tray tokens and an empty slot for placed ones", () => {
    expect(TokenTraySrc).toMatch(/tray-token-/);
    expect(TokenTraySrc).toMatch(/token-slot-/);
    expect(TokenTraySrc).toMatch(/pos === null/);
  });
});

describe("ControlsBar tokens toggle", () => {
  it("dispatches SET_TOKENS_MODE to flip tokensEnabled", () => {
    expect(ControlsBarSrc).toMatch(/type:\s*'SET_TOKENS_MODE'[\s\S]{0,80}enabled:\s*!gameState\.tokensEnabled/);
  });

  it("labels the toggle with enable/disable aria", () => {
    expect(ControlsBarSrc).toMatch(/Enable tokens/);
    expect(ControlsBarSrc).toMatch(/Disable tokens/);
  });
});

describe("BoardView renders TokenTray in the rail when tokens are enabled", () => {
  it("imports TokenTray", () => {
    expect(BoardViewSrc).toMatch(/import\s*\{\s*TokenTray\s*\}\s*from\s*'\.\/TokenTray'/);
  });

  it("guards TokenTray with gameState.tokensEnabled", () => {
    expect(BoardViewSrc).toMatch(/gameState\.tokensEnabled\s*&&[\s\S]{0,200}<TokenTray/);
  });
});
