# Phase 3: Core Board - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the interactive board that replaces the lobby panel once a player is connected: pile zones on the table, the player's private hand along the bottom, opponent hands (backs only) along the top, and drag-and-drop card movement between hand and pile zones.

**In scope (Phase 3):**
- Board layout: pile zones (center), player hand (bottom), opponent hands (top)
- CSS-rendered cards (classic style) with card-art.ts hooks preserved for future image swap
- Drag-and-drop: hand → pile, pile → hand (CARD-01)
- Draw from pile via drag (CARD-02)
- Pile zones display with card count visible to all (TABLE-01, TABLE-02)
- Opponent hand card counts shown as face-down backs (TABLE-03)
- Optimistic drag UX with server-update freeze during drag
- Card move animations (drag ghost, post-drop slide-in)

**Out of scope (Phase 3):**
- Flip cards face-up/face-down (Phase 4 — CARD-03)
- Pass card to another player (Phase 4 — CARD-04)
- Shuffle, deal, reset, undo (Phase 4 — CTRL-01 to CTRL-04)
- Flip and shuffle animations (Phase 4)
- Player-configurable pile zones (Phase 3 hardcodes 3 piles)
- "Start game" button (board is live as soon as a player connects)

</domain>

<decisions>
## Implementation Decisions

### Card Rendering
- **D-01:** Cards are CSS-rendered in Phase 3. No image files required.
- **D-02:** Face card style: classic playing card — white/off-white face, rank in top-left and bottom-right corners, large suit symbol centered. Red (#dc2626 or similar) for hearts/diamonds; high-contrast color for spades/clubs that reads on the dark felt background.
- **D-03:** Card back: crosshatch/pattern CSS (e.g. repeating diagonal lines or diamond grid). No image needed — pure CSS.
- **D-04:** card-art.ts URL hooks (`CARD_BACK_URL`, `CARD_FACE_URL`) are preserved and wired to the Card component's `src` prop. When URLs are empty strings, CSS rendering is used. When URLs are populated in a future code change, images take precedence. This is the "hybrid" approach for DECK-03.

### Board Layout
- **D-05:** Player's own hand: fixed bottom strip anchored to the bottom of the viewport. Full card height visible, horizontally scrollable if hand overflows.
- **D-06:** Opponent hands: top strip. One row of face-down card backs per opponent. Card count from `opponentHandCounts` determines how many backs to render. Players labeled as "Player" (no names until PRES-01 in v2).
- **D-07:** Pile zones: horizontal row centered on the board between the opponent strip and the player's hand. Each pile shows its name and card count badge.
- **D-08:** Board transitions immediately from the lobby panel when the player is connected and `gameState` is available — no "Start Game" button.

### Pile Zone Configuration
- **D-09:** Phase 3 hardcodes three piles initialized by the server: `draw`, `discard`, and `play`. These match the `Pile` type in `shared/types.ts` (id, name, cards array).
- **D-10:** Server initializes piles in `defaultGameState`: draw pile gets the full shuffled 52-card deck; discard and play piles start empty.
- **D-11:** Pile labels shown on board: "Draw", "Discard", "Play Area" (derived from pile `name` field).

### Drag-and-Drop
- **D-12:** Optimistic updates — card is removed from its source (hand or pile) in local state the moment a drag starts. Server confirms; on error the card snaps back.
- **D-13:** Server update freeze during drag — incoming `STATE_UPDATE` WebSocket messages are buffered while a drag is active. Buffered state is applied after `onDragEnd` resolves. This satisfies success criteria #5 (no tearing during active drag).
- **D-14:** Valid drop targets: pile zone areas and the player's own hand strip. Dropping on an opponent hand, empty board space, or outside a zone cancels the drag and returns the card to its source.
- **D-15:** Use `@dnd-kit/core` (per CLAUDE.md recommendation). `DragOverlay` for the floating card ghost. `useDroppable` for pile zones and hand. `useDraggable` for individual cards.

### Card Move Animations
- **D-16:** Drag ghost: full card clone rendered via `DragOverlay`, scaled up ~5-10% (`transform: scale(1.07)`) to indicate "lifted" state.
- **D-17:** Post-drop: card animates into destination with a brief slide-in (CSS transition, ~100–150ms ease-out). Applied via layout animation or CSS class on card arrival.
- **D-18:** Flip and shuffle animations are out of scope for Phase 3 — those belong with the flip/shuffle actions in Phase 4.

### New ClientAction Types
- **D-19:** Add `MOVE_CARD` action to `ClientAction` in `shared/types.ts`:
  ```typescript
  | { type: "MOVE_CARD"; cardId: string; fromZone: "hand" | "pile"; fromId: string; toZone: "hand" | "pile"; toId: string }
  ```
  The server handles the move atomically and broadcasts `STATE_UPDATE` to all players.

### Claude's Discretion
- Exact card dimensions and aspect ratio (standard ~63×88mm ratio, scaled to fit layout)
- CSS implementation details for crosshatch card back
- Hand horizontal scroll vs fan layout (implement whichever is cleaner with dnd-kit)
- Whether pile zones show a visual "hover" highlight when a card is dragged over them
- Stack offset rendering for piles with many cards (slight visual depth vs flat icon + count)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Types and State Shape
- `src/shared/types.ts` — `Card`, `Pile`, `GameState`, `ClientGameState`, `ClientAction` types. MOVE_CARD action must be added here.
- `src/card-art.ts` — card art hook (DECK-03). CSS rendering used when URLs are empty strings.

### Server
- `party/index.ts` — PartyKit room. MOVE_CARD handler must be added. Per-connection broadcast via `viewFor` is the established pattern.

### Existing UI Patterns
- `src/components/LobbyPanel.tsx` — current "room view." Board component replaces or wraps this when `gameState` is non-null.
- `src/components/ui/button.tsx`, `src/components/ui/badge.tsx` — shadcn components already installed.

### Project Decisions
- `.planning/ROADMAP.md` — Phase 3 goal, success criteria, requirements (TABLE-01, TABLE-02, TABLE-03, CARD-01, CARD-02)
- `.planning/REQUIREMENTS.md` — Full requirement definitions
- `.planning/STATE.md` — Prior phase decisions (per-connection broadcast, player token, shadcn felt theme)
- `CLAUDE.md` — Stack: @dnd-kit/core + @dnd-kit/sortable recommended; React 18, Vite 5, TypeScript, Tailwind v4, shadcn

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/usePartySocket.ts` — already manages WebSocket connection and returns `gameState: ClientGameState | null`. Board reads from this hook.
- `src/hooks/usePlayerId.ts` — returns stable player token. Board uses this to identify own hand in `gameState.myHand`.
- shadcn `Badge` — use for pile card count badges.
- shadcn `Button` — available for any board controls added later.

### Established Patterns
- Dark felt theme via CSS HSL variables (set in `globals.css`). All new components use `bg-card`, `bg-background`, `text-primary` etc. — no hardcoded colors.
- `@/*` path alias configured in tsconfig + vite.config.ts — use `@/components/...` and `@/shared/...` imports.
- shadcn component pattern: components in `src/components/ui/`, feature components directly in `src/components/`.

### Integration Points
- `App.tsx` `RoomView` renders `LobbyPanel` today. Phase 3 adds a `BoardView` (or renames) that conditionally shows the board when `gameState` exists.
- `party/index.ts` needs a `MOVE_CARD` message handler. Pattern already established: parse action, mutate `state`, call `room.broadcast(JSON.stringify(viewFor(state, conn.id)), conn)` for each connection.
- `src/shared/types.ts` needs `MOVE_CARD` added to `ClientAction`.

</code_context>

<specifics>
## Specific Ideas

- Card back as pure CSS crosshatch/diamond pattern (no image) — consistent with dark felt, can be done with repeating-linear-gradient or SVG data URI in CSS.
- Board layout: opponent strip at top (~80-100px), pile zone row in center (flexible height), player hand at bottom (~120-140px). Total fills the viewport.
- dnd-kit `DragOverlay` is the correct pattern for the lifted card ghost — it renders outside the normal flow and avoids z-index issues.

</specifics>

<deferred>
## Deferred Ideas

- Flip animation (belongs with CARD-03 in Phase 4)
- Shuffle animation (belongs with CTRL-02 in Phase 4)
- Player-configurable pile zones (could be a future enhancement or Phase 4 game controls)
- Fan layout for player hand (nice-to-have, can be revisited in Phase 5 polish)

</deferred>

---

*Phase: 03-core-board*
*Context gathered: 2026-04-02*
