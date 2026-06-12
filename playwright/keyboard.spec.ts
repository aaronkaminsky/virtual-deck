import { test, expect } from './fixtures';

async function dealCards(page: any, count = 5) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"]').fill(String(count));
  await page.getByRole('button', { name: 'Deal' }).click();
}

test.describe('keyboard shortcuts', () => {
  test('Cmd+Z undoes a move', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Deal cards so there's something to undo
    await dealCards(p1, 5);
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).toHaveCount(5);

    // Wait for the deal popover to close (ensures no input has keyboard focus)
    await expect(p1.locator('input[type="number"]')).not.toBeVisible();

    // Press Cmd+Z to undo the deal
    await p1.keyboard.press('Meta+z');

    // After undo, hand should be empty (restored to pre-deal state)
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).toHaveCount(0, { timeout: 3000 });
  });

  test('? opens the shortcuts cheat sheet and Escape closes it', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    // Click somewhere neutral to ensure the page has keyboard focus (not any overlay/input)
    await p1.mouse.click(200, 400);

    // Press ? to open cheat sheet
    await p1.keyboard.press('?');

    // Wait for the shortcuts modal to appear
    await expect(p1.getByText(/keyboard shortcuts/i)).toBeVisible();

    // Press Escape to close
    await p1.keyboard.press('Escape');

    // Verify it's closed
    await expect(p1.getByText(/keyboard shortcuts/i)).not.toBeVisible();
  });
});
