---
phase: 28-bug-fixes
verified: 2026-05-20T19:41:30Z
status: human_needed
score: 9/9
overrides_applied: 0
human_verification:
  - test: "Click Select All on a pile — top card shows ring"
    expected: "ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-sm ring appears on the pile top card matching the SpreadZone card ring style"
    why_human: "Ring application is CSS-conditional on isSelected; runtime prop flow from BoardDragLayer through BoardView → PileZone → DraggableCard cannot be fully exercised by static analysis"
  - test: "Open the game at 375px viewport (DevTools device simulation) — communal grid shows 4 columns"
    expected: "Grid-zone-play renders 4 columns below 640px, 7 columns at or above 640px"
    why_human: "Tailwind sm: breakpoint is a runtime CSS behavior; Playwright e2e test exists but requires live servers to run"
---

# Phase 28: Bug Fixes — Verification Report

**Phase Goal:** Fix BUG-01 (pile select ring missing) and BUG-02 (mobile grid renders 7 columns at all widths)
**Verified:** 2026-05-20T19:41:30Z
**Status:** human_needed — all automated checks pass; 2 items require live runtime/browser validation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DraggableCard has `isSelected?: boolean` prop and applies `ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-sm` via `cn()` when true | VERIFIED | Line 14: `isSelected?: boolean` in interface; line 48: `className={cn(isSelected && 'ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-sm')}` |
| 2 | PileZone has `selectedIds?: Set<string>` prop and passes `isSelected` to DraggableCard | VERIFIED | Line 16: `selectedIds?: Set<string>` in PileZoneProps; line 112: `isSelected={selectedIds?.has((topCard as Card).id) ?? false}` |
| 3 | BoardView passes `selectedIds={selectedIds}` to all PileZone renders | VERIFIED | Line 76: `<PileZone key={pile.id} pile={pile} sendAction={sendAction} draggingCardId={draggingCardId} shufflingPileIds={shufflingPileIds} onSelectAll={onSelectAll} selectedIds={selectedIds} />` |
| 4 | `tests/pileSelectRing.test.ts` exists with at least 4 test cases | VERIFIED | 4 test cases in `describe('PileZone isSelected derivation')`: true branch, false (wrong id), false (empty set), false (undefined) |
| 5 | `src/components/GridZone.tsx` contains `grid-cols-4 sm:grid-cols-7` (not bare `grid-cols-7`) | VERIFIED | Line 148: `className="grid grid-cols-4 sm:grid-cols-7 gap-px bg-border rounded-md overflow-hidden w-fit"` — bare `grid-cols-7` is absent |
| 6 | `playwright/responsive.spec.ts` contains `Phase 28 BUG-02 mobile grid columns` describe block with `toHaveClass(/grid-cols-4/)` assertion | VERIFIED | Lines 25–37: describe block present; line 35: `await expect(page.locator('[data-testid="grid-zone-play"]')).toHaveClass(/grid-cols-4/)` |
| 7 | `npm run typecheck` exits 0 | VERIFIED | Exit 0, no output — TypeScript clean |
| 8 | `npm test` exits 0 with 223 tests passing | VERIFIED | `Tests 223 passed (223)`, `Test Files 30 passed (30)`, exit 0 |
| 9 | Both 28-01-SUMMARY.md and 28-02-SUMMARY.md exist | VERIFIED | Both files present in `.planning/phases/28-bug-fixes/` |

