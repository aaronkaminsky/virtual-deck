---
phase: 13
slug: playwright-infrastructure
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | @playwright/test 1.59.1 |
| **Config file** | `playwright.config.ts` (project root — Wave 0 creates it) |
| **Quick run command** | `npx playwright test --grep "state sync"` |
| **Full suite command** | `npm run test:e2e` |
| **Estimated runtime** | ~30–60 seconds (two real browser contexts + PartyKit) |

---

## Sampling Rate

- **After every task commit:** Run `npx playwright test --grep` matching the scenario under development
- **After every plan wave:** Run `npm run test:e2e` (full e2e suite)
- **Before `/gsd-verify-work`:** Full e2e suite green + `npm test` (vitest unit suite) green
- **Max feedback latency:** ~60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | DEV-01 | — | N/A | manual | `cat .mcp.json` | ❌ W0 | ⬜ pending |
| 13-01-02 | 01 | 1 | DEV-02 SC1 | — | N/A | e2e | `npx playwright test --grep "state sync"` | ❌ W0 | ⬜ pending |
| 13-01-03 | 01 | 1 | DEV-02 SC2 | — | N/A | e2e | `npx playwright test --grep "deal"` | ❌ W0 | ⬜ pending |
| 13-01-04 | 01 | 1 | DEV-02 SC3 | — | N/A | e2e | `npx playwright test --grep "pass"` | ❌ W0 | ⬜ pending |
| 13-01-05 | 01 | 1 | DEV-02 SC4 | — | N/A | e2e | `npx playwright test --grep "reset"` | ❌ W0 | ⬜ pending |
| 13-01-06 | 01 | 1 | DEV-02 SC5 | — | Hand privacy: P2 sees count not card IDs | e2e | `npx playwright test --grep "privacy"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install --save-dev @playwright/test @playwright/mcp` — install test framework and MCP server
- [ ] `npx playwright install chromium` — install Chromium browser
- [ ] `playwright.config.ts` — dual webServer config (Vite port 5173 + PartyKit port 1999)
- [ ] `playwright/fixtures.ts` — `twoPlayerRoom` fixture with LobbyPanel interaction
- [ ] `playwright/game.spec.ts` — 5 scenario test stubs (one per SC)
- [ ] `.mcp.json` — `@playwright/mcp` MCP server entry
- [ ] `data-testid="hand-zone"` on `HandZone` droppable container
- [ ] `data-testid="opponent-hand"` on `OpponentHand` outer container
- [ ] `data-testid={`pile-${pile.id}`}` on `PileZone` containers
- [ ] `package.json` scripts: `"test:e2e"` and `"test:e2e:ui"`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `.mcp.json` registers as project-scoped MCP in Claude Code | DEV-01 | Claude Code MCP discovery requires a developer session to verify; no automated check | Start a Claude Code session in the repo; verify `@playwright/mcp` appears in available MCP servers |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
