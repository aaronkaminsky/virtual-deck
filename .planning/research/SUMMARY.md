# Project Research Summary

**Project:** Virtual Deck v1.2
**Domain:** Real-time multiplayer card table — dev infrastructure + gameplay zone depth
**Researched:** 2026-04-19
**Confidence:** HIGH

## Executive Summary

Virtual Deck v1.2 is a two-track milestone: developer infrastructure hardening (Playwright e2e testing + Playwright MCP + README) and new gameplay surface area (personal play zones, communal zone, multi-card set play). The existing stack — React 18, TypeScript, Vite, PartyKit, dnd-kit, zustand — is fully in place and needs no new UI library additions. The only new package is `@playwright/test` as a dev dependency. Playwright MCP is registered as a project-scoped MCP config (`.mcp.json`) and is never added to `package.json`.

The architecture is well-suited to the gameplay zone additions. Personal play areas and the communal zone map cleanly onto the existing `Pile` infrastructure with a minimal schema extension (`ownerId?` and `region?` fields on `Pile`). The new `PLAY_CARD_SET` server action follows the same validate-then-mutate-then-broadcast pattern as all existing actions. The critical design decision — reuse `piles[]` rather than introduce a parallel `zones[]` collection — avoids duplicating MOVE_CARD routing, viewFor masking, and RESET_TABLE logic.

The highest-risk items in v1.2 are in the testing track, not the gameplay track. Playwright e2e tests against a real WebSocket server introduce async timing hazards that must be handled exclusively with Playwright's built-in retry assertions (never fixed waits). The PartyKit dev server startup URL must be validated before the webServer config is finalized. The gameplay track risks are well-understood: idempotent pile creation prevents reconnect data loss, and upfront validation in `PLAY_CARD_SET` prevents partial-move state corruption.

## Key Findings

### Recommended Stack

The existing stack requires no changes for gameplay features. The sole addition is `@playwright/test@1.51.x` as a dev dependency for the e2e test suite. Playwright MCP (`@playwright/mcp@0.0.70`) is project tooling only — registered via `.mcp.json`, not `package.json`. No new UI libraries are needed; play zones are layout/component composition on top of existing shadcn v4 + Tailwind infrastructure.

**Core technologies (additions for v1.2):**
- `@playwright/test 1.51.x`: E2E test runner — industry standard for multi-browser-context testing, the correct primitive for simulating two real players in the same PartyKit room
- `@playwright/mcp 0.0.70`: Playwright MCP server for Claude Code — interactive dev tool, project-scoped via `.mcp.json`, never in CI
- Chromium binaries (via `npx playwright install chromium`): smallest download, fastest CI runner; no cross-browser matrix needed

### Expected Features

All 7 v1.2 features are already committed in PROJECT.md. Research confirms they are achievable within the existing stack and architecture.

**Must have (all 7 are table stakes for this milestone):**
- DEV-01: `.mcp.json` committed to repo — project-scoped Playwright MCP for all contributors
- DEV-02: Playwright e2e suite covering 2-player sync, deal, pass, reset, hand privacy
- DEV-03: README covering setup, architecture overview, two runners (vitest + Playwright), deploy instructions
- DEV-04: Test model fix — extend `makeMockRoom()` to populate `getConnections()` and add `viewFor` masking assertions
- PLAY-01: Personal play area per player (dynamic pile creation in `onConnect`)
- PLAY-02: Shared communal zone (rename/clarify the existing "play" pile; add to `defaultGameState`)
- PLAY-03: Multi-card selection and play via select-then-button UI + new `PLAY_CARD_SET` server action

**Defer to v1.3+:**
- Drag-based multi-card selection (dnd-kit has no native multi-drag; community workaround is ~200 LOC of brittle overrides)
- Visual set grouping / set separator in play zones
- Action log ("Player X played N cards")

### Architecture Approach

v1.2 integrates into the existing server-authoritative architecture with minimal schema changes. The `Pile` type gains two optional fields (`ownerId?: string`, `region?: "table" | "player"`). `ClientGameState` gains `myPlayZoneId: string`. A new `PLAY_CARD_SET` action is added to `ClientAction`. The server's `onConnect` creates a personal play zone pile idempotently. `BoardView` splits `piles[]` into table and player regions for rendering. All existing handlers (`MOVE_CARD`, `RESET_TABLE`, `UNDO_MOVE`, `viewFor`) work unchanged because personal zones are just piles.

