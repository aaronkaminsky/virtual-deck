# Phase 11: Empty Pile Drop UX - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Dropping a card onto an empty pile skips the insert-position dialog and places the card immediately at the top. The dialog continues to appear for non-empty piles. No new UI components, no new server actions — this is a conditional branch in the existing drag-end handler.

</domain>

<decisions>
## Implementation Decisions

### Visual Feedback
- **D-01:** Silent/immediate — no extra feedback when the dialog is skipped. The behavior is self-evident (empty pile means no position to choose), consistent with how hand drops work. No new animation or highlight needed.

### Detection
- **D-02:** Check pile emptiness client-side using `gameState.piles` in `handleDragEnd`. When `toZone === 'pile'`, find the target pile by `toId` and check `cards.length === 0`. If empty, bypass `setPendingMove` and call `sendAction` directly.

### Insert Position
- **D-03:** Send `insertPosition: 'top'` when bypassing the dialog for an empty pile. Top/bottom/random are equivalent for a single card in an empty pile — `'top'` is the canonical default already used by the "Enter confirms Top" behavior in phase 999.11.

### Claude's Discretion
- Whether to use `ClientPile.cards.length === 0` or `find(...) === undefined` (pile doesn't exist edge case) — use the existence check plus length check for safety
- Test structure for the new branch (unit test for the conditional, or integration via the existing drag test harness)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — UX-01 defines the acceptance criteria for this phase

### Key Implementation Files
- `src/components/BoardDragLayer.tsx` — `handleDragEnd` at line ~114 is the single change point. The `toZone === 'pile'` branch either intercepts with `setPendingMove` or sends directly. Add an empty-pile check here.
- `src/shared/types.ts` — `ClientPile.cards` is `(Card | MaskedCard)[]`; `cards.length === 0` is the empty check. `ClientGameState.piles` is accessible in scope via the `gameState` prop.

### Prior Phase Context
- `.planning/phases/999.11-pile-drop-dialog-ux-improvements/999.11-CONTEXT.md` — D-01 through D-05 define the current dialog behavior (Escape cancels, Enter confirms Top, Top is primary button). Phase 11 is additive — the dialog behavior is unchanged for non-empty piles.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sendAction({ type: 'MOVE_CARD', ..., insertPosition: 'top' })` — already used for hand drops; same pattern applies for empty-pile bypass
- `setPendingMove(...)` — existing intercept for non-empty pile drops; stays unchanged
- `gameState.piles` — `ClientPile[]` in scope as a prop on `BoardDragLayer`; `find(p => p.id === toId)` gives the target pile

### Established Patterns
- Hand drops bypass the dialog entirely and call `sendAction` directly (line ~118–127) — the empty-pile path mirrors this pattern exactly
- `insertPosition` on `MOVE_CARD` is optional on the type; for piles it's always set explicitly

### Integration Points
- No server changes needed — the server already handles `MOVE_CARD` with `insertPosition: 'top'` for any pile state
- No changes to the Dialog JSX — dialog renders only when `pendingMove !== null`; if `setPendingMove` is never called, dialog never opens

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-empty-pile-drop-ux*
*Context gathered: 2026-04-18*
