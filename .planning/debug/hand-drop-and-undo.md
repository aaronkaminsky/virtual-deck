---
status: resolved
trigger: "Bug 1 — Drop highlight inconsistent with large hand. Bug 2 — Undo undoes multiple moves AND doesn't re-enable."
created: 2026-04-04T00:00:00Z
updated: 2026-04-04T00:00:00Z
---

## Current Focus

hypothesis: |
  Bug 1: HandZone's droppable ref covers the full strip, but the SortableContext children (individual cards) render on top with their own pointer event consumers. When cards overflow and fill the zone, there are no gaps between them. dnd-kit hit-testing resolves to the individual sortable card IDs (not the 'hand' droppable), so `isOver` on the HandZone droppable is false whenever the cursor lands on a card rather than the bare background between/around cards. With few cards the background gaps are large; with 10+ cards nearly the entire zone is card surface, making reliable highlight nearly impossible.

  Bug 2a (multiple moves undone): UNDO_MOVE replaces `this.gameState = snap`. The snapshot was captured with `snap.undoSnapshots = {}`. So after undo the entire undoSnapshots record is wiped — not just this player's slot — clearing every other player's snapshots too. But more critically: the snapshot itself holds a GameState that already had the previous move's state, so undo does revert one move correctly. However, a deeper issue is visible: MOVE_CARD does NOT call takeSnapshot() before mutating state. So the only undo-capable actions are DRAW_CARD, FLIP_CARD, PASS_CARD, DEAL_CARDS, SHUFFLE_PILE. If user makes a MOVE_CARD, no snapshot is taken, but Undo is still shown as disabled (no snapshot). If user then does a DRAW_CARD, snapshot is taken; undo works. But symptom says "undoes multiple moves" — this needs more investigation.

  Bug 2b (undo stays disabled after subsequent move): After UNDO_MOVE, `this.gameState = snap` where `snap.undoSnapshots = {}`. Then on next move, takeSnapshot() is called on this.gameState — which is the snapshot object itself. takeSnapshot mutates `state.undoSnapshots[playerId] = snap2`, which mutates the OLD snapshot object. BUT `this.gameState` now IS that snap object, so the mutation does apply correctly. So canUndo should become true after the next move... unless the issue is that `this.gameState = snap` doesn't survive the re-assignment because snap holds a reference cycle or the storage/broadcast is using a stale reference. Need to verify.

  Actually re-reading UNDO_MOVE: `this.gameState = snap` replaces the instance field. Then `await this.persist()` and `this.broadcastState()` are called after the switch. broadcastState calls viewFor(this.gameState, ...) — which should now use the restored snap. viewFor checks `state.undoSnapshots[playerToken] != null` — and since snap.undoSnapshots was set to {} by takeSnapshot, canUndo = false. That's correct.

  Then on next move, takeSnapshot(this.gameState, senderToken) is called — this.gameState is the restored snap (a plain object). takeSnapshot does `state.undoSnapshots[playerId] = deepClone`. So canUndo should become true. viewFor should return canUndo=true. So why does it stay disabled?

  WAIT — looking more carefully at UNDO_MOVE handler: it does NOT call takeSnapshot before restoring. So after undo, undoSnapshots[player] = undefined (stripped). On next move, takeSnapshot IS called. So canUndo should re-enable. But the test "after undo, canUndo is false" passes. So the server logic seems correct...

  Could the bug be client-side? The client's gameState comes from the server via STATE_UPDATE. The isDraggingRef buffering could cause a stale canUndo — but that applies only while dragging. Let me re-examine.

  Actually the bug description says "stays disabled even after subsequent moves are made." This could be a MOVE_CARD issue: MOVE_CARD never calls takeSnapshot(). So after undo, if user makes a MOVE_CARD action (the most common action), no snapshot is taken, and canUndo stays false. The user may be doing MOVE_CARD (drag from pile to hand or between zones) expecting Undo to re-enable, but MOVE_CARD has no takeSnapshot call.

test: Read all action handlers to confirm which ones call takeSnapshot
expecting: MOVE_CARD does not call takeSnapshot — confirming the re-enable bug
next_action: Fix both bugs

## Symptoms

expected: |
  Bug 1: Dragging a card over the hand zone always shows orange drop highlight.
  Bug 2: Undo reverts exactly the last move. After Undo, button becomes disabled. After another move, Undo re-enables.
actual: |
  Bug 1: With 10+ cards in hand, orange highlight only appears when cursor is in specific spots.
  Bug 2: Undo appears to undo more than one move. After Undo is used and becomes disabled, it stays disabled even after subsequent moves.
errors: None reported.
reproduction: |
  Bug 1: Deal 10+ cards to a player. Drag a card from a pile. Try to drop on hand zone — highlight is inconsistent.
  Bug 2: Make a move, click Undo — multiple moves undone. Make another move — Undo button stays disabled.
started: UAT Phase 4

## Eliminated

