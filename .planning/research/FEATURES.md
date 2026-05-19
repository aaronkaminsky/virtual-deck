# Feature Landscape — Virtual Deck v1.5

**Domain:** Real-time multiplayer card table — Board Polish II (layout docking, empty states, badges, sort semantics, drop affordances)
**Researched:** 2026-05-19
**Context:** SUBSEQUENT MILESTONE. v1.4 shipped. This file covers the five UX questions driving v1.5 feature decisions only.

---

## Overview

v1.5 is a polish sprint. Every feature here is a refinement of already-built components. The research questions are about correct UX behavior and visual treatment, not capability gaps. Each section below gives a clear, opinionated answer with rationale and implementation implications.

---

## Feature 1: Spread Zones Docked to Their Owner's Hand

### What "good" looks like

On a physical card table, a player's play area — the cards spread face-up in front of them — sits immediately between that player's hand and the center of the table. This spatial adjacency is not decorative; it communicates ownership. Players read layout from their own perspective: hand at bottom, personal play area directly above it, shared table above that.

For opponents viewed from above, the same rule applies: their cards (face-down backs) appear at the top of the board, and any cards they have played out should be directly below their hand row, between their hand and the table center.

**The current layout breaks this:** opponent spread zones render below their hands in the same `flex flex-col gap-1` wrapper inside the opponent column (confirmed in `BoardView.tsx` line 47–64), but personal spread zones render in a separate bottom section entirely (`<div className="flex-shrink-0 px-4 py-1">` at line 91), which makes them visually unaffiliated with the hand zone below it.

### Spatial proximity that feels natural

**Opponents:** Spread immediately below the opponent `OpponentHand` component, within the same column div. Gap: 4px (gap-1) is correct — close enough to read as one unit but not cramped. The current code already does this for opponents. No change needed there.

**Personal spread:** Directly above `HandZone`, with the same tight gap (4–8px). The player's eye travels down from the table center, hits their play area, then hits their hand — the same left-to-right-then-down reading order used by every digital card game. The spread should not be in a detached section; it should be either inside the HandZone wrapper or immediately adjacent in the flex column.

**Implementation implication:** The personal `SpreadZone` rendering in `BoardView` needs to move from its own `flex-shrink-0 px-4 py-1` wrapper (current) to directly above the `HandZone` in the same flex column, sharing px-4 padding. The HandZone `div` wrapping both should use `flex flex-col` with a 1–2px gap. No new component needed — this is a layout change in `BoardView.tsx`.

### Table stakes vs. differentiator

**Table stakes.** Players who have played any card game online (BGA, TTS, MTG Arena) will immediately feel the spatial disconnect when their play area is not anchored to their hand. This is a "broken" feeling, not a "missing feature."

**Complexity:** LOW. Pure CSS/layout change in `BoardView.tsx`. No state changes. No dnd-kit changes. Spread zone is already conditionally rendered.

**Dependency:** ZONE-01 (personal spread hidden when empty with drag-reveal) — already shipped in v1.4. The docking just moves where the already-hidden zone renders.

---

## Feature 2: Empty Zone Indicator (Faint Dashed Strip)

### What "good" looks like

An empty drop zone needs to answer two player questions simultaneously:

1. "Is there anything here?" (orientation — I know where the zone is)
2. "Can I drop here?" (affordance — I know it accepts cards)

These are in tension: a fully-invisible zone answers neither question, but a full-height visually heavy zone wastes board space and clutters the layout when empty.

**The right treatment:** A faint, reduced-height dashed strip — roughly 1/4 the normal zone height — that is always visible when the zone is empty (not just on drag). This height is enough to register as "there is a slot here" without competing with cards for vertical space. The border should use a low-opacity or `muted-foreground` color token (not the active `border-primary`) so it reads as potential, not active.

This is the established pattern across design systems: Ant Design, Carbon, and Material all use dashed borders for empty droppable zones by default. The current code has the right instinct (`border-dashed` on empty piles in `PileZone.tsx` line 89) but the personal spread zone currently collapses to `h-px opacity-0` when empty and non-hovered — invisible by default. The dashed strip replaces `h-px opacity-0`.

**Controls behavior:** Controls (face-toggle, select-all) should hide when the zone is empty. There are no cards to act on, and showing ghosted buttons adds noise. Controls appear when the first card arrives. The current `SpreadZone.tsx` already gates controls behind `(!isEmpty || interactive === false)` — this logic is correct and should be preserved.

