// Wave-0 scaffold — stubs will be converted to real it() calls in Plan 23-02.
// This file exists so Plan 23-02 (HandZone sort implementation) has automated verify targets
// ready from the start. The sortCards() pure function is exported by Plan 23-02.

import { describe, it } from "vitest";
import type { Card, Suit, Rank } from "../src/shared/types";

// Suppress unused-import warnings until Plan 23-02 wires up sortCards.
// The types are imported here so the scaffold compiles cleanly under tsc.
const _typeCheck: [Card?, Suit?, Rank?] = [];
void _typeCheck;

describe("sortCards pure function", () => {
  it.todo("By Suit (D-01, D-03): sorts spades → clubs → diamonds → hearts, then 2 → A within each suit");
  it.todo("By Rank (D-02, D-03): sorts 2 → A, then spades → clubs → diamonds → hearts within each rank");
  it.todo("Sort click dispatches REORDER_HAND with skipSnapshot: true and sorted ids");
});