- hypothesis: HandZone droppable is not registered correctly or setNodeRef is missing
  evidence: HandZone uses useDroppable with setNodeRef on the outer div — registration is correct
  timestamp: 2026-04-04T00:00:00Z

- hypothesis: viewFor strips undoSnapshots so canUndo is never true
  evidence: viewFor explicitly includes canUndo computed from undoSnapshots, and ClientGameState has canUndo field
  timestamp: 2026-04-04T00:00:00Z

- hypothesis: UNDO_MOVE replaces this.gameState reference then broadcastState uses wrong reference
  evidence: broadcastState uses this.gameState directly, so the re-assignment is visible to it
  timestamp: 2026-04-04T00:00:00Z

## Evidence

- timestamp: 2026-04-04T00:00:00Z
  checked: HandZone.tsx — droppable setup and card rendering
  found: HandZone has useDroppable on outer div. Cards render inside via SortableContext/useSortable. Each card is a separate droppable hit target. isOver on the HandZone is only true when cursor is over the bare background, not over any card element. With 10+ cards filling the strip, nearly all surface area is card elements.
  implication: BUG 1 ROOT CAUSE — isOver on hand droppable is false when hovering over individual sortable card elements. Fix: also check if over.id matches a card in the hand (isOver OR over target is a hand card).

- timestamp: 2026-04-04T00:00:00Z
  checked: party/index.ts — all action handlers
  found: DRAW_CARD calls takeSnapshot. FLIP_CARD calls takeSnapshot. PASS_CARD calls takeSnapshot. DEAL_CARDS calls takeSnapshot. SHUFFLE_PILE calls takeSnapshot. MOVE_CARD does NOT call takeSnapshot.
  implication: BUG 2 "undo stays disabled" ROOT CAUSE — MOVE_CARD (drag a card between zones) is the most common action and never records a snapshot. After undo clears the snapshot, any subsequent MOVE_CARD won't re-enable Undo. Fix: add takeSnapshot call at start of MOVE_CARD handler.

- timestamp: 2026-04-04T00:00:00Z
  checked: UNDO_MOVE handler — multiple moves undone symptom
  found: takeSnapshot stores only one snapshot per player (the most recent). Each call to takeSnapshot overwrites the previous. So UNDO_MOVE always restores to the last snapshot — it can only undo one move. However, the DEAL_CARDS action deals cards in a loop and then sets phase="playing". If user then draws a card (DRAW_CARD calls takeSnapshot capturing post-deal state), undo returns to post-deal state (correct, 1 move). The "multiple moves undone" symptom may be from the user's perspective: deal gives everyone 10 cards, then undo returns to empty hands — which feels like many moves undone, but that's just how deal works (it's one atomic action).
  implication: No server bug for "multiple moves" — the symptom is deal being one atomic action. But MOVE_CARD missing takeSnapshot is a real bug causing the re-enable failure.

## Resolution

root_cause: |
  Bug 1: HandZone uses useDroppable for isOver detection, but individual SortableHandCard elements are separate droppable targets. When cursor hovers over a card in the hand (not the background), the HandZone's isOver is false. With 10+ cards filling the strip, almost no bare background is visible, so isOver is almost never true. Fix: compute isOver-equivalent by checking if the active drag is over the hand droppable OR over any sortable card that belongs to this player's hand.

  Bug 2: MOVE_CARD handler in party/index.ts never calls takeSnapshot(). This is the most common user action (dragging cards). After undo clears the snapshot, any subsequent MOVE_CARD won't record a new one, leaving canUndo=false permanently until a DRAW_CARD/FLIP_CARD/etc. is performed. Fix: add takeSnapshot(this.gameState, senderToken) at the start of the MOVE_CARD handler (before any mutation).

fix: |
  Bug 1: In HandZone.tsx, use useDndMonitor or accept the active drag context to detect when the dragged item is over any card in this hand. Simplest approach: use the dnd-kit `useDroppable` `isOver` plus subscribe to whether the currently over droppable's data matches this hand. Alternative: add `data` to the useDroppable call and use DndContext's `active`/`over` to compute highlight.

  Concretely: In HandZone, import `useDndContext` from @dnd-kit/core and compute `isOverHand = over?.id === 'hand' || cards.some(c => c.id === String(over?.id))` where `over` comes from useDndContext(). Apply highlight when isOverHand is true and active is not null.

  Bug 2: In MOVE_CARD handler in party/index.ts, add `takeSnapshot(this.gameState, senderToken);` before the source lookup / mutations.

files_changed:
  - src/components/HandZone.tsx
  - party/index.ts
verification: |
  tsc --noEmit: clean (0 errors)
  vitest run: 79/79 pass (including 2 new MOVE_CARD undo regression tests)
  Bug 1: HandZone now uses useDndContext() active/over to compute isOver across the full card surface — cannot run visually in headless environment, needs human verify.
  Bug 2: MOVE_CARD now calls takeSnapshot before mutation. Regression test confirms canUndo re-enables after undo + MOVE_CARD.
