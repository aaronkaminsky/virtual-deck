import { test, expect } from './fixtures';

test.describe('easter eggs', () => {
  test('rr double-tap shows a rickroll overlay on both players, dismissable by click', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.keyboard.press('r');
    await p1.keyboard.press('r');

    await expect(p1.getByTestId('rickroll-overlay')).toBeVisible();
    await expect(p2.getByTestId('rickroll-overlay')).toBeVisible();

    await p1.getByTestId('rickroll-overlay').click();
    await expect(p1.getByTestId('rickroll-overlay')).toHaveCount(0);
  });

  test('99 double-tap flips the table on both players and reverts', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.keyboard.press('9');
    await p1.keyboard.press('9');

    await expect(p1.getByTestId('table-flip-wrapper')).toHaveClass(/table-flip/);
    await expect(p2.getByTestId('table-flip-wrapper')).toHaveClass(/table-flip/);

    await expect(p1.getByTestId('table-flip-wrapper')).not.toHaveClass(/table-flip/, { timeout: 2000 });
  });
});
