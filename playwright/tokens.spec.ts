import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function enableTokens(page: Page) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.getByRole('button', { name: /enable tokens/i }).click();
  await page.keyboard.press('Escape');
}

async function dragByMouse(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 15 });
  await page.mouse.up();
}

function center(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function dragElementToElement(page: Page, fromTestId: string, toTestId: string) {
  const fromBox = (await page.getByTestId(fromTestId).boundingBox())!;
  const toBox = (await page.getByTestId(toTestId).boundingBox())!;
  await dragByMouse(page, center(fromBox), center(toBox));
}

test.describe('dealer button & tokens (1035)', () => {
  test('tray toggles on for both players; dealer token round-trips tray → felt → tray', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Default off: no tray anywhere
    await expect(p1.getByTestId('token-tray')).toHaveCount(0);

    await enableTokens(p1);
    await expect(p1.getByTestId('token-tray')).toBeVisible();
    await expect(p2.getByTestId('token-tray')).toBeVisible();

    // tray → felt
    const trayBox = (await p1.getByTestId('tray-token-dealer').boundingBox())!;
    const canvasBox = (await p1.getByTestId('canvas-zone').boundingBox())!;
    await dragByMouse(p1, center(trayBox), center(canvasBox));

    await expect(p1.getByTestId('canvas-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('canvas-token-dealer')).toBeVisible();
    await expect(p1.getByTestId('token-slot-dealer')).toBeVisible();
    await expect(p1.getByTestId('tray-token-dealer')).toHaveCount(0);

    // felt → tray (drop on the empty slot inside the tray droppable)
    const tokenBox = (await p1.getByTestId('canvas-token-dealer').boundingBox())!;
    const slotBox = (await p1.getByTestId('token-slot-dealer').boundingBox())!;
    await dragByMouse(p1, center(tokenBox), center(slotBox));

    await expect(p1.getByTestId('canvas-token-dealer')).toHaveCount(0);
    await expect(p1.getByTestId('tray-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('tray-token-dealer')).toBeVisible();
  });

  test('disabling tokens hides a placed token; re-enabling restores it in place', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableTokens(p1);
    const trayBox = (await p1.getByTestId('tray-token-red').boundingBox())!;
    const canvasBox = (await p1.getByTestId('canvas-zone').boundingBox())!;
    await dragByMouse(p1, center(trayBox), center(canvasBox));
    await expect(p2.getByTestId('canvas-token-red')).toBeVisible();

    // Let the drag's pointer state settle before reopening the controls popover —
    // reopening too soon after a drag races the popover's focus wiring and the
    // click on the trigger is silently swallowed (same class of issue as 1037).
    await p1.waitForTimeout(300);

    // Toggle off (button now reads "Disable tokens")
    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.getByRole('button', { name: /disable tokens/i }).click();
    await p1.keyboard.press('Escape');

    await expect(p1.getByTestId('canvas-token-red')).toHaveCount(0);
    await expect(p2.getByTestId('canvas-token-red')).toHaveCount(0);
    await expect(p1.getByTestId('token-tray')).toHaveCount(0);

    // Re-enable: token reappears where it was (display gate, not a reset)
    await enableTokens(p2);
    await expect(p1.getByTestId('canvas-token-red')).toBeVisible();
    await expect(p2.getByTestId('canvas-token-red')).toBeVisible();
  });

  test('dealer token anchors to a player and renders in their name row on both clients; re-anchors in one drag; returns to tray', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableTokens(p1);

    // tray → P2 (dragged from P1's tray onto P1's view of P2, i.e. p1's opponent-hand)
    await dragElementToElement(p1, 'tray-token-dealer', 'opponent-hand');

    // P1 sees the anchor in their opponent-hand row; P2 sees it in their own hand-zone row.
    await expect(p1.getByTestId('opponent-hand').getByTestId('anchored-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('anchored-token-dealer')).toBeVisible();
    // Tray slot empties for both.
    await expect(p1.getByTestId('token-slot-dealer')).toBeVisible();
    await expect(p1.getByTestId('tray-token-dealer')).toHaveCount(0);

    // Re-anchor directly from P2's row to P1's own row — one drag, no tray stop.
    // From P1's page: source is their opponent-hand's anchored disc; target is P1's own hand-zone.
    await dragElementToElement(p1, 'anchored-token-dealer', 'hand-zone');

    // Now anchored to P1: P1 sees it in their own hand row; P2 sees it in their opponent-hand row.
    await expect(p1.getByTestId('opponent-hand').getByTestId('anchored-token-dealer')).toHaveCount(0);
    await expect(p1.getByTestId('anchored-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('opponent-hand').getByTestId('anchored-token-dealer')).toBeVisible();

    // Drag back to the tray from the name row.
    await dragElementToElement(p1, 'anchored-token-dealer', 'token-slot-dealer');

    await expect(p1.getByTestId('anchored-token-dealer')).toHaveCount(0);
    await expect(p2.getByTestId('anchored-token-dealer')).toHaveCount(0);
    await expect(p1.getByTestId('tray-token-dealer')).toBeVisible();
    await expect(p2.getByTestId('tray-token-dealer')).toBeVisible();
  });
});
