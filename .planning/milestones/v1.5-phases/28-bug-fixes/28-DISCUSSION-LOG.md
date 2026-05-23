# Phase 28: Bug Fixes - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-20
**Phase:** 28-bug-fixes
**Areas discussed:** Select All ring on pile cards, Mobile grid wrapping behavior, Test coverage

---

## Select All ring on pile cards

### Ring placement

| Option | Description | Selected |
|--------|-------------|----------|
| On the card face/back | Ring wraps the card itself, matching SpreadZone/HandZone behavior | ✓ |
| On the pile border | Ring goes around the entire pile container | |

**User's choice:** On the card face/back
**Notes:** Consistency across all selectable zones.

### Ring style

| Option | Description | Selected |
|--------|-------------|----------|
| Match SpreadZone exactly (ring-1 ring-primary/30) | Consistent visual language | ✓ |
| Slightly more prominent (ring-2) | Stronger ring for pile single-card selection | |

**User's choice:** Match SpreadZone exactly

---

## Mobile grid wrapping behavior

| Option | Description | Selected |
|--------|-------------|----------|
| CSS-only wrapping (14 cells, 4 rows on mobile) | Accept visual wrapping; cards at col 5–6 shift rows | ✓ |
| Remove outer overflow-x-auto | Strip horizontal scroll wrapper at mobile widths | |
| Render fewer cells on mobile | Only 8 cells (4×2) on mobile; hide col 5–6 | |

**User's choice:** CSS-only wrapping is fine
**Notes:** Consistent with the established Out of Scope decision in REQUIREMENTS.md.

---

## Test coverage

### BUG-02 test

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add Playwright viewport test | Verify 4-column grid at 375px, mirrors responsive.spec.ts | ✓ |
| No test needed | CSS-only fix is low-risk | |

**User's choice:** Yes, add viewport test

### BUG-01 test

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, Vitest unit/component test | Assert ring class on pile top card when selectedIds contains it | ✓ |
| No test needed | Manual browser verification sufficient | |

**User's choice:** Yes, unit/component test

---

## Claude's Discretion

- Exact Vitest test setup (rendering approach, mock data structure)
- Whether to use `data-testid` or CSS class assertions for the Playwright grid test

## Deferred Ideas

None.
