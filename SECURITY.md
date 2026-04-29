# SECURITY.md — Phase 15: Multi-Card Set Play

**Audit date:** 2026-04-28
**Auditor:** gsd-security-auditor
**ASVS Level:** 1
**Phase:** 15 — Multi-Card Set Play
**Plans audited:** 15-01 (server handler), 15-02 (client UI), 15-03 (e2e tests)

---

## Threat Verification

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-15-01 | Spoofing/Tampering | mitigate | CLOSED | `party/index.ts:506` — `if (fromId !== senderToken)` fires before any state read or mutation; sends `UNAUTHORIZED_MOVE` and breaks |
| T-15-02 | Tampering | mitigate | CLOSED | `party/index.ts:526-535` — `const allPresent = cardIds.every(id => handIdSet.has(id))` fires before `takeSnapshot` (line 562); rejects with `CARD_NOT_IN_SOURCE` on any miss; no partial mutation possible |
| T-15-03 | Tampering | mitigate | CLOSED | `party/index.ts:549-558` — `this.gameState.piles.find(p => p.id === toId)` with `toZone === "pile"` guard; rejects with `PILE_NOT_FOUND` if absent |
| T-15-09 | Repudiation | mitigate | CLOSED | Covered by T-15-02 implementation at `party/index.ts:526-535`; server pre-validates every cardId against sender's hand before accepting the action |
| T-15-11 | Tampering | mitigate | CLOSED | `playwright/game.spec.ts` — `grep -c 'spread-zone-spread-communal'` = 0; `getByTestId('spread-zone-play')` appears 4 times; stale testid fully removed |
| T-15-12 | Information Disclosure | mitigate | CLOSED | `playwright/game.spec.ts:97` — `hand privacy: P2 sees count not card IDs` test present and unmodified; PLAY_CARD_SET targets only faceUp public piles |
| T-15-04 | Information Disclosure | accept | CLOSED | Accepted: spread zones and piles are intentionally public; `card.faceUp = destPile.faceUp === true` in handler ensures no hidden info leaks via broadcast |
| T-15-05 | Denial of Service | accept | CLOSED | Accepted: no server-side upper bound on `cardIds.length`; worst case is "play whole hand" which is a valid game action; no security implication in sandbox game |
| T-15-06 | Repudiation | accept | CLOSED | Accepted: audit log out of scope for v1.2; game state serves as implicit audit trail via undo snapshots |
| T-15-07 | Tampering | accept | CLOSED | Accepted: client-composed `fromId` is irrelevant; server enforces `fromId === senderToken` (T-15-01) independently |
| T-15-08 | Information Disclosure | accept | CLOSED | Accepted: `selectedIds` is ephemeral `Set<string>` of card IDs the local user already owns; never persisted |
| T-15-10 | Denial of Service | accept | CLOSED | Accepted: O(1) Set operations per toggle; React state batching handles burst events |

---

## Mitigation Order Verification (T-15-01 / T-15-02)

The PLAY_CARD_SET handler gate sequence in `party/index.ts` was verified to execute in this strict order:

1. Line 497 — empty cardIds check (`EMPTY_CARD_SET`) — no state read
2. Line 506 — auth gate (`fromId !== senderToken` → `UNAUTHORIZED_MOVE`) — no state read or mutation
3. Line 515 — hand existence read (`hands[fromId]`)
4. Line 526 — ALL cardIds pre-validation (`cardIds.every(id => handIdSet.has(id))` → `CARD_NOT_IN_SOURCE`) — no mutation
5. Line 538 — duplicate cardId check (`DUPLICATE_CARD_IDS`) — no mutation (bonus check beyond plan spec)
6. Line 549 — pile existence check (`piles.find(p => p.id === toId)` → `PILE_NOT_FOUND`) — no mutation
7. Line 562 — `takeSnapshot(this.gameState)` — first point of state mutation
8. Lines 565-574 — atomic hand filter + pile push

No state mutation can occur if any gate at steps 1-6 fails.

---

## Unregistered Flags

**15-03-SUMMARY.md `## Threat Flags`:** "None. Test-only file changes; no new network endpoints or auth paths introduced."

No unregistered threat flags from any SUMMARY.md in this phase.

---

## Bonus Mitigation (Unplanned, Not a Gap)

The implemented handler contains a **duplicate cardId check** (V6) at `party/index.ts:538-545` that was not declared in the threat model:

```
const cardIdSet = new Set(cardIds);
if (cardIdSet.size !== cardIds.length) → DUPLICATE_CARD_IDS
```

This prevents card duplication via repeated IDs in a single request. It is a defense-in-depth addition beyond the declared mitigations. It is not a threat gap — it is an unplanned improvement. Logged here for traceability.

---

## Accepted Risks Log

| Risk ID | Threat | Rationale | Owner |
|---------|--------|-----------|-------|
| AR-15-01 | T-15-04: faceUp disclosure via broadcast | Spread zones are intentionally public; no private data exposed | Game design |
| AR-15-02 | T-15-05: unbounded cardIds.length | Sandbox game; 52-card hand play is valid; no DoS concern at 2-4 player scale | Architecture |
| AR-15-03 | T-15-06: no audit log | PLAY-06 action log is a future requirement; undo snapshots serve as implicit trail | Product backlog |
| AR-15-04 | T-15-07: client-composed fromId | Server independently validates; client trust boundary is not relied upon | Architecture |
| AR-15-05 | T-15-08: selectedIds in useState | Ephemeral local-only state; no persistence or exfiltration path | Architecture |
| AR-15-06 | T-15-10: Escape/click DoS | O(1) operations; React batching sufficient at 2-4 player scale | Architecture |
