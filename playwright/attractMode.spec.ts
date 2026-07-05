import { test as base, expect, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

const ATTRACT_TEST_IDLE_MS = 8000;
const ANTICS = ['peekaboo', 'nap', 'houseOfCards'];

async function joinGame(page: Page, roomCode: string, playerName: string) {
  await page.goto(`/?room=${roomCode}&attractIdleMs=${ATTRACT_TEST_IDLE_MS}`);
  await page.getByPlaceholder('Your name').fill(playerName);
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

const test = base.extend<{ attractRoom: { p1: Page; p2: Page } }>({
  attractRoom: async ({ browser }, use) => {
    const roomCode = nanoid(8);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();
    await joinGame(p1, roomCode, 'Player1');
    await joinGame(p2, roomCode, 'Player2');
    await use({ p1, p2 });
    await ctx1.close();
    await ctx2.close();
  },
});

test.describe('idle attract mode (1017)', () => {
  test('critter appears for both players with the same antic after the room idles', async ({ attractRoom }) => {
    const { p1, p2 } = attractRoom;
    const o1 = p1.getByTestId('attract-overlay');
    const o2 = p2.getByTestId('attract-overlay');

    await expect(o1).toBeVisible({ timeout: 20_000 });
    await expect(o2).toBeVisible({ timeout: 5_000 });

    const [a1, a2] = await Promise.all([o1.getAttribute('data-antic'), o2.getAttribute('data-antic')]);
    expect(a1).toBe(a2);
    expect(ANTICS).toContain(a1);
  });

  test('local input dismisses locally; a game action dismisses everyone', async ({ attractRoom }) => {
    const { p1, p2 } = attractRoom;
    const o1 = p1.getByTestId('attract-overlay');
    const o2 = p2.getByTestId('attract-overlay');

    await expect(o1).toBeVisible({ timeout: 20_000 });
    await expect(o2).toBeVisible({ timeout: 5_000 });

    // Local: a click in a neutral corner startles only p1's critter.
    await p1.mouse.click(2, 2);
    await expect(o1).toBeHidden({ timeout: 3_000 });
    await expect(o2).toBeVisible();

    // Shared: wait for the next fire, then a real game action clears both.
    await expect(o1).toBeVisible({ timeout: 20_000 });
    await expect(o2).toBeVisible({ timeout: 5_000 });
    await p1.getByRole('button', { name: 'Shuffle pile' }).first().click();
    await expect(o1).toBeHidden({ timeout: 3_000 });
    await expect(o2).toBeHidden({ timeout: 3_000 });
  });
});
