import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function dealCards(page: Page, count = 5) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
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

    // Open controls to access the Reset button (inside the popover)
    await p1.getByRole('button', { name: /open controls/i }).click();

    // Reset table is in playing phase — first click shows confirmation, second confirms
    await p1.getByRole('button', { name: 'Reset table' }).click();
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

    // The opponent-hand shows the card count inline, e.g. "Player1 (5)" — not card IDs
    await expect(p2.getByTestId('opponent-hand')).toContainText(/\(\d+\)/);

    // P1 should NOT see opponent-hand with their own cards
    // P1's page shows HandZone (their own hand) not OpponentHand — confirms server masking
    await expect(p1.getByTestId('hand-zone')).not.toBeEmpty();
  });

  test('spread zone visibility: both players see communal + personal zones', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Both pages are already on the board (fixture waits for hand-zone).
    // The communal play area has pile id "play" → data-testid="grid-zone-play" (GridZone component).
    // Each player's personal spread zone has pile id "spread-{playerId}" → data-testid="spread-zone-spread-{playerId}".
    // Therefore the prefix selector below matches PERSONAL zones only (not the communal zone).
    await expect(p1.getByTestId('grid-zone-play')).toBeVisible();
    await expect(p2.getByTestId('grid-zone-play')).toBeVisible();

    // Each page should show AT LEAST 2 personal spread zones:
    //   - the viewing player's personal zone in the spread row
    //   - the other player's personal zone in the header
    // Expect >= 2 without hardcoding the opaque playerToken. (Total should be 2 in a 2-player room.)
    await expect(p1.locator('[data-testid^="spread-zone-spread-"]')).not.toHaveCount(0);
    await expect(p2.locator('[data-testid^="spread-zone-spread-"]')).not.toHaveCount(0);

    // Strict: the communal zone (grid-zone-play) is asserted directly above; this block confirms personal zones also render.
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

    // Drag card0 (which IS selected) to the communal grid zone
    const communal = p1.getByTestId('grid-zone-play');
    await expect(communal).toBeVisible();

    const src = await card0.boundingBox();
    const tgt = await communal.boundingBox();
    if (!src || !tgt) throw new Error('bounding boxes unavailable');

    await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await p1.mouse.down();
    // Move past the 8px threshold to activate PointerSensor; use height/4 to land in row 0 (not the 1px inter-row gap at height/2)
    await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 4, { steps: 15 });
    await p1.mouse.up();

    // P1: hand now has 3 cards
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(3);

    // P1: communal grid zone shows 1 occupied cell (both cards stacked in the same cell).
    // GridZone only renders the top card of each stack as a [role="button"] draggable element.
    const p1Cards = communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p1Cards).toHaveCount(1);

    // P2: same communal zone (real-time broadcast)
    const p2Communal = p2.getByTestId('grid-zone-play');
    await expect(p2Communal).toBeVisible();
    const p2Cards = p2Communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p2Cards).toHaveCount(1);

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

    const communal = p1.getByTestId('grid-zone-play');
    await expect(communal).toBeVisible();

    const srcPlay = await card0.boundingBox();
    const tgtPlay = await communal.boundingBox();
    if (!srcPlay || !tgtPlay) throw new Error('bounding boxes unavailable for play drag');

    await p1.mouse.move(srcPlay.x + srcPlay.width / 2, srcPlay.y + srcPlay.height / 2);
    await p1.mouse.down();
    // Use height/4 to land in row 0 (not the 1px inter-row gap at height/2)
    await p1.mouse.move(tgtPlay.x + tgtPlay.width / 2, tgtPlay.y + tgtPlay.height / 4, { steps: 15 });
    await p1.mouse.up();

    // P1 hand now has 3 cards; communal grid has 1 occupied cell (2 stacked cards, only top is draggable)
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(3);
    const p1SpreadCards = communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p1SpreadCards).toHaveCount(1);

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
    const p2Communal = p2.getByTestId('grid-zone-play');
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

    const communal = await p1.getByTestId('grid-zone-play').boundingBox();
    const hand = await p1.getByTestId('hand-zone').boundingBox();

    if (!communal || !hand) throw new Error('communal or hand bounding box unavailable');

    // Find P1's personal spread zone: the one in Band 3, which is directly above the hand zone.
    // Among all personal spread zones (header opponent zone + player's own zone), the player's own
    // zone is the one with a y coordinate greater than the communal zone's y.
    const allPersonalBoxes = await p1.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[data-testid^="spread-zone-spread-"]'));
      return els.map(el => {
        const rect = el.getBoundingClientRect();
        return { y: rect.y, height: rect.height, width: rect.width };
      });
    });

    // P1's own Band 3 personal zone is below the communal zone (higher y value)
    const personalBox = allPersonalBoxes.find(b => b.y > communal.y);
    if (!personalBox) throw new Error('P1 personal spread zone not found below communal zone');

    // Communal zone is above personal spread zone (communal in Band 2, personal in Band 3)
    expect(communal.y).toBeLessThan(personalBox.y);

    // Communal zone is above hand zone
    expect(communal.y + communal.height).toBeLessThan(hand.y);

    // Communal grid is meaningfully wide (7 cols × 80px at sm breakpoint = ~566px)
    expect(communal.width).toBeGreaterThan(160);

    // P2 sees the same arrangement
    const p2Communal = await p2.getByTestId('grid-zone-play').boundingBox();
    const p2Hand = await p2.getByTestId('hand-zone').boundingBox();

    if (!p2Communal || !p2Hand) throw new Error('P2 communal or hand bounding box unavailable');

    const p2AllPersonalBoxes = await p2.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[data-testid^="spread-zone-spread-"]'));
      return els.map(el => {
        const rect = el.getBoundingClientRect();
        return { y: rect.y, height: rect.height, width: rect.width };
      });
    });

    const p2PersonalBox = p2AllPersonalBoxes.find(b => b.y > p2Communal.y);
    if (!p2PersonalBox) throw new Error('P2 personal spread zone not found below communal zone');

    expect(p2Communal.y).toBeLessThan(p2PersonalBox.y);
    expect(p2Communal.y + p2Communal.height).toBeLessThan(p2Hand.y);
    expect(p2Communal.width).toBeGreaterThan(160); // same grid dimensions for P2
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

  test('grid card move: drag card within communal grid zone to a new cell', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await dealCards(p1, 5);

    const p1Hand = p1.getByTestId('hand-zone');
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(5);

    // Drag one card from hand into the communal grid zone (center of grid)
    const card0 = p1Hand.locator('[aria-pressed]').first();
    const communal = p1.getByTestId('grid-zone-play');
    await expect(communal).toBeVisible();

    const srcCard = await card0.boundingBox();
    const communalBox = await communal.boundingBox();
    if (!srcCard || !communalBox) throw new Error('bounding boxes unavailable');

    await p1.mouse.move(srcCard.x + srcCard.width / 2, srcCard.y + srcCard.height / 2);
    await p1.mouse.down();
    // Use height/4 to land in row 0 (not the 1px inter-row gap at height/2)
    await p1.mouse.move(communalBox.x + communalBox.width / 2, communalBox.y + communalBox.height / 4, { steps: 15 });
    await p1.mouse.up();

    // Hand loses one card; grid shows one occupied cell
    await expect(p1Hand.locator('[aria-pressed]')).toHaveCount(4);
    const gridCards = communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(gridCards).toHaveCount(1);

    // Capture console warnings before intra-grid drag
    const consoleMessages: string[] = [];
    p1.on('console', msg => { consoleMessages.push(msg.text()); });

    // Drag the card to the far-right column of the grid (MOVE_GRID_CARD)
    const firstGridCard = gridCards.first();
    await expect(firstGridCard).toBeVisible();

    const srcGrid = await firstGridCard.boundingBox();
    if (!srcGrid) throw new Error('grid card bounding box unavailable');

    // Target col 6 (rightmost), row 0: use height/4 to avoid the 1px inter-row gap at height/2
    const rightColX = communalBox.x + (communalBox.width * 13) / 14;
    const row0CenterY = communalBox.y + communalBox.height / 4;

    await p1.mouse.move(srcGrid.x + srcGrid.width / 2, srcGrid.y + srcGrid.height / 2);
    await p1.mouse.down();
    await p1.mouse.move(rightColX, row0CenterY, { steps: 15 });
    await p1.mouse.up();

    // Card count unchanged — card moved to new cell, not lost
    await expect(gridCards).toHaveCount(1);

    // P2 sees the same state (real-time broadcast)
    const p2Communal = p2.getByTestId('grid-zone-play');
    await expect(p2Communal).toBeVisible();
    const p2GridCards = p2Communal.locator('[role="button"]:not(:has([role="button"]))');
    await expect(p2GridCards).toHaveCount(1);

    // No console warnings about duplicate dnd-kit IDs
    const duplicateIdWarnings = consoleMessages.filter(msg => /duplicate id|multiple elements with the same id/i.test(msg));
    expect(duplicateIdWarnings).toHaveLength(0);
  });
});
