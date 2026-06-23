# Spread Zone Discoverability (Backlog #1011)

## Problem

User feedback: the collapsed spread zone (the personal drop area below a player's hand) is hard to notice — both for first-time players who don't realize it exists, and for returning players who lose track of it during a session. The current collapsed-empty state is a 16px dashed sliver with no text and no distinguishing color, per `SpreadZone.tsx`.

Constraint carried over from the backlog item: don't make the zone always fully visible/expanded — that costs vertical space players don't want spent when the zone is empty.

## Decision

Add a small text label, **"Tableau"** (Title Case), centered inside the collapsed empty spread zone, **only for the player's own spread zone** (not opponents' spread zones).

"Tableau" is the classic card-table term for a personal layout/display area (as in solitaire) — it names the zone without resorting to internal jargon like "spread zone" or a generic instruction like "drop cards here."

### Visual treatment

- Collapsed-empty bar grows from the current `h-4` (16px) to `h-5` (20px) to fit the label.
- Label text: `text-[10px] text-muted-foreground/90 tracking-wide`, centered (`flex items-center justify-center`).
- Border/background stay as-is: dashed, `border-muted-foreground/30`, no color tint. The label itself is the entire discoverability change — no icon, no accent color. (Rejected during brainstorming: a colored/icon treatment and a combined icon+text+tint treatment, both judged to either say too little without text or take too much persistent space for a passive, no-text-jargon goal.)
- On drag-hover (`isOver`), the zone already expands and switches to a `border-primary` highlighted state per existing behavior — the label is **not** shown in this state; the existing hover treatment is signal enough.

### Scope

- Applies only to the zone rendered with `interactive={true}` in `BoardView.tsx` (the player's own spread, `mySpreadZone`) — gate the label on the same `interactive` prop already used elsewhere in `SpreadZone.tsx` (e.g. line 292) to avoid adding a new prop.
- Opponent spread zones (`interactive={false}`) keep the current unlabeled collapsed treatment.
- No first-time-only / onboarding logic — this is a persistent, passive visual change, not a dismissible tooltip.

## Out of scope

- Opponent spread zone treatment (unchanged).
- Any first-time-user tooltip or onboarding flow.
- Changes to the non-empty or drag-hover spread zone states beyond suppressing the new label during hover.

## Implementation notes

- Touches `src/components/SpreadZone.tsx` only — the `isReallyEmpty && !isOver` branch (around line 227) gets the label, gated on `interactive !== false`.
- No new props, no shared-type changes, no server changes — this is a pure client-side rendering tweak to an existing conditional branch.
