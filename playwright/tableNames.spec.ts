import { test, expect } from '@playwright/test';

test.describe('custom table names', () => {
  test('creating a named table goes straight to the board', async ({ page }) => {
    const suffix = Math.random().toString(36).slice(2, 6); // lowercase alnum, slug-safe
    await page.goto('/');
    await page.getByTestId('player-name-input').fill('Alice');
    await page.getByTestId('table-name-input').fill('Friday Poker ' + suffix);
    await page.getByTestId('create-table').click();
    await expect(page).toHaveURL(new RegExp('\\?room=friday-poker-' + suffix));
    await expect(page.getByTestId('hand-zone')).toBeVisible();
  });

  test('quick table goes straight to the board', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('player-name-input').fill('Bob');
    await page.getByTestId('quick-table').click();
    await expect(page).toHaveURL(/\?room=[A-Za-z0-9_-]{8}/);
    await expect(page.getByTestId('hand-zone')).toBeVisible();
  });

  test('quick table is disabled until a name is entered', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('quick-table')).toBeDisabled();
    await page.getByTestId('player-name-input').fill('Cara');
    await expect(page.getByTestId('quick-table')).toBeEnabled();
  });

  test('warns when the name is occupied, then joins onto the board', async ({ browser }) => {
    const room = `poker-${Math.random().toString(36).slice(2, 8)}`;

    // Context A arrives via a shared URL and joins through the lobby.
    const ctxA = await browser.newContext();
    const a = await ctxA.newPage();
    await a.goto('/?room=' + room);
    await a.getByPlaceholder('Your name').fill('Alice');
    await a.getByRole('button', { name: 'Join Game' }).click();
    await expect(a.getByTestId('hand-zone')).toBeVisible();
    await a.waitForTimeout(250); // let A's live connection register before B probes

    // Context B from the landing screen tries the same name and is warned.
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await b.goto('/');
    await b.getByTestId('player-name-input').fill('Bob');
    await b.getByTestId('table-name-input').fill(room);
    await b.getByTestId('create-table').click();
    await expect(b.getByTestId('occupied-warning')).toBeVisible();
    await expect(b.getByTestId('occupied-warning')).toContainText(room);

    // Joining from the warning lands B straight on the board of that room.
    await b.getByTestId('join-occupied').click();
    await expect(b).toHaveURL(new RegExp('\\?room=' + room));
    await expect(b.getByTestId('hand-zone')).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
