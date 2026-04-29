# Phase 13: Playwright Infrastructure - Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 8 (5 new, 3 modified)
**Analogs found:** 7 / 8

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `playwright.config.ts` | config | request-response | `vitest.config.ts` | role-match |
| `playwright/fixtures.ts` | utility | request-response | `tests/helpers.ts` | role-match |
| `playwright/game.spec.ts` | test | request-response | `tests/broadcastMasking.test.ts` | role-match |
| `.mcp.json` | config | — | none | no-analog |
| `src/components/HandZone.tsx` (modify) | component | event-driven | self | exact (attr add) |
| `src/components/OpponentHand.tsx` (modify) | component | event-driven | self | exact (attr add) |
| `src/components/PileZone.tsx` (modify) | component | event-driven | self | exact (attr add) |
| `package.json` (modify) | config | — | self | exact (script add) |

---

## Pattern Assignments

### `playwright.config.ts` (config, root-level)

**Analog:** `vitest.config.ts`

**Config file pattern** (`vitest.config.ts` lines 1-14):
```typescript
import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
});
```

**Key differences from analog:**
- Import from `'@playwright/test'` not `'vitest/config'`
- No `resolve.alias` needed (Playwright runs the built app, not TypeScript source)
- Adds `webServer` array, `testDir`, `projects`, `use.baseURL`

**Complete target pattern** (from RESEARCH.md Code Examples):
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './playwright',
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:client',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx partykit dev',
      port: 1999,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

**Critical:** Use `port:` (not `url:`) for the PartyKit entry — PartyKit has no documented `/health` HTTP route. Playwright polls TCP port directly. Use `npm run dev:client` (not `npm run dev`) for Vite — `"dev"` in `package.json` runs `partykit dev`, not Vite.

---

### `playwright/fixtures.ts` (utility, request-response)

**Analog:** `tests/helpers.ts`

**Helper export pattern** (`tests/helpers.ts` lines 1-3, 5-19):
```typescript
import { vi } from "vitest";
import type * as Party from "partykit/server";
import type { Card } from "../src/shared/types";

export function makeMockRoom(...) { ... }
export function makeMockConnection(id: string) { ... }
export function makeCard(id: string, faceUp = false): Card { ... }
```

The analog exports named helper functions. The fixture file follows the same named-export pattern but exports a Playwright `test` object instead of plain functions.

**Lobby UI pattern** (from `src/components/LobbyPanel.tsx`):
- Name input: `placeholder="Your name"` (line 72) — target with `getByPlaceholder('Your name')`
- Join button: text `'Join Game'` (line 90) — target with `getByRole('button', { name: 'Join Game' })`
- Board ready signal: `data-testid="hand-zone"` (to be added in Wave 0 to `HandZone.tsx`)

**Complete target pattern** (from RESEARCH.md Pattern 2):
```typescript
import { test as base, expect, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

async function joinGame(page: Page, roomCode: string, playerName: string) {
  await page.goto(`/?room=${roomCode}`);
  await page.getByPlaceholder('Your name').fill(playerName);
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

type TwoPlayerFixture = { p1: Page; p2: Page; roomCode: string };

export const test = base.extend<{ twoPlayerRoom: TwoPlayerFixture }>({
  twoPlayerRoom: async ({ browser }, use) => {
    const roomCode = nanoid(8);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    await joinGame(p1, roomCode, 'Player1');
    await joinGame(p2, roomCode, 'Player2');

    await use({ p1, p2, roomCode });

    await ctx1.close();
    await ctx2.close();
  },
});

export { expect };
```

**Critical:** Each player needs a separate `BrowserContext` (not just a separate `Page`). `usePlayerId.ts` reads `localStorage` for player token — same context = same player token = both pages join as the same player.

---

### `playwright/game.spec.ts` (test, request-response)

**Analog:** `tests/broadcastMasking.test.ts`

**Test file structure** (`tests/broadcastMasking.test.ts` lines 1-6):
```typescript
import { describe, it, expect } from "vitest";
import GameRoom from "../party/index";
import { makeMockRoom, makeMockConnection, makeCard } from "./helpers";
import type { ClientGameState, ServerEvent } from "../src/shared/types";

describe("broadcastState masking via viewFor", () => {
  it("...", async () => { ... });
});
```

