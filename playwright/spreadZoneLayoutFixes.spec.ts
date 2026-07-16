import { test, expect } from './fixtures';

test.describe('board layout alignment and scroll fixes', () => {
  test('header content (opponent name) left-aligns with the opponent spread zone below it', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;
    await p1.setViewportSize({ width: 1400, height: 900 });

    const opponentHandBox = await p1.getByTestId('opponent-hand').boundingBox();
    const opponentSpreadBox = await p1.locator('[data-testid^="spread-zone-"]').first().boundingBox();
    expect(opponentHandBox).not.toBeNull();
    expect(opponentSpreadBox).not.toBeNull();

    expect(Math.round(opponentHandBox!.x)).toBe(Math.round(opponentSpreadBox!.x));
  });

  test('rail+canvas row right edge aligns with the spread zone right edge', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;
    await p1.setViewportSize({ width: 1400, height: 900 });

    const canvasBox = await p1.getByTestId('canvas-zone').boundingBox();
    const spreadBox = await p1.locator('[data-testid^="spread-zone-"]').first().boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(spreadBox).not.toBeNull();

    const canvasRight = canvasBox!.x + canvasBox!.width;
    const spreadRight = spreadBox!.x + spreadBox!.width;
    expect(Math.round(canvasRight)).toBe(Math.round(spreadRight));
  });

  test('content fits without internal overflow at the board\'s declared minimum desktop-width viewport', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;
    // Wide enough to be a "desktop" viewport (>= Tailwind's 640px sm breakpoint).
    // 590px tall matches the root container's min-h-[590px] floor, which is sized so the
    // five-band layout (header, opponent spread, rail+canvas, own spread, hand) fits
    // without overflowing board-scroll-area at exactly this minimum — i.e. scrolling
    // should not be needed at this size, even though it's now always available as a
    // backstop (see the overflow test below for when content needs more room than this).
    await p1.setViewportSize({ width: 1024, height: 590 });

    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.locator('input[type="number"][max]').fill('5');
    await p1.getByRole('button', { name: 'Deal' }).click();
    await p1.waitForTimeout(200);

    const scrollArea = p1.getByTestId('board-scroll-area');
    const { scrollHeight, clientHeight } = await scrollArea.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight);
    await expect(p1.getByTestId('hand-zone')).toBeInViewport();
  });

  test('board scrolls to reveal content that genuinely exceeds the available height, instead of clipping it', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;
    // A desktop-width viewport (>= 640px sm breakpoint) where board-scroll-area was
    // sm:overflow-hidden. The 590px floor only covers one specific minimal content
    // case; any content that needs more room (more opponents, larger hands, chips,
    // a populated spread zone, etc.) must still be reachable via scroll, not clipped.
    await p1.setViewportSize({ width: 1024, height: 700 });

    // Simulate content that needs more vertical room than is actually available,
    // independent of which game feature happens to cause it.
    await p1.evaluate(() => {
      const rail = document.querySelector('[data-testid^="pile-"]')?.parentElement;
      if (rail) (rail as HTMLElement).style.minHeight = '900px';
    });
    await p1.waitForTimeout(100);

    const scrollArea = p1.getByTestId('board-scroll-area');
    const { scrollHeight, clientHeight } = await scrollArea.evaluate((el) => ({
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    expect(scrollHeight).toBeGreaterThan(clientHeight);

    await expect(p1.getByTestId('hand-zone')).not.toBeInViewport();

    // A real user scrolls with the mouse wheel, not via scrollTo(). overflow:hidden
    // blocks wheel/scrollbar/keyboard scrolling even though the element remains
    // programmatically scrollable — so this is the gesture that must actually work.
    const box = (await scrollArea.boundingBox())!;
    await p1.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await p1.mouse.wheel(0, 2000);
    await p1.waitForTimeout(100);

    await expect(p1.getByTestId('hand-zone')).toBeInViewport();
  });
});
