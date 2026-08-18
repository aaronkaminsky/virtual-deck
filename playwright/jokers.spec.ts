import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function openControls(page: Page) {
  await page.getByRole('button', { name: /open controls/i }).click();
}

async function dealCards(page: Page, count = 5) {
  await openControls(page);
  await page.locator('input[type="number"][max]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
}

test.describe('jokers (1039)', () => {
  test('enabling jokers in setup adds two cards to the draw pile for both players', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await expect(p1.getByTestId('pile-draw')).toContainText('52');

    await openControls(p1);
    await p1.getByRole('button', { name: 'Enable jokers' }).click();
    await p1.keyboard.press('Escape');

    await expect(p1.getByTestId('pile-draw')).toContainText('54');
    await expect(p2.getByTestId('pile-draw')).toContainText('54');
  });

  test('toggling mid-game asks for confirmation and returns every card to the draw pile', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await openControls(p1);
    await p1.getByRole('button', { name: 'Enable jokers' }).click();
    await p1.keyboard.press('Escape');
    await expect(p1.getByTestId('pile-draw')).toContainText('54');

    await dealCards(p1, 5);
    await expect(p1.getByTestId('pile-draw')).toContainText('44');

    await openControls(p1);
    await p1.getByRole('button', { name: 'Disable jokers' }).click();

    // Base UI's FloatingFocusManager attaches interaction wiring one frame after
    // focus commits (backlog 1037) — wait for the confirm button to be visible,
    // then let two frames pass before clicking.
    const confirm = p1.getByRole('button', { name: 'Reshuffle' });
    await expect(confirm).toBeVisible();
    await p1.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
    await confirm.click();

    await expect(p1.getByTestId('pile-draw')).toContainText('52');
    await expect(p2.getByTestId('pile-draw')).toContainText('52');
  });

  test('cancelling the mid-game confirm leaves the table untouched', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    await dealCards(p1, 5);
    await expect(p1.getByTestId('pile-draw')).toContainText('42');

    await openControls(p1);
    await p1.getByRole('button', { name: 'Enable jokers' }).click();

    const cancel = p1.getByRole('button', { name: 'Cancel' });
    await expect(cancel).toBeVisible();
    await p1.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
    await cancel.click();

    await expect(p1.getByTestId('pile-draw')).toContainText('42');
  });
});
