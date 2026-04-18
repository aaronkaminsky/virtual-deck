# Phase 10: Shuffle Before Deal - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 10-shuffle-before-deal
**Areas discussed:** Any pile scope, Undo behavior, Shuffle visibility/animation

---

## Any Pile Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Just shuffle draw pile | Keep single Deal button; shuffle draw pile server-side before dealing. No UI changes. | ✓ |
| Per-pile deal buttons | Add deal affordance to each pile. Larger scope, UI changes required. | |

**User's choice:** Just shuffle the draw pile — existing Deal button only, no per-pile deal UI.

---

## Undo Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full restore | `takeSnapshot()` before shuffle; undo restores cards AND original pile order. | ✓ |
| Cards back, shuffle stays | Cards return but pile stays in shuffled order. | |

**User's choice:** Full restore — snapshot taken before shuffle so undo completely reverses both the deal and the shuffle.

---

## Shuffle Visibility / Animation

| Option | Description | Selected |
|--------|-------------|----------|
| Atomic — invisible | Shuffle happens silently server-side; players just see cards dealt in new order. | |
| Add shuffle animation | Card-fan animation on every pile shuffle, visible to all players before cards move. | ✓ |

**User's choice:** Add a card-fan (spread then collapse) animation to ALL pile shuffles — both the existing manual Shuffle button and deal-triggered shuffles. Animation plays first; dealt state arrives after.

**Notes:** User explicitly wants the animation on every shuffle, not just deal-triggered ones.

---

## Animation Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Animation first, then deal | Server broadcasts shuffle event; clients animate; then dealt state arrives. | ✓ |
| Concurrent | Animation plays while cards deal simultaneously. | |

**User's choice:** Sequential — all players see the shuffle animation complete before cards appear in hands.

---

## Animation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| All shuffles | Manual Shuffle button AND deal-triggered both animate. | ✓ |
| Deal only | Only deal-triggered shuffles animate. | |

**User's choice:** All shuffles get the animation for consistency.

---

## Claude's Discretion

- Animation duration and fan geometry
- Server event shape for triggering client animation (new event type vs. flag on existing state update)
- Client-side timing mechanism for animation-then-deal sequence

## Deferred Ideas

- Per-pile deal buttons — future backlog, not this phase