The analog pattern: top-level `describe` → `it` blocks → `expect` assertions. The e2e file follows identical structure but imports from `./fixtures` instead of `vitest`, and uses Playwright locators instead of mock objects.

**Import pattern** (differs from analog — import extended test, not base):
```typescript
import { test, expect } from './fixtures';
```

**Assertion pattern** (retry-based only — D-08):
```typescript
// Correct
await expect(page.getByTestId('hand-zone')).toBeVisible();
await expect(page.getByTestId('draw-pile')).toContainText('52');

// Forbidden
await page.waitForTimeout(2000);           // banned by D-08
const text = await locator.textContent();  // banned by D-08
```

**5 scenario structure:**
```typescript
describe('virtual-deck e2e', () => {
  test('state sync: P1 action visible to P2 in real time', async ({ twoPlayerRoom }) => { ... });
  test('deal cards: cards distributed to both hands', async ({ twoPlayerRoom }) => { ... });
  test('pass card: P1 hand to P2 hand', async ({ twoPlayerRoom }) => { ... });
  test('reset table: all cards return to draw pile', async ({ twoPlayerRoom }) => { ... });
  test('hand privacy: P2 sees count not card IDs', async ({ twoPlayerRoom }) => { ... });
});
```

**Hand privacy assertion pattern** (from RESEARCH.md Code Examples):
```typescript
await expect(p2.getByTestId('opponent-hand')).toBeVisible();
await expect(p2.getByTestId('opponent-hand').getByRole('status')).toHaveText(/\d+/);
```

**Phase sequencing requirement:** Reset and pass card tests must deal cards first — game starts in `"lobby"` phase, ControlsBar shows Deal button. After `DEAL_CARDS`, phase becomes `"playing"`. Deal has a 650ms server-side delay (`party/index.ts`) — retry-based matchers handle this automatically.

---

### `src/components/HandZone.tsx` (component, modify)

**Self-analog:** `src/components/HandZone.tsx`

**Target element** (lines 91-97 — the droppable div that needs `data-testid`):
```tsx
<div
  ref={setNodeRef}
  className={cn(
    'h-[128px] flex items-center px-4 gap-2 overflow-x-auto bg-card',
    isOver ? 'border-t-2 border-primary' : ''
  )}
>
```

**Modification:** Add `data-testid="hand-zone"` to the `<div ref={setNodeRef}>` element (line 91). This is the droppable container — the correct target because `setNodeRef` registers it with dnd-kit and it is the element that becomes visible after lobby join.

**After modification (line 91-97):**
```tsx
<div
  ref={setNodeRef}
  data-testid="hand-zone"
  className={cn(
    'h-[128px] flex items-center px-4 gap-2 overflow-x-auto bg-card',
    isOver ? 'border-t-2 border-primary' : ''
  )}
>
```

---

### `src/components/OpponentHand.tsx` (component, modify)

**Self-analog:** `src/components/OpponentHand.tsx`

**Target element** (lines 25-35 — the outer droppable div):
```tsx
<div
  ref={setNodeRef}
  className={cn(
    'flex flex-col rounded-lg p-1',
    isOver
      ? 'border-2 border-primary'
      : dragIsActive
        ? 'border-2 border-dashed border-primary/60'
        : 'border-2 border-transparent',
    dragIsActive && 'min-h-[44px] min-w-[80px]'
  )}
>
```

**Modification:** Add `data-testid="opponent-hand"` to the outermost `<div ref={setNodeRef}>` (line 25). This element also carries `setNodeRef` so it is the droppable zone that receives passed cards.

**After modification (lines 25-35):**
```tsx
<div
  ref={setNodeRef}
  data-testid="opponent-hand"
  className={cn(
    'flex flex-col rounded-lg p-1',
    ...
  )}
>
```

**Note on badge:** The `<Badge>{cardCount}</Badge>` at line 50 is rendered from shadcn `badge.tsx`. It does not carry an implicit ARIA `role="status"`. If `getByRole('status')` fails in tests, fall back to `data-testid="opponent-count"` on the `<Badge>` element.

