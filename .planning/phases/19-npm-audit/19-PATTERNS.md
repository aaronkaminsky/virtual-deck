# Phase 19: Responsive Layout - Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 7 (6 modified components + 1 new test)
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/CardFace.tsx` | component | request-response | `src/components/CardBack.tsx` | exact |
| `src/components/CardBack.tsx` | component | request-response | `src/components/CardFace.tsx` | exact |
| `src/components/HandZone.tsx` | component | event-driven | `src/components/SpreadZone.tsx` | exact |
| `src/components/PileZone.tsx` | component | event-driven | `src/components/SpreadZone.tsx` | role-match |
| `src/components/SpreadZone.tsx` | component | event-driven | `src/components/HandZone.tsx` | exact |
| `src/components/BoardView.tsx` | component | request-response | `src/components/BoardView.tsx` (self) | self |
| `playwright/responsive.spec.ts` | test | request-response | `playwright/game.spec.ts` | role-match |

---

## Pattern Assignments

### `src/components/CardFace.tsx` (component, two render paths)

**Analog:** `src/components/CardBack.tsx` (same dual render-path structure)

**Current class strings to replace** (lines 27, 39):

```tsx
// Line 27 — image path
className={cn('w-[63px] h-[88px] rounded-md select-none object-cover', className)}

// Line 39 — fallback div
className={cn(
  'w-[63px] h-[88px] relative bg-white rounded-md border border-gray-300 select-none',
  className
)}
```

**Target class strings (after edit):**

```tsx
// Line 27 — image path
className={cn('w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md select-none object-cover', className)}

// Line 39 — fallback div
className={cn(
  'w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] relative bg-white rounded-md border border-gray-300 select-none',
  className
)}
```

**Key pattern:** Both render paths must be updated. The image path (line 27) is the production path; the fallback div (line 39) is used when `CARD_FACE_URL` returns falsy. Missing either leaves one render path at the old desktop size.

---

### `src/components/CardBack.tsx` (component, two render paths)

**Analog:** `src/components/CardFace.tsx` (mirror structure)

**Current class strings to replace** (lines 14, 22):

```tsx
// Line 14 — image path
className={cn('w-[63px] h-[88px] rounded-md select-none object-cover', className)}

// Line 22 — fallback div
className={cn('w-[63px] h-[88px] rounded-md border border-gray-600 select-none', className)}
```

**Target class strings (after edit):**

```tsx
// Line 14 — image path
className={cn('w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md select-none object-cover', className)}

// Line 22 — fallback div
className={cn('w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] rounded-md border border-gray-600 select-none', className)}
```

---

### `src/components/HandZone.tsx` (component, three edit sites)

**Analog:** `src/components/SpreadZone.tsx` (same dnd-kit sortable pattern, same `-ml-5` overlap convention)

**Edit site 1 — SortableHandCard wrapper** (line 39):

```tsx
// Before
className={cn('relative w-[63px] h-[88px] flex-shrink-0', index > 0 ? '-ml-5' : '')}

