# Phase 31: Migration - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove the communal grid zone from the board; establish a fixed left sidebar containing draw and discard piles; create an empty canvas shell that occupies the remaining horizontal space. No canvas card placement yet — that is Phase 32. No full board restructure — the existing 5-band layout is preserved; only the middle band is changed.

</domain>

<decisions>
## Implementation Decisions

### Sidebar Layout
- **D-01:** Sidebar width is natural PileZone width — no fixed pixel width. The sidebar wraps snugly around the two PileZone components. Keeps pile sizing consistent with the rest of the board.
- **D-02:** Sidebar is fixed/sticky — always visible regardless of canvas scroll. Draw and discard piles must always be reachable.
- **D-03:** At narrow viewports (375px), sidebar stays visible at its natural width; the canvas gets the remaining space. Piles are never hidden or collapsed.
- **D-04:** Sidebar has a subtle 1px border-right in a muted color to visually separate it from the canvas. No background color contrast.

### Canvas Shell
- **D-05:** Empty canvas renders as plain felt (`bg-background`), no decoration, no placeholder text, no dashed border. Phase 32 adds cards; no empty-state hint is needed in a transitional phase.
- **D-06:** Canvas uses `flex-1` to fill all available vertical space in the middle band. No fixed height.

### Communal 'Play' Pile
- **D-07:** The server-side `'play'` pile (`region: "spread"`) is removed from the initial piles array. Clean break — no dual-mode fallback. Canvas cards will use a different data model (x/y/z) introduced in Phase 32.
- **D-08:** No migration guard for existing room state. Any cards in the 'play' pile at deploy time are silently lost. Rooms are typically reset before play.
- **D-09:** `GridZone.tsx` component is deleted. All grid-specific imports, action handlers (`MOVE_GRID_CARD`), and region checks in `BoardView.tsx` and `party/index.ts` are removed.

### Board Layout Restructure
- **D-10:** Only the middle band changes. The existing 5-band flex-column structure (`ConnectionBanner` | opponent hands + controls | opponent spreads | middle | personal spread + hand) is preserved. Opponent hands, opponent spreads, personal spread zone, and HandZone are untouched.
- **D-11:** The middle band drops `items-center` and switches to `items-start` (top-align). Canvas fills height via `flex-1`; sidebar piles align to the top of the band.
- **D-12:** Middle band becomes a horizontal flex row: `[sidebar] [canvas]`. Sidebar is `flex-shrink-0`; canvas is `flex-1 min-w-0`.

### Claude's Discretion
- Exact muted border color for sidebar divider — use an existing Tailwind border token from the dark felt theme (e.g. `border-border` or `border-muted`).
- Whether `overflow-hidden` or `overflow-auto` on the canvas shell in Phase 31 — canvas has no content yet; pick whichever matches the Phase 32 scroll model cleanly.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Requirements
- `.planning/ROADMAP.md` §"Phase 31: Migration" — goal, success criteria, requirements list (MIGRATE-01, MIGRATE-02, MIGRATE-03)
- `.planning/REQUIREMENTS.md` — MIGRATE-01, MIGRATE-02, MIGRATE-03 definitions

### Spike Findings (canvas architecture)
- `.planning/spikes/MANIFEST.md` — overview of all four validated spikes; key decisions about canvas data model and drag approach
- `.planning/spikes/CONVENTIONS.md` — **critical**: card positioning model (x/y/z), useDraggable-only approach, PointerSensor with distance:8 activation constraint, canvas panning approach. Downstream agents must read this before designing Phase 32+ canvas code.

### Existing Code (files being changed or deleted)
- `src/components/BoardView.tsx` — current 5-band layout; middle band is the primary change target
- `src/components/GridZone.tsx` — 166-line component to be deleted
- `party/index.ts` — server-side pile initialization and MOVE_GRID_CARD handler to be removed

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/PileZone.tsx` — renders draw and discard piles; used as-is in the sidebar; no modifications needed
- `src/components/SpreadZone.tsx` — personal spread zones; untouched by this phase
- `src/components/HandZone.tsx` — player hand; untouched by this phase

### Established Patterns
- **`flex-shrink-0` + spacer pattern**: Phase 30 used a `w-7 flex-shrink-0` spacer div for column alignment. Same pattern may apply to sidebar if column alignment with opponent spreads above is needed.
- **Middle band structure**: Currently `flex-1 min-h-0 flex items-center px-4 gap-4`. This becomes `flex-1 min-h-0 flex items-start px-0 gap-0` (or similar) with sidebar and canvas as direct children.
- **`overflow-x-hidden overflow-y-auto sm:overflow-hidden`** on the outer scroll container — preserved as-is; the canvas shell in Phase 31 has no content to scroll.

### Integration Points
- `BoardView.tsx` is the single file where the layout change happens on the client
- `party/index.ts` initialization array (remove 'play' pile entry) and MOVE_GRID_CARD handler removal on the server
- `src/shared/types.ts` — check if `region: "grid"` appears in the Pile type union; remove if present
- `BoardDragLayer.tsx` — has an `isIntraSpreadReorder` guard that references grid behavior; verify it doesn't need grid-specific cleanup

</code_context>

<specifics>
## Specific Ideas

No specific visual references — open to standard dark felt theme patterns already in use.

</specifics>

<deferred>
## Deferred Ideas

- **Full board restructure** (sidebar spans full board height, canvas as dominant surface) — discussed but deferred. Could benefit Phase 35 scroll model. Revisit if Phase 35 mobile work reveals a structural need.
- **Migration guard for existing room state** — discussed but deferred. Rooms reset before play makes this a non-issue in practice. If rooms ever persist long-term state, revisit.

</deferred>

---

*Phase: 31-Migration*
*Context gathered: 2026-05-23*
