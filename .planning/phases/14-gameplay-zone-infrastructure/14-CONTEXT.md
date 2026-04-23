# Phase 14: Gameplay Zone Infrastructure - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a personal spread zone per connected player and a shared communal spread zone. All spread zones show cards simultaneously (not stacked). Built on top of the existing `piles[]` infrastructure — no new collection type. Existing card mechanics (drag, pass, flip, undo, reset) continue working unchanged.

New gameplay mechanics (multi-card set play) are out of scope — that is Phase 15.

</domain>

<decisions>
## Implementation Decisions

### Type Model (locked by ROADMAP SC-5 + STATE.md)

- **D-01:** Spread zones are `Pile` records with two new fields: `ownerId: string | null` and `region: "spread" | "pile"`. `ownerId = null` for the communal zone; `ownerId = playerToken` for personal zones.
- **D-02:** `ClientGameState` gains `myPlayZoneId: string` — the pile ID of the current player's personal spread zone.
- **D-03:** No parallel `zones[]` collection. `MOVE_CARD`, `viewFor`, `RESET_TABLE`, and `UNDO_MOVE` all continue working with piles unchanged (spread zones are just piles with a different `region`).
- **D-04:** Existing `Pile` records (`draw`, `discard`, `play`) implicitly have `region: "pile"` after migration (defaulted in `onStart`).

### Zone Creation + Lifecycle

- **D-05:** Personal spread zone created in `onConnect` when a player joins for the first time. Zone ID format: `spread-{playerToken}`. Check is idempotent — if the zone already exists in `piles[]`, do not create a duplicate (satisfies SC-4).
- **D-06:** The communal spread zone (`id: "spread-communal"`, `ownerId: null`) is seeded in `defaultGameState()` alongside the existing Draw/Discard/Play piles (satisfies SC-2).
- **D-07:** Personal spread zones persist across disconnects (like all server state). `RESET_TABLE` clears cards from all piles including spread zones — zones themselves remain (no deletion).
- **D-08:** `onStart` migration: existing `Pile` records without `region` or `ownerId` fields get `region: "pile"` and `ownerId: null` defaults applied.

### Board Layout (4-section board)

- **D-09:** BoardView restructures to 4 sections:
  1. **Header** (auto-height, was fixed 104px): opponent hand zones + their personal spread zones below their hands. Header grows/shrinks based on content.
  2. **Middle** (flex-1): existing piles only (Draw, Discard, Play Area) — unchanged.
  3. **Spread row** (new section, auto-height): Communal zone + my personal zone, side by side.
  4. **Bottom**: my private HandZone — unchanged.
- **D-10:** Opponent spread zones render inside the header section, each directly below its owner's `OpponentHand`. Layout: column (hand on top, spread zone below).
- **D-11:** The spread row (communal + my zone) lives between the middle piles and my hand. Rendered as a flex row with gap.

### Spread Zone Appearance

- **D-12:** Cards in a spread zone use an overlapping cascade layout — same visual style as `HandZone`. Peek at rank/suit of each card. Any card is individually draggable (not just the top card).
- **D-13:** Empty spread zone shows a dashed-border placeholder with the zone label (player's `displayName` for personal zones, "Communal" for the communal zone). Consistent with empty PileZone.
- **D-14:** New `SpreadZone` component (parallel to `PileZone`) handles the spread layout. Does not reuse `PileZone` internals — different card rendering approach required.
- **D-15:** Face-up/face-down toggle button on each spread zone — same as existing piles (satisfies PLAY-01/02 requirements).

### Zone Interaction

- **D-16:** Any player can drag cards to/from any spread zone (personal or communal), and toggle face direction on any spread zone. No owner-restriction. Consistent with the project's no-rule-enforcement design principle.

### Claude's Discretion

- Exact CSS for the spread card cascade (overlap amount, min zone width, max zone width)
- Whether the spread row section has a visible separator/border from the middle piles section
- Hover/drop highlight style for spread zones (reuse `isOver ? 'border-primary' : 'border-border'` from PileZone)
- Whether opponent spread zones show when empty or only render when non-empty (recommend: always visible as empty placeholder once player is connected, so others know the zone exists)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §"Phase 14: Gameplay Zone Infrastructure" — Goal, SC-1 through SC-5, UI hint
- `.planning/REQUIREMENTS.md` §PLAY-01, §PLAY-02 — Full acceptance criteria including face toggle behavior

### Type Contracts
- `src/shared/types.ts` — `Pile`, `ClientPile`, `GameState`, `ClientGameState` (all modified in this phase)

### Existing Zone Implementation
- `party/index.ts` — `defaultGameState()`, `onConnect()`, `onStart()`, `viewFor()`, `RESET_TABLE` handler (all touched in this phase)
- `src/components/BoardView.tsx` — Layout restructure from 3 to 4 sections
- `src/components/PileZone.tsx` — Reference for droppable + card rendering; new `SpreadZone` component follows a different pattern but same props interface shape
- `src/components/HandZone.tsx` — Reference for cascade card layout reused in `SpreadZone`

### Prior Context
- `.planning/STATE.md` — "Reuse piles[] for spread zones" decision recorded here before this discussion

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HandZone.tsx` — Overlapping card cascade layout is the visual model for `SpreadZone`; reuse or adapt the card row rendering logic
- `PileZone.tsx` — Drop target setup with `useDroppable`, `isOver` highlight, face toggle button, empty dashed border — reuse these patterns in `SpreadZone`
- `DraggableCard` — Used in both `HandZone` and `PileZone`; `SpreadZone` renders all cards as `DraggableCard` (not just the top card)
- `Player.displayName` from Phase 9 — Used as the zone label for personal spread zones

### Established Patterns
- `piles[]` is the canonical server-side collection for all card zones — extend it, don't add a parallel array
- `onStart` migration pattern (from Phase 9) — add default values for new fields on existing state records
- `MOVE_CARD` action's `fromZone: "pile" | "hand"` and `fromId: string` already supports any pile ID — spread zone IDs work without action type changes
- `viewFor` currently maps all piles without masking — spread zone cards are fully public, so no masking logic needed
- Idempotent player checks in `onConnect` (`isExistingPlayer` pattern) — mirror this for spread zone creation

### Integration Points
- `BoardView.tsx` layout: currently `h-screen w-screen overflow-hidden flex flex-col`. Add a new `<div>` section between the middle piles row and `<HandZone>` for the spread row.
- `ClientGameState`: add `myPlayZoneId: string` field — `viewFor` computes this as `spread-{playerToken}`.
- `defaultGameState`: add communal zone to initial `piles[]` alongside Draw/Discard/Play.

</code_context>

<specifics>
## Specific Ideas

- Zone ID convention: `spread-{playerToken}` for personal, `spread-communal` for the communal zone. Short enough to be human-readable in debug logs.
- The spread row shows my personal zone + communal zone. If there are 2 players, the opponent's zone is in the header. The spread row always has exactly 2 zones (mine + communal).

</specifics>

<deferred>
## Deferred Ideas

- Multi-card drag from spread zones — dnd-kit multi-drag deferred to v1.3+ (per STATE.md decision from earlier in v1.2 planning)
- Zone deletion when a player permanently leaves — out of scope; zones persist like piles
- Scrollable spread zone for large card counts — Claude's discretion on overflow handling; not a user requirement

</deferred>

---

*Phase: 14-gameplay-zone-infrastructure*
*Context gathered: 2026-04-23*
