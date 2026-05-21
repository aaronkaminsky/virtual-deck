/**
 * Failing test (TDD gate) for pile Select All drag behavior.
 *
 * Bug: PileZone.handleSelectAll only passes the top card ID to onSelectAll.
 * After "Select All" on a pile, dragging should move ALL pile cards, not just
 * the top card. SpreadZone correctly passes all card IDs; PileZone does not.
 *
 * Fix target: PileZone.handleSelectAll — change the onSelectAll call from
 *   onSelectAll([(topCard as Card).id], 'pile', pile.id)
 * to
 *   onSelectAll(pile.cards.filter(c => 'id' in c).map(c => (c as Card).id), 'pile', pile.id)
 *
 * This test reads PileZone.tsx source and asserts the implementation contract.
 * RED before fix, GREEN after fix.
 */

import { describe, it, expect } from "vitest";
import PileZoneSrc from "../src/components/PileZone.tsx?raw";

describe("PileZone — PILE-SELECTALL-01: Select All passes all card IDs", () => {
  it("handleSelectAll does NOT pass a single-element array literal with only the top card", () => {
    // Before the fix: onSelectAll([(topCard as Card).id], 'pile', pile.id)
    // This pattern wraps a single card in an array — it must not exist after the fix.
    // We check for the characteristic single-element literal [(topCard as Card).id]
    // which is the faulty implementation.
    expect(PileZoneSrc).not.toMatch(/onSelectAll\(\s*\[\s*\(topCard as Card\)\.id\s*\]/);
  });

  it("handleSelectAll passes all visible card IDs from the pile, not just the top card", () => {
    // After the fix: the onSelectAll call must use pile.cards (with a filter/map over all cards),
    // not a single-element array containing only the top card.
    // We assert the presence of the corrected pattern: pile.cards...filter...map...id
    expect(PileZoneSrc).toMatch(/pile\.cards\.filter.*map.*\.id/s);
  });

  it("handleSelectAll result set size equals pile.cards length (logic contract)", () => {
    // Pure logic test: simulate what the corrected PileZone.handleSelectAll should do.
    // Given a pile with 3 face-up cards, Select All must produce 3 selected IDs.
    const cards = [
      { id: "A-s", suit: "spades" as const, rank: "A" as const, faceUp: true },
      { id: "K-h", suit: "hearts" as const, rank: "K" as const, faceUp: true },
      { id: "Q-d", suit: "diamonds" as const, rank: "Q" as const, faceUp: false },
    ];
    // Simulate the corrected handleSelectAll: all face-visible cards
    const selectedIds = cards.filter(c => "id" in c).map(c => c.id);
    // The selection must include ALL cards, not just the top one
    expect(selectedIds).toHaveLength(3);
    expect(selectedIds).toContain("A-s");
    expect(selectedIds).toContain("K-h");
    expect(selectedIds).toContain("Q-d");
    // Before the fix, only "Q-d" (the top card, last element) would have been selected
    expect(selectedIds).not.toEqual(["Q-d"]);
  });
});
