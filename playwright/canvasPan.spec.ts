import { test, expect, type Page } from '@playwright/test';
import { nanoid } from 'nanoid';

async function joinRoom(page: Page, roomCode: string) {
  await page.goto(`/?room=${roomCode}`);
  await page.getByPlaceholder('Your name').fill('PanTest');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

async function dealCards(page: Page, count = 5) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
}

// Place a hand card near the right edge of the canvas so the canvas overflows right.
// The drop lands clear of the right edge arrow; the edge-arrow-right visibility assertion
// confirms overflow was actually created.
async function createRightOverflow(page: Page) {
  await expect(page.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);
  const firstCard = page.getByTestId('hand-zone').locator('[role="button"]').first();
  const srcBox = await firstCard.boundingBox();
  if (!srcBox) throw new Error('no hand card');
  const canvasBox = await page.getByTestId('canvas-zone').boundingBox();
  if (!canvasBox) throw new Error('no canvas');
  await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + canvasBox.width - 70, canvasBox.y + canvasBox.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(page.locator('[data-testid="edge-arrow-right"]')).toBeVisible();
}

// The "hold pans past the nudge" test needs overflow LARGER than a half-viewport nudge.
// A normal UI drop is clamped to canvas bounds by BoardDragLayer, so it can only create
// ~padding of overflow — less than a half-viewport nudge, which would let the single
// immediate nudge exhaust all available scroll (making hold indistinguishable from tap).
// To plant a card far enough off-screen we inject a PLACE_ON_CANVAS action over a short-lived
// WebSocket using the same player token. This couples to the server's port + action contract,
// so it is deliberately confined to the one test that requires it.
async function createLargeRightOverflow(page: Page) {
  await createRightOverflow(page); // real card on canvas + the right edge arrow
  const wsParams = await page.evaluate(() => {
    const playerId = localStorage.getItem('playerId') ?? '';
    const name = localStorage.getItem('displayName') ?? '';
    const room = new URLSearchParams(window.location.search).get('room') ?? '';
    const cardEl = document.querySelector('[data-testid="hand-zone"] [data-card-id]') as HTMLElement | null;
    const cardId = cardEl?.getAttribute('data-card-id') ?? '';
    return { playerId, name, room, cardId };
  });
  if (!wsParams.cardId) throw new Error('createLargeRightOverflow: no hand card available to inject');
  await page.evaluate(async ({ playerId, name, room, cardId }) => {
    const ws = new WebSocket(`ws://localhost:1999/party/${room}?player=${playerId}&name=${encodeURIComponent(name)}`);
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'PLACE_ON_CANVAS', cardId, fromZone: 'hand', fromId: playerId, x: 2000, y: 200 }));
        setTimeout(() => { ws.close(); resolve(); }, 100);
      };
      ws.onerror = () => reject(new Error('ws error'));
      setTimeout(() => reject(new Error('ws timeout')), 3000);
    });
  }, wsParams);
  await page.waitForTimeout(300); // let the server broadcast and React update
}

function getInnerTransform(page: Page) {
  return page.locator('[data-testid="canvas-inner"]').evaluate((el) => getComputedStyle(el).transform);
}

test.describe('999.42 canvas drag-to-pan', () => {
  test('dragging empty felt pans the canvas', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    const before = await getInnerTransform(page);

    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!canvas) throw new Error('no canvas');
    const startX = canvas.x + canvas.width / 2;
    const startY = canvas.y + canvas.height - 40;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 150, startY, { steps: 15 }); // drag left → pan right
    await page.mouse.up();

    const after = await getInnerTransform(page);
    expect(after).not.toEqual(before);
    expect(after).toContain('matrix');
  });

  test('dragging a card does not pan (transform unchanged)', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    const before = await getInnerTransform(page);

    const card = page.locator('[data-testid="canvas-inner"] [data-card-id]').first();
    const box = await card.boundingBox();
    if (!box) throw new Error('no canvas card');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 40, box.y + box.height / 2 + 20, { steps: 15 });
    await page.mouse.up();

    const after = await getInnerTransform(page);
    expect(after).toEqual(before); // view did not pan
  });

  test('tapping empty felt deselects', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    const card = page.locator('[data-testid="canvas-inner"] [data-card-id]').first();
    await expect(card).toHaveAttribute('aria-pressed', 'false'); // wait for state hydration before clicking
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');

    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!canvas) throw new Error('no canvas');
    await page.mouse.move(canvas.x + 40, canvas.y + canvas.height - 30);
    await page.mouse.down();
    await page.mouse.up();

    await expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  test('tapping a canvas control does not deselect', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    // Click canvas-select-all from unselected state: it selects all canvas cards.
    // If the viewport's tap-to-deselect incorrectly fired, the card would not become selected.
    const card = page.locator('[data-testid="canvas-inner"] [data-card-id]').first();
    await expect(card).toHaveAttribute('aria-pressed', 'false'); // wait for state hydration before clicking
    await page.getByTestId('canvas-select-all').click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
  });

  test('empty canvas keeps native scroll (touch-action auto)', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    const ta = await page.getByTestId('canvas-zone').evaluate((el) => getComputedStyle(el).touchAction);
    expect(ta).toBe('auto');
  });

  test('tapping the controls panel background does not deselect', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    // Select a canvas card.
    const card = page.locator('[data-testid="canvas-inner"] [data-card-id]').first();
    await expect(card).toHaveAttribute('aria-pressed', 'false'); // wait for hydration
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');

    // Tap the controls panel's padding corner (the div itself, not a button).
    // Before the fix this armed the viewport pan/tap-deselect and cleared the selection.
    await page.getByTestId('canvas-controls').click({ position: { x: 2, y: 2 } });

    await expect(card).toHaveAttribute('aria-pressed', 'true'); // still selected
  });

  test('a quick tap on an edge arrow nudges the view', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createRightOverflow(page);

    const before = await getInnerTransform(page);

    // Quick tap (down+up, no hold) on the right arrow → one half-viewport nudge
    const arrow = await page.locator('[data-testid="edge-arrow-right"]').boundingBox();
    if (!arrow) throw new Error('no arrow');
    await page.mouse.move(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
    await page.mouse.down();
    await page.mouse.up();

    const after = await getInnerTransform(page);
    expect(after).not.toEqual(before); // a single tap moved the view
  });

  test('holding an edge arrow keeps panning past the first nudge', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);
    await createLargeRightOverflow(page);

    const arrow = await page.locator('[data-testid="edge-arrow-right"]').boundingBox();
    if (!arrow) throw new Error('no arrow');

    await page.mouse.move(arrow.x + arrow.width / 2, arrow.y + arrow.height / 2);
    await page.mouse.down();
    const afterNudge = await getInnerTransform(page); // immediate nudge already applied
    await page.waitForTimeout(450); // past the 250ms repeat delay + a few ticks
    const afterHold = await getInnerTransform(page);
    await page.mouse.up();

    expect(afterHold).not.toEqual(afterNudge); // continuous pan advanced beyond the nudge
  });
});