**Major components changed:**
1. `src/shared/types.ts` — add `ownerId`, `region`, `myPlayZoneId`, `PLAY_CARD_SET` action type
2. `party/index.ts` — personal zone creation in `onConnect`, communal zone in `defaultGameState`, `PLAY_CARD_SET` handler
3. `src/components/BoardView.tsx` — split piles by region, render personal zones near opponent hands
4. `src/components/HandZone.tsx` — add card selection toggle, selection visual, "Play selected" button
5. `src/hooks/useSelection.ts` (new) — zustand slice for `selectedCardIds: Set<string>`
6. `src/components/PlayZone.tsx` (new) — personal play area component (face-up spread, player name label, droppable)
7. `tests/e2e/` (new directory) — Playwright config, two-player fixture, e2e test files

**Unchanged components:** `PileZone.tsx`, `DraggableCard.tsx`, `usePartySocket.ts`, `usePlayerId.ts`, all existing vitest unit tests (additive, not rewritten).

### Critical Pitfalls

1. **Playwright assertions racing WebSocket state** — always use Playwright's retry-until-timeout assertions (`expect(locator).toHaveText()`); never use `.textContent()` or `waitForTimeout()`. Applies to every e2e test.
2. **Dynamic pile creation overwriting on reconnect** — `onConnect` must check `!piles.find(p => p.id === playZoneId)` before pushing a new pile. Idempotent creation is the established pattern for player join in this codebase.
3. **PLAY_CARD_SET partial move on validation failure** — validate ALL card IDs against `hands[senderToken]` before moving any; never mutate during validation. One failed card must block the entire set.
4. **PartyKit dev server not ready at test startup** — `webServer.url` must point to a PartyKit-specific ready endpoint, not just the Vite frontend. Validate actual startup URL from `npm run dev` output before writing the config.
5. **Conflating Playwright MCP with the e2e test suite** — MCP tools do not exist in the Playwright test runner and must never appear in committed test files. Two separate packages, two separate configs, two separate purposes.

## Implications for Roadmap

Based on research, the feature dependency graph dictates a clear build order with two parallel tracks.

### Phase 1: Test Model Fix (DEV-04)
**Rationale:** The existing test mock infrastructure has a known gap (empty `getConnections()` iterator means broadcastState assertions are silently skipped). Fixing this before writing new tests prevents building on a flawed foundation. Lowest-risk change — production code untouched.
**Delivers:** Extended `makeMockRoom()` that populates connections; new unit tests verifying `viewFor` masking for DEAL and PASS_CARD
**Addresses:** DEV-04
**Avoids:** Writing new e2e tests against a broken unit test model (scope creep risk bounded by timeboxing to mock extension only)

### Phase 2: Gameplay Zone Infrastructure (PLAY-02 + PLAY-01)
**Rationale:** The schema change in `types.ts` and `party/index.ts` must land before any client-side zone UI or the `PLAY_CARD_SET` action. Communal zone (PLAY-02) first because it is trivial (one pile in `defaultGameState`) and validates the `ownerId`/`region` fields are correct before the more complex dynamic pile creation (PLAY-01).
**Delivers:** `ownerId`/`region` fields on `Pile`; communal zone in `defaultGameState`; personal play zones created per player in `onConnect`; `myPlayZoneId` in `ClientGameState`
**Addresses:** PLAY-01, PLAY-02
**Avoids:** Pitfall 4 (reconnect overwrites) — idempotent check is part of the deliverable

### Phase 3: Multi-Card Play (PLAY-03)
**Rationale:** Depends on PLAY-01 and PLAY-02 zones existing as valid target zone IDs. New `PLAY_CARD_SET` server action + client selection UI + `PlayZone` component + `BoardView` layout split.
**Delivers:** `PLAY_CARD_SET` server action (atomic, validate-all-first); `useSelection` zustand hook; selection UI in `HandZone`; "Play N cards" button; `PlayZone` component; `BoardView` layout split by region
**Addresses:** PLAY-03 (and completes PLAY-01/PLAY-02 client rendering)
**Avoids:** Pitfall 5 (partial move) — validate-then-apply pattern; Pitfall 6 (dnd-kit multi-drag) — button-only for v1.2

### Phase 4: Playwright E2E Infrastructure (DEV-01 + DEV-02)
**Rationale:** E2E tests require a stable server (gameplay zones from Phases 2-3 should exist) to write meaningful two-player scenarios. DEV-01 (MCP config) is a single file commit bundled here. Install `@playwright/test`, configure `playwright.config.ts`, build the two-player fixture, write core scenario tests.
**Delivers:** `@playwright/test` installed; `playwright.config.ts` with webServer config; `tests/e2e/fixtures.ts` two-player fixture; e2e tests for 2-player sync, deal, pass, reset, hand privacy; `.mcp.json` committed
**Addresses:** DEV-01, DEV-02
**Avoids:** Pitfall 1 (async assertions) — enforce retry-only assertions in fixture; Pitfall 2 (server readiness) — validate PartyKit ready URL before committing config; Pitfall 3 (token isolation) — explicit `?player=` params in `beforeEach`; Pitfall 7 (MCP in test files)

