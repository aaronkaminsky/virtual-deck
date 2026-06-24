import { test, expect } from './fixtures';

test.describe('easter eggs', () => {
  test('rr double-tap shows a rickroll overlay on both players, dismissable via its close button', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await p1.locator('body').click();
    await p1.keyboard.press('r');
    await p1.keyboard.press('r');

    await expect(p1.getByTestId('rickroll-overlay')).toBeVisible();
    await expect(p2.getByTestId('rickroll-overlay')).toBeVisible();

    await p1.getByTestId('rickroll-dismiss').click();
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

  test('an explicit shuffle occasionally plays the exaggerated flourish animation', async ({ twoPlayerRoom }) => {
    test.setTimeout(60000); // up to 40 retries x ~700ms wait can exceed the 30s default
    const { p1 } = twoPlayerRoom;

    await p1.locator('body').click();
    let sawFlourish = false;

    // The shuffle button lives in a sibling controls row above the `pile-draw`
    // drop-zone div, not inside it — climb to their shared wrapper to scope the query.
    const drawPileWrapper = p1.getByTestId('pile-draw').locator('xpath=..');

    for (let i = 0; i < 40 && !sawFlourish; i++) {
      await drawPileWrapper.getByRole('button', { name: /shuffle/i }).click();
      // Give the server roundtrip (broadcast -> client state update -> render) a moment to land
      // before checking — checking immediately after click() races the WebSocket response.
      await p1.waitForTimeout(100);
      const flourishCard = p1.locator('.shuffle-card-1[style*="flourish-cut-right-1"]');
      sawFlourish = await flourishCard.isVisible().catch(() => false);
      if (!sawFlourish) await p1.waitForTimeout(600); // let the 650ms shuffle animation clear before the next click
    }

    expect(sawFlourish).toBe(true);
  });
});
