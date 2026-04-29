---
phase: 16-developer-readme
plan: "01"
subsystem: documentation
tags: [readme, developer-docs, deploy, architecture, testing]
dependency_graph:
  requires: []
  provides: [developer-onboarding, deploy-guide]
  affects: []
tech_stack:
  added: []
  patterns: [prose-architecture-overview, full-preflight-deploy-docs]
key_files:
  created:
    - README.md
  modified: []
decisions:
  - "Architecture section uses approved prose verbatim — no diagrams, no rationale (D-01, D-02)"
  - "Deploy section split into separate Frontend and Server subsections (D-06)"
  - "Full pre-flight coverage for both targets — GitHub Pages activation, partykit login, VITE_PARTYKIT_HOST secret (D-05)"
  - "Link to .planning/PROJECT.md Key Decisions table for all architectural rationale (D-02)"
metrics:
  duration: "~5 minutes"
  completed: "2026-04-28"
  tasks_completed: 2
  files_created: 1
  files_modified: 0
---

# Phase 16 Plan 01: Developer README Summary

## One-liner

README.md at repo root covering local setup (two-terminal dev stack), architecture prose with hand masking via `viewFor`, Vitest + Playwright test instructions, and full pre-flight deploy guide for GitHub Pages and PartyKit Cloud.

## What Was Built

Created `README.md` as the project's first developer-facing documentation file. The file enables a developer to set up locally, understand the architecture, run both test suites, and perform a first-time deploy — using only this single document.

**Section breakdown:**

- **Title + intro (2 sentences):** Project description + link to `.planning/PROJECT.md` Key Decisions table
- **Local Setup:** Prerequisites, clone/install, two-terminal dev stack start with port notes, full command reference table (9 commands from `package.json`)
- **Architecture:** 2-paragraph prose covering client/server split, PartyKit server role, hand masking via `viewFor`, typed message flow, `src/shared/` types, `party/index.ts` entrypoint
- **Tests:** Vitest unit tests (run once + watch), Playwright e2e (first-run browser install, headless + UI runner, `reuseExistingServer` behavior), Playwright MCP note
- **Deploy:** Frontend (GitHub Pages — Settings activation, `VITE_PARTYKIT_HOST` secret, push-to-main + `workflow_dispatch`); Server (PartyKit Cloud — `partykit login`, `npm run deploy`); First-time deploy order

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | README sections 1-4 (intro, Local Setup, Architecture, Tests) | ccb7c99 |
| 2 | Deploy section (Frontend + Server pre-flight) | 4bddebd |

## Deviations from Plan

None — plan executed exactly as written. All commands sourced verbatim from `package.json`; architecture prose used verbatim from 16-CONTEXT.md `<specifics>`; deploy facts sourced from `.github/workflows/deploy.yml`, `partykit.json`, and `vite.config.ts`.

## Known Stubs

None.

## Threat Flags

None — README.md is documentation only. `VITE_PARTYKIT_HOST` is referenced by name only; `virtual-deck.aaronkaminsky.partykit.dev` is already public via `.github/workflows/deploy.yml` committed to a public repo. No new attack surface introduced.

## Requirements Satisfied

- **DEV-03:** Developer README with setup, architecture, and deploy instructions — fully satisfied
  - Success criterion 1: Clone, install, start dev stack using only README.md — covered in Local Setup
  - Success criterion 2: Run unit tests (Vitest) and e2e tests (Playwright) using only README.md — covered in Tests
  - Success criterion 3: Understand client/server split, PartyKit role, hand masking, message flow from prose — covered in Architecture
  - Success criterion 4: Full first-time deploy of frontend (GitHub Pages) and server (PartyKit Cloud) including pre-flight setup — covered in Deploy

## Self-Check: PASSED

- `README.md` exists: CONFIRMED (`test -f README.md`)
- All 5 sections present (H1 title, H2 Local Setup, H2 Architecture, H2 Tests, H2 Deploy): CONFIRMED
- ccb7c99 exists in git log: CONFIRMED
- 4bddebd exists in git log: CONFIRMED
- File length 146 lines (minimum 130): CONFIRMED
- No secret-shaped values: CONFIRMED