**Height recommendation:** `h-10` (40px) at default breakpoint, `h-12` (48px) at sm+. This is 1/4 to 1/3 of the full zone height (currently `h-[64px] sm:h-[88px]`). Do not use a flex-based height — a fixed `h-10` ensures the strip stays small even when the parent column grows.

**On hover during drag:** When `isOver` is true, the strip should expand to full card-drop height and shift to `border-primary`. This already works in the current code; the change is just that the strip is now visible at its reduced height before hover, rather than invisible.

### Table stakes vs. differentiator

**Table stakes.** Without it, players lose track of where zones are, especially after the board has been reorganized with docking. An invisible drop target is a usability failure: players who don't know the zone exists cannot discover it.

**Complexity:** LOW. Change `h-px opacity-0` to `h-10 border border-dashed border-muted-foreground/40 rounded-lg` in `SpreadZone.tsx`. The isOver branch already handles hover expansion.

**Dependency:** Feature 1 (docking). Once docked, the strip will appear in the correct spatial position relative to the hand.

---

## Feature 3: Count Badge on Piles — Zero vs. Non-Zero

### When to hide, when to show

**Hide at zero. Always.** This is the unanimous convention across every major design system that has addressed this explicitly:

- Ant Design: badge hidden when count is 0 by default; `showZero` prop as an escape hatch
- Material UI: badge hides automatically at zero; `showZero` as override
- Material Design 3: "Badge is not shown when the value is zero" (guidelines)

The UX rationale is direct: a zero badge adds a visual element that conveys no information. It occupies space that registers as "something is here" but the payload is "nothing." This is worse than no badge — it creates a false-positive signal. Players glancing at the board read orange badges as "pile has cards." An orange "0" is noise that trains players to ignore the badge.

**The current code** renders `<Badge className="absolute -bottom-2 -right-2">{pile.cards.length}</Badge>` unconditionally in `PileZone.tsx` line 112. Fix: wrap in `{pile.cards.length > 0 && <Badge ...>}`.

**Secondary consideration:** whether to show the badge at all on a single-card pile is reasonable to debate (you can already see one card), but the standard UX position is to show it for count >= 1. Hiding at 1 would be a non-standard override that increases implementation surface without clear benefit. Show at >= 1, hide at 0.

### Table stakes vs. differentiator

**Table stakes.** An empty pile with an orange "0" badge looks broken. Players testing the app will interpret it as a bug rather than a design choice.

**Complexity:** TRIVIAL. One conditional in `PileZone.tsx`.

**Dependency:** None. Standalone change.

---

## Feature 4: Hand Sort — "Original Order" Semantics

### What "original" means in card games

"Original order" in a card game context is almost always **the order in which cards arrived in the player's hand**, not the order they were dealt globally or any intrinsic card ordering. Every source consulted is consistent: manual arrangement or arrival order is the baseline that players want to return to.

Board Game Arena's hand sort feature discussion (bug reports 114509, 140515, 115712) confirms: players want to preserve the order they personally arranged, with automatic sort modes available as overlays, and a way to "undo" the sort back to how they had things.

In this codebase, "original" is already implemented as **the server-canonical order of `myHand`** — the order cards exist in `GameState.hands[playerToken]`. This is the order cards arrived in the hand (deal order, or the order from the last manual drag-reorder). This is exactly correct.

**What "original" does NOT mean:**
- Deal order from session start — once a player drags cards around and that reorder is dispatched, the new server order is the new "original." The player's last manual arrangement wins.
- Suit/rank sorted — that is bySuit or byRank.
- An archived snapshot from session start — there is no reason to store and restore that.

### Cycling sort behavior

The current cycle is `original → bySuit → byRank → original`. This is correct and matches user expectations. Key behaviors:

**When original is active:** No `REORDER_HAND` dispatch is sent. The hand renders from server state. If the player drag-reorders a card while in original mode, the dispatch updates the server order, and original now reflects that new order. This is the correct behavior — drag reorder is the player's expression of their preferred order.

**When bySuit or byRank is active (visual-only sort mode):** Cards are sorted client-side via `sortCards()`. Server state is not changed. If the player then drag-reorders, `HandZone.tsx` correctly resets `sortMode` to `'original'` and dispatches the new order as the canonical order. This is correct — a drag during a sort mode signals "I want manual arrangement now."

