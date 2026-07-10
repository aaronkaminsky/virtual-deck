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

async function center(page: Page, testId: string): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId(testId).boundingBox();
  if (!box) throw new Error(`no bounding box for ${testId}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function handCardCenter(page: Page, nth = 0): Promise<{ x: number; y: number }> {
  const box = await page.getByTestId('hand-zone').locator('[aria-pressed]').nth(nth).boundingBox();
  if (!box) throw new Error('no hand card box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

test.describe('pile drop placement flaps (1039)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('plain drop on the draw pile inserts immediately with no dialog', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4); // draw pile: 52 - 4 = 48
    await expect(page.getByTestId('pile-draw')).toContainText('48');

    const from = await handCardCenter(page);
    const to = await center(page, 'pile-draw');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });
    await page.mouse.up();

    await expect(page.getByTestId('pile-draw')).toContainText('49');
    await expect(page.getByText('Insert card where?')).toHaveCount(0);
  });

  test('flaps appear on drag-over and dropping on Bottom inserts the card', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await expect(page.getByTestId('pile-draw')).toContainText('48');

    const bottomFlap = page.getByTestId('pile-flap-draw-bottom');
    await expect(bottomFlap).toHaveCount(0); // hidden before any drag

    const from = await handCardCenter(page);
    const to = await center(page, 'pile-draw');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });

    // Flaps slide out while hovering the pile mid-drag
    await expect(bottomFlap).toBeVisible();
    await expect(page.getByTestId('pile-flap-draw-random')).toBeVisible();

    const flapBox = await bottomFlap.boundingBox();
    if (!flapBox) throw new Error('no flap box');
    await page.mouse.move(flapBox.x + flapBox.width / 2, flapBox.y + flapBox.height / 2, { steps: 15 });
    await expect(bottomFlap).toBeVisible(); // stays armed while pointer is on the flap
    await page.mouse.up();

    await expect(page.getByTestId('pile-draw')).toContainText('49');
  });

  test('flaps retract when the drag moves away without dropping', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await expect(page.getByTestId('pile-draw')).toContainText('48');

    const from = await handCardCenter(page);
    const to = await center(page, 'pile-draw');
    const canvasBox = await page.getByTestId('canvas-zone').boundingBox();
    if (!canvasBox) throw new Error('no canvas box');

    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });
    const bottomFlap = page.getByTestId('pile-flap-draw-bottom');
    await expect(bottomFlap).toBeVisible();
    // Record the flap's position while it is visible, for the phantom-rect check below
    const flapBox = await bottomFlap.boundingBox();
    if (!flapBox) throw new Error('no flap box');

    // Drag away from pile and flaps (to mid-canvas): flaps disarm
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + 100, { steps: 15 });
    await expect(bottomFlap).toHaveCount(0);

    // Releasing at the flap's OLD screen position must not be swallowed by a
    // stale (phantom) flap rect — the card must not enter the pile. Wait for
    // dnd-kit's live-region announcement before releasing: collision updates are
    // rAF-throttled, so an immediate mouse.up can race ahead of the phantom
    // becoming `over` and mask the regression.
    await page.mouse.move(flapBox.x + flapBox.width / 2, flapBox.y + flapBox.height / 2, { steps: 15 });
    await expect(page.getByRole('status')).toContainText('no longer over a droppable area');
    await page.mouse.up();
    await expect(page.getByTestId('pile-draw')).toContainText('48');
  });

  test('multi-card set dropped on the Random flap moves the whole set into the pile', async ({ page }) => {
    await joinRoom(page, nanoid(8));
    await dealCards(page, 4);
    await expect(page.getByTestId('pile-draw')).toContainText('48');

    // Select two hand cards (click toggles selection)
    const handCards = page.getByTestId('hand-zone').locator('[aria-pressed]');
    await handCards.nth(0).click();
    await handCards.nth(1).click();
    await expect(page.getByTestId('hand-zone').locator('[aria-pressed="true"]')).toHaveCount(2);

    // Drag one selected card over the pile, drop on the Random flap
    const from = await handCardCenter(page, 0);
    const to = await center(page, 'pile-draw');
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 15 });
    const randomFlap = page.getByTestId('pile-flap-draw-random');
    await expect(randomFlap).toBeVisible();
    const flapBox = await randomFlap.boundingBox();
    if (!flapBox) throw new Error('no flap box');
    await page.mouse.move(flapBox.x + flapBox.width / 2, flapBox.y + flapBox.height / 2, { steps: 15 });
    await page.mouse.up();

    await expect(page.getByTestId('pile-draw')).toContainText('50');
    await expect(page.getByTestId('hand-zone').locator('[aria-pressed]')).toHaveCount(2);
  });
});
