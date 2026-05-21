---
slug: pile-selectall-drag-moves-all
status: resolved
trigger: "Select All on a pile zone only drags the top card instead of all cards in the pile — works correctly for spread zones"
created: "2026-05-21"
updated: "2026-05-20"
---

# Debug Session: pile-selectall-drag-moves-all

## Symptoms

- **Expected:** After clicking Select All on a pile zone, dragging the top card moves ALL cards in the pile (same as spread zones where Select All + drag moves all selected cards together)
- **Actual:** Only the top card moves; remaining pile cards stay in place
- **Error messages:** None — no errors, just wrong behavior
- **Timeline:** Never worked — this behavior has never been implemented for piles (not a regression)
- **Reproduction:** Start game, add cards to a pile, click "Select All" on the pile, drag the top card → only the top card moves

## Current Focus

hypothesis: "PileZone.handleSelectAll only passed the top card ID to onSelectAll instead of all card IDs in the pile"
test: "2 unit tests in tests/pileSelectAll.test.ts confirmed the bug; fix confirmed both green"
expecting: "All cards in pile included in selection"
next_action: "resolved"

## Evidence

- timestamp: "2026-05-20"
  checked: "PileZone.tsx handleSelectAll implementation"
  found: "onSelectAll([(topCard as Card).id], 'pile', pile.id) — single-element array containing only the top card"
  implication: "Only top card ever selected regardless of pile size"

## Eliminated Hypotheses

## Resolution

root_cause: "PileZone.handleSelectAll constructed a single-element array [(topCard as Card).id] instead of mapping all pile.cards to their IDs. Every click of Select All on a pile selected only the visible top card."
fix: "Replaced the single-element array with pile.cards.filter(c => 'id' in c).map(c => (c as Card).id) so all card IDs in the pile are passed to onSelectAll."
verification: "226/226 tests pass including the 2 previously-failing pileSelectAll tests."
files_changed: ["src/components/PileZone.tsx"]
