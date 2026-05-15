# Phase 20: Spread Zone Multi-Select - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-09
**Phase:** 20-spread-zone-multi-select
**Areas discussed:** Selection isolation, Multi-card move action, Opponent spread zones

---

## Selection Isolation

**Q1: What happens when you click a spread zone card while hand cards are selected?**

| Option | Description | Selected |
|--------|-------------|----------|
| Zone-exclusive | Selecting in any zone clears all other selections. One zone owns selection at a time. Simpler routing. | ✓ |
| Per-zone independent | Each zone has its own selectedIds. Hand and spread can have simultaneous selections. | |
| You decide | Claude picks zone-exclusive. | |

**User's choice:** Zone-exclusive (Recommended)

---

**Q2: How does selection toggle within a spread zone?**

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle per card + Escape clears all | Click toggles individual cards; Escape clears everything. Consistent with HandZone. | ✓ |
| Toggle per card only | No Escape shortcut in spread zone. | |

**User's choice:** Toggle per card + Escape clears all

---

**Q3: Should spread zones show a "N selected" badge when 2+ cards selected?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same badge | Show badge in zone header, same as HandZone. | ✓ |
| No badge in spread zone | Visual ring/lift on cards is sufficient. | |

**User's choice:** Yes, same badge

---

## Multi-Card Move Action

**Q1: How should the server handle moving a selected set of spread zone cards?**

| Option | Description | Selected |
|--------|-------------|----------|
| Extend PLAY_CARD_SET | Add optional fromZone/fromId fields. Additive/backward compat. | ✓ |
| Multiple MOVE_CARDs | Client loops, sends one MOVE_CARD per card. No server change. | |
| New MOVE_CARD_SET action | Explicit new action type and handler. | |

**User's choice:** Extend PLAY_CARD_SET

---

**Q2: Insert-position dialog for multi-card spread drag to non-empty regular pile?**

| Option | Description | Selected |
|--------|-------------|----------|
| No dialog — always top | Consistent with single-card spread drag behavior. | ✓ |
| Show dialog for multi-card set | User picks Top/Bottom/Random. | |

**User's choice:** No dialog — always top

---

**Q3: Should hand be a valid drop target for multi-card drag from spread?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — include hand as drop target | SPREAD-03 requires it. PLAY_CARD_SET with toZone: 'hand'. | ✓ |
| Scope to pile/spread only | Narrower, deviates from SPREAD-03. | |

**User's choice:** Yes — include hand as drop target

---

## Opponent Spread Zones

**Q1: Should multi-select work in opponent personal spread zones?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — all spread zones | Multi-select everywhere, consistent with Phase 17 D-06. | |
| Own zone + communal only | Requires isOwned prop and branching. | |

**User's choice (free text):** "We should change opponent spread zones to be drop-only, you should not be able to select or drag cards from an opponent's hand, single or multiple. This is consistent with opponent hand behavior. After play-testing, the ability to drag from an opponent's spread zone is unexpected and unnecessary."

**Notes:** This reverts Phase 17 D-06. User observed in play-testing that dragging from opponent spread zones felt wrong and inconsistent with opponent hand behavior.

---

**Q2: What about the communal spread zone?**

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — communal zone fully interactive for all | Any player can select and drag from communal zone. Restriction applies only to opponent personal zones. | ✓ |
| Only zone owner can drag from their spread | Personal spreads are owned; communal has no owner so any player can interact. | |

**User's choice:** Yes — communal zone fully interactive for all

---

**Q3: Does the restriction apply to single-card drag too?**

| Option | Description | Selected |
|--------|-------------|----------|
| Restrict both — single and multi-card drag | Makes opponent personal spreads consistent with opponent hands entirely. | ✓ |
| Multi-select only | Keep single-card drag from opponent spreads (Phase 17 behavior). | |

**User's choice:** Restrict both — single and multi-card drag from opponent spreads

---

## Claude's Discretion

None — all areas had explicit user choices.

## Deferred Ideas

None — discussion stayed within phase scope.
