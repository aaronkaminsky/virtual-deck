# Custom Table Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a player replace the random room slug with a memorable, self-chosen name that *is* the URL slug (`?room=friday-poker`), with a landing screen and an occupancy warning before joining an in-use name.

**Architecture:** The table name is the room slug — no new server state. A pure `slugify` turns typed input into a URL-safe slug. A new `HomeView` landing screen (shown when `?room=` is absent) lets the user create a named table (after an occupancy probe) or grab a random "Quick table". A GET-only, read-only `onRequest` handler on the PartyKit server reports live-connection occupancy as `{ occupied, playerCount }` — names deliberately omitted.

**Tech Stack:** React 18 + TypeScript + Vite (client), PartyKit/partysocket (server), Vitest (unit, no jsdom — logic tested as plain functions), Playwright (e2e). nanoid for random slugs.

## Global Constraints

- **Vitest includes only `tests/**/*.test.ts`; there is NO jsdom.** Unit tests verify pure functions only — never mount React. UI is verified by Playwright + typecheck.
- **Slug max length: 24 chars.** Slug charset: `[a-z0-9-]`, lowercased, case-insensitive.
- **Occupancy probe payload is `{ occupied: boolean, playerCount: number }` only — NO player names** (security: defense-in-depth, see spec).
- **`onRequest` is GET-only and read-only** — must never call `persist()` or mutate `gameState`.
- **Probe fails open** — any fetch/parse error resolves `{ occupied: false, playerCount: 0 }` so a flaky probe never blocks table creation.
- **CORS allowlist:** `http://localhost:5173` (dev) and `https://aaronkaminsky.github.io` (prod). CORS is hygiene only, not an auth boundary.
- Pre-commit hook runs `npm test` + `npm run typecheck`; both must pass before each commit.
- Spec: `docs/superpowers/specs/2026-06-20-custom-table-names-design.md`.

---

### Task 1: `slugify` pure function

