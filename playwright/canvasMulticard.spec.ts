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
  await page.locator('input[type="number"]').fill(String(count));
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

test.describe('canvas multi-card interactions', () => {
  test('999.39: multi-select from hand fans out on the canvas', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await joinRoom(page, nanoid(8));
    await dealCards(page, 5);

    const handCards = page.getByTestId('hand-zone').locator('[aria-pressed]');
    // Select two hand cards (click toggles selection; distance:8 sensor keeps a click from dragging)
    await handCards.nth(0).click();
    await handCards.nth(1).click();
    await expect(page.getByTestId('hand-zone').locator('[aria-pressed="true"]')).toHaveCount(2);

    // Drag the first selected card into the middle of the canvas
    const src = await handCards.nth(0).boundingBox();
    const canvas = await page.getByTestId('canvas-zone').boundingBox();
    if (!src || !canvas) throw new Error('missing bounding boxes');
    await pointerDrag(page,
      { x: src.x + src.width / 2, y: src.y + src.height / 2 },
      { x: canvas.x + canvas.width / 2, y: canvas.y + canvas.height / 2 },
    );

    // Both cards land on the canvas at DISTINCT x positions (fanned, not stacked)
    const canvasCards = page.locator('[data-testid="canvas-inner"] [data-card-id]');
    await expect(canvasCards).toHaveCount(2);
    const box0 = await canvasCards.nth(0).boundingBox();
    const box1 = await canvasCards.nth(1).boundingBox();
    if (!box0 || !box1) throw new Error('missing canvas card boxes');
    expect(Math.abs(box0.x - box1.x)).toBeGreaterThan(5);
  });
});
