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

  test('bg triggers the bad-game jeer overlay on both players and it clears', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.keyboard.press('b');
    await p1.keyboard.press('g');

    await expect(p1.getByTestId('jeer-overlay')).toBeVisible();
    await expect(p2.getByTestId('jeer-overlay')).toBeVisible();

    await expect(p2.getByTestId('jeer-overlay')).toHaveCount(0, { timeout: 8000 });
  });

  test('Konami code shows CHEATER DETECTED and renders all hand cards as aces, then reverts', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.locator('input[type="number"][max]').fill('5');
    await p1.getByRole('button', { name: 'Deal' }).click();
    await p1.keyboard.press('Escape');
    await p1.waitForTimeout(300);

    const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
    for (const key of sequence) {
      await p1.keyboard.press(key);
    }

    await expect(p1.getByTestId('konami-banner')).toBeVisible();
    await expect(p2.getByTestId('konami-banner')).toBeVisible();

    const handCardImages = p1.getByTestId('hand-zone').locator('img[alt^="A of"]');
    await expect(handCardImages.first()).toBeVisible();

    await expect(p1.getByTestId('konami-banner')).toHaveCount(0, { timeout: 4000 });
  });
});
