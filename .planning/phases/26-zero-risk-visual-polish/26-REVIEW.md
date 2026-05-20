---
phase: 26-zero-risk-visual-polish
reviewed: 2026-05-19T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/components/PileZone.tsx
  - src/components/SpreadZone.tsx
  - src/components/GridZone.tsx
  - tests/pileZonePolish.test.ts
  - tests/spreadZoneGuards.test.ts
  - tests/gridZoneFaceToggle.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
  fixed: 2
status: fixed
---

# Phase 26: Code Review Report

**Reviewed:** 2026-05-19
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 26 applies surgical visual-only changes: conditional badge rendering in PileZone, face-toggle button guarding in SpreadZone and GridZone, removal of the SpreadZone name label, and relocation of the GridZone face-toggle into the label row. No new behavior was introduced.

PileZone and the SpreadZone guard logic are correct. Two issues surface on closer examination: an empty-div artifact in SpreadZone when `interactive === false` and the pile is empty, and a test in `gridZoneFaceToggle.test.ts` that tests a hand-crafted predicate describing behavior the real component does not implement.

No security issues. No data-loss risks.

---

## Warnings

### WR-01: SpreadZone renders empty `<div>` for empty opponent zones `[FIXED]`

**File:** `src/components/SpreadZone.tsx:214`

**Issue:** The outer button-container guard is:

```tsx
{(!isEmpty || interactive === false) && (
  <div className="flex gap-1">
    {interactive !== false && <Button .../>}
    {interactive !== false && <Button .../>}
  </div>
)}
```

When `interactive === false` (opponent zone) and the pile is empty, the outer condition `(!isEmpty || interactive === false)` evaluates to `(false || true)` = `true`. The `<div className="flex gap-1">` is mounted, but both inner buttons are suppressed by `interactive !== false` = `false`. The result is an empty `<div>` node with flex styling injected into the DOM for every empty opponent spread zone. This produces a phantom element that can contribute unexpected spacing and will confuse any future reader auditing the DOM.

The intent is clearly to show the container only when there is something to put in it. The correct condition for an interactive zone is `!isEmpty && interactive !== false`. An alternative formulation that matches the pre-existing intent more directly:

```tsx
{interactive !== false && !isEmpty && (
  <div className="flex gap-1">
    <Button ... onClick={handleToggleFace} aria-label={...}>
      {pile.faceUp !== false ? <Eye ... /> : <EyeOff ... />}
    </Button>
    <Button ... onClick={handleSelectAll} aria-label="Select all" disabled={faceUpCards.length === 0}>
      <SquareCheck ... />
    </Button>
  </div>
)}
```

This eliminates the redundant per-button guards and the phantom-div condition in a single move.

---

### WR-02: gridZoneFaceToggle.test.ts tests a predicate that contradicts the real component `[FIXED]`

**File:** `tests/gridZoneFaceToggle.test.ts:43-60`

**Issue:** The test defines a `labelRowClassName` helper and asserts that when `interactive === false` it returns `"flex items-center"` (no `justify-between`). The real component at `GridZone.tsx:134` hardcodes `"flex items-center justify-between"` unconditionally — the className is never conditional on `interactive`. The tests pass because they only exercise the hand-written helper, never the real JSX. This creates false confidence: the tests will keep passing even if the component layout is wrong, and they will never catch an actual regression in the className.

**Fix:** Either (a) make the component className actually conditional to match the spec the test describes:

```tsx
<div className={cn("flex items-center", interactive !== false && "justify-between")}>
```

or (b) replace the test with a source-contract assertion that reads the actual component source (mirroring the pattern in `pileZonePolish.test.ts`), so it fails if the implementation diverges:

```ts
import GridZoneSrc from "../src/components/GridZone.tsx?raw";

it("label row has justify-between in the component source", () => {
  expect(GridZoneSrc).toMatch(/justify-between/);
});
```

Option (a) is the right fix if the original intent was to drop `justify-between` when the button is absent; option (b) is the right fix if `justify-between` unconditionally is acceptable.

---

## Info

### IN-01: pileZonePolish.test.ts badge-guard regex uses a fragile 30-char lookback window

**File:** `tests/pileZonePolish.test.ts:28-30`

**Issue:** The test that asserts every `<Badge` is guarded looks back only 30 characters:

```ts
const before = (PileZoneSrc as string).slice(
  Math.max(0, match.index! - 30),
  match.index!
);
expect(before).toMatch(/&&\s*$/);
```

This works for the current guard expression `!isEmpty && <Badge` but will silently fail to cover a longer guard expression (e.g., `pile.cards.length > 0 && someCondition && <Badge`). Not an immediate bug — a robustness gap.

**Fix:** Widen the lookback or use a more targeted approach: scan for the containing JSX expression with a regex that matches `{[^}]*&&\s*<Badge`. This is a low-priority cleanup.

---

### IN-02: SpreadZone source-contract test gap — `selectionSource?.zoneId` access chain not verified

**File:** `tests/spreadZoneGuards.test.ts:42-52`

**Issue:** The `showSelectionBadge` predicate mirrors the visibility logic from `SpreadZone.tsx:157`, but it accepts a `selectionSourceZoneId: string | undefined` flat parameter. The real component accesses `selectionSource?.zoneId` from a `{ zone: 'hand' | 'pile'; zoneId: string } | null` object. The test does not verify that the component accesses the correct property on `selectionSource`. If the component were changed to accidentally access `selectionSource?.zone` instead of `selectionSource?.zoneId`, all predicate tests would still pass.

**Fix:** This is a coverage gap inherent to the predicate-test pattern, not a defect in the tests themselves. Acceptable as-is given the low-risk nature of the changes; worth noting for future auditors.

---

### IN-03: SpreadZone outer button-container logic is harder to reason about than necessary

**File:** `src/components/SpreadZone.tsx:214-240`

**Issue:** The combination of the outer guard `(!isEmpty || interactive === false)` with two inner `interactive !== false` guards creates a three-level conditional that is difficult to reason about at a glance (and, as WR-01 shows, contains a behavioral defect). Even after fixing WR-01, consolidating the duplicate `interactive !== false` checks into the outer guard would make the intent clearer. This is a readability issue that can be addressed at the same time WR-01 is fixed, using the single-guard form shown in WR-01's fix suggestion.

---

_Reviewed: 2026-05-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