---

### `src/components/PileZone.tsx` (component, modify)

**Self-analog:** `src/components/PileZone.tsx`

**Target element** (lines 46-52 — the droppable div):
```tsx
<div
  ref={setNodeRef}
  className={cn(
    'w-[80px] h-[112px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary',
    isEmpty ? 'border-dashed' : '',
    isOver ? 'border-primary' : 'border-border'
  )}
>
```

**Modification:** Add `data-testid={`pile-${pile.id}`}` to the `<div ref={setNodeRef}>` element (line 46). The `pile.id` value for the draw pile is `"draw"` (from PartyKit initial state), so the draw pile selector becomes `data-testid="pile-draw"`.

**After modification (lines 46-52):**
```tsx
<div
  ref={setNodeRef}
  data-testid={`pile-${pile.id}`}
  className={cn(
    'w-[80px] h-[112px] rounded-lg border flex flex-col items-center justify-center relative bg-secondary',
    isEmpty ? 'border-dashed' : '',
    isOver ? 'border-primary' : 'border-border'
  )}
>
```

---

### `package.json` (config, modify)

**Self-analog:** `package.json` `"scripts"` block (lines 5-13):
```json
"scripts": {
  "dev": "partykit dev",
  "dev:client": "vite",
  "build": "vite build",
  "deploy": "partykit deploy",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit"
}
```

**Modification:** Add two scripts after `"test:watch"`, before `"typecheck"`:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui",
```

`"test"` (vitest) stays unchanged per D-05.

---

## Shared Patterns

### data-testid Attribute Convention
**Apply to:** `HandZone.tsx`, `OpponentHand.tsx`, `PileZone.tsx`

Attribute placement: always on the outermost meaningful element or the `ref`-attached droppable container. Pattern: `data-testid="kebab-name"` for static IDs, `data-testid={`pile-${pile.id}`}` for dynamic IDs from props.

### Retry-Based Assertion Convention
**Source:** RESEARCH.md D-08
**Apply to:** All assertions in `playwright/game.spec.ts`

```typescript
// All assertions use locator matchers (auto-retry up to configured timeout)
await expect(locator).toBeVisible();
await expect(locator).toHaveText(/pattern/);
await expect(locator).toContainText('text');
await expect(locator).not.toBeEmpty();

// Never use:
await page.waitForTimeout(ms);
const value = await locator.textContent();
```

The 650ms server-side deal delay in `party/index.ts` is handled transparently by retry matchers — no explicit sleep needed.

### Lobby Interaction Pattern
**Source:** `src/components/LobbyPanel.tsx` (placeholder line 72, button line 90)
**Apply to:** `playwright/fixtures.ts` `joinGame()` helper

```typescript
await page.goto(`/?room=${roomCode}`);
await page.getByPlaceholder('Your name').fill(playerName);
await page.getByRole('button', { name: 'Join Game' }).click();
await expect(page.getByTestId('hand-zone')).toBeVisible();
```

The `?name=` URL param does NOT bypass the lobby — `App.tsx` reads only `?room=` from the URL. The fixture must always interact with LobbyPanel.

### nanoid Import Convention
**Source:** `package.json` dependencies — `"nanoid": "^5.1.7"`
**Apply to:** `playwright/fixtures.ts`

```typescript
import { nanoid } from 'nanoid';
// Usage:
const roomCode = nanoid(8);
```

nanoid is already in `dependencies` (not devDependencies) — no install needed.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.mcp.json` | config | — | No existing MCP config in codebase; JSON format only, no TypeScript analog |

**`.mcp.json` pattern** (from RESEARCH.md Pattern 3):
```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@0.0.70"],
      "type": "stdio"
    }
  }
}
```

---

## Metadata

**Analog search scope:** `/Users/aaronkaminsky/code/virtual-deck/` — `src/components/`, `tests/`, project root config files
**Files scanned:** 10 (vitest.config.ts, vite.config.ts, package.json, tests/helpers.ts, tests/broadcastMasking.test.ts, HandZone.tsx, OpponentHand.tsx, PileZone.tsx, LobbyPanel.tsx, src/components/ glob)
**Pattern extraction date:** 2026-04-20
