---
phase: 15
slug: multi-card-set-play
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-28
---

# Phase 15 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Client WebSocket → PartyKit `onMessage` | Untrusted client message crosses into server-authoritative game state. `fromId`, `cardIds`, `toId` are fully attacker-controlled. | `PLAY_CARD_SET` action body (untrusted) |
| PartyKit `broadcastState()` → other clients | Server-authoritative state passes through `viewFor()` masking before reaching each connection. Spread zones are public. | Masked game state (hand cards hidden per connection) |
| Browser DOM events → React state | Ephemeral client-side selection UI. No data crosses a security boundary in this plan. | Selected card IDs (local user's own cards only) |
| `sendAction(PLAY_CARD_SET)` → PartyKit server | Client composes the action; server enforces all authorization. Client is not a trust source. | `PLAY_CARD_SET` message body |
| Playwright test runner → app under test | Test code is trusted; the app is the system under test. No external trust crossing. | None |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-15-01 | Spoofing/Tampering | `PLAY_CARD_SET` handler auth gate (`party/index.ts`) | mitigate | `if (fromId !== senderToken)` rejects with `UNAUTHORIZED_MOVE` at line 506 before any state read or mutation. Verified present. | closed |
| T-15-02 | Tampering | `PLAY_CARD_SET` handler pre-validation (`party/index.ts`) | mitigate | `cardIds.every(id => handIdSet.has(id))` at lines 526–535; rejects with `CARD_NOT_IN_SOURCE`; `takeSnapshot` not reached until line 562. No partial mutation possible. Verified present. | closed |
| T-15-03 | Tampering | Destination pile lookup (`party/index.ts`) | mitigate | `piles.find(p => p.id === toId)` with `toZone === "pile"` guard at lines 549–558; rejects with `PILE_NOT_FOUND` if absent. Verified present. | closed |
| T-15-04 | Information Disclosure | `viewFor()` masking after `PLAY_CARD_SET` broadcast | accept | Spread zones are intentionally public. `card.faceUp = destPile.faceUp ?? true` at line 569. No hidden information leaks. | closed |
| T-15-05 | Denial of Service | Unbounded `cardIds.length` from client | accept | 1–5 UI constraint only. Sandbox game; sending all 52 is a legitimate game action. No server enforcement needed. | closed |
| T-15-06 | Repudiation | Lack of audit log | accept | Out of scope for v1.2. PLAY-06 (action log) is a future requirement. Undo snapshot is the implicit audit trail. | closed |
| T-15-07 | Tampering | Client-composed `PLAY_CARD_SET.fromId` | accept | Server validates `fromId !== senderToken` independently of client (T-15-01). No client-side mitigation needed. | closed |
| T-15-08 | Information Disclosure | `selectedIds` in React `useState` | accept | `selectedIds` is a `Set<string>` of card IDs the local user already owns. Never persisted to localStorage or zustand. | closed |
| T-15-09 | Repudiation | Client crafting `PLAY_CARD_SET` with arbitrary `cardIds` | mitigate | Server pre-validates every `cardId` against sender's hand (T-15-02 at `party/index.ts:526–535`). Client UI cannot bypass server authorization. Verified present. | closed |
| T-15-10 | Denial of Service | Rapid Escape spamming or multi-click | accept | Set operations are O(1) per toggle; React state batching handles burst events. Real-time impact negligible. | closed |
| T-15-11 | Tampering | Stale testid in e2e test (`playwright/game.spec.ts`) | mitigate | `spread-zone-spread-communal` count = 0 (removed); `getByTestId('spread-zone-play')` count = 4 (corrected). Verified present. | closed |
| T-15-12 | Information Disclosure | E2e test exposing hand cards to opponent | mitigate | `hand privacy: P2 sees count not card IDs` test at `playwright/game.spec.ts:97` is present and unmodified. `PLAY_CARD_SET` only moves cards to public piles. Verified present. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-15-01 | T-15-04 | Spread zones are intentionally public game areas; faceUp cards visible to all players is correct game behavior | gsd-security-auditor | 2026-04-28 |
| AR-15-02 | T-15-05 | No upper-bound on `cardIds` is intentional; sandbox game with no adversarial model — playing all cards is a valid action | gsd-security-auditor | 2026-04-28 |
| AR-15-03 | T-15-06 | Audit log (PLAY-06) deferred to a future phase; undo snapshots provide implicit replay capability | gsd-security-auditor | 2026-04-28 |
| AR-15-04 | T-15-07 | Server-side auth gate (T-15-01) makes client-side validation redundant; accepted as defense-in-depth gap only | gsd-security-auditor | 2026-04-28 |
| AR-15-05 | T-15-08 | `selectedIds` is ephemeral React state scoped to the local user's own visible cards; no persistence or cross-player exposure | gsd-security-auditor | 2026-04-28 |
| AR-15-06 | T-15-10 | Selection toggle is O(1); React batching absorbs burst events; no server round-trip triggered by selection alone | gsd-security-auditor | 2026-04-28 |

*Accepted risks do not resurface in future audit runs.*

---

## Notable Findings

**Auth gate ordering confirmed correct.** The `PLAY_CARD_SET` handler gates execute strictly: empty-check → auth-gate (line 506) → hand-read (line 515) → all-cardIds pre-validation (line 527) → duplicate-check (line 538) → pile-lookup (line 549) → `takeSnapshot` (line 562) → atomic mutation. No state mutation is reachable if any gate rejects.

**Unplanned defense-in-depth.** The implementation adds a duplicate `cardId` check (`DUPLICATE_CARD_IDS` error at `party/index.ts:538–545`) not in the threat model. This prevents card duplication via repeated IDs and is a positive finding.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-28 | 12 | 12 | 0 | gsd-security-auditor (agent a82c32599d5c9a629) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-28
