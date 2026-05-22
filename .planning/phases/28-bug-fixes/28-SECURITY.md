---
phase: 28
slug: bug-fixes
status: verified
threats_open: 0
asvs_level: 1
created: 2026-05-22
---

# Phase 28 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Server → Client | `selectedIds` is local client UI state derived from user clicks; never originates from server messages | None (local state only) |
| Server → Client | Grid card positions originate from server; this phase does not change position coordinates | Read-only card position data |
| Client UI state | `selectedIds` is a `Set<string>` of card IDs; contains no sensitive information | Card IDs (non-secret, visible to all players) |
| Client viewport | CSS-only grid column change; no server state or user input involved | None |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-28-SC | Tampering | npm installs | accept | No new packages installed in either plan; supply chain attack surface unchanged | closed |
| T-28-01 | Information Disclosure | Card ID in selectedIds | accept | Card IDs are visible to all players at the table; selection state is local UI only and not broadcast over the wire | closed |
| T-28-02 | Tampering | isSelected prop | accept | `isSelected` is a pure UI rendering prop derived from client-owned `selectedIds`; no server action is triggered by the ring display | closed |
| T-28-03 | Information Disclosure | Grid layout on mobile | accept | Column count change is visual only; no card face data is exposed or hidden by the responsive grid | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-28-01 | T-28-SC | No packages added — supply chain surface is identical to Phase 27 | Plan author | 2026-05-21 |
| AR-28-02 | T-28-01 | Card IDs are non-secret; all players see the same deck. Selection highlight reveals which cards are selected, which is intentional UX | Plan author | 2026-05-21 |
| AR-28-03 | T-28-02 | The ring is purely decorative; it does not unlock actions or change game state | Plan author | 2026-05-21 |
| AR-28-04 | T-28-03 | Grid column count at mobile widths has no security implication; card data is unchanged | Plan author | 2026-05-21 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-05-22 | 4 | 4 | 0 | gsd-secure-phase (automated, register_authored_at_plan_time: true) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-05-22
