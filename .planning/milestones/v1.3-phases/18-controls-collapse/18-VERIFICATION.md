---
phase: 18-controls-collapse
verified: 2026-05-04T13:10:00Z
status: human_needed
score: 10/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Trigger variant visual check — ghost vs outline"
    expected: "Hamburger button blends into bg-card header background without conflicting color treatment"
    why_human: "variant was changed from outline to ghost during smoke to fix visual clash — cannot verify visual acceptability without a browser"
  - test: "Copy link flow end-to-end"
    expected: "Button shows Copied! after click, panel closes after 1500ms, pasted URL resolves to correct room"
    why_human: "setTimeout + clipboard.writeText chain requires a live browser environment; navigator.clipboard is not available in Vitest"
  - test: "confirmReset cleared on panel close (outside-click or Escape)"
    expected: "After clicking Reset table step 1, then clicking outside the panel, reopening shows step 1 (not step 2 / Are you sure?)"
    why_human: "Popover onOpenChange integration with Base UI escape/outside-click requires browser; automated tests cover logic only"
---

# Phase 18: Controls Collapse Verification Report

**Phase Goal:** Implement LAYOUT-03 — all game controls collapsed behind a single hamburger trigger in the board header; controls panel closed by default; auto-closes after every action; confirmReset cleared on panel close; disabled states correct.
**Verified:** 2026-05-04T13:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Header right section shows ONLY the hamburger trigger button (no Copy link, no Deal/Undo/Reset visible by default) | VERIFIED | BoardView line 52–54: `<div className="flex items-center gap-3"><ControlsBar .../></div>` — no other buttons; `grep -c "Copy link" BoardView.tsx` = 0 |
| 2 | Clicking the hamburger opens a Popover anchored bottom/end with: Copy link, Separator, Cards-per-player + Deal, Separator, Undo + Reset | VERIFIED | ControlsBar.tsx lines 63–148: `<Popover open={open}>` with `side="bottom" align="end"`, two `<Separator />` elements (grep count = 2), all controls present |
| 3 | Panel is closed by default on first board load | VERIFIED | ControlsBar.tsx line 17: `const [open, setOpen] = useState(false)` — initial state is false; tests/controlsCollapse.test.ts confirms this contract |
| 4 | Clicking Copy link copies room URL, shows 'Copied!' for 1500ms, then panel closes | VERIFIED (logic) / UNCERTAIN (browser) | handleCopy (lines 35–45): navigator.clipboard.writeText → setCopied(true) → setTimeout 1500ms → setCopied(false) + setOpen(false). Browser flow needs human verify |
| 5 | Clicking Deal sends DEAL_CARDS and closes panel | VERIFIED | handleDeal (lines 47–50): sendAction + setOpen(false); test "handleAction('DEAL_CARDS'...) calls sendAction and sets open=false" passes |
| 6 | Clicking Undo sends UNDO_MOVE and closes panel; disabled when !gameState.canUndo | VERIFIED | handleUndo (lines 52–55); undoDisabled = !gameState.canUndo (line 27); test asserts both |
| 7 | Clicking Reset shows inline 'Are you sure?' row; confirm sends RESET_TABLE and closes panel | VERIFIED | Two-step flow: confirmReset state (line 19), handleResetConfirm (lines 57–61); JSX lines 133–145 render "Are you sure?", "Keep playing", "Reset table"; test asserts chain |
| 8 | Reopening panel after Reset cancellation does NOT show confirmation row (Pitfall 1) | VERIFIED (logic) / UNCERTAIN (browser) | handleOpenChange (lines 30–33): `if (!nextOpen) setConfirmReset(false)` — logic confirmed; Base UI outside-click/Escape triggering onOpenChange is browser-only |
| 9 | Deal disabled when phase !== setup && !== lobby; Reset disabled when phase !== playing | VERIFIED | dealDisabled = `phase !== 'setup' && phase !== 'lobby'` (line 26); resetDisabled = `phase !== 'playing'` (line 28); 8 disabled-derivation tests pass |
| 10 | BoardView no longer contains handleCopy, copied state, or standalone Copy link Button | VERIFIED | grep counts: handleCopy=0, Copy link=0, copied=0, Copy/Check lucide imports=0 in BoardView.tsx |
| 11 | All Vitest tests including tests/controlsCollapse.test.ts pass; npm run typecheck is clean | VERIFIED | `npm test`: 150/150 passed (18 files); `npm run typecheck`: exits 0 |

