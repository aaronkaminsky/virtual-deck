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

// On a table with nothing to lose the toggle applies straight through; the
// confirm only appears once cards are out of the draw pile or tokens are placed.
// `tableHasContent` (tests/tableHasContent.test.ts) pins that predicate's edge
// cases, including the undealt-but-arranged table.
async function toggleJokersOnFreshTable(page: Page, name: 'Enable jokers' | 'Disable jokers') {
  await openControls(page);
  await page.getByRole('button', { name }).click();
  await page.keyboard.press('Escape');
}

test.describe('jokers (1039)', () => {
  test('enabling jokers on a fresh table applies with no confirm, for both players', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await expect(p1.getByTestId('pile-draw')).toContainText('52');

    await openControls(p1);
    await p1.getByRole('button', { name: 'Enable jokers' }).click();

    // Nothing is out of the draw pile, so there is nothing to warn about.
    await expect(p1.getByText('Turn jokers on?')).toHaveCount(0);
    await p1.keyboard.press('Escape');

    await expect(p1.getByTestId('pile-draw')).toContainText('54');
    await expect(p2.getByTestId('pile-draw')).toContainText('54');
  });

  test('toggling mid-game asks for confirmation and returns every card to the draw pile', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await toggleJokersOnFreshTable(p1, 'Enable jokers');
    await expect(p1.getByTestId('pile-draw')).toContainText('54');

    await dealCards(p1, 5);
    await expect(p1.getByTestId('pile-draw')).toContainText('44');

    await openControls(p1);
    await p1.getByRole('button', { name: 'Disable jokers' }).click();
    await expect(p1.getByText('Turn jokers off?')).toBeVisible();
    await clickDialogButton(p1, 'Reshuffle');

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
