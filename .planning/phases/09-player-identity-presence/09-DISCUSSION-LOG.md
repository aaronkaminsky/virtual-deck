# Phase 9: Player Identity & Presence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-12
**Phase:** 09-player-identity-presence
**Areas discussed:** Name prompt timing, Roster display, Name persistence, Fallback names

---

## Name Prompt Timing

| Option | Description | Selected |
|--------|-------------|----------|
| In the lobby, before joining | Name input + "Join Game" button in lobby panel; required to proceed | ✓ |
| Inline on the board, anytime | Player appears immediately, name editable anytime, no blocking step | |
| Modal on first connect | Connects immediately, then modal blocks board interaction until name entered | |

**User's choice:** In the lobby, before joining

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled until valid | Button stays disabled until 1+ chars entered | ✓ |
| Inline error on submit | Button always clickable; error shown on empty submit | |

**User's choice:** Button disabled until valid

---

## Roster Display

| Option | Description | Selected |
|--------|-------------|----------|
| Header bar with names | Replace header dots with name + status; compact, always visible | |
| Near opponent hands | Name floats near each opponent's hand zone on the board | ✓ |
| Both header + near hands | Header compact roster AND names near hand zones | |

**User's choice:** Near opponent hands (names appear near each hand zone on the board)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep dots in header too | Header dots remain; names also appear near hands | |
| Replace dots with name chips | Header dots become name tags | |
| Remove header dots entirely | Names near hands replace dots; header cleaned up | ✓ |

**User's choice:** Remove header dots entirely (existing PlayerPresence component removed)

| Option | Description | Selected |
|--------|-------------|----------|
| "You" label, no name | Own hand zone shows "You"; opponents show their names | |
| Same as opponents — your name | Your name appears above your own hand, same as opponents | ✓ |
| Nothing for yourself | Only opponent names shown; own hand has no label | |

**User's choice:** Same treatment for all players — name appears above every hand zone including your own

---

## Name Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage, pre-fills next time | Stored in localStorage; name field pre-filled on next visit | ✓ |
| Room-specific, not remembered | Name lives only for this session; blank field on next join | |
| localStorage, skip prompt if name exists | Like option 1 but auto-joins if name already saved | |

**User's choice:** localStorage, pre-fills next time

**Clarification discussion:** User asked whether server-storing the name against player token had a downside. Explained: PartyKit state is in-memory only; if room hibernates and restarts, server-side names would be lost unless client re-sends. Recommended hybrid: client sends name on every connect (same pattern as player token), server stores in GameState for broadcasting. User confirmed this approach.

| Option | Description | Selected |
|--------|-------------|----------|
| Client sends on every connect | localStorage + `?name=` URL param; server reads and updates GameState | ✓ |
| Server stores name against player token | Server-only lookup on reconnect; vulnerable to room hibernation | |

**User's choice:** Client sends name on every connect

---

## Fallback Names

| Option | Description | Selected |
|--------|-------------|----------|
| "Player" as fallback | Generic label when name is absent or empty | ✓ |
| Show nothing / blank | No label if name unavailable | |
| Truncated player ID | First 6 chars of player token | |

**User's choice:** "Player" as fallback label

---

## Claude's Discretion

- Exact layout / positioning of name + presence dot relative to each hand zone
- Typography and sizing of name labels
- Animation/transition when a player disconnects or reconnects mid-game

## Deferred Ideas

None.
