import { test as base, expect, Page } from '@playwright/test';
import { nanoid } from 'nanoid';

async function joinGame(page: Page, roomCode: string, playerName: string) {
  await page.goto(`/?room=${roomCode}`);
  await page.getByPlaceholder('Your name').fill(playerName);
  await page.getByRole('button', { name: 'Join Game' }).click();
  await expect(page.getByTestId('hand-zone')).toBeVisible();
}

type TwoPlayerFixture = { p1: Page; p2: Page; roomCode: string };

export const test = base.extend<{ twoPlayerRoom: TwoPlayerFixture }>({
  twoPlayerRoom: async ({ browser }, use) => {
    const roomCode = nanoid(8);
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    await joinGame(p1, roomCode, 'Player1');
    await joinGame(p2, roomCode, 'Player2');

    await use({ p1, p2, roomCode });

    await ctx1.close();
    await ctx2.close();
  },
});

export { expect };
