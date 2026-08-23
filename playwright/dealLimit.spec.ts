import { type Page, type Browser } from '@playwright/test';
import { nanoid } from 'nanoid';
import { test, expect } from './fixtures';

async function dealCards(page: Page, count: number) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.locator('input[type="number"][max]').fill(String(count));
  await page.getByRole('button', { name: /^Deal/ }).click();
}

async function joinSolo(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`/?room=${nanoid(8)}`);
  await page.getByPlaceholder('Your name').fill('Solo');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
  return page;
}

test.describe('deal limit and errors (1041, 1042)', () => {
  test('deals more than the old 13-card cap', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await dealCards(p1, 20);

    // 2 players x 20 = 40 of 52 dealt, 12 left.
    await expect(p1.getByTestId('pile-draw')).toContainText('12');
    await expect(p1.getByTestId('hand-zone').locator('[data-card-id]')).toHaveCount(20);
    await expect(p2.getByTestId('hand-zone').locator('[data-card-id]')).toHaveCount(20);
  });

  test('a hand too large for the comfortable spacing fans instead of overflowing', async ({ browser }) => {
    const page = await joinSolo(browser);

    await dealCards(page, 34);
    await expect(page.getByTestId('hand-zone').locator('[data-card-id]')).toHaveCount(34);

    // Two independent assertions, because each catches a different failure.
    //
    // 34 cards at the comfortable 40px advance need 60 + 33*40 = 1380px, past
    // the 1280px viewport, so the fan MUST have tightened. Asserting the margin
    // directly does not depend on how wide the hand row happens to be in the
    // surrounding layout.
    const margin = await page
      .getByTestId('hand-zone')
      .locator('[data-card-id]')
      .nth(1)
      .evaluate((el) => parseFloat(getComputedStyle(el.parentElement!).marginLeft));
    expect(margin).toBeLessThan(-20);

    // And the result actually fits, rather than merely being tighter.
    const fits = await page.getByTestId('hand-zone').evaluate(
      (el) => el.scrollWidth <= el.clientWidth + 1
    );
    expect(fits).toBe(true);

    await page.context().close();
  });

  test('a deal the table cannot satisfy shows the server error instead of doing nothing', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    // 2 players x 27 = 54 needed, 52 available.
    await dealCards(p1, 27);

    await expect(p1.getByTestId('error-banner')).toBeVisible();
    await expect(p1.getByTestId('error-banner')).toContainText('Not enough cards');
    // The table is untouched.
    await expect(p1.getByTestId('pile-draw')).toContainText('52');
  });
});
