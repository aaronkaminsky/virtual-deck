# Custom Table Names — Design (Phase 1001)

**Status:** Approved (brainstorming)
**Date:** 2026-06-20
**Branch:** `feat/custom-table-names`

## Problem

Rooms are identified by a random `nanoid(8)` slug (`?room=Xa7bQ2k9`). These are
impossible to share verbally — "join my table, that's question-mark-room-equals-capital-X-a-7..."
The goal: let a player replace the random slug with a memorable, self-chosen label
so a table can be shared by saying "go to table *friday-poker*."

## Core decision

**The table name *is* the room slug.** Typing "Friday Poker Night" sends you to
`?room=friday-poker-night`. PartyKit derives the room from the URL, so a custom
slug needs **no new persistent state** — no separate display-name field on
`GameState`, no new action, no sync. The room id is the name.

This keeps the data model untouched (`Type extension > parallel collections` is
moot — we add nothing) and reuses every existing handler and `viewFor` path.

## Decisions locked during brainstorming

1. **Entry flow** — Landing screen with a name field **plus** a "Quick table"
   button (random slug) to preserve today's zero-friction path.
2. **Collision** — Warn before entering if a table with that name is already
   occupied; let the user join it or pick another name.
3. **Slug format** — Slugify: lowercase, spaces/underscores → dashes, strip other
   punctuation, collapse repeats, cap length. Case-insensitive: "Poker" and
   "poker" are the same table.

## Components

### 1. `slugify(input: string): string` — `src/lib/slug.ts` (new, pure)

Transform a typed name into a URL-safe room slug:

- lowercase
- trim
- spaces and underscores → `-`
- strip every character not in `[a-z0-9-]`
- collapse runs of `-` into a single `-`
- trim leading/trailing `-`
- cap at **24** characters (after the above; re-trim trailing `-` if the cap
  lands on one)

Returns `''` when the input is empty or contains no usable characters (e.g. only
emoji/punctuation). Callers treat `''` as invalid → the Create button is disabled.

Pure and exhaustively unit-tested.

### 2. Landing screen — `src/components/HomeView.tsx` (new)

`App.tsx` renders this when `?room=` is **absent** (replacing today's
auto-generate-nanoid-and-redirect effect).

- **Name input** with a live slug preview: typing shows `→ friday-poker-night`.
- **Create table** button (disabled when the slug is empty):
  1. compute `slug = slugify(input)`
  2. `probeOccupancy(slug)` (see §3)
  3. if occupied → inline warning: *"Table 'friday-poker' already has N
     player(s)."* with two actions: **Join them** (navigate to `?room=<slug>`) and
     **Pick another name** (dismiss, keep editing).
  4. if free → navigate to `?room=<slug>`.
- **Quick table** button: `nanoid(8)` → navigate immediately, **no probe** (a
  random slug effectively never collides; skipping the probe keeps the fast path
  fast and avoids a needless DO instantiation).

Navigation uses the same `window.location` redirect pattern `App.tsx` uses today,
preserving `BASE_URL`.

### 3. Occupancy probe

**Server — `onRequest(req)` in `party/index.ts`:**

- **GET-only, read-only.** Reject any non-GET method with `405`. The handler
  **must not** call `persist()` or mutate `gameState` — it only reads live
  connection state. This keeps the HTTP surface from becoming an unauthenticated
  mutation/DoS vector beside the WebSocket path.
- Response body: `{ occupied: boolean, playerCount: number }`. **Player display
  names are deliberately omitted** (see Security §).
- `playerCount` = number of **live** connections (`[...this.room.getConnections()].length`).
  Historical/abandoned rooms (everyone disconnected) read as free, which is the
  desired collision behavior — you cleanly reuse a dead slug.
- **CORS:** `Access-Control-Allow-Origin` scoped to known origins (the GitHub
  Pages production origin and `localhost` in dev), not `*`. Handle the `OPTIONS`
  preflight. (Hygiene only — CORS is browser-scoped and is **not** an auth
  control; see Security §.)

**Client — `probeOccupancy(slug): Promise<{ occupied: boolean; playerCount: number }>`
in `src/lib/occupancy.ts`:**

- `fetch(`${proto}://${PARTYKIT_HOST}/parties/main/${slug}`)`, protocol `http` in
  dev / `https` in prod (mirror `import.meta.env.DEV`, matching `usePartySocket`).
- On any network/parse error, **fail open**: resolve `{ occupied: false }` so a
  flaky probe never blocks table creation. (The probe is advisory; see TOCTOU
  below.)

