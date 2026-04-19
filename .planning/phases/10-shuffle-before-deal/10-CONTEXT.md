# Phase 10: Shuffle Before Deal - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

The deal action shuffles the draw pile before distributing cards, so players cannot predict card order. Scope is the existing single Deal button (ControlsBar) — no per-pile deal affordance.

Additionally: a card-fan shuffle animation plays on every pile shuffle (manual Shuffle button AND deal-triggered), visible to all players before cards start moving.

</domain>

<decisions>
## Implementation Decisions

### Deal Scope
- **D-01:** "Any pile" means the existing draw-pile deal only — no per-pile deal buttons added
- **D-02:** `DEAL_CARDS` handler shuffles the draw pile before popping cards (server-side, within the same action handler)

### Undo Behavior
- **D-03:** `takeSnapshot()` is called before the shuffle — undoing a deal restores both cards AND the original pre-shuffle pile order

### Shuffle Animation
- **D-04:** A card-fan (spread then collapse) animation plays on every pile shuffle — both manual `SHUFFLE_PILE` and deal-triggered shuffles
- **D-05:** The animation is visible to ALL players (server broadcasts a shuffle event; clients animate on receipt)
- **D-06:** For deal-triggered shuffles: animation plays first, then the dealt state arrives — sequential, not concurrent
- **D-07:** Animation scope is ALL pile shuffles — the existing Shuffle button gets the same treatment

### Claude's Discretion
- Animation duration and exact fan geometry (how far cards spread, easing curve) — keep it short and readable
- Whether the server broadcasts a new `PILE_SHUFFLED` event type or reuses an existing message shape to trigger client animation
- Timing mechanism for the animation-then-deal sequence (server delay vs. client-side sequencing on a flag in the state update)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — GAME-01 defines the acceptance criteria for this phase

### Key Implementation Files
- `party/index.ts` — `DEAL_CARDS` handler (line ~334), `SHUFFLE_PILE` handler (line ~360), `shuffle()` function (line ~18), `takeSnapshot()` usage
- `src/shared/types.ts` — `GameAction` union (line ~56–60), `ServerEvent` type — any new event type must be added here
- `src/components/PileZone.tsx` — pile visual component; animation renders here
- `src/components/ControlsBar.tsx` — Deal button and count input (line ~31–56)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `shuffle<T>(arr: T[])` in `party/index.ts` — Fisher-Yates + crypto.getRandomValues; already used by `SHUFFLE_PILE` and `RESET_TABLE`. Reuse directly in `DEAL_CARDS`.
- `takeSnapshot(this.gameState)` pattern — already called before deal; position matters (must be before shuffle for full-restore undo)

### Established Patterns
- Server broadcasts full game state after each action via `viewFor` per connection — any new `PILE_SHUFFLED` event fits this pattern
- `ServerEvent` union in `src/shared/types.ts` — new event types added here and handled in `usePartySocket`

### Integration Points
- `DEAL_CARDS` in `party/index.ts` needs shuffle inserted before the card-pop loop
- `PileZone.tsx` is where the animation CSS/JS lives
- Client socket handler in `usePartySocket` needs to listen for shuffle event and trigger animation

</code_context>

<specifics>
## Specific Ideas

- Animation style: card fan — cards briefly spread out from the pile then snap back, like a real riffle shuffle
- Animation applies to every shuffle event, not just deal-triggered ones

</specifics>

<deferred>
## Deferred Ideas

- Per-pile deal buttons (deal from any arbitrary pile) — explicitly out of scope for this phase; could be a future backlog item

</deferred>

---

*Phase: 10-shuffle-before-deal*
*Context gathered: 2026-04-18*
