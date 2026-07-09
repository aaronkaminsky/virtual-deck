import { test, expect, type Page } from '@playwright/test';
import { nanoid } from 'nanoid';

async function joinRoom(page: Page, roomCode: string, name = 'Tester') {
  await page.goto(`/?room=${roomCode}`);
  await page.getByPlaceholder('Your name').fill(name);
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

async function dealCards(page: Page, count = 5) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"][max]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
  await expect(page.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
}

// dnd-kit needs real pointer events; dragAndDrop() fires HTML5 events it ignores.
async function pointerDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
}

// Drag n hand cards onto the canvas at spread-out spots, then multi-select them all.
async function placeAndSelectOnCanvas(page: Page, n: number) {
  const handCards = page.getByTestId('hand-zone').locator('[aria-pressed]');
  const canvas = await page.getByTestId('canvas-zone').boundingBox();
  if (!canvas) throw new Error('no canvas box');
  const startCount = await handCards.count();
  for (let i = 0; i < n; i++) {
    await expect(handCards).toHaveCount(startCount - i);
    await page.waitForTimeout(300); // let the hand re-fan settle
    const src = await handCards.nth(0).boundingBox();
    if (!src) throw new Error('no source card box');
    await pointerDrag(page,
      { x: src.x + src.width / 2, y: src.y + src.height / 2 },
      { x: canvas.x + 150 + i * 120, y: canvas.y + 200 },
    );
  }
  const canvasCards = page.locator('[data-testid="canvas-inner"] > [data-card-id]');
  await expect(canvasCards).toHaveCount(n);
  await page.waitForTimeout(400); // let drag settle and didDragRef reset
  for (let i = 0; i < n; i++) {
    await canvasCards.nth(i).click();
    await page.waitForTimeout(50); // give click handler time to process
  }
  await expect(page.locator('[data-testid="canvas-inner"] [aria-pressed="true"]')).toHaveCount(n);
}

