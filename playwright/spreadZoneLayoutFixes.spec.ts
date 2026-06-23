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
    // Wide enough to be a "desktop" viewport (>= Tailwind's 640px sm breakpoint), where
    // board-scroll-area is sm:overflow-hidden (drag-to-pan owns the canvas; there is no
    // page scroll for it to fall through to — see canvas-pan-discoverability-design.md).
    // 560px tall matches the root container's min-h-[560px] floor, which is sized so the
    // five-band layout (header, opponent spread, rail+canvas, own spread, hand) fits
    // without overflowing board-scroll-area at exactly this minimum.
    await p1.setViewportSize({ width: 1024, height: 560 });

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
});