**Files:**
- Create: `src/lib/slug.ts`
- Test: `tests/slug.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `slugify(input: string): string` — lowercased, `[a-z0-9-]`, max 24 chars, `''` when no usable chars.

- [ ] **Step 1: Write the failing test**

```ts
// tests/slug.test.ts
import { describe, it, expect } from 'vitest';
import { slugify } from '../src/lib/slug';

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Friday Poker Night')).toBe('friday-poker-night');
  });
  it('is case-insensitive', () => {
    expect(slugify('Poker')).toBe('poker');
    expect(slugify('POKER')).toBe('poker');
  });
  it('trims surrounding whitespace', () => {
    expect(slugify('  hello  ')).toBe('hello');
  });
  it('treats underscores as separators', () => {
    expect(slugify('a_b c')).toBe('a-b-c');
  });
  it('strips punctuation and accents without transliterating', () => {
    expect(slugify('café ☕')).toBe('caf');
  });
  it('returns empty string for all-unusable input', () => {
    expect(slugify('🎉🎉')).toBe('');
    expect(slugify('---')).toBe('');
    expect(slugify('   ')).toBe('');
  });
  it('collapses repeated dashes and trims edge dashes', () => {
    expect(slugify('a---b')).toBe('a-b');
    expect(slugify('-lead-trail-')).toBe('lead-trail');
  });
  it('caps length at 24 chars and re-trims a trailing dash from the cut', () => {
    const long = 'a'.repeat(23) + '-bbb'; // 23 a's, dash at index 23
    const out = slugify(long);
    expect(out).toBe('a'.repeat(23));
    expect(out.length).toBe(23);
    expect(out.endsWith('-')).toBe(false);
  });
  it('caps a long single word at 24 chars', () => {
    expect(slugify('a'.repeat(30))).toBe('a'.repeat(24));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/slug.test.ts`
Expected: FAIL — cannot resolve `../src/lib/slug`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/slug.ts
const MAX_SLUG_LENGTH = 24;

export function slugify(input: string): string {
  let s = input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-')    // spaces & underscores -> dash
    .replace(/[^a-z0-9-]/g, '') // strip everything else
    .replace(/-+/g, '-')        // collapse repeated dashes
    .replace(/^-+|-+$/g, '');   // trim leading/trailing dashes
  if (s.length > MAX_SLUG_LENGTH) {
    s = s.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
  }
  return s;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/slug.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/slug.ts tests/slug.test.ts
git commit -m "feat: slugify for custom table names (phase 1001)"
```

---

### Task 2: Server occupancy helpers + `onRequest`

**Files:**
- Modify: `party/index.ts` (add two exported pure helpers near the top; add `onRequest` method on `GameRoom`)
- Test: `tests/occupancyServer.test.ts`

**Interfaces:**
- Consumes: `Party` types (already imported), `this.room.getConnections()`.
- Produces:
  - `occupancyBody(connectionCount: number): { occupied: boolean; playerCount: number }`
  - `corsHeaders(origin: string | null): Record<string, string>`
  - `GameRoom.onRequest(req: Party.Request): Promise<Response>` (GET-only, read-only)

- [ ] **Step 1: Write the failing test**

```ts
// tests/occupancyServer.test.ts
import { describe, it, expect } from 'vitest';
import { occupancyBody, corsHeaders } from '../party/index';

describe('occupancyBody', () => {
  it('reports free when no live connections', () => {
    expect(occupancyBody(0)).toEqual({ occupied: false, playerCount: 0 });
  });
  it('reports occupied with the live connection count', () => {
    expect(occupancyBody(3)).toEqual({ occupied: true, playerCount: 3 });
  });
});

describe('corsHeaders', () => {
  it('reflects an allowlisted origin', () => {
    expect(corsHeaders('http://localhost:5173')['Access-Control-Allow-Origin'])
      .toBe('http://localhost:5173');
    expect(corsHeaders('https://aaronkaminsky.github.io')['Access-Control-Allow-Origin'])
      .toBe('https://aaronkaminsky.github.io');
  });
  it('falls back to the prod origin for unknown or null origins', () => {
    expect(corsHeaders('https://evil.example')['Access-Control-Allow-Origin'])
      .toBe('https://aaronkaminsky.github.io');
    expect(corsHeaders(null)['Access-Control-Allow-Origin'])
      .toBe('https://aaronkaminsky.github.io');
  });
  it('only advertises GET and OPTIONS', () => {
    expect(corsHeaders(null)['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/occupancyServer.test.ts`
Expected: FAIL — `occupancyBody`/`corsHeaders` not exported.

- [ ] **Step 3: Add the pure helpers**

Add near the top of `party/index.ts`, after the imports (before `buildDeck`):

```ts
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://aaronkaminsky.github.io",
];
const PROD_ORIGIN = "https://aaronkaminsky.github.io";

export function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : PROD_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary": "Origin",
  };
}

export function occupancyBody(connectionCount: number): { occupied: boolean; playerCount: number } {
  return { occupied: connectionCount > 0, playerCount: connectionCount };
}
```

- [ ] **Step 4: Add the `onRequest` method**

Add this method to the `GameRoom` class (e.g. immediately after `onStart`). It is GET-only and reads only live connections — it must NOT call `this.persist()` or mutate `this.gameState`:

```ts
  async onRequest(req: Party.Request): Promise<Response> {
    const origin = req.headers.get("Origin");
    const headers = { ...corsHeaders(origin), "Content-Type": "application/json" };
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
    }
    const count = [...this.room.getConnections()].length;
    return new Response(JSON.stringify(occupancyBody(count)), { status: 200, headers });
  }
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run tests/occupancyServer.test.ts && npm run typecheck`
Expected: PASS; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add party/index.ts tests/occupancyServer.test.ts
git commit -m "feat: GET-only occupancy probe endpoint on PartyKit server (phase 1001)"
```

---

### Task 3: Shared host constant + client `probeOccupancy`

**Files:**
- Create: `src/lib/partyHost.ts`
- Modify: `src/hooks/usePartySocket.ts:6-7` (replace inline `PARTYKIT_HOST` with an import)
- Create: `src/lib/occupancy.ts`
- Test: `tests/occupancyProbe.test.ts`

**Interfaces:**
- Consumes: `PARTYKIT_HOST` from `src/lib/partyHost.ts`; `occupancyBody` shape from Task 2.
- Produces:
  - `PARTYKIT_HOST: string` (`src/lib/partyHost.ts`)
  - `interface Occupancy { occupied: boolean; playerCount: number }`
  - `probeOccupancy(slug: string): Promise<Occupancy>` (`src/lib/occupancy.ts`, fails open)

- [ ] **Step 1: Write the failing test**

```ts
// tests/occupancyProbe.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { probeOccupancy } from '../src/lib/occupancy';

afterEach(() => vi.unstubAllGlobals());

describe('probeOccupancy', () => {
  it('returns parsed occupancy on a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, json: async () => ({ occupied: true, playerCount: 2 }),
    })));
    expect(await probeOccupancy('poker')).toEqual({ occupied: true, playerCount: 2 });
  });
  it('fails open on a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network down'); }));
    expect(await probeOccupancy('poker')).toEqual({ occupied: false, playerCount: 0 });
  });
  it('fails open on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    expect(await probeOccupancy('poker')).toEqual({ occupied: false, playerCount: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/occupancyProbe.test.ts`
Expected: FAIL — cannot resolve `../src/lib/occupancy`.

- [ ] **Step 3: Extract the shared host constant**

```ts
// src/lib/partyHost.ts
export const PARTYKIT_HOST: string =
  import.meta.env.VITE_PARTYKIT_HOST ??
  (import.meta.env.DEV ? 'localhost:1999' : 'virtual-deck.aaronkaminsky.partykit.dev');
```

In `src/hooks/usePartySocket.ts`, delete the inline constant (currently lines 6-7):

```ts
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST
  ?? (import.meta.env.DEV ? 'localhost:1999' : 'virtual-deck.aaronkaminsky.partykit.dev');
```

and replace it with an import alongside the other imports at the top of the file:

```ts
import { PARTYKIT_HOST } from '../lib/partyHost';
```

- [ ] **Step 4: Write `probeOccupancy`**

```ts
// src/lib/occupancy.ts
import { PARTYKIT_HOST } from './partyHost';

export interface Occupancy {
  occupied: boolean;
  playerCount: number;
}

const FREE: Occupancy = { occupied: false, playerCount: 0 };

export async function probeOccupancy(slug: string): Promise<Occupancy> {
  const proto = import.meta.env.DEV ? 'http' : 'https';
  try {
    const res = await fetch(`${proto}://${PARTYKIT_HOST}/parties/main/${slug}`);
    if (!res.ok) return FREE;
    const data = (await res.json()) as Partial<Occupancy>;
    return { occupied: !!data.occupied, playerCount: data.playerCount ?? 0 };
  } catch {
    return FREE; // fail open — a flaky probe must never block table creation
  }
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run tests/occupancyProbe.test.ts && npm run typecheck`
Expected: PASS; typecheck clean (confirms the `usePartySocket` refactor still compiles).

- [ ] **Step 6: Commit**

```bash
git add src/lib/partyHost.ts src/lib/occupancy.ts src/hooks/usePartySocket.ts tests/occupancyProbe.test.ts
git commit -m "feat: client occupancy probe + shared PARTYKIT_HOST (phase 1001)"
```

---

### Task 4: `HomeView` landing screen + `App.tsx` wiring

No unit test (no jsdom in this project). Verified by `npm run typecheck` here and by the Playwright suite in Task 6.

**Files:**
- Create: `src/components/HomeView.tsx`
- Modify: `src/App.tsx` (render `HomeView` when `?room=` is absent; remove the auto-redirect effect)

**Interfaces:**
- Consumes: `slugify` (Task 1), `probeOccupancy` (Task 3), `nanoid`, `Button`/`Input` from `@/components/ui/*`, `Loader2` from `lucide-react`.
- Produces: default-exported `HomeView` component; `App` that gates on `?room=`.

- [ ] **Step 1: Create `HomeView`**

```tsx
// src/components/HomeView.tsx
import { useState } from 'react';
import { nanoid } from 'nanoid';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/slug';
import { probeOccupancy } from '@/lib/occupancy';

function navigateToRoom(slug: string) {
  window.location.assign(`${window.location.pathname}?room=${slug}`);
}

export default function HomeView() {
  const [name, setName] = useState('');
  const [probing, setProbing] = useState(false);
  const [occupied, setOccupied] = useState<{ slug: string; playerCount: number } | null>(null);

  const slug = slugify(name);
  const canCreate = slug.length > 0 && !probing;

  const handleCreate = async () => {
    if (!slug || probing) return;
    setProbing(true);
    setOccupied(null);
    const result = await probeOccupancy(slug);
    setProbing(false);
    if (result.occupied) {
      setOccupied({ slug, playerCount: result.playerCount });
      return;
    }
    navigateToRoom(slug);
  };

  const handleQuick = () => navigateToRoom(nanoid(8));

  return (
    <div className="min-h-screen flex items-center justify-center p-4 felt-surface">
      <div className="bg-card rounded-xl p-8 w-full max-w-[480px] border border-border elev-2">
        <h1 className="text-[1.75rem] font-semibold leading-[1.2] mb-6">Virtual Deck</h1>

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
            {slug ? <>Shareable as <span className="text-primary font-medium">{slug}</span></> : ' '}
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
              onClick={() => navigateToRoom(occupied.slug)}
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

- [ ] **Step 2: Wire `App.tsx` to render `HomeView` when no room**

In `src/App.tsx`: remove the `nanoid` import (no longer used here) and add `import HomeView from './components/HomeView';`. Replace the `App` function (currently lines 71-85, including the `useEffect` auto-redirect) with:

```tsx
export default function App() {
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room');
  if (!roomId) return <HomeView />;
  return <RoomView roomId={roomId} />;
}
```

Leave `RoomView` and its `useEffect` (the celebration hotkey) untouched. Confirm the top-of-file `import { useEffect, useState } from 'react';` stays — `useEffect` is still used by `RoomView`.

- [ ] **Step 3: Typecheck + full unit suite**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all unit tests pass (no regressions from the `App`/`nanoid` change).

- [ ] **Step 4: Commit**

```bash
git add src/components/HomeView.tsx src/App.tsx
git commit -m "feat: HomeView landing screen with named + quick tables (phase 1001)"
```

---

### Task 5: Lobby relabel + browser tab title

**Files:**
- Modify: `src/components/LobbyPanel.tsx` (relabel "Room code" → "Table"; set `document.title` to the slug)

**Interfaces:**
- Consumes: existing `roomId` prop.
- Produces: no new exports.

- [ ] **Step 1: Set the document title**

In `src/components/LobbyPanel.tsx`, change the React import (currently `import { useState } from 'react';`) to:

```tsx
import { useState, useEffect } from 'react';
```

Inside the `LobbyPanel` component body, after the `useState` hooks, add:

```tsx
  useEffect(() => {
    document.title = `${roomId} · Virtual Deck`;
  }, [roomId]);
```

- [ ] **Step 2: Relabel "Room code" → "Table"**

Change the label line (currently `<p className="text-sm text-muted-foreground mb-1">Room code</p>`) to:

```tsx
        <p className="text-sm text-muted-foreground mb-1">Table</p>
```

- [ ] **Step 3: Typecheck + unit suite**

Run: `npm run typecheck && npm test`
Expected: typecheck clean; all unit tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/LobbyPanel.tsx
git commit -m "feat: lobby reads 'Table' + sets tab title to slug (phase 1001)"
```

---

### Task 6: Playwright e2e — landing flow + occupancy warning

**Files:**
- Create: `playwright/tableNames.spec.ts`

**Interfaces:**
- Consumes: the `data-testid`s from Task 4 (`table-name-input`, `create-table`, `quick-table`, `occupied-warning`, `join-occupied`); the existing lobby DOM (`Your name` placeholder, `Join Game` button, `hand-zone`).
- Produces: nothing.

**Note:** Two independent `BrowserContext`s are required for the occupancy test (project convention — two pages in one context share the player token). Start both dev servers first (`npm run dev` + `npm run dev:client`) or rely on Playwright's `webServer` config to launch them.

- [ ] **Step 1: Write the spec**

```ts
// playwright/tableNames.spec.ts
import { test, expect } from '@playwright/test';

test.describe('custom table names', () => {
  test('create a named table lands in its lobby with the slug', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('table-name-input').fill('Friday Poker Night');
    await page.getByTestId('create-table').click();
    await expect(page).toHaveURL(/\?room=friday-poker-night/);
    // Lobby for that room renders the slug as the table label.
    await expect(page.getByText('friday-poker-night')).toBeVisible();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('quick table generates a random room and opens its lobby', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('quick-table').click();
    await expect(page).toHaveURL(/\?room=[A-Za-z0-9_-]{8}/);
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('warns when the chosen name is already occupied', async ({ browser }) => {
    // Context A occupies "poker" by joining the room.
    const ctxA = await browser.newContext();
    const a = await ctxA.newPage();
    await a.goto('/?room=poker');
    await a.getByPlaceholder('Your name').fill('Alice');
    await a.getByRole('button', { name: 'Join Game' }).click();
    await expect(a.getByTestId('hand-zone')).toBeVisible();

    // Context B tries to create "poker" from the landing screen and is warned.
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await b.goto('/');
    await b.getByTestId('table-name-input').fill('poker');
    await b.getByTestId('create-table').click();

    await expect(b.getByTestId('occupied-warning')).toBeVisible();
    await expect(b.getByTestId('occupied-warning')).toContainText('poker');

    // Joining from the warning navigates into the occupied room's lobby.
    await b.getByTestId('join-occupied').click();
    await expect(b).toHaveURL(/\?room=poker/);
    await expect(b.getByPlaceholder('Your name')).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
```

- [ ] **Step 2: Run the e2e spec**

Ensure both dev servers are up (ports 5173 + 1999), then run:
`npx playwright test tableNames.spec.ts`
Expected: 3 passed.

> If the "occupied" test is flaky under accumulated room load, give Context A a moment to register its connection before B probes (the probe counts live connections); a short `await a.waitForTimeout(250)` after the hand-zone assertion is an acceptable stabilizer, consistent with the project's noted e2e flakiness under PartyKit room load.

- [ ] **Step 3: Commit**

```bash
git add playwright/tableNames.spec.ts
git commit -m "test: e2e for custom table names landing + occupancy warning (phase 1001)"
```

---

## Self-Review

**Spec coverage:**
- slugify (charset, case, length cap) → Task 1. ✓
- Landing screen w/ name + Quick table → Task 4. ✓
- Occupancy probe (server GET-only/read-only, names omitted, CORS allowlist) → Task 2. ✓
- Client probe + fail-open + shared host → Task 3. ✓
- Collision warning UX (warn / join / rename) → Task 4 (`occupied-warning`, `join-occupied`) + Task 6 e2e. ✓
- Lobby relabel + `document.title` → Task 5. ✓
- e2e: named create, quick, occupied-warning → Task 6. ✓
- Security framing (names dropped, GET-only, CORS, accepted enumeration) → enforced by Tasks 2 (payload/method/CORS) and 3 (no names consumed). ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `Occupancy { occupied, playerCount }` defined in Task 3 matches `occupancyBody`'s return shape in Task 2 and the probe consumption in Task 4. `slugify`/`probeOccupancy`/`PARTYKIT_HOST` signatures consistent across tasks. ✓

**Open item to confirm during verification:** the prod CORS origin `https://aaronkaminsky.github.io` is inferred from the PartyKit subdomain + git user, not pinned in-repo. If wrong, prod probes are CORS-blocked and degrade via fail-open (table creation still works; warning silently disabled). Confirm the actual GitHub Pages origin before/at ship and adjust `ALLOWED_ORIGINS`/`PROD_ORIGIN` if needed.
