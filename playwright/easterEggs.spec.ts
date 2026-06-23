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
});
