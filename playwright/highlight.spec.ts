import { test, expect } from './fixtures';

test.describe('highlight last move', () => {
  test('P1 moves a card — P2 sees last-move-highlight on the pile', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    // Verify both players are on the board
    await expect(p1.getByTestId('pile-discard')).toBeVisible();
    await expect(p2.getByTestId('pile-discard')).toBeVisible();

    // P1 drags the top card of the draw pile to discard
    // Target the draggable card element inside the draw pile (role="button" from dnd-kit attributes)
    const drawCard = p1.getByTestId('pile-draw').locator('[role="button"]').first();
    const discardPile = p1.getByTestId('pile-discard');

    await expect(drawCard).toBeVisible();
    const src = await drawCard.boundingBox();
    const tgt = await discardPile.boundingBox();
    if (!src || !tgt) throw new Error('Could not get bounding boxes');

    await p1.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await p1.mouse.down();
    await p1.mouse.move(tgt.x + tgt.width / 2, tgt.y + tgt.height / 2, { steps: 15 });
    await p1.mouse.up();
    // Discard pile starts empty → card placed directly (no insert dialog)

    // P2 should see the last-move-highlight overlay inside the discard pile
    await expect(p2.getByTestId('pile-discard').locator('.last-move-highlight')).toBeVisible({ timeout: 3000 });

    // P1 undoes the move
    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.getByRole('button', { name: /undo/i }).click();

    // P2's highlight should now be absent
    await expect(p2.getByTestId('pile-discard').locator('.last-move-highlight')).not.toBeVisible({ timeout: 3000 });
  });
});
