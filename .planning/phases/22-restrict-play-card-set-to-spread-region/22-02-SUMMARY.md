---
phase: 22-restrict-play-card-set-to-spread-region
plan: "02"
subsystem: ui
tags: [hand-reveal, react, shadcn, lucide, tailwind, eye-toggle]
dependency_graph:
  requires:
    - phase: "22-01"
      provides: Player.handRevealed, ClientGameState.myHandRevealed, ClientGameState.opponentRevealedHands, SET_HAND_REVEALED action handler
  provides:
    - Eye/EyeOff toggle button in HandZone header row (ghost h-7 w-7 p-0, aria-pressed, title, aria-label)
    - HandZone container ring-1 ring-primary/50 ring-inset when isRevealed=true
    - OpponentHand revealed rendering path using CardFace (no cap, same layout as CardBack row)
    - BoardView prop threading: myHandRevealed → HandZone; opponentRevealedHands → OpponentHand
    - BoardView iterates all opponents (hidden + revealed) via union of opponentHandCounts and opponentRevealedHands
  affects:
    - Any future phase modifying HandZone, OpponentHand, or BoardView
tech-stack:
  added: []
  patterns:
    - Icon-only ghost button (h-7 w-7 p-0) matching PileZone style for reveal toggle
    - Conditional cn() ring clause for persistent revealed-state indicator
    - Union of mutually exclusive opponent collections (opponentHandCounts + opponentRevealedHands) in BoardView
key-files:
  created: []
  modified:
    - src/components/HandZone.tsx
    - src/components/OpponentHand.tsx
    - src/components/BoardView.tsx
key-decisions:
  - "allOpponentIds union covers both opponentHandCounts (hidden) and opponentRevealedHands (revealed) — ensures no opponent is dropped from the board when their state transitions"
  - "Drop-to-pass hint in OpponentHand suppressed when revealedCards is non-empty and cardCount=0 — avoids stale hint when count derives from revealed cards"
patterns-established:
  - "Pattern: mutually exclusive server collections (opponentHandCounts vs opponentRevealedHands) are unified client-side via Set union before rendering"
requirements-completed: [HAND-01, HAND-02, HAND-03, HAND-04]

duration: ~10min
completed: 2026-05-15
---

# Phase 22 Plan 02: Hand Reveal — UI Layer Summary

**Eye/EyeOff toggle button in HandZone header with ring-primary glow when revealed; OpponentHand renders CardFace row (no cap) when revealedCards is non-empty; BoardView threads myHandRevealed and opponentRevealedHands through to both components.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-05-15T22:32:00Z
- **Completed:** 2026-05-15T22:37:00Z
- **Tasks:** 2 (plus checkpoint:human-verify pending)
- **Files modified:** 3

## Accomplishments

- HandZone header gains an icon-only Eye/EyeOff toggle button (ghost h-7 w-7 p-0) that dispatches SET_HAND_REVEALED; aria-pressed, title, and aria-label follow the UI spec copywriting contract exactly
- HandZone container cn() expression adds `ring-1 ring-primary/50 ring-inset` when isRevealed=true — persistent amber glow signals revealed state without interfering with existing drag-over border-t-2 behavior
- OpponentHand conditionally renders a CardFace row (no count cap, same w-[42px] h-[59px] / -ml-3 layout as CardBack row) when revealedCards prop is non-empty; CardBack row unchanged when hidden
- BoardView builds `allOpponentIds` as the union of opponentHandCounts and opponentRevealedHands keys so revealed opponents (absent from opponentHandCounts per 22-01 design) are still rendered
- npm test 172 passed; npm run typecheck exit 0

## Task Commits

1. **Task 1: Update HandZone — toggle button and revealed ring** — `af2ea61` (feat)
2. **Task 2: Update OpponentHand and BoardView — revealed card rendering and prop threading** — `11641c9` (feat)

## Files Created/Modified

- `src/components/HandZone.tsx` — Added Eye/EyeOff imports, Button import, isRevealed/onToggleReveal props, toggle button in header row, ring-primary/50 ring-inset clause in container cn()
- `src/components/OpponentHand.tsx` — Added Card/CardFace imports, revealedCards?: Card[] prop, conditional CardFace vs CardBack rendering
- `src/components/BoardView.tsx` — Added allOpponentIds union, opponent loop now covers hidden + revealed, HandZone receives isRevealed and onToggleReveal props

## Decisions Made

- Union of opponentHandCounts and opponentRevealedHands computed as `Array.from(new Set([...Object.keys(hidden), ...Object.keys(revealed)]))` — this correctly handles the mutually exclusive server collections defined in 22-01
- Drop-to-pass hint condition updated to also require `!(revealedCards && revealedCards.length > 0)` — avoids showing the hint when a revealed player has 0 cards that count by opponentHandCounts

## Deviations from Plan

### Post-verification Bug Fix

**[Rule 1 - Bug] Fixed inverted Eye/EyeOff icon logic in HandZone**
- **Found during:** Human verification (checkpoint Task 3)
- **Issue:** The Eye icon was showing when `isRevealed === false` and EyeOff was showing when `isRevealed === true` — the opposite of the app convention established in PileZone and SpreadZone (Eye = visible, EyeOff/strikethrough = not visible).
- **Fix:** Swapped `{isRevealed ? <EyeOff ... /> : <Eye ... />}` to `{isRevealed ? <Eye ... /> : <EyeOff ... />}`. Tooltip text (`isRevealed ? 'Hide hand from opponents' : 'Show hand to opponents'`) was already correct.
- **Files modified:** `src/components/HandZone.tsx`
- **Commit:** `b2512b0`

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Known Stubs

None — no hardcoded empty values, placeholder text, or unconnected data sources. All props are wired through real server state fields established in plan 22-01.

## Threat Flags

No new security surface. The toggle button dispatches SET_HAND_REVEALED via the existing sendAction channel; server identity and input validation are handled server-side (plan 22-01). No new network endpoints, auth paths, file access patterns, or schema changes.

## Next Phase Readiness

- Hand Reveal feature is fully wired end-to-end — server side (22-01) and UI (22-02) complete
- Human-verify checkpoint (Task 3 in this plan) is pending — functional testing in two-tab browser session required
- Feature is ready for verification: start `npm run dev` + `npm run dev:client`, open two tabs, test Eye/EyeOff toggle and opponent CardFace rendering

---

*Phase: 22-restrict-play-card-set-to-spread-region*
*Completed: 2026-05-15*
