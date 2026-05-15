# Phase 22: Hand Reveal - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a Show Hand / Hide Hand toggle to each player's hand zone. When toggled on, all other players immediately see that player's card faces (not just backs) in real time. The reveal state is persisted in server room state so reconnecting players see the correct current revealed/hidden state for every already-connected player. The revealing player's own view is unchanged — they always see their own card faces.

Requirements: HAND-01, HAND-02, HAND-03, HAND-04

</domain>

<decisions>
## Implementation Decisions

### Toggle Button

- **D-01:** The Show/Hide toggle lives in the **HandZone header row**, inline with the player name and connection dot — not in ControlsBar. This places the control closest to the thing it affects.
- **D-02:** The toggle is an **icon-only button** using lucide-react `Eye` / `EyeOff` icons. Matches the icon-only style of PileZone controls (28×28px range).

### Revealed Opponent Display

- **D-03:** When an opponent reveals their hand, `OpponentHand` renders a **scrollable row of card faces** using `CardFace` — same layout as the current card-back row, no card count cap.
- **D-04:** No "showing" label or badge is added to the opponent display — visible card faces are self-explanatory.

### Self-Indicator When Revealed

- **D-05:** When the local player's hand is revealed, two visual signals are active simultaneously:
  1. The eye icon button reflects the revealed state (e.g., `EyeOff` icon when revealed, or button highlighted/active)
  2. A subtle **primary-color (teal/blue) glow or border** on the HandZone container — matching the `ring-primary` palette used for selection rings elsewhere.
- **D-06:** This indicator exists only on the local player's own HandZone (not on opponent views).

### Reset Interaction

- **D-07:** `RESET_TABLE` clears all `handRevealed` states for all players. Reveal state is part of the game session; a reset returns everything to defaults.

### Claude's Discretion

- Exact implementation of `handRevealed` in the data model (adding field to `Player` type or as a separate `Record<string, boolean>` at `GameState` level — either is viable)
- Exact `ClientAction` type name for the toggle (e.g., `SET_HAND_REVEALED`)
- Exact glow/border CSS (e.g., `ring-1 ring-primary/50` or `border border-primary/40`) — use whichever fits the dark felt theme best

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Types and Data Model
- `src/shared/types.ts` — `Player`, `GameState`, `ClientGameState`, `ClientAction` — all types that need new fields (`handRevealed`, new action type, updated `opponentHandCounts` or new field for revealed hand cards)

### Server Logic
- `party/index.ts` — `viewFor()` at line 64 is where opponent hand masking happens; must be updated to conditionally send full `Card[]` instead of just a count when a player is revealed. `RESET_TABLE` handler must also clear reveal state.

### Components to Modify
- `src/components/HandZone.tsx` — add toggle button to header row; add revealed-state indicator (glow/border)
- `src/components/OpponentHand.tsx` — add revealed path that renders card faces instead of backs
- `src/components/BoardView.tsx` — passes props to `HandZone` and `OpponentHand`; will need to pass `handRevealed` state down

### Reference Patterns
- `src/components/PileZone.tsx` — icon-only button style to match for the toggle button
- `src/components/SpreadZone.tsx` — `CardFace` rendering pattern to reference for revealed opponent display

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CardFace` (`src/components/CardFace.tsx`) — renders a single card face; use directly in the revealed opponent display
- `CardBack` (`src/components/CardBack.tsx`) — current opponent display; replaced with CardFace when revealed
- lucide-react `Eye` / `EyeOff` icons — already a dependency; use for toggle button (matching PileZone icon pattern)
- `cn()` utility — use for conditional glow/border class on HandZone when revealed

### Established Patterns
- **`viewFor()` masking** (`party/index.ts:64`): This is the authoritative location for what data each client receives. The masking for opponent hands (currently `opponentHandCounts`) must be modified here — nowhere else.
- **Server-side state, broadcast per-connection**: The project uses per-connection `viewFor()` broadcasts, not `room.broadcast()`, because each client gets a different view. Revealed hands follow the same pattern — `viewFor()` conditionally includes opponent card data.
- **Icon-only controls** (`PileZone.tsx`): 28×28px lucide-react icon buttons with tooltip. Match this style for the toggle.
- **`ring-primary` selection indicator**: Used in `SortableHandCard` (`ring-1 ring-primary/30`). The revealed HandZone indicator should use the same color family at a slightly higher opacity.

### Integration Points
- `GameState` → `Player` type needs `handRevealed: boolean` (or equivalent) — affects `src/shared/types.ts`
- `ClientGameState.opponentHandCounts` → needs to carry actual card data for revealed players — either extend the type or add a parallel field
- `party/index.ts` `viewFor()` — conditional card data for revealed opponents
- `party/index.ts` `RESET_TABLE` handler — clear all `handRevealed` flags
- `BoardView.tsx` → passes `gameState` props down; may need to pass reveal state explicitly to `HandZone` and `OpponentHand`
- A new `ClientAction` type (e.g., `SET_HAND_REVEALED`) needs to be dispatched from `HandZone` and handled in the server

</code_context>

<specifics>
## Specific Ideas

- The toggle button should visually indicate the current state clearly — `Eye` when hidden (normal), `EyeOff` when revealed (or reverse — whichever is more intuitive). The icon-only approach relies on the icon being unambiguous.
- The primary-color HandZone border/glow while revealed should be subtle enough not to distract from gameplay but prominent enough that the player can't easily miss that their hand is "open."
- The scrollable row for revealed opponent cards should behave exactly like the current card-back row — same height, same overflow-x-auto behavior.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 22-restrict-play-card-set-to-spread-region*
*Context gathered: 2026-05-15*
