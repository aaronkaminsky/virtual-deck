---
phase: 27
slug: drop-target-empty-spread-behavior
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-22
---

# Phase 27 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Server → Client | `pile.cards` and the `interactive` prop flow from server through BoardView; OpponentHand and SpreadZone only read these values | pile.cards (read-only), interactive prop (boolean) |
| Client → DnD context | `useDndContext().active` and `useDroppable().isOver` are local-only signals derived from pointer events in the browser; no network surface | Pointer events (local only, no network) |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-27-SC | Tampering | npm/pip/cargo installs | accept | No new packages installed — both edits are className-only; existing `vitest` + Vite `?raw` import reused | closed |
| T-27-01 | Spoofing | SpreadZone `interactive` prop | accept | `interactive` is set by BoardView from server-derived player identity; inherited from Phase 26; guard at line 214 (`interactive !== false && !isEmpty`) unchanged | closed |
| T-27-02 | Information Disclosure | OpponentHand drop-target visual | accept | CTRL-06 reduces leakage — removing dashed border at drag-start means no longer signals "drag is happening" on opponent zones; net improvement over prior state | closed |
| T-27-03 | Denial of Service | className changes | accept | Pure CSS className changes; no runtime cost; cannot cause DoS | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-27-SC | T-27-SC | Supply chain attack surface unchanged — no new dependencies introduced | Aaron Kaminsky | 2026-05-22 |
| R-27-01 | T-27-01 | `interactive` prop trust inherited from Phase 26 server-authoritative identity model; no new spoofing surface | Aaron Kaminsky | 2026-05-22 |
| R-27-02 | T-27-02 | Prior behavior was worse (broadcast drag activity); CTRL-06 removes the leak entirely | Aaron Kaminsky | 2026-05-22 |
| R-27-03 | T-27-03 | Pure CSS change with no runtime execution path | Aaron Kaminsky | 2026-05-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-22 | 4 | 4 | 0 | gsd-secure-phase (automated) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-22
