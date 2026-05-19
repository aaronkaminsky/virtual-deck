# Phase 23: Hand Sort + Select All - Context

**Gathered:** 2026-05-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Two independent UI affordances added to the existing board:
1. **Hand Sort** — a cycle button on the player's own hand that rotates through Original → By Suit → By Rank → Original; sort is persisted server-side via the existing `REORDER_HAND` action and does NOT enter the undo stack.
2. **Select All** — a button on every PileZone and SpreadZone header that selects all cards in that zone, replacing any existing selection, for use with the existing multi-card drag.

No new server actions beyond `REORDER_HAND`. No changes to opponent views or hand masking.

</domain>

<decisions>
## Implementation Decisions

### Sort Order & Semantics

- **D-01:** Suit order for "By Suit": ♠ ♣ ♦ ♥ (Spades, Clubs, Diamonds, Hearts)
- **D-02:** Rank order for "By Rank": 2 3 4 5 6 7 8 9 10 J Q K A (Ace high — highest rank)
- **D-03:** "By Suit" uses suit as primary key and rank as secondary key (within each suit, cards sorted 2→A). "By Rank" uses rank as primary key and suit as secondary key (within each rank, suits sorted in the D-01 suit order). These are two separate modes — no combined mode.

### Sort Button UI

- **D-04:** A single ghost icon button (style: `h-7 w-7 p-0`, matching Eye/EyeOff) added to the hand header row, after the Eye/EyeOff toggle. Clicking cycles Original → By Suit → By Rank → Original.
- **D-05:** When a non-original sort is active, the sort icon is rendered in the primary color (amber) rather than the default muted foreground. When original order is active, the icon is muted.
- **D-06:** Tooltip text shows the current mode: "Sort: Original order" / "Sort: By suit" / "Sort: By rank". The tooltip should also hint the next mode on next click.

### Select All Behavior

- **D-07:** Clicking "Select All" on a zone replaces any existing selection (clears prior `selectedIds` and `selectionSource`) and selects all cards in that zone. No cross-zone merging.
- **D-08:** "Select All" works on face-down piles — selected cards remain face-down during drag. No reveal required.

### Select All Placement

- **D-09:** PileZone: ghost icon button (e.g. `CheckSquare` from lucide-react) added to the pile's existing controls row in the header.
- **D-10:** SpreadZone: ghost icon button added to the spread zone header row alongside the existing eye icon. Same `h-7 w-7 p-0` style.

### Claude's Discretion

- Exact icon choice for sort button (ArrowUpDown, ListOrdered, etc.) and select-all button (CheckSquare, SquareCheck, etc.) — use whatever lucide-react icon is most semantically clear.
- Hand header layout management — if the header row gets crowded at narrow widths, the planner may hide the sort button's label (text-only fallback) or use `sm:` breakpoints as needed, consistent with existing responsive patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §"Hand Sort" (SORT-01) and §"Select All" (SELECT-01, SELECT-02, SELECT-03) — locked requirements and success criteria
- `.planning/ROADMAP.md` §"Phase 23: Hand Sort + Select All" — phase goal, depends-on, UI hint

### Source Files (must read before planning)
- `src/components/HandZone.tsx` — existing hand sort via drag, REORDER_HAND send, header layout, selection wiring
- `src/components/SpreadZone.tsx` — existing spread zone header, eye icon pattern, selection wiring
- `src/components/PileZone.tsx` — existing pile header and controls; no selection today
- `src/components/BoardView.tsx` — `selectedIds`, `onToggleSelect`, `selectionSource` threading

### Server
- `party/index.ts` §REORDER_HAND handler — sort must use this action; does not enter undo stack
- `src/shared/types.ts` — `REORDER_HAND` action type

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Button` (`src/components/ui/button.tsx`, `variant="ghost"`, `className="h-7 w-7 p-0"`) — the exact pattern used for Eye/EyeOff; reuse for sort and select-all buttons
- `useSortable` + `SortableContext` + `arrayMove` (`@dnd-kit/sortable`) — already imported in HandZone; sort implementation reuses `sendAction({ type: 'REORDER_HAND', orderedCardIds })` 
- `cn` utility — use for conditional primary-color icon class when sort is active

### Established Patterns
- **Sort persistence via REORDER_HAND:** The existing drag-reorder in HandZone sends `REORDER_HAND` — hand sort uses the same action with a freshly sorted card ID array. No new server action needed.
- **Selection state lives in App.tsx (or equivalent root):** `selectedIds`, `onToggleSelect`, `selectionSource` are passed down through BoardView → SpreadZone / HandZone. Select All extends `onToggleSelect` or adds a new `onSelectAll(ids, zone, zoneId)` callback following the same threading pattern.
- **selectionSource enforces single-zone selection:** The existing `selectionSource` field locks selection to one zone/zoneId. Select All replaces the selection (D-07) so it must update both `selectedIds` and `selectionSource`.
- **Icon active state:** Phase 22 used ring (`ring-primary/50`) for the container; sort uses primary-colored icon (D-05) — these are different affordances, don't mix them.

### Integration Points
- Hand header row: add sort button after Eye/EyeOff (right side of header)
- PileZone header controls: add Select All button alongside existing controls
- SpreadZone header: add Select All button alongside existing eye icon
- BoardView or App: add `onSelectAll` callback (or extend `onToggleSelect`) to set all zone card IDs as selected

</code_context>

<specifics>
## Specific Ideas

- Sort button sits after the Eye/EyeOff toggle in the hand header row — the user confirmed the existing header layout as the anchor.
- Sort mode indicator: primary-colored icon (not a badge/pip/ring) — distinct from the Hand Reveal ring.
- Tooltip includes current mode name (not just icon semantics).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 23-replace-hardcoded-communal-zone-id*
*Context gathered: 2026-05-16*
