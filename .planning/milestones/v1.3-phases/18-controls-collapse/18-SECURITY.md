---
phase: 18
slug: controls-collapse
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-04
---

# Phase 18 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| (Plan 01 — none) | Test file runs in Vitest worker; no untrusted input crosses any boundary | None |
| Browser → PartyKit (DEAL_CARDS) | `dealCount` parsed with `parseInt(dealCount, 10)` and sent as `cardsPerPlayer`; server-side validation already exists for DEAL_CARDS | Integer (cardsPerPlayer), client-supplied |
| Browser → clipboard (Copy link) | Constructed URL sent to `navigator.clipboard.writeText`; no user-controlled fields beyond server-issued `roomId` | Room URL (no PII, no session tokens) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-18-P1-01 | I — Information disclosure | tests/controlsCollapse.test.ts | accept | Test file contains no secrets, fixtures, or PII; pure logic-extraction with `vi.fn()` mocks | closed |
| T-18-P2-01 | T — Tampering | DEAL_CARDS payload (ControlsBar → PartyKit) | accept | `cardsPerPlayer` integer is validated server-side (existing behavior, no change in this phase). Client `parseInt` is a UX guard, not a security boundary. | closed |
| T-18-P2-02 | I — Information disclosure | Copy link URL (ControlsBar → clipboard) | accept | URL contains `roomId` only — no PII or session tokens. Room codes are designed to be shared. Same threat surface as pre-existing Copy link in BoardView (no new exposure). | closed |
| T-18-P2-03 | D — Denial of Service | Reset confirmation race (ControlsBar state) | mitigate | `setConfirmReset(false)` executes on every panel close via `handleOpenChange` — outside-click, Escape, and programmatic close all clear the stale confirmation row. Verified in code (18-02-SUMMARY.md). | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-18-01 | T-18-P1-01 | Test-only file; no secrets or PII can be exposed | Phase 18 PLAN.md | 2026-05-04 |
| AR-18-02 | T-18-P2-01 | Server-side validation already guards this boundary; client parse is defense-in-depth only | Phase 18 PLAN.md | 2026-05-04 |
| AR-18-03 | T-18-P2-02 | Room URLs are inherently shareable; no sensitive data included in link | Phase 18 PLAN.md | 2026-05-04 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-04 | 4 | 4 | 0 | gsd-security-auditor (automated) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-04
