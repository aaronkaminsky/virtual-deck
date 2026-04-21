# Phase 13: Playwright Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 13-playwright-infrastructure
**Areas discussed:** Dev server startup, 2-player room isolation, npm script integration

---

## Dev Server Startup

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-start both | playwright.config.ts webServer array starts Vite + PartyKit; reuseExistingServer skips startup if already running | ✓ |
| Auto-start Vite only | Requires PartyKit pre-running; violates SC #1 | |
| Mock WebSocket | No real servers; doesn't test real 2-player sync | |

**User's choice:** Auto-start both
**Notes:** User asked whether auto-start causes issues if servers already running locally. Clarified that `reuseExistingServer: !process.env.CI` handles this — Playwright checks the port before launching, reuses existing process locally, always starts fresh in CI.

---

## 2-Player Room Isolation

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh room per test | Unique nanoid room code per test; two browser contexts; clean teardown | ✓ |
| Shared room with cleanup | Single room reused across tests; state reset between tests | |

**User's choice:** Fresh room per test
**Notes:** No follow-up questions — decision was clear and self-contained.

---

## npm Script Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Separate test:e2e script | npm test stays vitest-only; test:e2e and test:e2e:ui added | ✓ |
| Combined test:all script | Adds test:all that runs vitest + playwright sequentially | |

**User's choice:** Separate test:e2e script
**Notes:** No follow-up questions.

---

## Claude's Discretion

- File organization within `playwright/`
- playwright.config.ts reporter
- Assertion selector strategy
- Whether `@playwright/test` goes in devDependencies (recommended yes)

## Deferred Ideas

None.
