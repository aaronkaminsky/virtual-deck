---
phase: 26-zero-risk-visual-polish
plan: 01
subsystem: ui
tags: [react, tailwindcss, badge, pilezone, visual-polish]

# Dependency graph
requires: []
provides:
  - "PileZone badge hidden when pile is empty (POLISH-05)"
  - "PileZone outer flex-col gap reduced from 4px to 2px (POLISH-06)"
affects: [26-02, phase-27-drop-target-polish, phase-29-hand-sort-controls]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Conditional JSX render via {!isEmpty && <Component />} using pre-computed isEmpty constant"
    - "?raw Vite import in test files for source-contract assertions without Node.js type dependencies"

key-files:
  created:
    - tests/pileZonePolish.test.ts
  modified:
    - src/components/PileZone.tsx

key-decisions:
  - "Use existing isEmpty constant (line 24) to guard Badge render — no new variable needed"
  - "gap-0.5 (2px) is the only non-multiple-of-4 gap permitted in this codebase per 26-UI-SPEC"
  - "Source-contract tests use Vite ?raw import instead of Node readFileSync to stay within existing tsconfig types"

patterns-established:
  - "?raw import pattern: import Src from '../src/Foo.tsx?raw' — reads source as string in Vitest without Node type dependencies"

requirements-completed: [POLISH-05, POLISH-06]

# Metrics
duration: 15min
completed: 2026-05-20
---

# Phase 26 Plan 01: Zero-Risk Visual Polish (Pile Badge + Gap) Summary

**PileZone badge conditionally rendered on `!isEmpty` eliminating the "0" badge, and outer wrapper gap tightened from gap-1 (4px) to gap-0.5 (2px)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-20T20:19:00Z
- **Completed:** 2026-05-20T20:22:30Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- POLISH-05: Badge no longer renders on empty piles — `{!isEmpty && <Badge ...>}` guard uses the pre-existing `isEmpty` constant
- POLISH-06: Outer `flex flex-col gap-1` changed to `flex flex-col gap-0.5`, tightening the controls-row-to-pile-card spacing from 4px to 2px
- TDD cycle complete: RED commit (`d1bd064`) with 4 failing tests, GREEN commit (`a7068fd`) with all 191 tests passing

## Task Commits

Each task was committed atomically:

1. **RED — POLISH-05/POLISH-06 failing tests** - `d1bd064` (test)
2. **GREEN — POLISH-05/POLISH-06 implementation** - `a7068fd` (feat)

_TDD task: RED commit has intentionally failing tests (committed with --no-verify per TDD protocol); GREEN commit passes pre-commit hook normally._

## Files Created/Modified
- `src/components/PileZone.tsx` - Two surgical edits: outer div gap-1 → gap-0.5; Badge wrapped in `{!isEmpty && ...}`
- `tests/pileZonePolish.test.ts` - Source-contract tests using `?raw` Vite import to verify implementation patterns

## Decisions Made
- Used existing `isEmpty` constant (already computed at line 24) to guard Badge — no new variable or prop needed
- `?raw` Vite import in test file avoids `readFileSync`/`__dirname` which required `@types/node` not configured in tsconfig; the `?raw` approach is ESM-native and works with existing tsconfig
- Inner `flex gap-1` on the controls row (line 52) was NOT changed — only the outer flex-col wrapper; this preserves button spacing within the row

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Rewrote test file to use ?raw import instead of Node.js fs**
- **Found during:** Task 1 RED phase (typecheck after writing source-reading test)
- **Issue:** Initial test used `readFileSync`/`__dirname` which caused `tsc --noEmit` to fail with TS2591/TS2304 — `@types/node` not included in tsconfig types
- **Fix:** Replaced Node.js imports with Vite `?raw` query (`import PileZoneSrc from "../src/components/PileZone.tsx?raw"`) — same source-reading capability, zero tsconfig changes
- **Files modified:** tests/pileZonePolish.test.ts
- **Verification:** `npm run typecheck` exits 0; `npm test` 191/191 pass
- **Committed in:** a7068fd (GREEN phase commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocking typecheck failure)
**Impact on plan:** Minimal — same test capability, cleaner ESM-native approach. No scope creep.

## Issues Encountered
- RED phase commit required `--no-verify` since pre-commit hook runs `npm test` and intentionally-failing RED tests would block the commit. This is standard TDD protocol.

## Threat Surface Scan
No new network endpoints, auth paths, file access patterns, or schema changes introduced. Badge render is purely cosmetic — shows count only, not card identity (T-26-01 in threat register: accepted).

## Known Stubs
None — both changes are complete implementations with no placeholder values.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 26-01 complete; plan 26-02 (SpreadZone/GridZone changes: CTRL-05, CTRL-07, LAYOUT-07) can proceed independently
- PileZone is stable — no further changes expected in this phase

## Self-Check

### Checking files exist:
- `src/components/PileZone.tsx` — modified file (exists in worktree)
- `tests/pileZonePolish.test.ts` — new test file

### Checking commits exist:
- `d1bd064` — RED phase test commit
- `a7068fd` — GREEN phase implementation commit

## Self-Check: PASSED

---
*Phase: 26-zero-risk-visual-polish*
*Completed: 2026-05-20*
