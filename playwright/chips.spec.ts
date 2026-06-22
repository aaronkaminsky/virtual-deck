import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function enableChips(page: Page) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.getByRole('button', { name: /enable poker chips/i }).click();
  await page.keyboard.press('Escape');
}

// The player's own spread zone is the only one rendered with the "Move to pot"
// quick action (interactive=true); opponents' spreads render interactive=false
// and therefore never show that button. Scope through it to reach the
// player's own spread chip-badge, since spread pile ids are dynamic per-room
// player tokens and can't be hardcoded in the spec.
function mySpreadChipBadge(page: Page) {
  // SpreadZone renders the chip-badge as the immediate sibling of the
  // "Move to pot" button inside the same row (`<div className="flex items-center gap-2">`).
  // xpath `..` reaches that exact row, not an outer ancestor that would also
  // match the opponent's badge containers further up the tree.
  return page
    .getByRole('button', { name: /move to pot/i })
    .locator('xpath=..')
    .getByTestId('chip-badge');
}

// HandZone's "Bet {amount}" button is the only quick-bet button scoped inside
// the hand-zone's sibling controls row; PotZone also renders a "Bet" button
// (pot-to-spread), so the bet click must be scoped away from the pot.
function handBetButton(page: Page) {
  return page.getByRole('button', { name: /^bet \d+/i });
}

// HandZone renders the player's own chip-badge as the immediate sibling of
// the "Bet {amount}" button in the same controls row — mirrors mySpreadChipBadge.
function myHandChipBadge(page: Page) {
  return handBetButton(page).locator('xpath=..').getByTestId('chip-badge');
}

test.describe('poker chips', () => {
  test('enabling chips from the menu shows the starting amount on both hands and a zero pot', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);

    await expect(p1.getByTestId('chip-badge').first()).toContainText('1000');
    await expect(p2.getByTestId('chip-badge').first()).toContainText('1000');
    await expect(p1.getByTestId('pot-zone')).toContainText('0');
  });

  test("bet quick action moves chips from hand to the betting player's own spread only", async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);

    await handBetButton(p1).click();

    // P1's own spread chip badge increases to the default bet amount (10);
    // P2's own hand badge is untouched (P2 still has 1000, even though P1's
    // hand — shown to P2 as opponent-hand — drops to 990).
    await expect(mySpreadChipBadge(p1)).toContainText('10');
    await expect(myHandChipBadge(p2)).toContainText('1000');
  });

  test('move-to-pot and take-all round-trip chips through the shared pot', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);
    await handBetButton(p1).click();
    await p1.getByRole('button', { name: /move to pot/i }).click();

    await expect(p1.getByTestId('pot-zone')).toContainText('10');

    await p1.getByRole('button', { name: /take all/i }).click();

    await expect(p1.getByTestId('pot-zone')).toContainText('0');
    // P2 sees the same pot state in real time
    await expect(p2.getByTestId('pot-zone')).toContainText('0');
  });

  test("a player cannot move another player's hand or spread chips", async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);

    // P2 has no chip-transfer controls rendered for P1's hand/spread — only a read-only badge.
    // P1's spread renders for P2 as `interactive={false}` (BoardView.tsx), so P2 sees a
    // chip-badge there with no "Move to pot" button, unlike P2's own (interactive) spread.
    const p2ViewOfOpponentHand = p2.getByTestId('opponent-hand');
    await expect(p2ViewOfOpponentHand.getByRole('button', { name: /^bet/i })).toHaveCount(0);
    await expect(p2ViewOfOpponentHand.getByTestId('chip-badge')).toContainText('1000');

    // Exactly one "Move to pot" button exists for P2 — their own spread's — not P1's.
    await expect(p2.getByRole('button', { name: /move to pot/i })).toHaveCount(1);
  });
});
