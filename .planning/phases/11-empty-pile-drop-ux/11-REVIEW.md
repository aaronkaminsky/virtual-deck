---
phase: 11-empty-pile-drop-ux
reviewed: 2026-04-18T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/components/BoardDragLayer.tsx
  - tests/boardDragLayerDialog.test.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 11: Code Review Report

**Reviewed:** 2026-04-18
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the empty-pile drop UX implementation in `BoardDragLayer.tsx` and its accompanying unit tests. The core feature — bypassing the position dialog when dropping onto an empty pile — is correctly implemented. The dialog cancel and confirm logic is sound, and the test coverage for the three UX scenarios (UX-01, UX-02, UX-03) is thorough.

One warning-level bug was found: `setTimeout` calls that clear the drag overlay are not tracked by ID, meaning a rapid drag-then-drag sequence can cause the first timeout to fire mid-second-drag, prematurely clearing the active card overlay. Two info-level observations cover a Vitest generic syntax deprecation and a missing edge-case test.

## Warnings

### WR-01: Untracked `setTimeout` in drag overlay teardown can corrupt active drag

**File:** `src/components/BoardDragLayer.tsx:151` and `src/components/BoardDragLayer.tsx:161`

**Issue:** `setTimeout(() => setActiveCard(null), ...)` is called on failed drop and on cancel, but the timeout ID is never stored or cancelled. If a user starts a new drag before the timeout fires (~200 ms), the stale callback will call `setActiveCard(null)` and clear the overlay for the new, still-in-progress drag. The result is a drag where the card ghost disappears mid-flight.

**Fix:** Track the timeout with a `useRef` and cancel it on `handleDragStart`:

```tsx
const snapBackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function handleDragStart(event: DragStartEvent) {
  // Cancel any in-flight snap-back timer from a previous failed drop
  if (snapBackTimerRef.current !== null) {
    clearTimeout(snapBackTimerRef.current);
    snapBackTimerRef.current = null;
  }
  // ... rest of existing logic
}

// Replace both bare setTimeout calls with:
snapBackTimerRef.current = setTimeout(() => {
  setActiveCard(null);
  snapBackTimerRef.current = null;
}, defaultDropAnimation.duration + 50);
```

## Info

### IN-01: Deprecated Vitest generic syntax for `vi.fn`

**File:** `tests/boardDragLayerDialog.test.ts:43`

**Issue:** `vi.fn<[ClientAction], void>()` uses the tuple-based generic signature that was deprecated in Vitest v1.x. The current signature is `vi.fn<(arg: ClientAction) => void>()`. This compiles correctly in older versions but may produce type errors or warnings when the project upgrades Vitest.

**Fix:**
```ts
// Before
const sendAction = vi.fn<[ClientAction], void>();

// After
const sendAction = vi.fn<(action: ClientAction) => void>();
```

### IN-02: No test for button-click-after-dialog-close race in `sendPendingMove`

**File:** `tests/boardDragLayerDialog.test.ts` (no specific line — gap in coverage)

**Issue:** There is a test for calling `sendPendingMove` when `pendingMove` is already `null` (the null guard, line 122), but no test for the sequence: `onOpenChange(false)` fires (clearing `pendingMove`) → `sendPendingMove('top')` is called in the same tick (simulating a click that arrives after the closing animation starts). The null guard handles this correctly at runtime, but the test documents only the isolated null case, not the race sequence. Low risk given the null guard exists — this is a test completeness note.

**Fix:** Add one test:

```ts
it("button click after dialog close is a no-op (race guard)", () => {
  const card = makeCard("3-d");
  const pending: PendingMove = {
    card, fromZone: "hand", fromId: "hand", toZone: "pile", toId: "draw",
  };
  const logic = makeDialogLogic(pending);

  // Dialog starts closing (Escape fires onOpenChange(false))
  logic.onOpenChange(false);
  expect(logic.pendingMove).toBeNull();

  // Stale button click arrives
  logic.sendPendingMove("top");

  // Must not dispatch — pendingMove was already cleared
  expect(logic.sendAction).not.toHaveBeenCalled();
});
```

---

_Reviewed: 2026-04-18_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
