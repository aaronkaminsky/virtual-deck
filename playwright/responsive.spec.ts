import { test, expect } from '@playwright/test';
import { nanoid } from 'nanoid';

test.describe('Phase 19 responsive layout', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('LAYOUT-04: no horizontal scroll at 375x667 viewport', async ({ page }) => {
    const roomCode = nanoid(8);
    await page.goto(`/?room=${roomCode}`);
    await page.getByPlaceholder('Your name').fill('PhoneTest');
    await page.getByRole('button', { name: 'Join Game' }).click();
    await expect(page.getByTestId('hand-zone')).toBeVisible();

    // Probe page-level horizontal overflow on the documentElement (the html node),
    // which is what a horizontal scrollbar would attach to. document.body.scrollWidth
    // can be misleading if body's overflow is constrained — documentElement is the
    // viewport-bound element.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    expect(clientWidth).toBeLessThanOrEqual(375);
  });
});