**Score:** 9/9 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/DraggableCard.tsx` | isSelected prop + ring class application | VERIFIED | Prop in interface line 14; cn() application line 48; cn import line 7 |
| `src/components/PileZone.tsx` | selectedIds prop wired to DraggableCard isSelected | VERIFIED | Prop in interface line 16; passed to DraggableCard line 112 |
| `src/components/BoardView.tsx` | selectedIds passed to PileZone | VERIFIED | Passed on line 76 in pilePiles.map render |
| `tests/pileSelectRing.test.ts` | 4+ test cases for isSelected derivation | VERIFIED | Exactly 4 cases; all pass (`vitest run` confirmed) |
| `src/components/GridZone.tsx` | grid-cols-4 sm:grid-cols-7 responsive classes | VERIFIED | Line 148 contains exact class string; no bare grid-cols-7 remains |
| `playwright/responsive.spec.ts` | Phase 28 BUG-02 describe block with grid-cols-4 assertion | VERIFIED | Lines 25–37; `toHaveClass(/grid-cols-4/)` on grid-zone-play locator |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `SpreadZone.tsx` ring pattern | `DraggableCard` ring | `ring-1 ring-primary/30 ring-offset-1 ring-offset-background rounded-sm` via `cn()` | VERIFIED | DraggableCard line 48 matches plan spec exactly (note: plan uses `rounded-sm`, SpreadZone reference uses `rounded-md` — plan explicitly chose `rounded-sm` for DraggableCard; intentional) |
| `BoardView.tsx` pilePiles.map | `PileZone selectedIds` | `selectedIds={selectedIds}` prop addition | VERIFIED | Line 76 contains `selectedIds={selectedIds}` alongside all other existing props |
| `GridZone.tsx` line 148 | grid div className | `grid-cols-4 sm:grid-cols-7` replaces `grid-cols-7` | VERIFIED | Exact replacement confirmed; data-testid="grid-zone-play" unchanged |
| `responsive.spec.ts` | new describe block | `Phase 28 BUG-02` test at 375x667 viewport with `toHaveClass(/grid-cols-4/)` | VERIFIED | Describe block at lines 25–37; pattern `grid-cols-4` present |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles clean | `npm run typecheck` | exit 0, no errors | PASS |
| All 223 unit tests pass | `npm test` | 223 passed / 30 files / exit 0 | PASS |
| pileSelectRing.test.ts — 4 cases pass | `npm test -- --reporter=verbose` grep pileSelectRing | 4 x PASS | PASS |

---

## Anti-Patterns Found

No TBD, FIXME, or XXX markers in modified files. No placeholder return values in any of the four modified files. No empty handlers.

One minor observation (not a blocker): `DraggableCard` applies the ring to the root div which also carries `style={...}` (transform, opacity, touchAction). The ring is layered over any DnD transform — this is architecturally consistent with the SpreadZone pattern and not a defect.

---

## Human Verification Required

### 1. Pile Select Ring — Runtime Prop Flow

**Test:** Start local stack (`npm run dev` + `npm run dev:client`). Open the game, add cards to a pile using drag or deal actions, then click the Select All (SquareCheck) button on the pile.
**Expected:** The top card in the pile shows a visible `ring-1 ring-primary/30` ring, matching the ring that appears on a selected card in the spread zone.
**Why human:** The ring appearance depends on `selectedIds` state flowing from `BoardDragLayer` through `BoardView` → `PileZone` → `DraggableCard`. Static analysis confirms the prop chain is wired; live runtime validation confirms the state is actually populated and the CSS is applied at the right DOM node.

### 2. Mobile Grid Column Collapse — BUG-02 Playwright e2e

**Test:** With both dev servers running, execute `npm run test:e2e` to run the Playwright suite, or run only `playwright/responsive.spec.ts`. Alternatively open the game in a browser DevTools device simulator at 375px width.
**Expected:** `playwright/responsive.spec.ts > Phase 28 BUG-02 mobile grid columns > BUG-02: grid renders 4 columns at 375px viewport` passes. At 375px the communal grid visually renders 4 columns; at >= 640px it renders 7 columns.
**Why human:** The Playwright test requires live dev servers (PartyKit + Vite) which cannot be started during static verification. Tailwind's sm: breakpoint behavior is a runtime CSS outcome that unit tests cannot cover.

---

## Gaps Summary

No gaps. All 9 automated checks VERIFIED. The 2 human verification items are runtime/browser checks that require live servers — they are not evidence of incomplete implementation.

---

_Verified: 2026-05-20T19:41:30Z_
_Verifier: Claude (gsd-verifier)_