**Shared host constant — `src/lib/partyHost.ts` (new):**

Extract the `PARTYKIT_HOST` constant (currently inline in `usePartySocket.ts`) so
the hook and the probe share one source of truth. `usePartySocket` imports it.

### 4. Lobby relabel — `src/components/LobbyPanel.tsx`

- Change the "Room code" label to **"Table"**; the slug now reads as the table's
  name. Copy-link behavior is unchanged.
- Set `document.title` to the slug (e.g. `friday-poker · Virtual Deck`) so the
  browser tab and bookmarks are readable. Reset on unmount is not required (SPA
  navigation replaces the whole document on room change).

## Flow

```
/                         → HomeView
  ├─ named + Create       → probe → (free) navigate ?room=<slug>
  │                                 (occupied) warn → Join / rename
  └─ Quick table          → navigate ?room=<nanoid(8)>
?room=<slug>              → LobbyPanel (enter player name, Join)
                         → Board
```

Sharing the URL or just saying "go to table *<slug>*" both work.

## Security

This feature changes the threat model and the spec records that explicitly.

**The app has no table access control. The slug is the only secret.** This is
true today with random slugs: anyone who knows (or guesses) a slug can open
`?room=<slug>`, land in the lobby, and receive a `STATE_UPDATE` containing the
full player roster (display names) and public board state. Private hands stay
masked per-connection via `viewFor`, so a guesser never sees anyone's cards.

**Custom memorable slugs weaken the only protection — slug unguessability — by
design.** Memorable means guessable (dictionaries of common words: "poker",
"blackjack", "friday-night"). This is a property of the *feature*, not of the
probe; it exists even if we never build the probe.

**The occupancy probe is an enumeration oracle, but not a new disclosure
boundary.** Because the WebSocket join path *already* reveals existence + roster
to anyone who guesses a slug, the probe adds no information you couldn't get by
joining. Its only marginal cost is making enumeration *cheaper* (a plain GET, no
WebSocket handshake, reachable cross-origin from a browser).

**Decisions:**

- **Drop player names from the probe payload** (return only `{ occupied,
  playerCount }`). This is *defense-in-depth*, not a fix: it keeps the cheap,
  no-auth, cross-origin GET low-value so an attacker must do the heavier
  WebSocket join to harvest names. It does **not** remove enumeration — the
  `occupied` boolean is itself the oracle, and the feature can't warn about
  collisions without it.
- **Scope CORS to known origins** as hygiene. Note plainly: CORS is browser-only
  and trivially bypassed by `curl`; it is not a security boundary.
- **GET-only / read-only handler** so the probe can't mutate state or create
  storage entries.
- **Accept enumeration of memorable tables as an inherent, documented risk.** The
  data exposed (existence, headcount, chosen display names, public board state)
  is low-severity for a casual 2–4 player card game with no real PII and no
  private-hand leakage. The only true mitigations live at the table-access layer
  (random slug + friendly alias, or a per-table PIN), both deliberately scoped
  out as overkill for this app.

**DO-instantiation cost (minor):** each probe to a *new* slug spins up a Durable
Object (runs `onStart`). Hammering random slugs burns PartyKit free-tier request
quota. This is inherent to PartyKit's model (connecting already does it) and is
**noted, not mitigated**.

**TOCTOU (not a security issue):** two groups probing the same name at the same
instant both see "free" and collide anyway. The warning is best-effort advisory,
not a lock. Acceptable; out of scope.

## Out of scope (YAGNI)

- Separate display-name state distinct from the slug.
- Reserved-name lists.
- Renaming a live table (would orphan everyone else's URL).
- A board-header table-name banner.
- Any table-access control (PIN, alias-to-random-slug).

## Testing

**Vitest (unit):**

- `slugify` — exhaustive edge cases: spaces, mixed case, punctuation, emoji-only
  (→ `''`), leading/trailing/collapsed dashes, length cap landing on a dash,
  underscores.
- Occupancy count logic — extract the connection-counting into a small testable
  helper so the `{ occupied, playerCount }` shape is asserted without a live DO.
- `probeOccupancy` fail-open on fetch rejection.

**Playwright (e2e):**

- Create-named-table: from `/`, type a name → Create → land in the lobby whose
  room code reads the expected slug.
- Quick-table: from `/`, click Quick table → land in a lobby with a non-empty
  slug.
- Occupied-warning: context A occupies "poker" (joins the room); context B from
  `/` types "poker" → Create → sees the occupied warning with a Join action.
  (Two `BrowserContext`s per the project convention.)
```
