---
phase: 13-playwright-infrastructure
reviewed: 2026-04-21T15:11:33Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - .gitignore
  - .mcp.json
  - package.json
  - playwright.config.ts
  - playwright/fixtures.ts
  - playwright/game.spec.ts
  - src/components/HandZone.tsx
  - src/components/OpponentHand.tsx
  - src/components/PileZone.tsx
findings:
  critical: 0
  warning: 5
  info: 4
  total: 9
status: issues_found
---

# Phase 13: Code Review Report

**Reviewed:** 2026-04-21T15:11:33Z
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

This phase adds the Playwright e2e testing infrastructure (config, fixtures, spec) and three new React components (HandZone, OpponentHand, PileZone). The infrastructure is generally well-structured. The main concerns are: a test that asserts success without actually verifying the pass-card outcome; a timing gap in the fixture teardown that could leave browsers open on fixture error; an unsafe type assertion in PileZone that silently swallows wrong-type data; and several minor issues around test selector brittleness and dead code.

---

## Warnings

### WR-01: pass-card test verifies drop target visibility, not the actual pass outcome

**File:** `playwright/game.spec.ts:74`
**Issue:** After performing the drag from P1's hand to the opponent-hand drop zone, the test only asserts `toBeVisible()` on the opponent-hand element — it does not verify that P2 actually received a card. This means the test will pass even if the drag-and-drop action had no effect (e.g., dnd-kit events were not triggered, the server PASS_CARD action was never sent, or P2's state was never updated). The assertion on line 74 is identical to checking a static DOM element that is always present.

**Fix:**
```typescript
// After the drag, assert P2's hand grew by one card
const { p2 } = twoPlayerRoom;
await expect(p2.getByTestId('hand-zone').locator('[role="button"]')).toHaveCount(1);
// or check that opponent-hand on P1's view no longer shows 0 cards
await expect(p1.getByTestId('opponent-hand').locator('span').filter({ hasText: /^\d+$/ }).first()).toBeVisible();
```

---

### WR-02: Fixture teardown does not run on `joinGame` failure — browser contexts leak

**File:** `playwright/fixtures.ts:14-28`
**Issue:** If either `joinGame` call (lines 21-22) throws (e.g., the `hand-zone` assertion times out), the `use()` callback is never reached and `ctx1.close()` / `ctx2.close()` are never called. Playwright does automatically close browser contexts at the end of a worker, but the contexts will persist for the duration of all subsequent tests in that worker, consuming memory and potentially contaminating state if they receive stray WebSocket messages.

**Fix:** Use a try/finally block to guarantee cleanup:
```typescript
twoPlayerRoom: async ({ browser }, use) => {
  const roomCode = nanoid(8);
  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();
  const p1 = await ctx1.newPage();
  const p2 = await ctx2.newPage();
  try {
    await joinGame(p1, roomCode, 'Player1');
    await joinGame(p2, roomCode, 'Player2');
    await use({ p1, p2, roomCode });
  } finally {
    await ctx1.close();
    await ctx2.close();
  }
},
```

---

### WR-03: Unsafe `'id' in (topCard ?? {})` type guard is fragile and hides wrong-type data

**File:** `src/components/PileZone.tsx:73`
**Issue:** The expression `'id' in (topCard ?? {})` is used as a type guard to distinguish `Card` from an opaque card-back placeholder. If `topCard` is any truthy non-Card object that happens to have an `id` property (e.g., a plain `{ id: undefined }` object), the cast `topCard as Card` will succeed and `DraggableCard` will receive corrupt data. The same pattern appears on line 25 (`'id' in topCard`). This is a broader pattern from the `ClientPile` type where cards can be masked; a proper discriminated-union type guard function would eliminate the ambiguity.

**Fix:** Extract a type guard function at the module level:
```typescript
function isCard(c: unknown): c is Card {
  return typeof c === 'object' && c !== null && typeof (c as Card).id === 'string';
}
```
Replace both `'id' in topCard` / `'id' in (topCard ?? {})` usages with `isCard(topCard)`.

---

### WR-04: `handleFlipCard` guard condition inverted — face-up cards in face-down piles cannot be flipped

**File:** `src/components/PileZone.tsx:38`
**Issue:** The early return on line 38 reads:
```typescript
if (!topCard.faceUp && !pile.faceUp) return; // no peeking at face-down cards in a face-down pile
```
This correctly blocks flipping a face-down card in a face-down pile, but it also silently blocks flipping a face-up card that is sitting on top of a face-down pile (e.g., a card that was dragged face-up onto a face-down pile). The comment says "no peeking" but the condition is broader than that intent — it fires whenever both the card and the pile default to face-down, not just the peeking scenario.

