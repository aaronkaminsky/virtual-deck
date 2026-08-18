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

// Base UI's FloatingFocusManager attaches interaction wiring one frame after
// focus commits (backlog 1037) — wait for the button to be visible, then let two
// frames pass before clicking.
async function clickDialogButton(page: Page, name: 'Reshuffle' | 'Cancel') {
  const button = page.getByRole('button', { name });
  await expect(button).toBeVisible();
  await page.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
  await button.click();
}

// The toggle confirms in every phase, not just mid-game: a table can hold a
// canvas or spread arrangement without ever having been dealt, so "setup" is
// not safe to skip the warning on.
async function toggleJokers(page: Page, name: 'Enable jokers' | 'Disable jokers') {
  await openControls(page);
  await page.getByRole('button', { name }).click();
  await clickDialogButton(page, 'Reshuffle');
}

test.describe('jokers (1039)', () => {
  test('enabling jokers in setup adds two cards to the draw pile for both players', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await expect(p1.getByTestId('pile-draw')).toContainText('52');

    await toggleJokers(p1, 'Enable jokers');

    await expect(p1.getByTestId('pile-draw')).toContainText('54');
    await expect(p2.getByTestId('pile-draw')).toContainText('54');
  });

  test('the toggle asks for confirmation before resetting an undealt table', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    await openControls(p1);
    await p1.getByRole('button', { name: 'Enable jokers' }).click();

    // Nothing has been dealt, yet the confirm still appears.
    await expect(p1.getByText('Turn jokers on?')).toBeVisible();

    await clickDialogButton(p1, 'Cancel');

    await expect(p1.getByTestId('pile-draw')).toContainText('52');
  });

  test('toggling mid-game asks for confirmation and returns every card to the draw pile', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await toggleJokers(p1, 'Enable jokers');
    await expect(p1.getByTestId('pile-draw')).toContainText('54');

    await dealCards(p1, 5);
    await expect(p1.getByTestId('pile-draw')).toContainText('44');

    await toggleJokers(p1, 'Disable jokers');

    await expect(p1.getByTestId('pile-draw')).toContainText('52');
    await expect(p2.getByTestId('pile-draw')).toContainText('52');
  });

  test('cancelling the mid-game confirm leaves the table untouched', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    await dealCards(p1, 5);
    await expect(p1.getByTestId('pile-draw')).toContainText('42');

    await openControls(p1);
    await p1.getByRole('button', { name: 'Enable jokers' }).click();
    await clickDialogButton(p1, 'Cancel');

    await expect(p1.getByTestId('pile-draw')).toContainText('42');
  });
});
