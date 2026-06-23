import { test, expect } from './fixtures';

test.describe('hand reveal/sort sync', () => {
  test('opponent sees the sorted order once the hand is revealed', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Deal so P1 has cards to sort
    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.locator('input[type="number"][max]').fill('5');
    await p1.getByRole('button', { name: 'Deal' }).click();
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).not.toHaveCount(0);

    // P1 sorts by suit (one click on the sort button cycles original -> bySuit)
    await p1.getByLabel('Sort hand — current: Original order').click();

    // P1 reveals the hand
    await p1.getByLabel('Show hand').click();

    // P2 (opponent) should see P1's revealed cards
    const opponentHand = p2.getByTestId('opponent-hand');
    const revealedImgs = opponentHand.locator('img');
    await expect(revealedImgs).toHaveCount(5);

    // Read P1's own displayed order (same sort applied locally) and P2's observed order — must match
    const ownHandImgs = p1.getByTestId('hand-zone').locator('img');
    await expect(ownHandImgs).toHaveCount(5);
    const p1Order = await ownHandImgs.evaluateAll(
      els => els.map(el => (el as HTMLImageElement).alt)
    );
    const p2Order = await revealedImgs.evaluateAll(
      els => els.map(el => (el as HTMLImageElement).alt)
    );
    expect(p2Order).toEqual(p1Order);
  });
});
