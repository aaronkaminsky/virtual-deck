---
phase: 16-developer-readme
fixed_at: 2026-04-28T00:00:00Z
review_path: .planning/phases/16-developer-readme/16-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-04-28
**Source review:** .planning/phases/16-developer-readme/16-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (warnings only; info excluded per fix_scope=critical_warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### WR-01: Playwright `baseURL` omits the `/virtual-deck/` subpath

**Files modified:** `playwright.config.ts`
**Commit:** 5fcb65d
**Applied fix:** Changed `baseURL` from `'http://localhost:5173'` to `'http://localhost:5173/virtual-deck/'` so Playwright navigates to the correct path matching Vite's configured `base`.

---

### WR-02: `nanoid` version claim contradicts installed version

**Files modified:** `CLAUDE.md`
**Commit:** dc9c125
**Applied fix:** Updated nanoid version from `4.x [UNVERIFIED]` to `5.x` in the Supporting Libraries table, updated the description to reflect v5's ESM-only nature, and removed the now-resolved Version Validation Checklist entry for nanoid v4/Workers compatibility.

---

### WR-03: `@dnd-kit/sortable` version claim is wrong by four major versions

**Files modified:** `CLAUDE.md`
**Commit:** 60a25ef
**Applied fix:** Split the combined `@dnd-kit/core + @dnd-kit/sortable | 6.x [UNVERIFIED]` row into two separate rows: `@dnd-kit/core | 6.x` and `@dnd-kit/sortable | 10.x`, reflecting that the two packages version independently. Updated the Version Validation Checklist to note both versions are verified against package.json.

---

### WR-04: README does not document the `VITE_PARTYKIT_HOST` environment variable for local dev

**Files modified:** `README.md`
**Commit:** 5ae39d0
**Applied fix:** Added a paragraph after the local dev URL instruction explaining that no `.env` file is needed — the client (`src/hooks/usePartySocket.ts`) falls back to `localhost:1999` when `VITE_PARTYKIT_HOST` is unset and `import.meta.env.DEV` is true. Notes that the variable is only needed for production builds via the GitHub Actions secret.

---

### WR-05: Playwright `reuseExistingServer` behavior description is incomplete for the two-server case

**Files modified:** `README.md`
**Commit:** 5c87e96
**Applied fix:** Added a note below the existing `reuseExistingServer` explanation clarifying that the flag applies independently per server. Recommends having either both servers running or neither running when invoking `npm run test:e2e` to avoid mixed-state issues.

---

## Skipped Issues

None — all in-scope findings were fixed.

---

_Fixed: 2026-04-28_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
