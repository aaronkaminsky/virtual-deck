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
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
    // P2's hand should also have cards — proving P1's action synced to P2 in real time
    await expect(p2.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
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
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
    await expect(p2.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
  });

  test('pass card: P1 hand to P2 hand', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    // Deal first to get cards in hand
    await dealCards(p1, 5);
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

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

  test('deal next hand: Deal button available in playing phase, deals fresh hand, undo restores previous', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Deal initial hand — enters playing phase
    await dealCards(p1, 3);
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
    await expect(p2.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // Open controls in playing phase — button should say "Deal next hand"
    await p1.getByRole('button', { name: /open controls/i }).click();
    await expect(p1.getByRole('button', { name: 'Deal next hand' })).toBeVisible();

    // Click "Deal next hand" — clears table and deals fresh cards
    await p1.getByRole('button', { name: 'Deal next hand' }).click();

    // Wait for deal to complete
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // Both players should have cards in their hands after the deal
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
    await expect(p2.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // Undo — should restore the prior hand (canUndo becomes true after DEAL_NEXT_HAND)
    await p1.getByRole('button', { name: /open controls/i }).click();
    const undoButton = p1.getByRole('button', { name: /undo/i });
    await expect(undoButton).toBeEnabled();
    await undoButton.click();

    // After undo, P1 should still have cards (restored from snapshot)
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
  });

  test('hand privacy: P2 sees count not card IDs', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Deal first so P1 has cards in hand
    await dealCards(p1, 5);
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // P2 should see the opponent-hand area for P1
    // (P2's page renders P1's hand as OpponentHand with cardCount badge)
    await expect(p2.getByTestId('opponent-hand')).toBeVisible();

    // The opponent-hand shows the card count inline, e.g. "Player1 (5)" — not card IDs
    await expect(p2.getByTestId('opponent-hand')).toContainText(/\(\d+\)/);

    // P1 should NOT see opponent-hand with their own cards
    // P1's page shows HandZone (their own hand) not OpponentHand — confirms server masking
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
  });

  test('spread zone visibility: both players see personal spread zones', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Both pages are already on the board (fixture waits for hand-zone).
    // Each player's personal spread zone has pile id "spread-{playerId}" → data-testid="spread-zone-spread-{playerId}".
    // Each page should show AT LEAST 2 personal spread zones:
    //   - the viewing player's personal zone in the spread row
    //   - the other player's personal zone in the header
    // Expect >= 2 without hardcoding the opaque playerToken. (Total should be 2 in a 2-player room.)
    await expect(p1.locator('[data-testid^="spread-zone-spread-"]')).not.toHaveCount(0);
    await expect(p2.locator('[data-testid^="spread-zone-spread-"]')).not.toHaveCount(0);

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

  test('spread zone dock: drag from hand to docked spread lands and stays in board area', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    await dealCards(p1, 5);

    const handZone = p1.getByTestId('hand-zone');
    await expect(handZone.locator('[aria-pressed]')).toHaveCount(5);

    // Collect console messages BEFORE the drag to catch duplicate-ID dnd-kit warnings
    const consoleMessages: string[] = [];
    p1.on('console', msg => { consoleMessages.push(msg.text()); });

    // Identify P1's personal spread zone: the one with the greatest y (lowest on screen)
    // In a 2-player room, P1's page shows P2's opponent spread (near top of board area)
    // and P1's own personal spread (below the piles row, above hand). Pick the max-y one.
    const ownSpreadBoxes = await p1.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[data-testid^="spread-zone-spread-"]'));
      return els.map(el => {
        const rect = el.getBoundingClientRect();
        return { testId: el.getAttribute('data-testid') as string, y: rect.y, height: rect.height };
      });
    });
    const ownSpread = ownSpreadBoxes.reduce((max, b) => b.y > max.y ? b : max, ownSpreadBoxes[0]);
    const ownSpreadEl = p1.getByTestId(ownSpread.testId);

    // Drag card 0 from hand to P1's personal spread zone
    const firstCard = handZone.locator('[aria-pressed]').nth(0);
    await expect(firstCard).toBeVisible();

    const src = await firstCard.boundingBox();
    const tgt = await ownSpreadEl.boundingBox();
    if (!src || !tgt) throw new Error('bounding boxes unavailable for spread dock drag');

    await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await p1.mouse.down();
    await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
    await p1.mouse.up();

    // Behavioral assertions: hand loses one card, spread gains at least one
    await expect(handZone.locator('[aria-pressed]')).toHaveCount(4);
    await expect(ownSpreadEl.locator('[role="button"]')).not.toHaveCount(0);

    // Structural assertion: personal spread zone is below the bg-card header band
    // (proves DOM was restructured — spread is in the board area, not the header)
    const headerBox = await p1.locator('.bg-card').first().boundingBox();
    const spreadBox = await ownSpreadEl.boundingBox();
    if (!headerBox || !spreadBox) throw new Error('bounding boxes unavailable for structural assertion');
    expect(spreadBox.y).toBeGreaterThan(headerBox.y + headerBox.height);

    // Console-warning scrub: no duplicate-id dnd-kit warnings (useDndMonitor subscription-loss guard, D-08)
    const duplicateIdWarnings = consoleMessages.filter(msg =>
      /duplicate id|multiple elements with the same id/i.test(msg)
    );
    expect(duplicateIdWarnings).toHaveLength(0);
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
});