**The unresolved semantic question for v1.5 (SORT-02):** What should happen when the player clicks "back to original" from bySuit? There are two interpretations:
1. **Snapshot original:** Revert to the server-canonical order that existed when bySuit was activated. Would require storing a snapshot of `cards` at sort activation time.
2. **Live original:** Revert to current server-canonical order (which, if no drag occurred during bySuit, is the same as when bySuit was activated). This is what the current code already does — it simply stops applying the visual sort.

**Recommendation:** Live original (interpretation 2). It is simpler, has no state management overhead, and covers 95%+ of cases correctly. The only case where they diverge is if another player passes a card to this player's hand while the player is in bySuit mode — in that case, "live original" includes the new card at the end, while "snapshot original" would not. Live original is the more intuitive behavior: "show me the hand as it actually is."

**Tooltip/label improvement needed:** The current tooltip reads "Sort: Original order — click for By Suit." This is correct. But there is a gap: when in bySuit or byRank, there is no visual indicator *on the button* showing the current mode to a player who forgot they sorted. The `sortMode !== 'original'` check already adds `text-primary` color to the icon — this is sufficient for v1.5. No additional work needed here.

### Table stakes vs. differentiator

**Clarifying the semantic:** Table stakes — "original order" must mean something consistent and logical, or players will be confused about why the button seems to do nothing after they drag-reorder while sorted. The current implementation is correct; SORT-02 is about verifying and documenting this, not rewriting it.

**Complexity:** LOW. This is primarily a decision/documentation task plus one edge case verification in tests.

**Dependency:** `REORDER_HAND` action (already shipped). `skipSnapshot?: boolean` on `REORDER_HAND` (already shipped in v1.4 Phase 23).

---

## Feature 5: Drop Target Affordances — When to Highlight

### The two options

**Option A — Highlight at drag start:** All valid drop targets get a visual indicator (border, glow, outline) the moment a drag begins, regardless of where the pointer is.

**Option B — Highlight on hover entry only:** No global "valid zone" signal at drag start. Only the specific zone the pointer is currently over highlights, and only while it is over.

### What the UX literature says

Multiple authoritative sources (NN/G, Smart Interface Design Patterns, Pencil & Paper) converge on a middle ground: the primary affordance should be on hover entry, but some ambient signal (that drag is active) can appear globally. The Trello pattern — widely cited as a gold standard — highlights only the column the card is approaching, not all columns simultaneously.

Key principle: "When there are multiple drop zones, differentiating between them requires precision" (Pencil & Paper). Highlighting all valid zones simultaneously reduces the signal of the specifically-hovered zone. Players need to identify where their card will land, not a list of all places it could go.

### What this codebase does and what it should do

**Opponent hand drop target:** Currently uses `dragIsActive` to show a `border-dashed border-primary/60` border across the entire drag session (confirmed in `OpponentHand.tsx` lines 32–38). This is Option A, and CTRL-06 in v1.5 Active requirements says this should change to Option B (hover only).

**Why hover-only is correct for opponent hand specifically:** The opponent hand drop target means "pass this card to this player." It is a high-stakes, intentional action — not an accidental landing zone. Advertising it the entire time a card is in motion creates noise: players who are just moving a card from hand to a pile will see all opponent hand borders lit up throughout the drag, which is distracting and implies "you might accidentally pass your card."

**Personal spread zone:** Correctly uses `isOver` (hover detection) to expand from the faint strip to full height. This is Option B already — no change needed.

**Pile zones and hand zone:** Use `isOver` border-primary already — no change needed.

**Implementation:** In `OpponentHand.tsx`, remove the `dragIsActive` branch entirely from the className conditional. The `isOver` branch (solid `border-primary` 2px) remains. The `border-2 border-transparent` fallback remains as the collapsed no-drag state. The `dragIsActive && 'min-h-[44px] min-w-[80px]'` size expansion can also be removed, or kept if the size expansion (without the border highlight) is helpful — but the border highlight must go.

**The `min-h` question:** Expanding the hit area during any drag (even without border highlight) is a valid usability choice — it makes the drop target easier to reach. However, this expansion currently only fires when `dragIsActive`, which means the opponent hand grows during any drag. If this expansion persists even after removing the border, it is a subtle affordance that is unlikely to confuse players. Keep the size expansion, remove the border color.

### Table stakes vs. differentiator