test.describe('runtime piles (1031)', () => {
  test('stack, opponent view, drop-onto-pile, unstack', async ({ browser }) => {
    const roomCode = nanoid(8);
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    await pageA.setViewportSize({ width: 1280, height: 720 });
    await pageB.setViewportSize({ width: 1280, height: 720 });

    await joinRoom(pageA, roomCode, 'Alice');
    await joinRoom(pageB, roomCode, 'Bob');
    await dealCards(pageA, 4); // deals to both players

    // Alice stacks three loose canvas cards
    await placeAndSelectOnCanvas(pageA, 3);
    await pageA.getByTestId('canvas-stack').click();
    const pileA = pageA.locator('[data-canvas-pile]');
    await expect(pileA).toHaveCount(1);
    await expect(pileA.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('3');
    await expect(pageA.locator('[data-testid="canvas-inner"] > [data-card-id]')).toHaveCount(0);

    // Bob sees the pile with count 3
    const pileB = pageB.locator('[data-canvas-pile]');
    await expect(pileB).toHaveCount(1);
    await expect(pileB.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('3');

    // Bob drops one of his hand cards onto the pile (nested droppable: pile beats felt)
    const bobCard = await pageB.getByTestId('hand-zone').locator('[aria-pressed]').nth(0).boundingBox();
    const pileBox = await pileB.boundingBox();
    if (!bobCard || !pileBox) throw new Error('missing boxes');
    await pointerDrag(pageB,
      { x: bobCard.x + bobCard.width / 2, y: bobCard.y + bobCard.height / 2 },
      { x: pileBox.x + pileBox.width / 2, y: pileBox.y + pileBox.height / 2 },
    );
    // Non-empty pile drop → insert-position dialog
    await expect(pageB.getByText('Insert card where?')).toBeVisible();
    // Dialog.Popup's initialFocus targets the Top button; focus landing there is deterministic
    // proof the popup mounted. But Base UI's FloatingFocusManager commits focus in a layout
    // effect while its own interaction wiring (outside-press/click handling) attaches in a
    // passive effect that runs a frame later — clicking in that gap gets silently swallowed
    // (verified via WS frame capture: no MOVE_CARD is ever sent when the click misses).
    // Waiting two animation frames after focus lands, instead of a raw sleep, ties the wait to
    // that passive-effect flush rather than an arbitrary duration.
    const topButton = pageB.getByRole('button', { name: 'Top' });
    await expect(topButton).toBeFocused();
    await pageB.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    await topButton.click();
    await expect(pileB.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('4');
    await expect(pileA.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('4');

    // Alice unstacks: pile gone, 4 loose cards, on both boards
    await pileA.hover();
    await pageA.getByRole('button', { name: 'Unstack pile' }).click();
    await expect(pageA.locator('[data-canvas-pile]')).toHaveCount(0);
    await expect(pageA.locator('[data-testid="canvas-inner"] > [data-card-id]')).toHaveCount(4);
    await expect(pageB.locator('[data-testid="canvas-inner"] > [data-card-id]')).toHaveCount(4);

    await ctxA.close();
    await ctxB.close();
  });

  test('drag disambiguation: top card vs frame handle', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await placeAndSelectOnCanvas(page, 2);
    await page.getByTestId('canvas-stack').click();
    const pile = page.locator('[data-canvas-pile]');
    await expect(pile).toHaveCount(1);

    // Frame-handle drag repositions the pile (count unchanged).
    // The handle is targeted by coordinates: the header row's label area (left side),
    // clear of the control buttons on the right.
    const before = await pile.boundingBox();
    if (!before) throw new Error('no pile box');
    // Grab the handle's label area (left side), clear of the control buttons
    await pointerDrag(page,
      { x: before.x + 12, y: before.y + 10 },
      { x: before.x + 200, y: before.y + 120 },
    );
    await expect(async () => {
      const after = await pile.boundingBox();
      if (!after) throw new Error('pile vanished');
      expect(Math.abs(after.x - before.x)).toBeGreaterThan(100);
    }).toPass();
    await expect(pile.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('2');

    // Top-card drag moves ONE card off; pile stays with count 1
    // Aim at the actual rendered top-card element, not the pile frame's center: the
    // card area has a fixed width and is left-anchored inside the (wider) pile frame,
    // so frame-center falls on frame background and would grab the whole-pile drag instead.
    const topCardBox = await pile.locator('[data-card-id]').boundingBox();
    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!topCardBox || !canvas) throw new Error('missing boxes');
    await pointerDrag(page,
      { x: topCardBox.x + topCardBox.width / 2, y: topCardBox.y + topCardBox.height / 2 },
      { x: canvas.x + canvas.width / 2, y: canvas.y + 100 },
    );
    await expect(pile.locator('[data-testid^="canvas-pile-count-"]')).toHaveText('1');
    await expect(page.locator('[data-testid="canvas-inner"] > [data-card-id]')).toHaveCount(1);
  });

  test('pile frame dropped on discard moves all cards there', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await placeAndSelectOnCanvas(page, 2);
    await page.getByTestId('canvas-stack').click();
    const pile = page.locator('[data-canvas-pile]');
    await expect(pile).toHaveCount(1);

    const pileBox = await pile.boundingBox();
    const discard = await page.getByTestId('pile-discard').boundingBox();
    if (!pileBox || !discard) throw new Error('missing boxes');
    await pointerDrag(page,
      { x: pileBox.x + 12, y: pileBox.y + 10 },
      { x: discard.x + discard.width / 2, y: discard.y + discard.height / 2 },
    );
    await expect(page.locator('[data-canvas-pile]')).toHaveCount(0);
    // Count badge renders inside the pile-discard div (see PileZone)
    await expect(page.getByTestId('pile-discard').getByText('2', { exact: true })).toBeVisible();
  });
});
