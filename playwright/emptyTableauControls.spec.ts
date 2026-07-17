import { test, expect } from './fixtures';

test.describe('face toggle on empty tableau (1039)', () => {
  test('face up/down control is visible and toggles on an empty spread zone', async ({ twoPlayerRoom }) => {
    const { p1 } = twoPlayerRoom;

    // Fresh room: p1's own tableau is empty. Only the own (interactive) zone
    // renders controls, so this locator is unique on the page.
    const toggle = p1.getByRole('button', { name: 'Cards land face-up' });
    await expect(toggle).toBeVisible();

    // The empty zone's controls float above the strip and are
    // pointer-events-gated while hidden; hover the strip to reveal them,
    // as a real user would.
    await p1.getByText('Tableau').hover();
    await toggle.click();
    await expect(p1.getByRole('button', { name: 'Cards land face-down' })).toBeVisible();
  });
});
