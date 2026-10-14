import { expect, test } from '@playwright/test';

test.use({ actionTimeout: 3_000 });

test.describe('App shell', () => {
  test('deep link shows the active row in view', async ({ page }) => {
    await page.goto('/tools/snaps/send-transaction');
    const row = page.getByRole('navigation', { name: 'Stages' }).getByRole('link', { name: 'Send transaction' });
    await expect(row).toHaveAttribute('aria-current', 'page');
    await expect(row).toBeInViewport();
  });

  test('sidebar navigation changes the stage', async ({ page }) => {
    await page.goto('/tools/main/wallet-initialization');
    const nav = page.getByRole('navigation', { name: 'Stages' });
    await nav.getByRole('button', { name: /^RPC requests/ }).click();
    await nav.getByRole('link', { name: 'Get balance' }).click();
    await expect(page).toHaveURL(/\/tools\/rpc\/get-balance$/);
    await expect(nav.getByRole('link', { name: 'Get balance' })).toHaveAttribute('aria-current', 'page');
  });

  test('filter finds stages and Enter opens the first match', async ({ page }) => {
    // Wallet initialization autofocuses its seed field, where `/` must type.
    await page.goto('/tools/rpc/get-balance');
    await page.keyboard.press('/');
    const filter = page.getByRole('searchbox', { name: 'Filter stages' });
    await expect(filter).toBeFocused();
    await filter.fill('xpub');
    await filter.press('Enter');
    await expect(page).toHaveURL(/\/tools\/snaps\/get-xpub$/);
  });

  // `page.goto` resolves on `load`, so shortcuts must be live by then.
  // Pressing at the `load` event itself makes this deterministic.
  test('shortcuts work as soon as the page loads', async ({ page }) => {
    await page.addInitScript(() => {
      addEventListener('load', () => {
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
      });
    });
    await page.goto('/tools/rpc/get-balance');
    await expect(page.getByRole('searchbox', { name: 'Filter stages' })).toBeFocused();
  });

  test('walkthroughs are reachable from the workspace switcher', async ({ page }) => {
    await page.goto('/tools/main/wallet-initialization');
    await page.getByRole('button', { name: /^Workspace:/ }).click();
    await page.getByRole('menuitem', { name: 'Desktop walkthrough' }).click();
    await expect(page).toHaveURL(/\/desktop/);
    await expect(page.locator('h2', { hasText: 'Sections' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Workspace: Desktop walkthrough' })).toBeVisible();

    await page.getByRole('button', { name: /^Workspace:/ }).click();
    await page.getByRole('menuitem', { name: 'Tools' }).click();
    await expect(page).toHaveURL(/\/tools\//);
  });

  test('workspace menu closes on Escape and restores focus', async ({ page }) => {
    await page.goto('/tools/main/wallet-initialization');
    const trigger = page.getByRole('button', { name: /^Workspace:/ });
    await trigger.click();
    await expect(page.getByRole('menu', { name: 'Workspace' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'Workspace' })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test('command palette: open, type, Enter navigates', async ({ page }) => {
    await page.goto('/tools/rpc/connection');
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    const input = palette.getByRole('combobox');
    await expect(input).toBeFocused();

    await input.fill('htr_getBalance');
    const options = palette.getByRole('option');
    await expect(options.filter({ hasText: 'Get balance' })).toHaveCount(2);
    await expect(options.nth(0)).toContainText(/RPC|Snap/);

    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(palette).toBeHidden();
    await expect(page).toHaveURL(/\/tools\/(rpc|snaps)\/get-balance$/);
  });

  test('command palette: Escape restores focus to the trigger', async ({ page }) => {
    await page.goto('/tools/rpc/connection');
    const trigger = page.getByRole('button', { name: 'Find stage' });
    await trigger.click();
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test.describe('phone width', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('navigation lives in a drawer', async ({ page }) => {
      await page.goto('/tools/main/wallet-initialization');
      await expect(page.getByRole('navigation', { name: 'Stages' })).toBeHidden();

      await page.getByRole('button', { name: 'Open navigation' }).click();
      const drawer = page.getByRole('dialog', { name: 'Navigation' });
      await expect(drawer).toBeVisible();
      await drawer.getByRole('button', { name: /^RPC requests/ }).click();
      await drawer.getByRole('link', { name: 'Get balance' }).click();

      await expect(page).toHaveURL(/\/tools\/rpc\/get-balance$/);
      await expect(drawer).toBeHidden();
    });

    test('Escape closes the drawer', async ({ page }) => {
      await page.goto('/tools/main/wallet-initialization');
      const menu = page.getByRole('button', { name: 'Open navigation' });
      await menu.click();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog', { name: 'Navigation' })).toBeHidden();
      await expect(menu).toBeFocused();
    });
  });
});
