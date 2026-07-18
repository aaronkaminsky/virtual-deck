import { describe, it, expect } from "vitest";
import AnchoredTokenDiscSrc from "../src/components/AnchoredTokenDisc.tsx?raw";
import HandZoneSrc from "../src/components/HandZone.tsx?raw";
import OpponentHandSrc from "../src/components/OpponentHand.tsx?raw";
import BoardViewSrc from "../src/components/BoardView.tsx?raw";

describe("AnchoredTokenDisc", () => {
  it("is a draggable carrying the same id/data contract as tray and canvas tokens", () => {
    expect(AnchoredTokenDiscSrc).toMatch(/useDraggable/);
    expect(AnchoredTokenDiscSrc).toMatch(/type:\s*'token'/);
    expect(AnchoredTokenDiscSrc).toMatch(/`token-\$\{tokenId\}`/);
  });

  it("renders a small TokenDisc with an anchored-token testid", () => {
    expect(AnchoredTokenDiscSrc).toMatch(/<TokenDisc tokenId=\{tokenId\} size="sm"\s*\/>/);
    expect(AnchoredTokenDiscSrc).toMatch(/`anchored-token-\$\{tokenId\}`/);
  });
});

describe("HandZone anchored token rendering", () => {
  it("imports AnchoredTokenDisc and accepts anchoredTokenIds", () => {
    expect(HandZoneSrc).toMatch(/import\s*\{\s*AnchoredTokenDisc\s*\}\s*from\s*'\.\/AnchoredTokenDisc'/);
    expect(HandZoneSrc).toMatch(/anchoredTokenIds:\s*TokenId\[\]/);
  });

  it("renders one AnchoredTokenDisc per anchored id inside the name row", () => {
    const nameRowMatch = HandZoneSrc.match(/<div className="flex items-center gap-2 px-4 mb-1">[\s\S]*?<\/div>\s*<div\s/);
    expect(nameRowMatch).not.toBeNull();
    expect(nameRowMatch![0]).toMatch(/anchoredTokenIds\.map/);
    expect(nameRowMatch![0]).toMatch(/<AnchoredTokenDisc/);
  });
});

describe("OpponentHand anchored token rendering", () => {
  it("imports AnchoredTokenDisc and accepts anchoredTokenIds", () => {
    expect(OpponentHandSrc).toMatch(/import\s*\{\s*AnchoredTokenDisc\s*\}\s*from\s*'\.\/AnchoredTokenDisc'/);
    expect(OpponentHandSrc).toMatch(/anchoredTokenIds:\s*TokenId\[\]/);
  });

  it("renders one AnchoredTokenDisc per anchored id", () => {
    expect(OpponentHandSrc).toMatch(/anchoredTokenIds\.map/);
    expect(OpponentHandSrc).toMatch(/<AnchoredTokenDisc/);
  });
});

describe("BoardView threads anchoredTokenIds", () => {
  it("derives anchoredTokenIds filtered to player-placement tokens", () => {
    expect(BoardViewSrc).toMatch(/placement\.kind === 'player' && t\.placement\.playerId === /);
  });

  it("passes anchoredTokenIds to OpponentHand and HandZone, immediately after chipsInHand", () => {
    // Anchored on the immediately-preceding prop rather than the opening tag — both
    // components have long prop lists that exceed a short fixed-size window from <Component.
    // Note: `??` is nullish coalescing in the source but two regex metacharacters here —
    // both `?` must be escaped (`\?\?`), not left bare, or they parse as lazy quantifiers.
    expect(BoardViewSrc).toMatch(/chipsInHand=\{player\?\.chipsInHand \?\? 0\}[\s\S]{0,40}anchoredTokenIds=\{anchoredTokenIds\(id\)\}/);
    expect(BoardViewSrc).toMatch(/chipsInHand=\{myPlayer\?\.chipsInHand \?\? 0\}[\s\S]{0,40}anchoredTokenIds=\{anchoredTokenIds\(gameState\.myPlayerId\)\}/);
  });
});
