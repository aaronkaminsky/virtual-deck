# Phase 20: Spread Zone Multi-Select - Context

**Gathered:** 2026-05-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the existing click-to-select + drag-group pattern from `HandZone` to `SpreadZone`. Players click to select cards in any spread zone (visual ring/lift), then drag the selected set to another zone — pile, hand, or another spread zone. Opponent personal spread zones become drop-only (no drag-from), aligning them with opponent hand behavior.

**Requirements in scope:** SPREAD-01, SPREAD-03
**Out of scope:** Spread zone card reorder verification (Phase 21), touch drag support, undo for set moves (beyond what server already handles)

</domain>

<decisions>
## Implementation Decisions

### Selection Isolation
- **D-01:** Zone-exclusive selection — selecting in any zone clears all other selections. Only one zone "owns" the selection at a time. Implementation: add a `selectionSource` state (e.g., `{ zone: 'hand' | 'pile'; zoneId: string } | null`) alongside `selectedIds` in `BoardDragLayer`. When a card is toggled in a different zone than `selectionSource`, clear `selectedIds` before adding the new card.
- **D-02:** Toggle per card + Escape clears all — same as `HandZone`. Clicking a selected spread card deselects it; clicking an unselected card adds it. Escape key already wired globally in `BoardDragLayer` (clears `selectedIds`).
- **D-03:** Show "N selected" badge in spread zone header when 2+ cards are selected in that zone — mirrors `HandZone` line 114. Only show the badge for the zone that currently owns the selection.

### Multi-Card Move Action
- **D-04:** Extend `PLAY_CARD_SET` with optional `fromZone: 'hand' | 'pile'` and `fromId: string` fields. Default behavior unchanged: hand dispatches keep `fromId: playerId` (backward compat). Spread zone dispatches supply `fromZone: 'pile'` and `fromId: pile.id`. Server must resolve source cards from the correct zone based on these fields.
- **D-05:** No insert-position dialog for multi-card drag from spread zone — always inserts at top. Consistent with single-card spread drag behavior (the existing `isSpread` bypass in `handleDragEnd` already covers this pattern).
- **D-06:** Hand is a valid drop target for multi-card drag from spread (SPREAD-03 requires "pile, hand, or another spread zone"). `PLAY_CARD_SET` with `toZone: 'hand'` must be handled by the server — moves spread cards into the player's private hand.

### Opponent Spread Zones
- **D-07:** Opponent personal spread zones are **drop-only** — no single-card or multi-card drag from them. This reverts Phase 17 D-06 for opponent personal zones. Aligns with opponent hand behavior: you can drop cards onto them but cannot take from them. Opponent personal zones are identified by pile ID `spread-{opponentId}` where `opponentId !== gameState.myPlayerId`.
- **D-08:** Communal zone (`play` pile) remains fully interactive for all players — any player can select and drag from it.
- **D-09:** Implementation: `SpreadZone` receives a new `interactive` boolean prop (default `true`). When `false`, `SortableSpreadCard` is replaced with a non-draggable render (direct `CardFace`/`CardBack` without `useSortable`). `BoardView.tsx` passes `interactive={false}` for opponent personal spread zones.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §Phase 20 — goal, success criteria, dependencies
- `.planning/REQUIREMENTS.md` — SPREAD-01, SPREAD-03 acceptance criteria

### Pattern to Mirror
- `src/components/HandZone.tsx` — **read the full file**. The `SortableHandCard` component (lines 9–60) is the exact multi-select pattern to replicate in `SpreadZone`: `isSelected`/`onToggleSelect` props, `translateY(-6px)` lift transform, `ring-1 ring-primary/30` ring, `aria-pressed`, `didDragRef` disambiguation. The "N selected" badge (lines 114–118) is also the model.

### Components to Change
- `src/components/SpreadZone.tsx` — extend `SortableSpreadCard` with `isSelected`/`onToggleSelect` props; add `interactive` prop to `SpreadZone` to conditionally disable dragging for opponent personal zones
- `src/components/BoardView.tsx` — pass `interactive={false}` for opponent personal spread zones; pass `selectedIds`/`onToggleSelect` down to interactive `SpreadZone` instances
- `src/components/BoardDragLayer.tsx` — add `selectionSource` state; extend `handleToggleSelect` for zone-exclusive clearing; extend `isMultiCardSet` check to also handle spread-zone source; extend `PLAY_CARD_SET` dispatch to include `fromZone`/`fromId`
- `party/index.ts` — extend `PLAY_CARD_SET` handler to read `fromZone`/`fromId` and locate cards in the correct zone (hand or pile)
- `src/shared/types.ts` — extend `PLAY_CARD_SET` action type with optional `fromZone` and `fromId` fields

### Drop Routing
- `src/components/BoardDragLayer.tsx` — `handleDragEnd` (lines 122–234): the `isMultiCardSet` block (lines 125–145) and the `isSpread` bypass (lines 187–199) are the two most important sections for Phase 20 routing

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SortableHandCard` in `HandZone.tsx` (lines 9–60): complete multi-select card template — copy the `isSelected`/`onToggleSelect` prop shape and the `resolvedTransform` / ring pattern verbatim into `SortableSpreadCard`
- `handleToggleSelect` in `BoardDragLayer.tsx` (line 64): existing toggle logic to extend with `selectionSource` tracking
- `selectedIds` Set in `BoardDragLayer.tsx` (line 58): stays as a single shared `Set<string>` — no per-zone split needed

### Established Patterns
- `dragDataRef` + `didDragRef` disambiguation: drag-vs-click is already handled in HandZone via `onPointerDown` / `onClick` separation — apply the same to `SortableSpreadCard`
- Spread zone drop bypass (`isSpread` guard, line 187): already skips the insert dialog for spread destinations — multi-card drops from spread zones follow the same bypass
- `aria-pressed={isSelected}` placed AFTER `{...attributes}` spread (Phase 15 decision): avoids TS2783 dnd-kit override conflict — preserve this in `SortableSpreadCard`
- Opponent zone identification: `spread-${opponentId}` pattern is already used in `BoardView.tsx` line 47 (`opponentSpread.id === \`spread-${id}\``)

### Integration Points
- `BoardView.tsx` → `SpreadZone`: currently passes `pile`, `sendAction`, `draggingCardId`, `className`. Phase 20 adds `interactive`, `selectedIds`, `onToggleSelect` for interactive instances
- `BoardDragLayer.tsx` → `BoardView.tsx`: `selectedIds` and `onToggleSelect` already threaded through to `HandZone`; same plumbing extends to `SpreadZone`
- `party/index.ts` `PLAY_CARD_SET` handler: currently reads `fromId` as player ID (hand). With D-04, it needs to branch on `fromZone` to look up cards in a pile vs hand

</code_context>

<specifics>
## Specific Ideas

- The opponent personal spread zone interaction restriction (D-07) is a **behavior change from Phase 17 D-06**, which said "opponent spread zones remain fully interactive — any player can drag cards to/from them." This phase deliberately reverts that for drag-from. The reason: play-testing showed it was unexpected and unnecessary, inconsistent with how opponent hands work.
- `selectionSource` state should store `{ zone: 'hand' | 'pile'; zoneId: string }` so `handleToggleSelect` knows which zone initiated the current selection. When a card from a different zone is toggled, clear and restart.
- The "N selected" badge in spread zones should only appear when the spread zone is the current `selectionSource` — don't show it if the selection is owned by a different zone.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 20-spread-zone-multi-select*
*Context gathered: 2026-05-09*
