import { test, expect } from './fixtures';

test.describe('short-viewport layout', () => {
  // With an opponent present there are two spread zones (one at the top, one
  // above the hand) plus a taller header, so the board's natural height exceeds
  // a short viewport. The rail/canvas row must not collapse and let the rail's
  // centered piles spill over the spread zones.
  test('rail piles do not overlap spread zones on a short screen', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;
    await p1.setViewportSize({ width: 900, height: 520 });

    // Deal so the hand and rail piles are populated
    await p1.getByRole('button', { name: /open controls/i }).click();
    await p1.locator('input[type="number"][max]').fill('5');
    await p1.getByRole('button', { name: 'Deal' }).click();
    await expect(p1.getByTestId('hand-zone').locator('[aria-pressed]')).toHaveCount(5);

    // Opponent spread (top) + own spread (above hand)
    await expect(p1.locator('[data-testid^="spread-zone-"]')).toHaveCount(2);

    const overlaps = await p1.evaluate(() => {
      const rects = (sel: string) =>
        [...document.querySelectorAll(sel)].map((e) => {
          const b = e.getBoundingClientRect();
          return { id: e.getAttribute('data-testid'), top: b.top, bottom: b.bottom };
        });
      const piles = rects('[data-testid^="pile-"]'); // rail piles (draw/discard)
      const spreads = rects('[data-testid^="spread-zone-"]');
      const hits: { pile: string | null; spread: string | null }[] = [];
      for (const p of piles)
        for (const s of spreads)
          if (p.bottom > s.top + 1 && p.top < s.bottom - 1)
            hits.push({ pile: p.id, spread: s.id });
      return hits;
    });

    expect(overlaps).toEqual([]);
  });
});