**Removing the drag-start border highlight:** Table stakes fix. A persistent dashed border on all opponent hands throughout every drag is visual noise that degrades the experience for anyone who moves cards frequently.

**Hover-only highlight on entry:** Table stakes. Players expect the "you can drop here" signal to appear when they are actually hovering, not preemptively.

**Complexity:** LOW. Remove one branch from the className conditional in `OpponentHand.tsx`.

**dnd-kit dependency:** `useDndContext()` is already imported in `OpponentHand.tsx` and provides both `active` (for `dragIsActive`) and `isOver` via `useDroppable`. No new API surface needed.

---

## Feature Dependencies

```
Feature 1 (spread zone docking)
    └──prerequisite for──> Feature 2 (empty strip visibility)
                               [docking determines where strip appears]

Feature 3 (badge zero hide) ──independent──> no dependencies

Feature 4 (sort semantics) ──depends on──> REORDER_HAND action (v1.4, shipped)

Feature 5 (drop affordance) ──depends on──> useDroppable / useDndContext (already used in OpponentHand)
```

### Dependency notes

- Feature 2 builds on Feature 1 — implement docking first, then refine the strip's visual treatment
- Feature 3, 4, and 5 are each independent; any order
- Features 3 and 5 are TRIVIAL complexity; Feature 4 is primarily a decision task; Feature 1 and 2 are the only layout changes with moderate risk of affecting other components

---

## Prioritization

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| 1 — Spread zone docking | HIGH — spatial confusion every session | LOW | P1 |
| 2 — Empty zone strip | HIGH — invisible drop targets are a usability failure | LOW | P1 (after Feature 1) |
| 3 — Zero badge hide | MEDIUM — looks broken; easy fix | TRIVIAL | P1 |
| 5 — Hover-only drop highlight | MEDIUM — persistent noise degrades drag UX | LOW | P1 |
| 4 — Sort semantics clarification | LOW-MEDIUM — current behavior is correct; this is verification + docs | LOW | P2 |

---

## Anti-Features

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| Highlight ALL valid drop zones at drag start | Seems helpful — players know where they can go | Adds noise to every drag; players cannot focus on their intended target; makes high-stakes zones (pass to opponent) look the same as low-stakes ones (pile) | Hover-only highlight with a subtle `min-h` expansion for hit area |
| Show zero badge "so players know the pile exists" | Seems informative | A zero badge adds an attention signal with no information payload; players learn to ignore all badges | Empty pile border-dashed treatment already communicates "this is a container" |
| Store a session-start "original order" snapshot | Seems like "true" original | Adds state, confuses players who drag-reorder, and diverges from what "original" means in physical play | Live original (current server order) is correct — last manual arrangement wins |
| Animate spread zone from hidden to dashed strip on drag start | Seems like a clever reveal | Animation during drag is distracting; the strip should exist statically so players can orient to the layout before dragging | Static faint strip always visible when empty |

---

## Sources

- BoardView.tsx, SpreadZone.tsx, PileZone.tsx, HandZone.tsx, OpponentHand.tsx — codebase inspection (HIGH confidence)
- PROJECT.md v1.5 Active requirements — primary source for feature scope (HIGH confidence)
- Material Design 3 Badge guidelines: https://m3.material.io/components/badges/guidelines — zero badge convention (HIGH confidence)
- Ant Design Badge API — `showZero` prop default behavior (HIGH confidence)
- Pencil & Paper drag-and-drop UX: https://www.pencilandpaper.io/articles/ux-pattern-drag-and-drop — hover-entry timing (MEDIUM confidence)
- Smart Interface Design Patterns drag-and-drop: https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/ — dashed empty zone convention (MEDIUM confidence)
- Nielsen Norman Group drag-and-drop: https://www.nngroup.com/articles/drag-drop/ — single active zone highlighting (MEDIUM confidence)
- Board Game Arena hand sort bug threads (114509, 140515, 115712) — "original order = manual arrangement" convention (MEDIUM confidence; pages inaccessible, derived from search summaries)
- UX Collective drag-and-drop design systems: https://uxdesign.cc/drag-and-drop-for-design-systems-8d40502eb26d — ambient vs. targeted highlighting (MEDIUM confidence)
- dnd-kit docs — `useDndContext`, `useDroppable` API (HIGH confidence — used throughout codebase)

---

*Feature research for: Virtual Deck v1.5 Board Polish II*
*Researched: 2026-05-19*
