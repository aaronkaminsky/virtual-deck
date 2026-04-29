---
phase: 16-developer-readme
reviewed: 2026-04-28T00:00:00Z
depth: standard
files_reviewed: 1
files_reviewed_list:
  - README.md
findings:
  critical: 0
  warning: 5
  info: 3
  total: 8
status: issues_found
---

# Phase 16: Code Review Report

**Reviewed:** 2026-04-28
**Depth:** standard
**Files Reviewed:** 1
**Status:** issues_found

## Summary

README.md is a developer-facing documentation file. The review cross-referenced every factual claim (commands, ports, paths, URLs, setup steps) against the actual project files (`package.json`, `vite.config.ts`, `playwright.config.ts`, `partykit.json`). No critical issues were found. Five warnings were identified where the README makes claims that are incorrect, misleading, or likely to block a developer following it for the first time. Three info-level items cover omissions and minor inaccuracies that reduce documentation quality without blocking onboarding.

---

## Warnings

### WR-01: Playwright `baseURL` omits the `/virtual-deck/` subpath — e2e tests will silently navigate to the wrong origin

**File:** `README.md:35` (cross-reference: `playwright.config.ts:8`)

**Issue:** The README tells developers to visit `http://localhost:5173/virtual-deck/` and explicitly explains the `/virtual-deck/` path is required because Vite's `base` is set to `/virtual-deck/`. However, `playwright.config.ts` sets `baseURL: 'http://localhost:5173'` — without the subpath. Playwright navigates using `page.goto('/')` which resolves to `http://localhost:5173/`, not `http://localhost:5173/virtual-deck/`. The README's explanation creates the correct mental model but does not note that e2e tests (and therefore the `npm run test:e2e` command the README documents) have a mismatch that will cause page-load failures or blank screens during Playwright runs. A developer following the README will not understand why e2e tests fail when everything appears to be configured correctly.

**Fix:** Either fix `playwright.config.ts` to use `baseURL: 'http://localhost:5173/virtual-deck/'`, or add a note in the README's e2e section that the Playwright `baseURL` does not include the subpath and that test `goto` calls must include `/virtual-deck/` explicitly.

---

### WR-02: `nanoid` version claim contradicts installed version — onboarding documentation is factually wrong

**File:** `README.md` (cross-reference: `package.json:26`)

**Issue:** The CLAUDE.md (which is displayed inside README.md via GSD template blocks) states nanoid `4.x [UNVERIFIED]`. The actual installed version is `nanoid@^5.1.7`. This is not a minor version bump — nanoid v5 dropped CJS support and changed the export structure. A developer reading this section will expect v4 semantics. The README's "Version Validation Checklist" entry for nanoid says to confirm v4+ works in Cloudflare Workers, but the project has already moved past v4. The documented claim is stale and misleading.

**Fix:** Update the nanoid version reference to `5.x` (or remove the version claim and the now-resolved checklist item for nanoid v4/Workers compatibility, since v5 is installed and presumably working).

---

### WR-03: `@dnd-kit/sortable` version claim is wrong by four major versions

**File:** `README.md` (cross-reference: `package.json:19`)

**Issue:** The README states `@dnd-kit/core + @dnd-kit/sortable | 6.x [UNVERIFIED]`. The installed version is `@dnd-kit/sortable@^10.0.0`. Major versions 7–10 may have introduced breaking API changes. A developer following the README who tries to reference version-specific documentation or installs v6 explicitly will encounter unexpected behavior. The `[UNVERIFIED]` marker does not excuse a four-major-version error — the installed version is ground truth.

**Fix:** Update the version claim to reflect the actual installed `@dnd-kit/sortable` version (`10.x`). Note that `@dnd-kit/core` is at `6.x` (`^6.3.1`), so the two packages are at different major versions and should be documented separately, not grouped under a single version number.

---

### WR-04: README does not document the `VITE_PARTYKIT_HOST` environment variable needed for local dev

