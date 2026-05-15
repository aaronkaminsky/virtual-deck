# Phase 21: Spread Zone Reorder Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-11
**Phase:** 21-phase-14-live-session-verification
**Areas discussed:** Selection Preservation, Undo Granularity, Verification Output

---

## Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Selection preservation | SPREAD-02 SC2: intra-zone reorder must not clear selection; D-04 needs exemption | ✓ |
| Undo granularity | takeSnapshot missing from REORDER_PILE_SPREAD; each drag = 1 undo step? | ✓ |
| Verification output | Unit tests only vs. HUMAN-UAT.md + REQUIREMENTS update | ✓ |

**User also added free-text:** "Re-ordering single or multiple selections should work and let you re-order within any spread zone or the player's hand. Dragging multiple-selected cards should move all selected cards to the list at the point of the drop zone. The number of cards in the zone or hand should not change."

---

## Selection Preservation

### Group reorder intent
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — group reorder | All selected cards move to drop point as a block, maintaining relative order | ✓ |
| No — only dragged card moves | Dragging a selected card moves just that one; others stay selected in place | |

**User's choice:** Yes — group reorder

### Zone scope
| Option | Description | Selected |
|--------|-------------|----------|
| Spread zones AND player hand | Same group-reorder behavior in both | ✓ |
| Spread zones only | Group reorder in spread zones only | |

**User's choice:** Spread zones AND player hand

### Group order preservation
| Option | Description | Selected |
|--------|-------------|----------|
| Preserve relative order | Selected cards land in the same relative order they were in before the drag | ✓ |
| Dragged card first | The card physically dragged lands first, others follow in original relative order | |

**User's choice:** Preserve relative order

### Hand reorder computation site
| Option | Description | Selected |
|--------|-------------|----------|
| In HandZone's useDndMonitor | Mirrors SpreadZone pattern; HandZone's existing useDndMonitor is extended | ✓ |
| You decide | Claude picks the cleanest pattern | |

**User's choice:** In HandZone's useDndMonitor

---

## Undo Granularity

### Undo step size
| Option | Description | Selected |
|--------|-------------|----------|
| One undo per drag | Each drag (single or group) = 1 snapshot. Simple, consistent. | ✓ |
| Coalesce rapid reorders | Multiple reorders within ~500ms share one snapshot | |

**User's choice:** One undo per drag

### Hand reorder undo
| Option | Description | Selected |
|--------|-------------|----------|
| Fix both in this phase | Add takeSnapshot to REORDER_PILE_SPREAD AND REORDER_HAND | ✓ |
| Spread zone only | Only fix REORDER_PILE_SPREAD; hand undo is a separate item | |

**User's choice:** Fix both in this phase

---

## Verification Output

### Artifacts
| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests | Vitest tests for group reorder calc, selection preservation, undo snapshots | ✓ |
| HUMAN-UAT.md | Live session test script like Phase 19 | ✓ |
| REQUIREMENTS.md update | Mark SPREAD-02 complete in traceability table | ✓ |

**User's choice:** All three

### SC1 status
| Option | Description | Selected |
|--------|-------------|----------|
| Trust it, fix SC2 and SC3 | SC1 already wired server-side and client-side | ✓ |
| Verify SC1 too | Write explicit test or UAT step for SC1 | |

**User's choice:** Trust it, focus on SC2 and SC3

---

## Claude's Discretion

None — user made explicit choices for all gray areas.

## Deferred Ideas

None — discussion stayed within phase scope.
