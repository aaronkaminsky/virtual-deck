// playwright/tableNames.spec.ts
import { test, expect } from '@playwright/test';

test.describe('custom table names', () => {
  test('create a named table lands in its lobby with the slug', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('table-name-input').fill('Friday Poker Night');
    await page.getByTestId('create-table').click();
    await expect(page).toHaveURL(/\?room=friday-poker-night/);
    // Lobby for that room renders the slug as the table label.
    await expect(page.getByText('friday-poker-night')).toBeVisible();
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('quick table generates a random room and opens its lobby', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('quick-table').click();
    await expect(page).toHaveURL(/\?room=[A-Za-z0-9_-]{8}/);
    await expect(page.getByPlaceholder('Your name')).toBeVisible();
  });

  test('warns when the chosen name is already occupied', async ({ browser }) => {
    // Context A occupies "poker" by joining the room.
    const ctxA = await browser.newContext();
    const a = await ctxA.newPage();
    await a.goto('/?room=poker');
    await a.getByPlaceholder('Your name').fill('Alice');
    await a.getByRole('button', { name: 'Join Game' }).click();
    await expect(a.getByTestId('hand-zone')).toBeVisible();
    // Stabilizer: give the occupancy probe time to count A's live connection
    // before B probes (project convention — see CLAUDE.md e2e flakiness notes).
    await a.waitForTimeout(250);

    // Context B tries to create "poker" from the landing screen and is warned.
    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await b.goto('/');
    await b.getByTestId('table-name-input').fill('poker');
    await b.getByTestId('create-table').click();

    await expect(b.getByTestId('occupied-warning')).toBeVisible();
    await expect(b.getByTestId('occupied-warning')).toContainText('poker');

    // Joining from the warning navigates into the occupied room's lobby.
    await b.getByTestId('join-occupied').click();
    await expect(b).toHaveURL(/\?room=poker/);
    await expect(b.getByPlaceholder('Your name')).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
