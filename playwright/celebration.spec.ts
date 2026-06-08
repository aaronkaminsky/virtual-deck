import { nanoid } from 'nanoid';
import { test, expect } from './fixtures';

test('g-g celebration shows on both players and clears after ~5s', async ({ twoPlayerRoom }) => {
  const { p1, p2 } = twoPlayerRoom;

  // Ensure window (not an input) has focus, then press 'g' twice quickly.
  await p1.locator('body').click();
  await p1.keyboard.press('g');
  await p1.keyboard.press('g');

  // Shared: overlay appears for BOTH players.
  await expect(p1.getByTestId('celebration-overlay')).toBeVisible();
  await expect(p2.getByTestId('celebration-overlay')).toBeVisible();

  // Auto-clears after the ~5s duration.
  await expect(p2.getByTestId('celebration-overlay')).toHaveCount(0, { timeout: 8000 });
});

test('mute toggle persists across reload', async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const room = nanoid(8);

  // Join.
  await page.goto(`/?room=${room}`);
  await page.getByPlaceholder('Your name').fill('Muter');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();

  // Open menu, mute.
  await page.getByRole('button', { name: 'Open controls' }).click();
  await page.getByRole('button', { name: 'Mute sounds' }).click();

  // Reload and rejoin (React join state resets on reload; the name is pre-filled from localStorage).
  await page.reload();
  await page.getByPlaceholder('Your name').fill('Muter');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();

  // Reopen menu — the toggle should now read "Unmute sounds" (i.e. it is muted).
  await page.getByRole('button', { name: 'Open controls' }).click();
  await expect(page.getByRole('button', { name: 'Unmute sounds' })).toBeVisible();

  await ctx.close();
});
