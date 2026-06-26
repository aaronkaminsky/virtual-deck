import { describe, it, expect } from "vitest";
import LobbyPanelSrc from "../src/components/LobbyPanel.tsx?raw";

describe("Lobby redesign (1002)", () => {
  it("does not import Copy or Check icons (removed with copy-link button)", () => {
    expect(LobbyPanelSrc).not.toMatch(/\bCopy\b/);
    expect(LobbyPanelSrc).not.toMatch(/\bCheck\b/);
  });

  it("does not contain copied state or handleCopy", () => {
    expect(LobbyPanelSrc).not.toMatch(/copied/);
    expect(LobbyPanelSrc).not.toMatch(/handleCopy/);
  });

  it("does not render a Separator", () => {
    expect(LobbyPanelSrc).not.toMatch(/<Separator/);
  });

  it("does not render the 'Share this table' description or copy-link button", () => {
    expect(LobbyPanelSrc).not.toMatch(/Share this table/);
    expect(LobbyPanelSrc).not.toMatch(/Copy link/);
  });

  it("renders a 'Joining' subtitle that includes roomId", () => {
    expect(LobbyPanelSrc).toMatch(/Joining/);
    expect(LobbyPanelSrc).toMatch(/\{roomId\}/);
  });
});
