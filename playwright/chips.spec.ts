import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function enableChips(page: Page) {
  await page.getByRole('button', { name: /open controls/i }).click();
  await page.getByRole('button', { name: /enable poker chips/i }).click();
  await page.keyboard.press('Escape');
}

// SpreadZone (unlike HandZone/OpponentHand) does not render a `ChipBadge` —
// it shows a `ChipStack` plus a plain numeric `Badge` with no testid. Scope
// to the player's own spread box by filtering `spread-zone-<id>` elements
// for the one containing `chip-stack` (only rendered once chipsInSpread > 0,
// which is only ever true for the betting player's own spread in this test).
function mySpreadZoneCardBox(page: Page) {
  return page.getByTestId(/^spread-zone-/).filter({ has: page.getByTestId('chip-stack') });
}

// HandZone's "Bet {amount}" button is the only quick-bet button scoped inside
// the hand-zone's sibling controls row; PotZone also renders a "Bet" button
// (pot-to-spread), so the bet click must be scoped away from the pot.
function handBetButton(page: Page) {
  return page.getByRole('button', { name: /^bet \d+/i });
}

// HandZone renders the player's own chip-badge as a sibling of the
// `zone-controls` span (which holds the "Bet {amount}" button) inside the
// same name-row div — not inside `zone-controls` itself, so it's always
// visible, never hover-gated. Scope two levels up from the Bet button (its
// `zone-controls` span's parent, the name row) to reach the row's own badge.
function myHandChipBadge(page: Page) {
  return handBetButton(page).locator('xpath=../..').getByTestId('chip-badge');
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

    // The Bet button lives inside `zone-controls`, hidden until the
    // ancestor `.zone-hover` is hovered — hover the hand-zone card row first.
    await p1.getByTestId('hand-zone').hover();
    await handBetButton(p1).click();

    // P1's own spread chip box (chip-stack + count badge) shows the default
    // bet amount (10); P2's own hand badge is untouched (P2 still has 1000,
    // even though P1's hand — shown to P2 as opponent-hand — drops to 990).
    await expect(mySpreadZoneCardBox(p1)).toContainText('10');
    // myHandChipBadge locates through the (now hover-gated) Bet button, so
    // P2's hand-zone must be hovered first to reveal it.
    await p2.getByTestId('hand-zone').hover();
    await expect(myHandChipBadge(p2)).toContainText('1000');
  });

  test('move-to-pot and take-all round-trip chips through the shared pot', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await enableChips(p1);
    await p1.getByTestId('hand-zone').hover();
    await handBetButton(p1).click();

    // The "Pot" quick-move button (handleMoveToPot — visible label is just
    // "Pot" next to an arrow icon, not "Move to pot") is in SpreadZone's
    // `zone-controls`, hidden until the ancestor `.zone-hover` wrapper is
    // hovered. Hovering the `spread-zone-<id>` card box (a descendant of
    // that wrapper) triggers the ancestor's `:hover` via CSS bubbling.
    await mySpreadZoneCardBox(p1).hover();
    await p1.getByRole('button', { name: /^pot$/i }).click();

    await expect(p1.getByTestId('pot-zone')).toContainText('10');

    // "Take all" is in PotZone's `zone-controls`; `pot-zone` testid is on the
    // outer `.zone-hover` element itself, so hovering it directly works.
    await p1.getByTestId('pot-zone').hover();
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
    // chip-badge there with no "Pot" quick-move button, unlike P2's own (interactive) spread.
    // Hovering is irrelevant here: these controls are never rendered at all for a
    // non-owner, hidden-until-hover or not.
    const p2ViewOfOpponentHand = p2.getByTestId('opponent-hand');
    await expect(p2ViewOfOpponentHand.getByRole('button', { name: /^bet/i })).toHaveCount(0);
    await expect(p2ViewOfOpponentHand.getByTestId('chip-badge')).toContainText('1000');

    // P2's own spread only renders the "Pot" quick-move button once it has a
    // non-zero bet (SpreadZone gates the whole controls row, including "Pot",
    // behind `!isReallyEmpty`, i.e. `hasBet || pile.cards.length > 0`). Give P2
    // a bet of their own so their button legitimately renders, then hover their
    // spread to reveal `zone-controls` and confirm exactly one "Pot" button is
    // visible to them — never two, i.e. never P1's.
    await p2.getByTestId('hand-zone').hover();
    await p2.getByRole('button', { name: /^bet \d+/i }).click();
    await mySpreadZoneCardBox(p2).hover();
    await expect(p2.getByRole('button', { name: /^pot$/i })).toHaveCount(1);
  });
});
