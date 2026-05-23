---
phase: 29-sort-verification
slug: sort-verification
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-22
---

# Phase 29 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| client UI → PartyKit server | `sendAction` calls cross this boundary; phase 29 REMOVES sort-click dispatches so sort is purely local | No sort state crosses this boundary; `REORDER_HAND` (drag-reorder only) and room/player data still cross as before |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-29-01 | Tampering | `handleSort` — accidentally emitting REORDER_HAND on sort click | mitigate | Verified: `grep -c "type: 'REORDER_HAND'" HandZone.tsx` = 1 (drag-reorder only); `grep -c "sendAction(dispatch)" HandZone.tsx` = 0 | closed |
| T-29-02 | Tampering | `sortCards` — mutating the source `cards` prop, polluting React state and server-sync expectations | mitigate | Verified: non-mutation invariant test present in `tests/handSort.test.ts`; `toEqual(originalIds)` assertion confirms input unchanged after two consecutive sort calls | closed |
| T-29-03 | Information Disclosure | Hand sort revealing card data to opponents | accept | `viewFor` server-side masking unchanged; sort is purely client-side render-time visual; opponents never receive local sort state. See Accepted Risks Log. | closed |
| T-29-04 | Repudiation | Sort actions appearing in undo history and being undone unexpectedly | mitigate | Verified: `grep -c "skipSnapshot" HandZone.tsx` = 0; sort can no longer enter any snapshot/undo path | closed |
| T-29-SC | Tampering | npm/pip/cargo supply-chain installs | accept | No package installs in this phase — only edits to two existing TypeScript files. See Accepted Risks Log. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-29-01 | T-29-03 | Sort is render-time visual only; `viewFor` server-side masking is unchanged and unaffected by this phase. Opponents receive only masked server state; the local `sortMode` value never crosses the client→server boundary. | gsd-security-auditor | 2026-05-22 |
| AR-29-02 | T-29-SC | Phase 29 modifies only `src/components/HandZone.tsx` and `tests/handSort.test.ts` — no package installs, no lockfile changes, no new dependencies. Supply-chain risk is zero for this phase. | gsd-security-auditor | 2026-05-22 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-22 | 5 | 5 | 0 | gsd-security-auditor (automated) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-22
