# Phase 7: Nyquist Validation - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 closes the Nyquist compliance gap across all completed phases. The deliverable is updated VALIDATION.md files with correct frontmatter flags, plus a new VALIDATION.md for Phase 5.

**In scope:**
- Phase 1: Update `nyquist_compliant: false` → `true`, `wave_0_complete: false` → `true`
- Phase 3: Update `wave_0_complete: false` → `true` (already `nyquist_compliant: true`)
- Phase 4: Update `nyquist_compliant: false` → `true`, `wave_0_complete: false` → `true`
- Phase 5: Create VALIDATION.md from scratch with `nyquist_compliant: true`

**Out of scope:**
- New test code (tests already exist and pass — 88/88)
- Changes to game logic or server code
- Updating requirements traceability beyond VALIDATION.md

</domain>

<decisions>
## Implementation Decisions

### Stale Per-Task Status (Areas B — user deferred to Claude)
- **D-01:** Update per-task verification maps to reflect current reality: tasks whose test files now exist and pass should be marked `✅ green`. This makes the VALIDATION.md a useful audit document rather than a stale planning artifact.
- **D-02:** Tasks that were manual-only remain `⬜ pending` unless the planner can verify they were actually performed.

### Phase 01 Compliance Path (Area C — user deferred to Claude)
- **D-03:** Presence of test files + all 88 tests passing is sufficient to flip `wave_0_complete: true`. Wave 0 items listed in Phase 01 VALIDATION.md are all accounted for: `tests/deck.test.ts`, `tests/shuffle.test.ts`, `tests/viewFor.test.ts`, `vitest.config.ts`, `src/shared/types.ts`, `party/index.ts` — all exist.
- **D-04:** `nyquist_compliant: true` for Phase 01 follows from wave_0_complete + all automated tasks having passing tests. No additional coverage claims need verification beyond confirming `npm test` is green.

### Phase 05 VALIDATION Structure (Area A — user deferred to Claude)
- **D-05:** Phase 05 VALIDATION.md should cover: `reconnect.test.ts` (ROOM-04 server reconnect), manual-only verifications for presence dots and disconnection banner (browser-only). `nyquist_compliant: true` is achievable because the reconnect behavior has automated coverage.
- **D-06:** Wave 0 for Phase 05: `tests/reconnect.test.ts` (already exists and passes). No new test files needed.
- **D-07:** Manual-only verifications for Phase 05: presence dot display (multi-tab), disconnection banner behavior (network disconnect simulation).

### Claude's Discretion
- Exact wording and formatting of VALIDATION.md for Phase 05 — follow the established pattern from Phase 03 VALIDATION.md (most similar: feature phase with both automated and manual-only verifications)
- Which specific reconnect test cases map to which task IDs in the verification map

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing VALIDATION.md files (to be updated)
- `.planning/phases/01-server-foundation/01-VALIDATION.md` — current state: `nyquist_compliant: false`, `wave_0_complete: false`; wave_0 items: deck.test.ts, shuffle.test.ts, viewFor.test.ts, vitest.config.ts, src/shared/types.ts, party/index.ts
- `.planning/phases/03-core-board/03-VALIDATION.md` — current state: `nyquist_compliant: true`, `wave_0_complete: false`; wave_0 items: moveCard.test.ts, deck.test.ts update
- `.planning/phases/04-game-controls/04-VALIDATION.md` — current state: `nyquist_compliant: false`, `wave_0_complete: false`; wave_0 items: flipCard, passCard, dealCards, shufflePile, resetTable, undoMove test files

### Phase 05 source material (for creating 05-VALIDATION.md)
- `.planning/phases/05-resilience-polish/05-CONTEXT.md` — implementation decisions for ROOM-04, presence, disconnection UX
- `.planning/phases/05-resilience-polish/05-01-SUMMARY.md` — what was actually built
- `.planning/phases/05-resilience-polish/05-02-SUMMARY.md` — what was actually built
- `.planning/phases/05-resilience-polish/05-03-SUMMARY.md` — what was actually built

### Test infrastructure (verify state before updating flags)
- `tests/` — all 12 test files; `npm test` shows 88/88 passing as of 2026-04-09
- `vitest.config.ts` — root config pointing at `tests/**/*.test.ts` (Wave 0 gap for Phase 01 is closed)

### Roadmap
- `.planning/ROADMAP.md` §Phase 7 — success criteria for each phase's compliance

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- All Phase 04 wave_0 test files now exist: `tests/flipCard.test.ts`, `tests/passCard.test.ts`, `tests/dealCards.test.ts`, `tests/shufflePile.test.ts`, `tests/resetTable.test.ts`, `tests/undoMove.test.ts`
- `tests/reconnect.test.ts` — exists and passes; covers ROOM-04 server reconnect logic

### Established Patterns
- VALIDATION.md structure established by Phase 03 (most complete example): frontmatter flags, Test Infrastructure table, Sampling Rate, Per-Task Verification Map, Wave 0 Requirements, Manual-Only Verifications, Validation Sign-Off checklist
- `npm test` runs the full suite; `npx tsc --noEmit` for typecheck; both referenced in existing VALIDATION.md files

### Integration Points
- Phase 05 VALIDATION.md should be created in `.planning/phases/05-resilience-polish/05-VALIDATION.md`
- All three updates (phases 1, 3, 4) are in-place edits to existing VALIDATION.md files

</code_context>

<specifics>
## Specific Ideas

No specific requirements — user skipped discussion (no areas selected). Claude has full discretion on all implementation decisions captured above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 07-nyquist-validation*
*Context gathered: 2026-04-09*
