import { describe, it, expect } from "vitest";
import type { Card, Suit, Rank } from "../src/shared/types";
import { getHandOrderSyncAction } from "../src/components/HandZone";

function mkCard(id: string, suit: Suit, rank: Rank): Card {
  return { id, suit, rank, faceUp: false };
}

describe("getHandOrderSyncAction", () => {
  it("returns null when sortMode is 'original' (display already matches server order)", () => {
    const cards: Card[] = [mkCard("A-h", "hearts", "A"), mkCard("2-s", "spades", "2")];
    expect(getHandOrderSyncAction("original", cards)).toBeNull();
  });

  it("returns a REORDER_HAND action with the bySuit order and skipSnapshot:true", () => {
    const cards: Card[] = [
      mkCard("A-h", "hearts", "A"),
      mkCard("2-s", "spades", "2"),
      mkCard("K-c", "clubs", "K"),
      mkCard("5-d", "diamonds", "5"),
    ];
    const action = getHandOrderSyncAction("bySuit", cards);
    expect(action).toEqual({
      type: "REORDER_HAND",
      orderedCardIds: ["2-s", "K-c", "5-d", "A-h"],
      skipSnapshot: true,
    });
  });

  it("returns a REORDER_HAND action with the byRank order and skipSnapshot:true", () => {
    const cards: Card[] = [
      mkCard("A-h", "hearts", "A"),
      mkCard("2-s", "spades", "2"),
      mkCard("K-c", "clubs", "K"),
      mkCard("5-d", "diamonds", "5"),
    ];
    const action = getHandOrderSyncAction("byRank", cards);
    expect(action).toEqual({
      type: "REORDER_HAND",
      orderedCardIds: ["2-s", "5-d", "K-c", "A-h"],
      skipSnapshot: true,
    });
  });

  it("does not mutate the input cards array", () => {
    const cards: Card[] = [mkCard("A-h", "hearts", "A"), mkCard("2-s", "spades", "2")];
    const originalIds = cards.map(c => c.id);
    getHandOrderSyncAction("bySuit", cards);
    expect(cards.map(c => c.id)).toEqual(originalIds);
  });
});
