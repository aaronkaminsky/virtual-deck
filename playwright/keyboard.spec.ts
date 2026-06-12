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
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // Verify initial card count in hand
    const initialCount = await p1.getByTestId('hand-zone').locator('[aria-pressed]').count();
    expect(initialCount).toBe(5);

    // Press Cmd+Z to undo the deal
    await p1.keyboard.press('Meta+z');

    // Wait briefly for undo to process
    await p1.waitForTimeout(300);

    // After undo, hand should be empty or have different card count
    // (undo should restore to pre-deal state)
    const postUndoCount = await p1.getByTestId('hand-zone').locator('[aria-pressed]').count();
    expect(postUndoCount).toBe(0);
  });

  test('? opens the shortcuts cheat sheet and Escape closes it', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

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
