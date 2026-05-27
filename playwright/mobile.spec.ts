import { test, expect, type Page } from '@playwright/test';
import { nanoid } from 'nanoid';

async function joinRoom(page: Page, roomCode: string) {
  await page.goto(`/?room=${roomCode}`);
  await page.getByPlaceholder('Your name').fill('MobileTest');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

async function dealCards(page: Page, count = 5) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
}

test.describe('Phase 35 mobile edge pan', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  // MOBILE-01: edge arrows hidden when canvas has no overflow
  test('MOBILE-01: edge arrows hidden when canvas has no overflow', async ({ page }) => {
    const roomCode = nanoid(8);
    await joinRoom(page, roomCode);

    // Canvas is empty — no overflow, no arrows should appear (D-06: arrows visible only on overflow)
    await expect(page.locator('[data-testid="edge-arrow-right"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="edge-arrow-left"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="edge-arrow-up"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="edge-arrow-down"]')).toHaveCount(0);
  });

  // MOBILE-01: edge arrows appear when canvas content overflows
  test('MOBILE-01: edge arrows appear when canvas content overflows', async ({ page }) => {
    const roomCode = nanoid(8);
    await joinRoom(page, roomCode);
    await dealCards(page, 5);

    // Wait for cards to appear in hand
    await expect(page.getByTestId('hand-zone')).not.toBeEmpty();

    // Drag a hand card to near the right edge of the canvas to create right overflow
    // At <640px viewport, card width is 42px (getCardDimensions), so placing at x~350 causes overflow
    const handZone = page.getByTestId('hand-zone');
    const firstCard = handZone.locator('[role="button"]').first();
    await expect(firstCard).toBeVisible();

    await expect(page.getByTestId('canvas-zone')).toBeVisible();

    const srcBox = await firstCard.boundingBox();
    if (srcBox) {
      await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
      await page.mouse.down();
      // Move to near right edge of 375px viewport — card x + 42px width exceeds viewportW
      await page.mouse.move(350, 200, { steps: 15 });
      await page.mouse.up();
    }

    // After placing a card near the right edge, the right arrow should appear
    await expect(page.locator('[data-testid="edge-arrow-right"]')).toBeVisible();
  });

  // MOBILE-01: holding the right arrow pans the canvas (transform changes)
  test('MOBILE-01: holding the right arrow pans the canvas (transform changes)', async ({ page }) => {
    const roomCode = nanoid(8);
    await joinRoom(page, roomCode);
    await dealCards(page, 5);
    await expect(page.getByTestId('hand-zone')).not.toBeEmpty();

    // Place a card near the right edge to create overflow and make the right arrow appear
    const handZone = page.getByTestId('hand-zone');
    const firstCard = handZone.locator('[role="button"]').first();
    await expect(firstCard).toBeVisible();

    const srcBox = await firstCard.boundingBox();
    if (srcBox) {
      await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(350, 200, { steps: 15 });
      await page.mouse.up();
    }

    // Wait for right arrow to appear
    await expect(page.locator('[data-testid="edge-arrow-right"]')).toBeVisible();

    // Read the inner canvas computed transform BEFORE panning
    const before = await page.locator('[data-testid="canvas-inner"]').evaluate(
      (el) => getComputedStyle(el).transform
    );

    // Hold the right arrow to trigger panning (~7+ intervals: 7 × 16ms = 112ms → 56px+ pan)
    const arrowEl = page.locator('[data-testid="edge-arrow-right"]');
    const box = await arrowEl.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(120); // ~7 ticks × 16ms + slack
      await page.mouse.up();
    }

    // Read transform AFTER panning
    const after = await page.locator('[data-testid="canvas-inner"]').evaluate(
      (el) => getComputedStyle(el).transform
    );

    // Transform must have changed — panning moved the inner canvas
    expect(before).not.toEqual(after);
    // After panning right, result must be a CSS matrix (CSS computed transforms return matrix form)
    expect(after).toContain('matrix');
  });

  // MOBILE-02: pressing edge arrow does not trigger card drag or selection
  test('MOBILE-02: pressing edge arrow does not trigger card drag', async ({ page }) => {
    const roomCode = nanoid(8);
    await joinRoom(page, roomCode);
    await dealCards(page, 5);
    await expect(page.getByTestId('hand-zone')).not.toBeEmpty();

    // Place a card near the right edge to create overflow and make the arrow appear
    const handZone = page.getByTestId('hand-zone');
    const firstCard = handZone.locator('[role="button"]').first();
    const srcBox = await firstCard.boundingBox();
    if (srcBox) {
      await page.mouse.move(srcBox.x + srcBox.width / 2, srcBox.y + srcBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(350, 200, { steps: 15 });
      await page.mouse.up();
    }

    await expect(page.locator('[data-testid="edge-arrow-right"]')).toBeVisible();

    // Press the right arrow for 100ms — MUST NOT cause card selection or drag activation
    // onPointerDown stopPropagation prevents dnd-kit from seeing the pointer event (T-35-05)
    const arrowEl = page.locator('[data-testid="edge-arrow-right"]');
    const box = await arrowEl.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(100);
      await page.mouse.up();
    }

    // Selection count badge appears only when selectedIds.size >= 2 (CanvasZone canvas-selection-count)
    // Arrow press MUST NOT register as a canvas card click or drag activation
    const selectionCount = await page.locator('[data-testid="canvas-selection-count"]').count();
    expect(selectionCount).toBe(0);
  });

  // MOBILE-03: at 375×667 viewport, hand zone remains visible without page scroll
  test('MOBILE-03: at 375x667 viewport, hand zone remains visible without scroll', async ({ page }) => {
    const roomCode = nanoid(8);
    await joinRoom(page, roomCode);
    await dealCards(page, 5);

    // Hand zone must be visible (not below fold)
    await expect(page.getByTestId('hand-zone')).toBeVisible();

    // Entire hand zone must fit within viewport height (no portion cut off below 667px)
    const handBox = await page.getByTestId('hand-zone').boundingBox();
    expect(handBox).not.toBeNull();
    if (handBox) {
      expect(handBox.y + handBox.height).toBeLessThanOrEqual(667);
    }

    // Page must not require vertical scroll to reach the hand (D-04: canvas height cap enforces this)
    // Mirrors scrollWidth <= clientWidth probe from responsive.spec.ts but for vertical axis
    const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const clientHeight = await page.evaluate(() => document.documentElement.clientHeight);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
  });
});