**Score:** 10/11 truths verified (11th has a browser-only sub-component marked human_needed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `tests/controlsCollapse.test.ts` | Logic-extraction unit tests for ControlsBar collapse contract | VERIFIED | 173 lines; 4 describe blocks; 15 it cases; all passing; no it.skip / it.todo |
| `src/components/ControlsBar.tsx` | Single-Popover controls panel — Copy link, Deal stepper, Undo, two-step inline Reset | VERIFIED | Full rewrite; 150 lines; all required state, handlers, and JSX present |
| `src/components/BoardView.tsx` | Header without Copy link Button or handleCopy; ControlsBar receives roomId prop | VERIFIED | Copy link / handleCopy / copied fully excised; `<ControlsBar ... roomId={roomId} />` at line 53 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/BoardView.tsx` | `src/components/ControlsBar.tsx` | `<ControlsBar ... roomId={roomId} />` | WIRED | Line 53 matches pattern `ControlsBar[^>]*roomId=\{roomId\}` |
| `src/components/ControlsBar.tsx` | Base UI Popover | `<Popover open={open} onOpenChange={handleOpenChange}>` | WIRED | Line 64; controlled state confirmed |
| `src/components/ControlsBar.tsx` | navigator.clipboard | `handleCopy → writeText → setTimeout(setOpen(false), 1500)` | WIRED | Lines 35–45; pattern confirmed |

### Data-Flow Trace (Level 4)

Not applicable — ControlsBar renders props passed in (gameState, sendAction, roomId) directly; no async data fetching or store involved. All dynamic state is local React state derived from props.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Test suite (15 controlsCollapse + 135 others) | `npm test` | 150/150 passed | PASS |
| TypeScript compilation | `npm run typecheck` | exits 0 | PASS |
| Test file structure: 4 describe blocks | `grep -c "describe("` | 4 | PASS |
| Test file structure: 15 it cases | `grep -c "^  it("` | 15 | PASS |
| No skipped/todo tests | `grep -q 'it.skip\|it.todo'` | no matches | PASS |
| Pitfall 1 guard present | `grep -q 'if (!nextOpen) setConfirmReset(false)'` | found | PASS |
| Two Separators in panel | `grep -cE '<Separator ?/>'` | 2 | PASS |
| No AlertDialog remnants | `grep -c 'AlertDialog'` | 0 | PASS |
| No ChevronDown remnants | `grep -c 'ChevronDown'` | 0 | PASS |
| No phase-conditional null returns | `grep -c 'return null'` | 0 | PASS |
| Browser clipboard / timing flow | (requires live browser) | n/a | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| LAYOUT-03 | 18-01, 18-02 | Player can access all game controls from a collapsible panel triggered by a single header button; controls are hidden by default | SATISFIED | ControlsBar.tsx: single Popover, default-closed state, all controls inside panel; BoardView header reduced to hamburger trigger only |

REQUIREMENTS.md traceability table marks LAYOUT-03 as "Phase 18 / Pending" (checkbox unchecked). This is a documentation gap — the requirement is implemented. The checkbox in REQUIREMENTS.md was not updated as part of this phase. Not a blocker for implementation correctness.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `src/components/ControlsBar.tsx` line 220 (plan spec) | Trigger variant changed to `ghost` from plan-specified `outline` | INFO | Documented deviation in 18-02-SUMMARY.md; smoke-approved |
| `src/components/ControlsBar.tsx` | Reset confirmation split into two rows from plan's one-row spec | INFO | Documented deviation in 18-02-SUMMARY.md; overflow fix; smoke-approved |

No blockers. No stubs. No hardcoded empty arrays. No TODO/FIXME. No `return null` phase gates.

### Human Verification Required

#### 1. Hamburger trigger visual appearance

**Test:** Start `npm run dev:client`, join a room, observe the header right section.
**Expected:** Single ghost-variant hamburger button blends into the card-colored header without a visible border or background fill that clashes.
**Why human:** Trigger variant was changed from `outline` to `ghost` during smoke to fix a `bg-background` clash with the `bg-card` header. Visual correctness is not grep-checkable.

#### 2. Copy link clipboard + auto-close timing

**Test:** Open the panel, click "Copy link". Wait.
**Expected:** Button changes to "Copied!" immediately. Panel closes automatically after approximately 1.5 seconds. Pasting the copied text in a new tab loads the correct room.
**Why human:** `navigator.clipboard.writeText` and `setTimeout` integration can only be verified in a live browser. Vitest environment does not have clipboard API.

#### 3. confirmReset cleared on outside-click or Escape

**Test:** Open panel, click "Reset table" (step 1 shows "Are you sure?"). Press Escape or click outside the panel to close it. Reopen the panel.
**Expected:** Panel reopens showing the single "Reset table" button — NOT the "Are you sure?" row.
**Why human:** The `onOpenChange` logic is verified by unit tests (logic-extraction), but the actual Base UI Popover firing `onOpenChange(false)` on Escape/outside-click is a browser-level integration that unit tests cannot exercise.

---

Note: the SUMMARY.md claims manual smoke was completed and all 10 items approved. If that smoke was performed by the developer before this verification, items 2 and 3 above may already be considered satisfied. The verifier cannot confirm this from static analysis alone — the human_needed status stands until the developer explicitly re-confirms or the smoke approval is documented with a date and linked here.

### Gaps Summary

No gaps. All must-haves are either VERIFIED by static analysis + test run, or flagged for human browser confirmation. The three human-verification items are integration-layer concerns (visual appearance, clipboard API, Popover event integration) that cannot be confirmed via grep or Vitest alone.

---

_Verified: 2026-05-04T13:10:00Z_
_Verifier: Claude (gsd-verifier)_
