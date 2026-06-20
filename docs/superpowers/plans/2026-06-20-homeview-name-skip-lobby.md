# Name on HomeView, Skip Lobby for Creators — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a required "Your name" field to HomeView so Create/Quick take the player straight onto the board, while a shared `?room=` URL still lands on the lobby.

**Architecture:** A one-shot `sessionStorage` "auto-join intent" flag set by HomeView before navigation and consumed once by `RoomView` on mount. HomeView saves the player name (existing localStorage `saveDisplayName`) and marks the intent; RoomView consumes it and programmatically joins via the existing `handleJoin` path, bypassing the lobby. Absence of the flag (shared link, refresh, new tab) falls through to the lobby unchanged.

**Tech Stack:** React 18 + TypeScript + Vite; Vitest (pure-logic, no jsdom); Playwright e2e.

## Global Constraints

- Vitest includes only `tests/**/*.test.ts`, NO jsdom — pure-logic tests only; UI flow verified by typecheck + Playwright.
- Auto-join intent: `sessionStorage` key `vd:autojoin`, value `"1"`, **consumed once** (read-then-remove). Tab-scoped by nature of `sessionStorage`.
- "Your name" is **required** on HomeView: Create enabled only with a non-empty table slug AND a non-empty trimmed player name; Quick enabled only with a non-empty trimmed player name. Player-name field capped at 20 chars (matches the lobby) and prefilled from `getDisplayName()`.
- Player name persists via existing `saveDisplayName` (localStorage `displayName`); player token unchanged.
- `LobbyPanel.tsx` is unchanged (it is now purely the URL-arrival path).
- Pre-commit hook runs `npm test` + `npm run typecheck`; both must pass. Do not use `--no-verify`.
- Spec: `docs/superpowers/specs/2026-06-20-homeview-name-skip-lobby-design.md`.

---

### Task 1: Auto-join intent module

**Files:**
- Create: `src/lib/autojoin.ts`
- Test: `tests/autojoin.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `markAutojoin(): void` — sets the one-shot flag.
  - `consumeAutojoin(): boolean` — returns whether the flag was set, and clears it (one-shot).

- [ ] **Step 1: Write the failing test**

```ts
// tests/autojoin.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { markAutojoin, consumeAutojoin } from '../src/lib/autojoin';

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

