import { describe, it, expect } from "vitest";
import BoardDragLayerSrc from "../src/components/BoardDragLayer.tsx?raw";

describe("BoardDragLayer token collision detection", () => {
  it("checks the tray first, then hand/opponent-hand targets, then canvas", () => {
    const tokenBranch = BoardDragLayerSrc.match(/if \(tokenData\?\.type === 'token'\) \{[\s\S]*?\n  \}/);
    expect(tokenBranch).not.toBeNull();
    const body = tokenBranch![0];
    const trayIdx = body.indexOf("'token-tray'");
    const handIdx = body.search(/'hand'|opponent-hand-/);
    const canvasIdx = body.lastIndexOf("'canvas'");
    expect(trayIdx).toBeGreaterThan(-1);
    expect(handIdx).toBeGreaterThan(trayIdx);
    expect(canvasIdx).toBeGreaterThan(handIdx);
  });

  it("matches both the player's own hand and opponent-hand droppables", () => {
    expect(BoardDragLayerSrc).toMatch(/String\(c\.id\) === 'hand' \|\| String\(c\.id\)\.startsWith\('opponent-hand-'\)/);
  });
});

describe("BoardDragLayer token drag-end dispatch", () => {
  it("computes base position from placement.kind (canvas vs. tray/player source)", () => {
    expect(BoardDragLayerSrc).toMatch(/token\.placement\.kind === 'canvas'/);
  });

  it("passes overToId (droppable toId) into resolveTokenDrop", () => {
    expect(BoardDragLayerSrc).toMatch(/overToId:/);
  });

  it("dispatches MOVE_TOKEN with a canvas destination on place", () => {
    expect(BoardDragLayerSrc).toMatch(/to:\s*\{\s*kind:\s*'canvas',\s*x:\s*resolution\.x,\s*y:\s*resolution\.y\s*\}/);
  });

  it("dispatches MOVE_TOKEN with a player destination on anchor", () => {
    expect(BoardDragLayerSrc).toMatch(/to:\s*\{\s*kind:\s*'player',\s*playerId:\s*resolution\.playerId\s*\}/);
  });

  it("dispatches MOVE_TOKEN with a tray destination on return", () => {
    expect(BoardDragLayerSrc).toMatch(/to:\s*\{\s*kind:\s*'tray'\s*\}/);
  });

  it("no longer dispatches a separate RETURN_TOKEN action", () => {
    expect(BoardDragLayerSrc).not.toMatch(/RETURN_TOKEN/);
  });
});
