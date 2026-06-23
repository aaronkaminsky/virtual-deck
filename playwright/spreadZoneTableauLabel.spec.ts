import { test, expect } from './fixtures';

test.describe('spread zone Tableau label', () => {
  test('each player sees exactly one "Tableau" label — their own empty spread, not their opponent\'s', async ({ twoPlayerRoom }) => {
    const { p1, p2 } = twoPlayerRoom;

    await expect(p1.getByText('Tableau', { exact: true })).toHaveCount(1);
    await expect(p2.getByText('Tableau', { exact: true })).toHaveCount(1);
  });
});