beforeEach(() => { vi.stubGlobal('sessionStorage', makeStorage()); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('autojoin intent', () => {
  it('consumeAutojoin returns false when nothing was marked', () => {
    expect(consumeAutojoin()).toBe(false);
  });
  it('marks then consumes as true', () => {
    markAutojoin();
    expect(consumeAutojoin()).toBe(true);
  });
  it('is one-shot: a second consume returns false', () => {
    markAutojoin();
    consumeAutojoin();
    expect(consumeAutojoin()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/autojoin.test.ts`
Expected: FAIL — cannot resolve `../src/lib/autojoin`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/autojoin.ts
// One-shot "skip the lobby" intent, set by HomeView before navigating to a room
// and consumed once by RoomView on mount. sessionStorage keeps it tab-scoped, so
// a shared URL opened in a new tab/device never inherits the intent.
const AUTOJOIN_FLAG = 'vd:autojoin';

export function markAutojoin(): void {
  sessionStorage.setItem(AUTOJOIN_FLAG, '1');
}

export function consumeAutojoin(): boolean {
  const marked = sessionStorage.getItem(AUTOJOIN_FLAG) === '1';
  sessionStorage.removeItem(AUTOJOIN_FLAG);
  return marked;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/autojoin.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/autojoin.ts tests/autojoin.test.ts
git commit -m "feat: one-shot auto-join intent helper (phase 1001)"
```

---

### Task 2: HomeView — player-name field + auto-join on entry

No unit test (no jsdom). Verified by `npm run typecheck` here and the Playwright suite (Task 4).

**Files:**
- Modify: `src/components/HomeView.tsx` (full new content below)

**Interfaces:**
- Consumes: `markAutojoin` (Task 1); `getDisplayName`, `saveDisplayName` from `@/hooks/usePlayerId`; existing `slugify`, `probeOccupancy`, `nanoid`, UI components.
- Produces: HomeView with `data-testid="player-name-input"` plus the existing testids (`table-name-input`, `create-table`, `quick-table`, `occupied-warning`, `join-occupied`). The Quick button is now `disabled` when the player name is empty.

- [ ] **Step 1: Replace `src/components/HomeView.tsx` with this content**

```tsx
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/slug';
import { probeOccupancy } from '@/lib/occupancy';
import { markAutojoin } from '@/lib/autojoin';
import { getDisplayName, saveDisplayName } from '@/hooks/usePlayerId';

function navigateToRoom(slug: string) {
  window.location.assign(`${window.location.pathname}?room=${slug}`);
}

export default function HomeView() {
  const [name, setName] = useState('');
  const [playerName, setPlayerName] = useState(() => getDisplayName());
  const [probing, setProbing] = useState(false);
  const [occupied, setOccupied] = useState<{ slug: string; playerCount: number } | null>(null);

  const slug = slugify(name);
  const hasPlayerName = playerName.trim().length > 0;
  const canCreate = slug.length > 0 && hasPlayerName && !probing;
  const canQuick = hasPlayerName;

  // Save the name and mark a one-shot auto-join intent, then navigate — RoomView
  // consumes the intent and drops the player straight onto the board.
  const enterRoom = (target: string) => {
    saveDisplayName(playerName.trim());
    markAutojoin();
    navigateToRoom(target);
  };

  const handleCreate = async () => {
    if (!canCreate) return;
    setProbing(true);
    setOccupied(null);
    const result = await probeOccupancy(slug);
    setProbing(false);
    if (result.occupied) {
      setOccupied({ slug, playerCount: result.playerCount });
      return;
    }
    enterRoom(slug);
  };

  const handleQuick = () => {
    if (!canQuick) return;
    enterRoom(nanoid(8));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 felt-surface">
      <div className="bg-card rounded-xl p-8 w-full max-w-[480px] border border-border elev-2">
        <h1 className="text-[1.75rem] font-semibold leading-[1.2] mb-6">Virtual Deck</h1>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-1">Your name</p>
          <Input
            value={playerName}
            onChange={e => setPlayerName(e.target.value.slice(0, 20))}
            placeholder="Your name"
            maxLength={20}
            data-testid="player-name-input"
          />
        </div>

        <div className="mb-2">
          <p className="text-sm text-muted-foreground mb-1">Table name</p>
          <Input
            value={name}
            onChange={e => { setName(e.target.value.slice(0, 40)); setOccupied(null); }}
            placeholder="e.g. Friday Poker Night"
            maxLength={40}
            onKeyDown={e => { if (e.key === 'Enter' && canCreate) handleCreate(); }}
            data-testid="table-name-input"
          />
          <p className="text-sm text-muted-foreground mt-1 min-h-[1.25rem]">
            {slug ? <>Shareable as <span className="text-primary font-medium">{slug}</span></> : ' '}
          </p>
        </div>

        {occupied && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 p-3" data-testid="occupied-warning">
            <p className="text-sm mb-2">
              Table <span className="text-primary font-medium">{occupied.slug}</span> already has{' '}
              {occupied.playerCount} player{occupied.playerCount === 1 ? '' : 's'}.
            </p>
            <Button
              variant="outline"
              className="min-h-[44px] mr-2"
              onClick={() => enterRoom(occupied.slug)}
              data-testid="join-occupied"
            >
              Join them
            </Button>
            <span className="text-sm text-muted-foreground">or pick another name</span>
          </div>
        )}

        <Button
          className="w-full min-h-[44px] mb-3"
          disabled={!canCreate}
          onClick={handleCreate}
          data-testid="create-table"
        >
          {probing ? (<><Loader2 className="mr-2 size-4 animate-spin" />Checking…</>) : 'Create table'}
        </Button>

        <Button
          variant="outline"
          className="w-full min-h-[44px]"
          disabled={!canQuick}
          onClick={handleQuick}
          data-testid="quick-table"
        >
          Quick table
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + full unit suite**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all unit tests pass (Task 1's `autojoin` tests included).

- [ ] **Step 3: Commit**

```bash
git add src/components/HomeView.tsx
git commit -m "feat: HomeView 'Your name' field + auto-join intent on entry (phase 1001)"
```

---

### Task 3: RoomView — consume intent and auto-join

No unit test (no jsdom). Verified by `npm run typecheck` here and the Playwright suite (Task 4).

**Files:**
- Modify: `src/App.tsx` (`RoomView`: add an import and a run-once effect)

**Interfaces:**
- Consumes: `consumeAutojoin` (Task 1); existing `getDisplayName`, `handleJoin`.
- Produces: no new exports — `RoomView` now auto-joins onto the board when the intent flag is present.

- [ ] **Step 1: Add imports**

In `src/App.tsx`, change the `usePlayerId` import (currently `import { getOrCreatePlayerId, saveDisplayName } from './hooks/usePlayerId';`) to also pull in `getDisplayName`:

```tsx
import { getOrCreatePlayerId, saveDisplayName, getDisplayName } from './hooks/usePlayerId';
```

And add, alongside the other imports:

```tsx
import { consumeAutojoin } from './lib/autojoin';
```

- [ ] **Step 2: Add the run-once auto-join effect**

In `RoomView`, immediately after the `handleJoin` definition (before the existing celebration `useEffect`), add:

```tsx
  // One-shot auto-join: if we arrived from HomeView's create/quick action, skip
  // the lobby and join straight onto the board with the saved name. A direct URL
  // visit or refresh has no intent flag and falls through to the lobby.
  useEffect(() => {
    if (!consumeAutojoin()) return;
    const savedName = getDisplayName();
    if (savedName) handleJoin(savedName);
    // run once on mount; consumeAutojoin is one-shot so re-runs are no-ops anyway
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

(`useEffect` is already imported in `App.tsx`. Place this effect before any early `return` in `RoomView` — both effects must run unconditionally.)

- [ ] **Step 3: Typecheck + full unit suite**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: RoomView consumes auto-join intent, skips lobby for creators (phase 1001)"
```

---

### Task 4: Update Playwright e2e for the new flow

**Files:**
- Modify: `playwright/tableNames.spec.ts` (replace its contents with the new flow)

**Interfaces:**
- Consumes: HomeView testids incl. the new `player-name-input`; the lobby DOM (`Your name` placeholder, `Join Game` button, `hand-zone`).
- Produces: nothing.

**Note:** Create now lands on the board (`hand-zone`), not the lobby, so the assertions change. Two independent `BrowserContext`s for the multiplayer test (project convention). Use per-run-unique room names so repeated local runs stay idempotent (avoids the accumulated-PartyKit-room-load cap noted in CLAUDE.md). Both dev servers auto-start via Playwright's `webServer` config; baseURL is `http://localhost:5173/virtual-deck/`.

- [ ] **Step 1: Replace `playwright/tableNames.spec.ts` with this content**

```ts
import { test, expect } from '@playwright/test';

test.describe('custom table names', () => {
  test('creating a named table goes straight to the board', async ({ page }) => {
    const suffix = Math.random().toString(36).slice(2, 6); // lowercase alnum, slug-safe
    await page.goto('/');
    await page.getByTestId('player-name-input').fill('Alice');
    await page.getByTestId('table-name-input').fill('Friday Poker ' + suffix);
    await page.getByTestId('create-table').click();
    await expect(page).toHaveURL(new RegExp('\\?room=friday-poker-' + suffix));
    await expect(page.getByTestId('hand-zone')).toBeVisible();
  });

  test('quick table goes straight to the board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('player-name-input').fill('Bob');
    await page.getByTestId('quick-table').click();
    await expect(page).toHaveURL(/\?room=[A-Za-z0-9_-]{8}/);
    await expect(page.getByTestId('hand-zone')).toBeVisible();
  });

  test('quick table is disabled until a name is entered', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('quick-table')).toBeDisabled();
    await page.getByTestId('player-name-input').fill('Cara');
    await expect(page.getByTestId('quick-table')).toBeEnabled();
  });

  test('warns when the name is occupied, then joins onto the board', async ({ browser }) => {
    const room = `poker-${Math.random().toString(36).slice(2, 8)}`;

    // Context A arrives via a shared URL and joins through the lobby.
    const ctxA = await browser.newContext();
    const a = await ctxA.newPage();
    await a.goto('/?room=' + room);
    await a.getByPlaceholder('Your name').fill('Alice');
    await a.getByRole('button', { name: 'Join Game' }).click();
    await expect(a.getByTestId('hand-zone')).toBeVisible();
    await a.waitForTimeout(250); // let A's live connection register before B probes

    // Context B from the landing screen tries the same name and is warned.
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await b.goto('/');
    await b.getByTestId('player-name-input').fill('Bob');
    await b.getByTestId('table-name-input').fill(room);
    await b.getByTestId('create-table').click();
    await expect(b.getByTestId('occupied-warning')).toBeVisible();
    await expect(b.getByTestId('occupied-warning')).toContainText(room);

    // Joining from the warning lands B straight on the board of that room.
    await b.getByTestId('join-occupied').click();
    await expect(b).toHaveURL(new RegExp('\\?room=' + room));
    await expect(b.getByTestId('hand-zone')).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
```

- [ ] **Step 2: Run the e2e spec (twice, to confirm idempotency)**

Ensure no stale servers, then:
`npx playwright test tableNames.spec.ts`
Expected: 4 passed. Run it a second consecutive time and confirm 4 passed again (proves the unique-room-name idempotency holds; if you suspect accumulated local state from prior debugging, `.partykit/state` is gitignored and safe to clear).

- [ ] **Step 3: Commit**

```bash
git add playwright/tableNames.spec.ts
git commit -m "test: e2e for HomeView name + skip-lobby flow (phase 1001)"
```

---

### Task 5: Backlog item — lobby redesign

**Files:**
- Modify: `docs/superpowers/specs/BACKLOG.md` (append one table row)

**Interfaces:** none.

- [ ] **Step 1: Append the backlog row**

In `docs/superpowers/specs/BACKLOG.md`, add this row to the end of the table (after the `1000` row):

```markdown
| 1002 | Lobby redesign for the join-by-URL focus — table creators now skip the lobby, so it is only seen by people arriving via a shared `?room=` URL. De-emphasize the table name/code and the copy-link button; prioritize the "Your name" field and the Join control. |
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/BACKLOG.md
git commit -m "docs: backlog item for join-focused lobby redesign (1002)"
```

---

## Self-Review

**Spec coverage:**
- One-shot `sessionStorage` intent (`vd:autojoin`, consumed once) → Task 1. ✓
- Required "Your name" on HomeView; Create gated on slug+name, Quick on name; prefilled; 20-char cap → Task 2. ✓
- `enterRoom` sets name + intent on all three nav paths (create-free, quick, join-occupied) → Task 2. ✓
- RoomView consumes intent once on mount, auto-joins via `handleJoin`, guards on empty name, else lobby → Task 3. ✓
- LobbyPanel unchanged → not touched by any task. ✓
- e2e: create→board, quick→board, occupied→join→board; URL-arrival still lobby; unique rooms → Task 4. ✓
- Backlog lobby-redesign item → Task 5. ✓
- Sound-preload-without-gesture caveat: accepted in spec, no code action — correctly no task. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full content. ✓

**Type consistency:** `markAutojoin(): void` / `consumeAutojoin(): boolean` defined in Task 1 are used with those exact signatures in Tasks 2 and 3. `enterRoom(target: string)` internal to Task 2. `getDisplayName`/`saveDisplayName` signatures match `usePlayerId`. ✓