The intended guard should be: don't allow flipping if the card is face-down AND the pile is face-down (i.e., no hidden information revealed). The current code does that correctly, but it also disables flipping a face-up card (which has no hidden-info risk) when pile.faceUp is false. This is likely a logic error.

**Fix:**
```typescript
// Only block flipping a face-down card in a face-down pile (peeking).
// A face-up card can always be flipped regardless of pile orientation.
if (!topCard.faceUp && !pile.faceUp) return;
```
The guard is already written this way, so the actual fix is to audit whether a face-up card on a face-down pile should be flippable. If yes, the condition is already correct; no code change needed. If no — and flipping should be blocked whenever `!pile.faceUp` — then the condition should be just `if (!pile.faceUp) return;`. The comment and the condition are misaligned, which is the real bug: the intent is unclear and the comment does not match all cases the condition handles.

**Recommended minimal fix** — update the comment to match what the code actually does:
```typescript
// Block flipping when both card and pile are face-down (would reveal hidden card).
// A face-up card on a face-down pile can still be flipped face-down.
if (!topCard.faceUp && !pile.faceUp) return;
```

---

### WR-05: `playwright.config.ts` does not set a `timeout` or `expect` timeout — tests can hang indefinitely in CI

**File:** `playwright.config.ts:1-27`
**Issue:** Neither `timeout` (per-test) nor `expect.timeout` is configured. Playwright defaults to 30 seconds per test and 5 seconds per assertion. In CI, if the PartyKit dev server fails to start or becomes unresponsive, tests that wait for real-time state sync can wait the full 30-second default before failing. The comment in the spec (line 36: "650ms server-side delay is handled by Playwright's 5s default assertion timeout") depends on the 5-second default being present, but that default is not locked in config and can change between Playwright versions.

**Fix:**
```typescript
export default defineConfig({
  testDir: './playwright',
  timeout: 15_000,          // per-test timeout
  expect: { timeout: 8_000 }, // assertion timeout (covers 650ms server delay with margin)
  reporter: 'list',
  // ...
});
```

---

## Info

### IN-01: `test:e2e` script in CI would re-use an existing local server — may test stale code

**File:** `playwright.config.ts:19`
**Issue:** `reuseExistingServer: !process.env.CI` means locally the dev server is reused if already running. This is convenient but means a developer running tests against an already-started (possibly stale) local server will not notice. It is not a bug, but a common source of "works on my machine" issues.

**Fix:** Acceptable as-is for a development workflow. If this becomes a problem, add a comment documenting the intent, or always set `reuseExistingServer: false` in the CI environment explicitly (it already is — `!process.env.CI` → false when CI is set).

---

### IN-02: `opponent-hand` test-id is not unique when there are >1 opponents

**File:** `playwright/game.spec.ts:57`, `src/components/OpponentHand.tsx:27`
**Issue:** `data-testid="opponent-hand"` is a static string in `OpponentHand`. With 2 players, there is exactly one opponent, so `getByTestId('opponent-hand')` matches one element. With 3 or 4 players, there would be multiple elements with the same test-id, and `getByTestId` would return multiple elements, causing `.first()` to silently pick whichever is rendered first. The current 2-player tests are unaffected, but this will become a problem if tests are added for 3+ player games.

**Fix:** Incorporate the player ID into the test-id at render time:
```tsx
data-testid={`opponent-hand-${playerId}`}
```
Update test selectors accordingly: `p2.getByTestId(`opponent-hand-${p1PlayerId}`)`.

---

### IN-03: `@playwright/mcp` pinned to a pre-release version in `.mcp.json`

**File:** `.mcp.json:5`
**Issue:** `@playwright/mcp@0.0.70` is a pre-release version. Pre-release packages (`0.x.y`) can introduce breaking API changes between minor versions. This is also duplicated in `package.json` devDependencies. The MCP version and the test runner version should be kept in sync.

**Fix:** No action required now, but add a note in `CLAUDE.md` conventions that these versions should be updated together. Consider adding a comment in `.mcp.json` or a `README` entry explaining what this server is for.

---

### IN-04: `sendAction` prop is received but unused in `OpponentHand` — dead parameter

**File:** `src/components/OpponentHand.tsx:15`
**Issue:** The `sendAction` prop is destructured as `_sendAction` (the underscore prefix indicates intentional non-use). While this is a valid TypeScript convention for acknowledging an unused parameter, it means the public interface of `OpponentHand` advertises a capability (`sendAction`) that the component never exercises. This is dead interface surface area that could confuse callers about whether passing the prop has any effect.

**Fix:** If `OpponentHand` will never call `sendAction`, remove it from `OpponentHandProps` and the function signature. If it is planned for future use (e.g., a "request card" gesture), add a comment explaining the intent.

---

_Reviewed: 2026-04-21T15:11:33Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
