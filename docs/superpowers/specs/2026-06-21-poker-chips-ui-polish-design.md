# Poker Chips UI Polish — Design

**Status:** Approved (brainstorming)
**Date:** 2026-06-21
**Branch:** `feat/poker-chips`
**Follow-up to:** `2026-06-21-poker-chips-design.md`

## Problem

Live use of the shipped chips feature surfaced three issues:

1. **The pot's chip-stack visual overlaps the "Pot" label.** Root cause: `ChipStack` stacks discs with negative `margin-top` inside a `flex-col-reverse` container. Negative margins on a flex child can pull the element's rendered box upward past its own flow position, bleeding into the previous sibling (the "Pot" label) above it. The stack also reads as an odd crescent shape rather than a chip.
2. **The coin/chip icon look is flat and plain** compared to the rest of the app's iconography — a flat dot with a soft border, not "premium."
3. **The transfer controls are always visible and take up too much vertical space**, inconsistent with how every other per-zone control in this app (`PileZone`'s eye/shuffle/select-all, `SpreadZone`'s eye/select-all) is hidden until the zone is hovered or focused (the existing `zone-hover`/`zone-controls` CSS convention in `src/globals.css`).

## Decisions locked during brainstorming

### 1. Coin visual

Both chip components are rebuilt around one shared coin face — a small circle with a diagonal gold gradient (`#f5d77a` → `hsl(43 75% 60%)` i.e. the app's `--primary` → `#9a7416`) and a dark inset rim (`inset 0 0 0 1px rgba(0,0,0,0.45)`) plus a thin outer rim (`0 0 0 1px rgba(0,0,0,0.3)`). No new theme tokens — the gradient stops are the existing `--primary` plus two adjacent gold shades chosen to bracket it, used nowhere else in the app's CSS as named tokens (this is the one deliberate exception to "theme-tokens-only," scoped to literal gradient stops on a single small icon, not a new reusable color).

- **`ChipBadge`** (hand): **one** coin + the number. Used only for the hand total (a personal tally, not a physical pile).
- **`ChipStack`** (spread, pot): **three** coins in a vertical stack, evenly spaced with a fixed 5px gap between each, absolutely positioned (not negative-margin flex children) so spacing can never drift and can never bleed into a sibling element. Disc count is fixed at 3 regardless of amount — purely cosmetic, never read back into logic (unchanged from the original design).

### 2. Visibility — extend the existing hover-reveal convention to chip controls

Per-zone, the **only thing always visible** (on pointer devices — touch devices keep everything visible per the existing `@media (hover: hover)` rule in `globals.css`) is the coin icon and its number. Every interactive control hides behind the zone's existing `zone-hover`/`zone-controls` hover/focus reveal:

- **Hand:** at rest, only `ChipBadge` (coin + `chipsInHand`) is visible. On hover/focus: the bet-amount input, the "Bet" button, and a kebab trigger all appear together (they are not staged separately — the input and button share one reveal, matching the "exactly as visible as each other" requirement).
- **Spread:** at rest, only `ChipStack` (coin stack + `chipsInSpread`) is visible. On hover/focus: the full-amount, one-click spread→pot button (labeled per §3 below) and a kebab trigger appear.
- **Pot:** at rest, only `ChipStack` (coin stack + `pot`) is visible. On hover/focus: the "Take all" button (full-amount, one-click) and a kebab trigger appear.

`PotZone` currently has no `zone-hover` wrapper — this task adds one (matching the `<div className="zone-hover">` pattern already used in `HandZone`/`SpreadZone`/`PileZone`).

### 3. Placement within each zone (second brainstorming pass)

A second round of feedback refined *where* each chip element sits, not just when it's visible:

- **Hand:** the chip badge joins the existing name row (connected-dot + display name), right-aligned, immediately before the hover-revealed controls — not a separate line below it. On hover/focus, the bet-amount input + "Bet" button + kebab appear in that same row, positioned right after the badge and before the existing eye/sort icons (chip controls lead, pre-existing controls stay rightmost — chip elements and their controls stay adjacent).
- **Pot:** matches the existing `PileZone` pattern exactly, since the pot sits in the same narrow rail column (~56-80px) as the Draw/Discard piles and a wide horizontal layout doesn't fit there:
  - Top line: the "Pot" label (left) + the hover-revealed kebab (right) — same line, same as every `PileZone`'s label+controls row.
  - Below: a `PileZone`-style box (`bg-secondary`, rounded border) containing the coin stack, with the pot amount as a `Badge` overlaid bottom-right of the box — the same visual language as the existing card-count badge on Draw/Discard, not separate text underneath.
  - On hover/focus: the "Take all" button appears below the box (kebab is on the label line above; both reveal together from the same `zone-hover`/`zone-controls` trigger, they just live in two different rows of the same zone).
- **Spread:** the chip stack moves *inside* the spread zone's own card rectangle, as a leading slot to the left of the cards (or where cards would go), separated by a thin divider — not a separate line above the cards. The amount renders as an overlaid `Badge` on the chip slot, same treatment as Pot.
  - **The box always renders at full size if there is a bet OR cards** — never collapses to the empty-state thin dashed strip just because there are zero cards while `chipsInSpread > 0`. This avoids a layout jump when the last card is removed/passed away while a bet is still outstanding (the existing empty-state collapse remains for the true empty case: no cards AND no bet).
  - Controls: the existing bottom `zone-controls` row (currently eye + select-all) gains the chip controls — the spread→pot button + kebab — inserted **before** (to the left of) the existing eye/select-all icons, with a thin vertical divider between the two groups. This mirrors the chip slot's leading position in the box above it: chip-related things stay on the left throughout the zone, card-related things on the right.
  - The spread→pot button renders as a small coin glyph + a right-arrow + the text "Pot" (not "Move to pot" spelled out, and not icon-only) — confirmed over an icon-only treatment because this action has no established icon convention (unlike eye=visibility or checkbox=select-all) and risks being unreadable without a label; a literal pot/cooking-pot glyph alone was rejected for the same reason (reads as "food," not "poker pot").

### 4. Kebab → Popover secondary actions

Each zone's kebab (lucide-react `MoreVertical`, sized to match the existing small ghost icon buttons in `zone-controls` elsewhere) opens a `Popover` (the same component already used for the hamburger menu in `ControlsBar.tsx`) containing:

- **Hand's popover:** a single "To pot" button — moves the current bet-amount-input value from hand directly to the pot (bypassing spread). Uses the same amount value as the hover-revealed "Bet" button, so there is one shared amount input, not two.
- **Spread's popover:** one amount input, defaulting to the **current full `chipsInSpread` value** (i.e. defaults to "move everything," matching what the always-visible "Move to pot" button already does at one click) — plus **two** buttons, "To pot" and "To hand", both consuming that same input value. This is the only place a spread chip can move partially or move backward to the hand; the always-visible button stays the fast, full-amount, one-click path.
- **Pot's popover:** one amount input, defaulting to the current full `pot` value — plus two buttons, "Hand" and "Bet" (pot→hand, pot→spread), both consuming that input value. Mirrors the spread popover's shape for consistency.

## Components touched

- `src/components/ChipBadge.tsx` — single coin instead of a flat dot.
- `src/components/ChipStack.tsx` — three coins, fixed 5px gaps, absolute positioning (replaces the negative-margin flex approach). Gains an optional overlaid `Badge` mode for the amount (used by Pot and Spread; `ChipBadge`'s single-coin form is unaffected).
- `src/components/HandZone.tsx` — move `ChipBadge` into the existing name row (right-aligned); wrap the bet input/button/kebab together in `zone-controls`, positioned right after the badge, before the existing eye/sort icons; add the kebab + `Popover` with the "To pot" action; remove the standalone "To pot" button from the always-visible row (it no longer exists outside the popover).
- `src/components/SpreadZone.tsx` — move the chip stack into the card rectangle as a leading slot (divider, then cards or empty space); box sizing logic changes from `isEmpty` to `isEmpty && chipsInSpread === 0` for the collapse-to-thin-strip case; insert chip controls (coin+arrow+"Pot" button + kebab) before the existing eye/select-all icons in the bottom `zone-controls` row, with a divider between the two groups; replace the always-visible amount input with a kebab + `Popover` (defaulting to full `chipsInSpread`, two buttons: "To pot"/"To hand").
- `src/components/PotZone.tsx` — restructure into the `PileZone` pattern: top line (label + hover-revealed kebab), `PileZone`-style box below (coin stack + overlaid `Badge` amount), "Take all" button on hover beneath the box; add a `zone-hover` wrapper (none exists today); replace the always-visible amount input + Hand/Bet buttons with a kebab + `Popover` (defaulting to full `pot`, two buttons: "Hand"/"Bet").

No `ClientAction`/server changes — this is purely presentational; every `TRANSFER_CHIPS` dispatch shape from the original design is unchanged, only which UI surface triggers it.

## Out of scope (YAGNI)

- New theme color tokens (the coin gradient stays a literal, single-use exception, not a new named token).
- Changing the underlying chip data model, validation, or undo behavior — none of that changes.
- A persistent (non-hover) compact summary view — touch devices already get full visibility for free via the existing CSS rule; no separate mobile-specific design needed.

## Testing

Existing source-contract tests (`tests/chipVisuals.test.ts`, `tests/chipsHandZone.test.ts`, `tests/chipsSpreadZone.test.ts`, `tests/chipsPotZone.test.ts`) assert specific string patterns (e.g. "renders exactly 3 discs via `rounded-full`", "always-visible Move to pot button") that will need updating to match the new markup — these are expected, planned-for test rewrites, not regressions. New assertions should cover: `ChipStack` still renders exactly 3 coin elements with no amount-based scaling; the always-visible elements are the coin/number only (no button/input strings outside a `zone-controls` guard); the kebab/Popover dispatches the correct `TRANSFER_CHIPS` shape with the shared amount value for both destination buttons in Spread/Pot popovers.

Playwright e2e (`playwright/chips.spec.ts`) will need its action triggers updated to `.hover()` the zone (or otherwise focus an element inside it) before clicking a button that's now hover-revealed, and to open the kebab popover before clicking a secondary action. No existing e2e spec currently exercises a `zone-controls` element (the shuffle/eye/select-all icons in `PileZone`/`SpreadZone` have no e2e coverage today), so there's no established precedent to follow — this will be the first e2e coverage of the hover-reveal pattern, and should explicitly call `.hover()` rather than relying on `.click()`'s implicit pointer movement, since that's more deterministic in CI.
