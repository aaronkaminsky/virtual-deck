# Phase 15: Multi-Card Set Play - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Player can select 1–5 cards from their hand (by clicking/tapping) and play them as an atomic set by dragging to any valid target zone. Single-card drag continues to work as before. No rule enforcement — this is a physical-table mechanic, not game logic.

Drag-based multi-select (dnd-kit native multi-drag) is explicitly deferred (PLAY-04). This phase uses a custom select-then-drag approach.

</domain>

<decisions>
## Implementation Decisions

### Interaction Model

- **D-01:** Click (short tap — pointerdown + pointerup without crossing the distance threshold) on a hand card toggles its selection state. No separate "Select mode" — selection is always available.
- **D-02:** Dual-sensor setup via `useSensors`:
  - `PointerSensor` with `activationConstraint: { distance: 8 }` — for mouse (8px movement = drag intent)
  - `TouchSensor` with `activationConstraint: { delay: 250, tolerance: 5 }` — for touch (hold 250ms = drag intent; 5px tolerance during hold)
  - Both active simultaneously. This future-proofs touch/mobile even though mobile is currently out of scope in REQUIREMENTS.md.
- **D-03:** Dragging a **selected** card drags the entire selection as a set. On drop, dispatches `PLAY_CARD_SET` with all selected card IDs and the target zone. Atomic — all cards move or none do.
- **D-04:** Dragging an **unselected** card when other cards are selected: clears selection and moves only the dragged card (normal `MOVE_CARD` behavior). Predictable, no surprises.
- **D-05:** After a set is played (drag+drop of a selected group), selection state clears automatically.

### Zone Targeting

- **D-06:** Target zone is determined by where the player drops. Any droppable zone (spread zone, pile zone, hand) is a valid target. No "Play N cards" button — zone choice is implicit in the drag gesture.
- **D-07:** The `PLAY_CARD_SET` server action receives `cardIds: string[]`, `fromId: string` (player's hand ID), `toZone: "pile"`, `toId: string` (target pile/zone ID). Atomic: server removes all cards from hand and appends to the target pile in one mutation.

### Selection Indicator

- **D-08:** Selected cards in HandZone render with `ring-2 ring-primary` border and `-translate-y-1.5` (≈6px upward lift via CSS transform). Combined effect is visually clear even with overlapping cards.

### Deselect / Cancel

- **D-09:** Clicking a selected card deselects it (toggle — same mechanism as selecting).
- **D-10:** Pressing Escape clears all selection.
- **D-11:** Clicking/tapping anywhere that is not a hand card clears all selection (pointer event lands outside the card hit area).

### State Note

STATE.md previously recorded "Multi-card play via select-then-button (not dnd-kit multi-drag)." This discussion supersedes the "select-then-button" part: the interaction is now **select-then-drag** (button removed; zone targeting is implicit). The "not dnd-kit multi-drag" part still stands — this is a custom implementation.

### Claude's Discretion

- Exact pixel value for upward lift (≈6px — adjust to taste during implementation)
- Whether a subtle count badge ("2 selected") appears near the hand label or elsewhere
- Visual drag preview when dragging a multi-card set (single ghost card vs. stacked ghost)
- Whether selection ring uses `ring-offset-background` for contrast against the card art

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §"Phase 15: Multi-Card Set Play" — Goal, SC-1 through SC-5, UI hint
- `.planning/REQUIREMENTS.md` §PLAY-03 — Full acceptance criteria

### Type Contracts (modified in this phase)
- `src/shared/types.ts` — `ClientAction` union (add `PLAY_CARD_SET`), `ClientGameState`, `ClientPile`

### Component Integration
- `src/components/HandZone.tsx` — SortableContext + useSortable pattern; add dual-sensor, selection state, click handler, and visual indicator
- `src/components/SpreadZone.tsx` — Drop target for played sets (no changes needed — already wired via useDroppable)
- `src/components/BoardView.tsx` — Where selection state may be lifted to if needed for cross-component coordination

### Server Action
- `party/index.ts` — Add `PLAY_CARD_SET` handler; atomic removal from hand + append to target pile

### Prior Phase Context
- `.planning/phases/14-gameplay-zone-infrastructure/14-CONTEXT.md` — SpreadZone architecture, pile region/ownerId model, zone IDs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `HandZone.tsx` `SortableHandCard` — wraps each card in `useSortable`; extend to accept `isSelected` prop and apply ring + translate styles
- `HandZone.tsx` `useDndMonitor` — already discriminates intra-hand reorder from cross-zone drops; extend `onDragEnd` to detect multi-card drag and dispatch `PLAY_CARD_SET` vs `MOVE_CARD`
- `SpreadZone.tsx` `useDroppable` — already set up with `toZone: 'pile', toId: pile.id`; no changes needed to receive dropped sets
- `REORDER_HAND` action shape — pattern for sending ordered card ID arrays to server; `PLAY_CARD_SET` follows the same convention

### Established Patterns
- `activationConstraint` in dnd-kit sensors — project currently has no explicit sensor config (uses default); this phase introduces the first explicit `useSensors` call
- `useDndMonitor` in `HandZone` — already used for intra-hand reorder detection; can also detect when active card is part of a selection and dispatch `PLAY_CARD_SET`
- `isExistingPlayer` idempotent check pattern (Phase 14) — mirrors how click-to-select state should be managed (local React state, not server)
- `viewFor` — spread zones are already fully public (no masking); played cards are visible to all players immediately after `PLAY_CARD_SET` broadcasts `STATE_UPDATE`

### Integration Points
- Selection state lives in `HandZone` (or lifted to `BoardView`) as `useState<Set<string>>` — set of selected card IDs
- `onDragEnd` in `HandZone` or `BoardView`: if `active.id` is in selection set AND selection has >1 card → dispatch `PLAY_CARD_SET`; else dispatch `MOVE_CARD`
- Escape key listener: `useEffect` with `keydown` event on document, clears selection state
- Click-outside clearing: pointer event on non-card elements clears selection; can be handled via `onPointerDown` on the board container with `stopPropagation` on card elements

</code_context>

<specifics>
## Specific Ideas

- The preview sketch from discussion: selected cards show a ring + upward lift, and drag moves the whole group to the dropped zone. The zone choice is entirely implicit — no intermediate dialog or button bar.
- Dual-sensor is a forward-looking choice: mobile is out of scope but the `TouchSensor` setup makes the feature work on touch devices without a future rewrite.

</specifics>

<deferred>
## Deferred Ideas

- dnd-kit native multi-drag overlay (PLAY-04) — deferred to v1.3+; this phase uses custom select-then-drag
- "Play N cards" button UI — removed in discussion; drag-based zone targeting is preferred
- Visual set grouping / separator in spread zone (PLAY-05) — future phase
- Action log "Player X played N cards" (PLAY-06) — future phase

</deferred>

---

*Phase: 15-multi-card-set-play*
*Context gathered: 2026-04-26*
