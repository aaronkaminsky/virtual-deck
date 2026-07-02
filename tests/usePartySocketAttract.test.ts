import { describe, it, expect } from "vitest";
import src from "../src/hooks/usePartySocket.ts?raw";

describe("usePartySocket attract handling", () => {
  it("exports the AttractState type", () => {
    expect(src).toMatch(/export type AttractState = \{ antic: AttractAntic; nonce: number; leaving: boolean \}/);
  });

  it("sets attract state and plays the sound on kind 'attract'", () => {
    expect(src).toMatch(/kind === 'attract'[\s\S]{0,400}playSound\('attract'\)/);
    expect(src).toMatch(/kind === 'attract'[\s\S]{0,400}setAttract/);
  });

  it("suppresses the whole effect under prefers-reduced-motion", () => {
    expect(src).toMatch(/prefers-reduced-motion/);
  });

  it("flips leaving on any STATE_UPDATE while attract is active", () => {
    expect(src).toMatch(/type === 'STATE_UPDATE'\)[\s\S]{0,300}leaving: true/);
  });

  it("exposes dismissAttract and clearAttract callbacks", () => {
    expect(src).toMatch(/const dismissAttract = useCallback/);
    expect(src).toMatch(/const clearAttract = useCallback/);
    expect(src).toMatch(/return\s*\{[\s\S]*attract[\s\S]*dismissAttract[\s\S]*clearAttract[\s\S]*\}/);
  });

  it("forwards the attractIdleMs URL param to the PartyKit connection query", () => {
    expect(src).toMatch(/attractIdleMs/);
  });
});
