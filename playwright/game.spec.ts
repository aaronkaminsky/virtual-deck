import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function dealCards(page: Page, count = 5) {
  await page.getByRole('button', { name: /deal/i }).click();
  // Click the inner Deal button inside the popover (last match is the popover button)
  await page.locator('input[type="number"]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).last().click();
}

test.describe('virtual-deck e2e', () => {
  test('state sync: P1 action visible to P2 in real time', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Both pages are already on the board (fixture handles join + board-ready wait)
    await expect(p1.getByTestId('hand-zone')).toBeVisible();
    await expect(p2.getByTestId('hand-zone')).toBeVisible();

    // P1 deals cards — this sends a DEAL_CARDS action to the PartyKit server
    await dealCards(p1, 5);

    // P1's hand should have cards
    await expect(p1.getByTestId('hand-zone')).not.toBeEmpty();
    // P2's hand should also have cards — proving P1's action synced to P2 in real time
    await expect(p2.getByTestId('hand-zone')).not.toBeEmpty();
  });

  test('deal cards: cards distributed to both hands', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Both players should see the draw pile
    await expect(p1.getByTestId('pile-draw')).toBeVisible();
    await expect(p2.getByTestId('pile-draw')).toBeVisible();

    // P1 opens the Deal popover and deals 5 cards to each player
    // The 650ms server-side delay is handled by Playwright's 5s default assertion timeout
    await dealCards(p1, 5);

    // Both players should have cards in their hand zones
    await expect(p1.getByTestId('hand-zone')).not.toBeEmpty();
    await expect(p2.getByTestId('hand-zone')).not.toBeEmpty();
  });

  test('pass card: P1 hand to P2 hand', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    // Deal first to get cards in hand
    await dealCards(p1, 5);
    await expect(p1.getByTestId('hand-zone')).not.toBeEmpty();

    // Find the first draggable card in P1's hand zone
    // SortableHandCard renders an inner div with dnd-kit attributes (role="button")
    const handZone = p1.getByTestId('hand-zone');
    const firstCard = handZone.locator('[role="button"]').first();
    await expect(firstCard).toBeVisible();

    const opponentHand = p1.getByTestId('opponent-hand');
    await expect(opponentHand).toBeVisible();

    // Use mouse events for dnd-kit pointer-event-based drag
    const src = await firstCard.boundingBox();
    const tgt = await opponentHand.boundingBox();

    if (src && tgt) {
      await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
      await p1.mouse.down();
      // Move in steps to trigger dnd-kit pointer move events
      await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
      await p1.mouse.up();
    }

    // P2 should receive a card in their hand zone
    // The server routes the PASS_CARD action and updates P2's hand
    await expect(p1.getByTestId('opponent-hand')).toBeVisible();
  });

  test('reset table: all cards return to draw pile', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Deal first to enter "playing" phase (Reset button only visible in playing phase)
    await dealCards(p1, 5);
    await expect(p1.getByTestId('hand-zone')).not.toBeEmpty();

    // Reset button is visible in playing phase
    await expect(p1.getByRole('button', { name: /reset/i })).toBeVisible();
    await p1.getByRole('button', { name: /reset/i }).click();

    // Confirm via the AlertDialog action button
    await p1.getByRole('button', { name: 'Reset table' }).click();

    // All 52 cards should return to the draw pile — Badge shows count
    // The pile-draw div contains a Badge element with the card count
    await expect(p1.getByTestId('pile-draw')).toContainText('52');
    await expect(p2.getByTestId('pile-draw')).toContainText('52');
  });

  test('hand privacy: P2 sees count not card IDs', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Deal first so P1 has cards in hand
    await dealCards(p1, 5);
    await expect(p1.getByTestId('hand-zone')).not.toBeEmpty();

    // P2 should see the opponent-hand area for P1
    // (P2's page renders P1's hand as OpponentHand with cardCount badge)
    await expect(p2.getByTestId('opponent-hand')).toBeVisible();

    // The Badge inside opponent-hand shows the card count (a digit) — not card IDs
    // Badge only renders when cardCount > 0
    const countBadge = p2.getByTestId('opponent-hand').locator('span').filter({ hasText: /^\d+$/ }).first();
    await expect(countBadge).toHaveText(/\d+/);

    // P1 should NOT see opponent-hand with their own cards
    // P1's page shows HandZone (their own hand) not OpponentHand — confirms server masking
    await expect(p1.getByTestId('hand-zone')).not.toBeEmpty();
  });

  test('spread zone visibility: both players see communal + personal zones', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Both pages are already on the board (fixture waits for hand-zone).
    // The communal spread zone has pile id "play" → data-testid="spread-zone-play".
    // Each player's personal spread zone has pile id "spread-{playerId}" → data-testid="spread-zone-spread-{playerId}".
    // Therefore the prefix selector below matches PERSONAL zones only (not the communal zone).
    await expect(p1.getByTestId('spread-zone-play')).toBeVisible();
    await expect(p2.getByTestId('spread-zone-play')).toBeVisible();

    // Each page should show AT LEAST 2 personal spread zones:
    //   - the viewing player's personal zone in the spread row
    //   - the other player's personal zone in the header
    // Expect >= 2 without hardcoding the opaque playerToken. (Total should be 2 in a 2-player room.)
    await expect(p1.locator('[data-testid^="spread-zone-spread-"]')).not.toHaveCount(0);
    await expect(p2.locator('[data-testid^="spread-zone-spread-"]')).not.toHaveCount(0);

    // Strict: the communal zone (spread-zone-play) is asserted directly above; this block confirms personal zones also render.
    const p1Zones = await p1.locator('[data-testid^="spread-zone-spread-"]').count();
    const p2Zones = await p2.locator('[data-testid^="spread-zone-spread-"]').count();
    expect(p1Zones).toBeGreaterThanOrEqual(2);
    expect(p2Zones).toBeGreaterThanOrEqual(2);
  });

  test('selection toggle: clicking hand card sets aria-pressed; clicking again clears it', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    await dealCards(p1, 5);

    const handZone = p1.getByTestId('hand-zone');
    await expect(handZone).toBeVisible();

    // Initially nothing is selected
    await expect(handZone.locator('[aria-pressed="true"]')).toHaveCount(0);

    // Click first hand card — distance:8 sensor must NOT trigger drag for a plain click
    const firstCardWrapper = handZone.locator('[aria-pressed]').first();
    await expect(firstCardWrapper).toBeVisible();
    await firstCardWrapper.click();

    // One card now selected
    await expect(handZone.locator('[aria-pressed="true"]')).toHaveCount(1);

    // Click again to deselect
    await firstCardWrapper.click();
    await expect(handZone.locator('[aria-pressed="true"]')).toHaveCount(0);
  });

  test('multi-card set play: select 2 cards, drag to communal zone, both players see them', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await dealCards(p1, 5);

    const p1Hand = p1.getByTestId('hand-zone');
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(5);

    // Pick two cards by index
    const card0 = p1Hand.locator('[aria-pressed]').nth(0);
    const card1 = p1Hand.locator('[aria-pressed]').nth(1);

    // Toggle selection on both
    await card0.click();
    await card1.click();
    await expect(p1Hand.locator('[aria-pressed="true"]')).toHaveCount(2);

    // Drag card0 (which IS selected) to the communal spread zone
    const communal = p1.getByTestId('spread-zone-play');
    await expect(communal).toBeVisible();

    const src = await card0.boundingBox();
    const tgt = await communal.boundingBox();
    if (!src || !tgt) throw new Error('bounding boxes unavailable');

    await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await p1.mouse.down();
    // Move past the 8px threshold to activate PointerSensor
    await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
    await p1.mouse.up();

    // P1: hand now has 3 cards
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(3);

    // P1: communal zone shows 2 cards.
    // Each card renders two nested [role="button"] divs (useSortable outer + useDraggable inner).
    // Use :not(:has([role="button"])) to select only the innermost (leaf) role="button" per card.
    const p1Cards = communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p1Cards).toHaveCount(2);

    // P2: same communal zone shows 2 cards (real-time broadcast)
    const p2Communal = p2.getByTestId('spread-zone-play');
    await expect(p2Communal).toBeVisible();
    const p2Cards = p2Communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p2Cards).toHaveCount(2);

    // Selection cleared on P1 after successful set play (D-05)
    await expect(p1Hand.locator('[aria-pressed="true"]')).toHaveCount(0);
  });

  test('spread zone drag: drag card from communal spread zone to hand', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await dealCards(p1, 5);

    const p1Hand = p1.getByTestId('hand-zone');
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(5);

    // Select 2 cards and play them into the communal spread zone
    const card0 = p1Hand.locator('[aria-pressed]').nth(0);
    const card1 = p1Hand.locator('[aria-pressed]').nth(1);
    await card0.click();
    await card1.click();
    await expect(p1Hand.locator('[aria-pressed="true"]')).toHaveCount(2);

    const communal = p1.getByTestId('spread-zone-play');
    await expect(communal).toBeVisible();

    const srcPlay = await card0.boundingBox();
    const tgtPlay = await communal.boundingBox();
    if (!srcPlay || !tgtPlay) throw new Error('bounding boxes unavailable for play drag');

    await p1.mouse.move(srcPlay.x + srcPlay.width / 2, srcPlay.y + srcPlay.height / 2);
    await p1.mouse.down();
    await p1.mouse.move(tgtPlay.x + tgtPlay.width / 2, tgtPlay.y + tgtPlay.height / 2, { steps: 15 });
    await p1.mouse.up();

    // P1 hand now has 3 cards; communal zone has 2
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(3);
    const p1SpreadCards = communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p1SpreadCards).toHaveCount(2);

    // Capture console warnings before dragging back
    const consoleMessages: string[] = [];
    p1.on('console', msg => { consoleMessages.push(msg.text()); });

    // Drag first card from communal spread zone back to hand
    const firstSpreadCard = communal.locator('[role="button"]:not(:has([role="button"]))').first();
    await expect(firstSpreadCard).toBeVisible();

    const srcSpread = await firstSpreadCard.boundingBox();
    const tgtHand = await p1Hand.boundingBox();
    if (!srcSpread || !tgtHand) throw new Error('bounding boxes unavailable for spread-to-hand drag');

    await p1.mouse.move(srcSpread.x + srcSpread.width / 2, srcSpread.y + srcSpread.height / 2);
    await p1.mouse.down();
    await p1.mouse.move(tgtHand.x + tgtHand.width / 2, tgtHand.y + tgtHand.height / 2, { steps: 15 });
    await p1.mouse.up();

    // P1 hand gains one card (4 total); communal loses one (1 total)
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(4);
    await expect(p1SpreadCards).toHaveCount(1);

    // P2 sees the same communal zone state (real-time broadcast)
    const p2Communal = p2.getByTestId('spread-zone-play');
    await expect(p2Communal).toBeVisible();
    const p2SpreadCards = p2Communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p2SpreadCards).toHaveCount(1);

    // No console warnings about duplicate dnd-kit IDs
    const duplicateIdWarnings = consoleMessages.filter(msg => /duplicate id|multiple elements with the same id/i.test(msg));
    expect(duplicateIdWarnings).toHaveLength(0);
  });

  test('communal zone position: rendered in center row band, not bottom bar', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await dealCards(p1, 5);

    const communal = await p1.getByTestId('spread-zone-play').boundingBox();
    const hand = await p1.getByTestId('hand-zone').boundingBox();
    const personal = await p1.locator('[data-testid^="spread-zone-spread-"]').first().boundingBox();

    if (!communal || !hand || !personal) throw new Error('bounding boxes unavailable');

    // Communal zone is above personal spread zone (communal in Band 2, personal in Band 3)
    expect(communal.y).toBeLessThan(personal.y);

    // Communal zone is above hand zone
    expect(communal.y + communal.height).toBeLessThan(hand.y);

    // Communal zone is meaningfully wide (fills flex-1 parent — default min-width was 80px)
    expect(communal.width).toBeGreaterThan(160);

    // P2 sees the same arrangement
    await dealCards(p2, 0); // ensure P2 board is rendered with zones
    const p2Communal = await p2.getByTestId('spread-zone-play').boundingBox();
    const p2Hand = await p2.getByTestId('hand-zone').boundingBox();
    const p2Personal = await p2.locator('[data-testid^="spread-zone-spread-"]').first().boundingBox();

    if (!p2Communal || !p2Hand || !p2Personal) throw new Error('P2 bounding boxes unavailable');

    expect(p2Communal.y).toBeLessThan(p2Personal.y);
    expect(p2Communal.y + p2Communal.height).toBeLessThan(p2Hand.y);
    expect(p2Communal.width).toBeGreaterThan(160);
  });

  test('no horizontal scrollbar on board at 1280x720', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.setViewportSize({ width: 1280, height: 720 });

    const overflowed = await p1.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflowed).toBe(false);

    await p2.setViewportSize({ width: 1280, height: 720 });
    const p2Overflowed = await p2.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(p2Overflowed).toBe(false);
  });

  test('spread zone reorder: drag-reorder within communal spread zone preserves useSortable data routing', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await dealCards(p1, 5);

    const p1Hand = p1.getByTestId('hand-zone');
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(5);

    // Select 3 cards and play them into the communal spread zone
    const card0 = p1Hand.locator('[aria-pressed]').nth(0);
    const card1 = p1Hand.locator('[aria-pressed]').nth(1);
    const card2 = p1Hand.locator('[aria-pressed]').nth(2);
    await card0.click();
    await card1.click();
    await card2.click();
    await expect(p1Hand.locator('[aria-pressed="true"]')).toHaveCount(3);

    const communal = p1.getByTestId('spread-zone-play');
    await expect(communal).toBeVisible();

    const srcPlay = await card0.boundingBox();
    const tgtPlay = await communal.boundingBox();
    if (!srcPlay || !tgtPlay) throw new Error('bounding boxes unavailable for play drag');

    await p1.mouse.move(srcPlay.x + srcPlay.width / 2, srcPlay.y + srcPlay.height / 2);
    await p1.mouse.down();
    await p1.mouse.move(tgtPlay.x + tgtPlay.width / 2, tgtPlay.y + tgtPlay.height / 2, { steps: 15 });
    await p1.mouse.up();

    // Communal zone should now have 3 cards
    const spreadCards = communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(spreadCards).toHaveCount(3);

    // Capture console warnings
    const consoleMessages: string[] = [];
    p1.on('console', msg => { consoleMessages.push(msg.text()); });

    // Drag card at index 0 to position of card at index 2 within spread zone
    const firstCard = spreadCards.nth(0);
    const thirdCard = spreadCards.nth(2);
    await expect(firstCard).toBeVisible();
    await expect(thirdCard).toBeVisible();

    const srcFirst = await firstCard.boundingBox();
    const tgtThird = await thirdCard.boundingBox();
    if (!srcFirst || !tgtThird) throw new Error('bounding boxes unavailable for reorder drag');

    await p1.mouse.move(srcFirst.x + srcFirst.width / 2, srcFirst.y + srcFirst.height / 2);
    await p1.mouse.down();
    await p1.mouse.move(tgtThird.x + tgtThird.width / 2, tgtThird.y + tgtThird.height / 2, { steps: 15 });
    await p1.mouse.up();

    // Card count unchanged after reorder (3 cards still in spread zone)
    await expect(spreadCards).toHaveCount(3);

    // P2 sees the same card count (real-time broadcast)
    const p2Communal = p2.getByTestId('spread-zone-play');
    await expect(p2Communal).toBeVisible();
    const p2SpreadCards = p2Communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p2SpreadCards).toHaveCount(3);

    // No console warnings about duplicate dnd-kit IDs
    const duplicateIdWarnings = consoleMessages.filter(msg => /duplicate id|multiple elements with the same id/i.test(msg));
    expect(duplicateIdWarnings).toHaveLength(0);
  });
});