### Phase 5: Developer README (DEV-03)
**Rationale:** README is standalone documentation with no code dependencies, but is best written after all v1.2 features are in place so it accurately reflects both test runners and the final architecture.
**Delivers:** `README.md` with setup, architecture overview, local dev, both test runners, GitHub Pages + PartyKit deploy, pointer to PROJECT.md for decisions
**Addresses:** DEV-03

### Phase Ordering Rationale

- DEV-04 before DEV-02: fix the unit test model before adding more tests that depend on the same mock infrastructure
- PLAY-02 before PLAY-01 before PLAY-03: schema changes gate zone UI; communal zone validates the schema before dynamic creation; PLAY_CARD_SET needs target zones to exist
- E2E after gameplay zones: writing meaningful 2-player zone tests requires the server to understand PLAY_CARD_SET and personal zones
- README last: document what exists, not what will exist

### Research Flags

Phases that need verification during implementation (not additional research):
- **Phase 4 (Playwright E2E):** Validate the exact PartyKit dev server health-check URL by running `npm run dev` and inspecting output. Current recommendation (`http://localhost:1999/~partykit/ping`) is MEDIUM confidence. Also confirm whether `npm run dev` starts both Vite and PartyKit in one process or requires two separate commands.

Phases with standard patterns (no additional research needed):
- **Phase 1 (DEV-04):** Root cause confirmed from code inspection; mock extension only
- **Phase 2 (PLAY-01/02):** Schema extension follows existing Pile type; idempotent join pattern already in codebase
- **Phase 3 (PLAY-03):** `PLAY_CARD_SET` follows existing action handler pattern; client selection in zustand is standard
- **Phase 5 (DEV-03):** Pure documentation; no technical unknowns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new packages for gameplay; `@playwright/test` 1.51.x confirmed via npm search. Existing stack fully validated in-repo. |
| Features | HIGH | All 7 features map cleanly to existing architecture. Scope for each is well-defined. Defer list is explicit. |
| Architecture | HIGH | Based on direct code inspection of `party/index.ts`, `src/shared/types.ts`, test files. Playwright patterns MEDIUM (docs reviewed, not yet in-repo). |
| Pitfalls | HIGH | Specific, actionable, grounded in known failure modes for this exact tech stack. |

**Overall confidence:** HIGH

### Gaps to Address

- **PartyKit dev server ready URL:** Exact health-check endpoint for `webServer.url` is MEDIUM confidence. Must be confirmed by running `npm run dev` before writing the config.
- **`npm run dev` behavior:** ARCHITECTURE.md states one command starts both Vite and PartyKit; STACK.md shows two separate webServer entries. Check `package.json` scripts to resolve before writing `playwright.config.ts`.
- **dnd-kit multi-drag (deferred):** If v1.3 wants drag-based multi-select, this needs dedicated research at that time. Community patterns are MEDIUM confidence at best.

## Sources

### Primary (HIGH confidence)
- `/virtual-deck/party/index.ts` — server logic, onConnect, broadcastState, MOVE_CARD pattern
- `/virtual-deck/src/shared/types.ts` — Pile, ClientGameState, ClientAction types
- `/virtual-deck/src/components/BoardDragLayer.tsx` — dnd-kit wiring, collision detection
- `/virtual-deck/src/components/HandZone.tsx` — hand rendering, drag integration
- `/virtual-deck/tests/*.test.ts` — existing unit test structure and mock helpers

### Secondary (MEDIUM confidence)
- Playwright official docs: https://playwright.dev/docs/test-webserver, https://playwright.dev/docs/browser-contexts
- Microsoft playwright-mcp: https://github.com/microsoft/playwright-mcp
- Simon Willison's TIL: https://til.simonwillison.net/claude-code/playwright-mcp-claude-code
- Builder.io guide on Playwright MCP + Claude Code: https://www.builder.io/blog/playwright-mcp-server-claude-code
- npm registry search (April 2026): `@playwright/test@1.51.x`, `@playwright/mcp@0.0.70`

### Tertiary (LOW confidence)
- dnd-kit multi-drag: issues #120, discussion #1313 — community patterns only, no official API

---
*Research completed: 2026-04-19*
*Ready for roadmap: yes*