// After
className={cn('relative w-[42px] h-[59px] sm:w-[63px] sm:h-[88px] flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
```

**Edit site 2 — HandZone drop container** (line 124):

```tsx
// Before
'h-[128px] flex items-center px-4 overflow-x-auto bg-card'

// After
'h-[100px] sm:h-[128px] flex items-center px-4 overflow-x-auto bg-card'
```

**Overlap ratio context:** `-ml-5` (20px) on 63px card = 31.7% overlap. Proportional at 42px = 13.3px → `-ml-3` (12px, nearest 4px grid). `h-[100px]` is the spec value from UI-SPEC.md (not derived from ratio — the 40px non-card overhead does not scale proportionally).

---

### `src/components/PileZone.tsx` (component, one edit site)

**Analog:** `src/components/SpreadZone.tsx` (same fixed-pixel zone container pattern)

**Edit site — card slot container** (line 49):

```tsx
// Before
'w-[80px] h-[112px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary'

// After
'w-[56px] h-[79px] sm:w-[80px] sm:h-[112px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary'
```

**Ratio verification:** 80 × 0.667 = 53.3 → 56px; 112 × 0.667 = 74.7 → 79px (both rounded to nearest 4px grid).

---

### `src/components/SpreadZone.tsx` (component, three edit sites)

**Analog:** `src/components/HandZone.tsx` (same dnd-kit sortable pattern, same `-ml-5` overlap convention)

**Edit site 1 — zone container** (line 95):

```tsx
// Before
'min-w-[80px] h-[112px] rounded-lg border flex items-center px-2 overflow-x-auto bg-secondary'

// After
'min-w-[56px] h-[79px] sm:min-w-[80px] sm:h-[112px] rounded-lg border flex items-center px-2 overflow-x-auto bg-secondary'
```

**Edit site 2 — SortableSpreadCard overlap** (line 36):

```tsx
// Before
className={cn('flex-shrink-0', index > 0 ? '-ml-5' : '')}

// After
className={cn('flex-shrink-0', index > 0 ? '-ml-3 sm:-ml-5' : '')}
```

**Edit site 3 — masked CardBack wrapper** (line 118):

```tsx
// Before
<div className={cn('flex-shrink-0', i > 0 ? '-ml-5' : '')}>

// After
<div className={cn('flex-shrink-0', i > 0 ? '-ml-3 sm:-ml-5' : '')}>
```

**Key pattern:** Two overlap locations exist because SpreadZone renders both `SortableSpreadCard` (face-up/known cards) and a plain `<div>` with `CardBack` (masked/unknown cards). Both must be updated for visual consistency when a spread contains a mix of known and unknown cards.

---

### `src/components/BoardView.tsx` (component, one edit site)

**Analog:** Self — no other component controls the root scroll container.

**Edit site — root div** (line 29):

```tsx
// Before
<div className="h-screen w-screen overflow-hidden flex flex-col bg-background">

// After
<div className="h-screen w-screen overflow-x-hidden overflow-y-auto sm:overflow-hidden flex flex-col bg-background">
```

**Pattern note:** `sm:overflow-hidden` correctly overrides both axis-specific classes at 640px+ because Tailwind's shorthand `overflow: hidden` takes precedence over axis-specific `overflow-x`/`overflow-y` at the same specificity level when the `sm:` media-query block appears later in the cascade.

---

### `playwright/responsive.spec.ts` (test, new file — Wave 0 gap)

**Analog:** `playwright/game.spec.ts` — exact file structure, import pattern, and assertion style to copy.

**Import pattern** (from `playwright/game.spec.ts` lines 1-2):

```ts
import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';
```

**Viewport configuration pattern** (Playwright API — no existing example in codebase, use Playwright docs):

```ts
test.use({ viewport: { width: 375, height: 667 } });
```

**Assertion pattern** (modeled on `playwright/game.spec.ts` style):

```ts
test('LAYOUT-04: no horizontal scroll at 375px viewport', async ({ page }) => {
  // navigate to board (single-player or lobby)
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(375);
});
```

**Note:** The fixture in `game.spec.ts` (`twoPlayerRoom`) requires two live PartyKit connections. The responsive test should use a simpler single-page fixture or `page` directly to avoid the two-player overhead. Check `playwright/fixtures.ts` for available fixture options before implementing.

---

## Shared Patterns

### Mobile-First Tailwind Class Order
**Source:** CONTEXT.md D-04 and RESEARCH.md Pattern 1
**Apply to:** All six component edit sites
```tsx
// Default (unprefixed) class = phone size (≤639px)
// sm: prefix = desktop size (≥640px)
// Example canonical form:
w-[42px] h-[59px] sm:w-[63px] sm:h-[88px]
```

### `cn()` Utility for Class Composition
**Source:** All existing components (e.g., `HandZone.tsx` line 7, `SpreadZone.tsx` line 8)
```tsx
import { cn } from '@/lib/utils';
// Usage: cn('base-classes', conditionalClasses, externalClassName)
```
All class edits in this phase occur inside existing `cn()` calls. No changes to `cn()` call structure — only the string arguments change.

### Negative Margin Overlap (Proportional Scale)
**Source:** `HandZone.tsx` line 39, `SpreadZone.tsx` lines 36 and 118
**Apply to:** SortableHandCard in HandZone, SortableSpreadCard and masked wrapper in SpreadZone
```tsx
// Pattern: conditional negative margin only on index > 0
// Phone: -ml-3 (12px); Desktop sm:: -ml-5 (20px)
index > 0 ? '-ml-3 sm:-ml-5' : ''
```

---

## No Analog Found

No files in this phase are without an analog.

---

## Metadata

**Analog search scope:** `src/components/`, `playwright/`
**Files scanned:** 8 source files read directly (CardFace, CardBack, HandZone, PileZone, SpreadZone, BoardView, OpponentHand, game.spec.ts)
**Pattern extraction date:** 2026-05-05
