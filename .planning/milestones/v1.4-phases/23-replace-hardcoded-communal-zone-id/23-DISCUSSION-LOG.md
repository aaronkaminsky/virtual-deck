# Phase 23: Hand Sort + Select All - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-16
**Phase:** 23-replace-hardcoded-communal-zone-id
**Areas discussed:** Sort order & semantics, Sort button UI, Select All behavior, Select All placement

---

## Sort Order & Semantics

### Suit order

| Option | Description | Selected |
|--------|-------------|----------|
| ♠♥♦♣ Bridge order | Spades, Hearts, Diamonds, Clubs | |
| ♣♦♥♠ Reverse bridge | Clubs, Diamonds, Hearts, Spades | |
| Color-paired ♥♠♦♣ | Reds together, blacks together | |
| Spades, Clubs, Diamonds, Hearts | Custom order specified by user | ✓ |

**User's choice:** ♠ ♣ ♦ ♥ (Spades, Clubs, Diamonds, Hearts)
**Notes:** User specified this exact order rather than selecting from the presented options.

---

### Rank order

| Option | Description | Selected |
|--------|-------------|----------|
| A 2 3 ... K (Ace low) | Ace at left as lowest | |
| 2 3 ... K A (Ace high) | Ace at right as highest | ✓ |

**User's choice:** 2 3 ... K A (Ace high)

---

### Combined sort

| Option | Description | Selected |
|--------|-------------|----------|
| Suit primary, rank secondary | All spades grouped A→K, then clubs, etc. | |
| Rank primary, suit secondary | All Aces grouped, then all 2s, etc. | |
| Two separate modes | "By suit" and "by rank" are independent | ✓ |

**User's choice:** Two separate modes — but within each, the other dimension is the secondary key. "By suit" groups by suit with rank secondary (2→A within each suit). "By rank" groups by rank with suit secondary (♠♣♦♥ within each rank).
**Notes:** User clarified: each sort mode uses the other as secondary key, giving fully deterministic sort in both cases.

---

## Sort Button UI

### Button style

| Option | Description | Selected |
|--------|-------------|----------|
| Icon button cycles on click | Single icon, ghost style, cycles modes | ✓ |
| Text label shows active mode | Button reads "Original"/"Suit"/"Rank" | |
| Dropdown/menu | Chevron opens 3-item menu | |

**User's choice:** Icon button, cycles on click (same ghost button style as Eye/EyeOff)

---

### Active state indicator

| Option | Description | Selected |
|--------|-------------|----------|
| Filled/primary color icon | Icon colored primary when non-original sort active | ✓ |
| No indicator | Hand order is the indicator | |
| Badge/dot on button | Pip on icon when active | |

**User's choice:** Primary-colored icon when a non-original sort is active

---

### Tooltip

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — tooltip shows current mode | "Sort: Original order / By suit / By rank" | ✓ |
| No tooltip | Icon + color is sufficient | |

**User's choice:** Tooltip showing current mode name

---

## Select All Behavior

### Merge vs. replace

| Option | Description | Selected |
|--------|-------------|----------|
| Replace existing selection | Clears prior selection, selects zone | ✓ |
| Merge with existing | Adds to current selection | |

**User's choice:** Replace (simpler mental model, consistent with selectionSource design)

---

### Face-down pile behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Cards stay face-down during drag | No reveal | ✓ |
| Select All only works on face-up piles | Disable or prompt if face-down cards exist | |

**User's choice:** Cards stay face-down — same behavior as dragging a single face-down card

---

## Select All Placement

### PileZone trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Icon button in pile header row | Ghost icon in existing controls row | ✓ |
| Long-press/right-click | Context menu, no visible button | |

**User's choice:** Icon button in the pile header row

---

### SpreadZone trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Icon button in spread zone header | Ghost icon alongside existing eye icon | ✓ |

**User's choice:** Icon button in the spread zone header

---

## Claude's Discretion

- Exact lucide-react icon for sort button (ArrowUpDown, ListOrdered, etc.)
- Exact lucide-react icon for Select All button (CheckSquare, SquareCheck, etc.)
- Responsive layout handling if hand header gets crowded at narrow widths

## Deferred Ideas

None.