**File:** `README.md:25–35` (Local Setup / Start the Dev Stack section)

**Issue:** The README documents deploying with `VITE_PARTYKIT_HOST` as a GitHub Actions secret (line 101–103) but never explains that local development also requires this variable (or a `.env` file / default fallback). If the Vite frontend uses `import.meta.env.VITE_PARTYKIT_HOST` to determine the PartyKit host at build time, a developer following the Local Setup section who does not set this variable will connect to an undefined host (empty string, `undefined`, or the production host) rather than `localhost:1999`. The setup instructions are incomplete in a way that will produce silent connection failures rather than an obvious error.

**Fix:** Add a step in the Local Setup section that clarifies what value `VITE_PARTYKIT_HOST` takes in local development (e.g., `localhost:1999`) and whether a `.env.local` file is needed, or confirm that the client has a hardcoded local fallback and document it.

---

### WR-05: Playwright `reuseExistingServer` behavior description is incomplete for the two-server case

**File:** `README.md:81–83`

**Issue:** The README states "locally, if `npm run dev` and `npm run dev:client` are already running on ports 1999 and 5173, Playwright reuses them." This is correct for the case where both servers are running. But it omits a critical failure mode: if only one of the two servers is running when `npm run test:e2e` is called, Playwright will attempt to start the missing one but will not kill or restart the already-running one. Depending on port state, this can result in one server being stale and the other fresh, causing inconsistent test behavior. Developers who routinely run `npm run dev:client` for frontend work will hit this split-state scenario when they run e2e tests.

**Fix:** Add a note that `reuseExistingServer` applies per-server. Recommend either having both servers running or neither running when invoking `npm run test:e2e` to avoid mixed-state issues.

---

## Info

### IN-01: `npm run test:watch` is documented in README but absent from CLAUDE.md command table

**File:** `README.md:44` (cross-reference: `CLAUDE.md` Dev Commands table)

**Issue:** The README's Command Reference table correctly includes `npm run test:watch` (line 44), and the script exists in `package.json` (`"test:watch": "vitest"`). The CLAUDE.md Dev Commands table omits it. The inconsistency means Claude Code sessions using CLAUDE.md as their reference will not know this command exists. This is a documentation inconsistency between two developer-facing sources, not a README bug — but the README is the authoritative source here and is correct.

**Fix:** Add `npm run test:watch` to the CLAUDE.md Dev Commands table. (No change needed to README.md itself.)

---

### IN-02: Local dev URL in README uses the Vite default port but Playwright `baseURL` does not

**File:** `README.md:35`

**Issue:** The README documents `http://localhost:5173/virtual-deck/` as the local URL. This is correct for manual browser access. However, the Playwright `baseURL` is `http://localhost:5173` (without the path). Developers will notice the discrepancy and may incorrectly conclude the Playwright config is wrong, or that the README URL is wrong. The README should note that the Playwright `baseURL` intentionally omits the path (or, preferably, WR-01 is fixed and the `baseURL` is updated to match).

**Fix:** Resolve by fixing WR-01. If WR-01 is accepted as-is, add a parenthetical to line 35 noting that the Playwright base URL differs from the manual access URL.

---

### IN-03: `zustand` and `immer` are listed in the stack table but are absent from `package.json`

**File:** `README.md` (cross-reference: `package.json`)

**Issue:** The embedded CLAUDE.md stack section documents `zustand` and `immer` as dependencies. Neither package appears in `package.json`. This may mean they were planned but not yet installed, or they were evaluated and rejected. The documentation describes them as "when to use" guidance, which suggests they are intended to be installed later — but they are presented in a table titled "Recommended Stack" which reads as the current stack, not a future plan.

**Fix:** Add a note to the stack section (or a separate "Planned / Optional" heading) that distinguishes installed packages from planned-but-not-yet-added dependencies. Alternatively, if `zustand` and `immer` are not going to be used, remove them from the table.

---

_Reviewed: 2026-04-28_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
