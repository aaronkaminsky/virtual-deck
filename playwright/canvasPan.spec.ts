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
// below confirms overflow was actually created.
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
});
