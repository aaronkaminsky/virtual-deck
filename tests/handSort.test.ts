// Tests for sortCards and buildSortDispatch pure functions exported from HandZone.
// These helpers implement the hand sort feature (SORT-01, D-01..D-03).

import { describe, it, expect } from "vitest";
import type { Card, Suit, Rank } from "../src/shared/types";
import { sortCards, buildSortDispatch } from "../src/components/HandZone";

// Local factory — makeCard in helpers hardcodes suit/rank; we need real values for sort tests.
function mkCard(id: string, suit: Suit, rank: Rank): Card {
  return { id, suit, rank, faceUp: false };
}

describe("sortCards pure function", () => {
  it("By Suit (D-01, D-03): sorts spades → clubs → diamonds → hearts, then 2 → A within each suit", () => {
    // Scrambled input with cards from each suit and duplicate ranks across suits.
    const input: Card[] = [
      mkCard("A-h", "hearts", "A"),
      mkCard("2-s", "spades", "2"),
      mkCard("K-c", "clubs", "K"),
      mkCard("5-d", "diamonds", "5"),
      mkCard("2-h", "hearts", "2"),
      mkCard("A-s", "spades", "A"),
    ];

    const result = sortCards(input, "bySuit");

    // Expected: spades first (2→A), then clubs, then diamonds, then hearts
    expect(result.map(c => c.id)).toEqual(["2-s", "A-s", "K-c", "5-d", "2-h", "A-h"]);
  });

  it("By Rank (D-02, D-03): sorts 2 → A, then spades → clubs → diamonds → hearts within each rank", () => {
    // Input with multiple suits at the same rank.
    const input: Card[] = [
      mkCard("A-h", "hearts", "A"),
      mkCard("2-s", "spades", "2"),
      mkCard("A-c", "clubs", "A"),
      mkCard("2-h", "hearts", "2"),
      mkCard("K-d", "diamonds", "K"),
      mkCard("A-s", "spades", "A"),
    ];

    const result = sortCards(input, "byRank");

    // Expected: 2s first (by suit order), then K, then As (by suit order)
    expect(result.map(c => c.id)).toEqual(["2-s", "2-h", "K-d", "A-s", "A-c", "A-h"]);
  });

  it("Sort click dispatches REORDER_HAND with skipSnapshot: true and sorted ids", () => {
    const cards: Card[] = [
      mkCard("A-h", "hearts", "A"),
      mkCard("2-s", "spades", "2"),
      mkCard("K-c", "clubs", "K"),
    ];

    const dispatch = buildSortDispatch(cards, "bySuit");

    expect(dispatch).not.toBeNull();
    expect(dispatch!.type).toBe("REORDER_HAND");
    expect((dispatch as { skipSnapshot: boolean }).skipSnapshot).toBe(true);
    expect((dispatch as { orderedCardIds: string[] }).orderedCardIds).toEqual(
      sortCards(cards, "bySuit").map(c => c.id)
    );

    // Cycling back to 'original' must return null (no dispatch)
    const nullDispatch = buildSortDispatch(cards, "original");
    expect(nullDispatch).toBeNull();
  });
});
