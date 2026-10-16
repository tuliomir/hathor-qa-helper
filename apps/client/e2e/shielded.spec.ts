import { expect, test } from '@playwright/test';
import { createConsoleCollector } from './helpers/console-collector';

test.use({ actionTimeout: 3_000 });

// Every QA server call answers like the dev proxy does when nothing listens
// (204 from the health middleware), so these tests see a stopped server even
// when one is running locally.
test.beforeEach(async ({ page }) => {
  await page.route('**/qa-server/**', (route) => route.fulfill({ status: 204 }));
});

test.describe('Shielded stages, QA server stopped, no wallets', () => {
  test('sidebar navigates through the Shielded family', async ({ page }) => {
    await page.goto('/tools/shielded/send');
    const nav = page.getByRole('navigation', { name: 'Stages' });
    const family = nav.getByRole('region', { name: 'Shielded' });
    await expect(family.getByRole('button', { name: /^Shielded outputs\b/ })).toHaveAttribute('aria-expanded', 'true');

    for (const [title, slug] of [
      ['Receive', 'receive'],
      ['Shielded balances', 'balances'],
      ['Transaction inspector', 'inspector'],
      ['Shielded send', 'send'],
    ] as const) {
      await nav.getByRole('link', { name: title, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/tools/shielded/${slug}$`));
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page).toHaveTitle(`${title} | Shielded | QA Helper`);
    }
  });

  test('Shielded send: preconditions and a disabled send', async ({ page }) => {
    const collector = createConsoleCollector(page);
    await page.goto('/tools/shielded/send');
    const preconditions = page.getByRole('list', { name: 'Preconditions' });
    await expect(preconditions).toContainText('QA server not running');
    await expect(preconditions).toContainText('No sending wallet');
    await expect(page.getByText('bun run dev:server').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send transaction' })).toBeDisabled();
    for (const preset of ['Shield (amount)', 'Shield (full)', 'Unshield', 'Shielded to shielded']) {
      await expect(page.getByRole('button', { name: preset, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('radiogroup', { name: 'Change privacy' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Wallet address' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan QR' })).toBeVisible();
    collector.assertNoCriticalErrors('Shielded send');
  });

  test('Shielded send: one shielded output explains the split and its fee', async ({ page }) => {
    await page.goto('/tools/shielded/send');
    await page.getByRole('button', { name: 'Shield (full)' }).click();
    await expect(page.getByText('One shielded output')).toBeVisible();
    await expect(page.getByText(/splits this one into two halves/)).toBeVisible();
    await expect(page.getByText(/Shielded fee at least 0\.04 HTR/)).toBeVisible();
  });

  test('Shielded send: the wallet picker says no wallet is on a shielded network', async ({ page }) => {
    await page.goto('/tools/shielded/send');
    await page.getByRole('button', { name: 'Wallet address' }).click();
    await expect(page.getByRole('combobox', { name: 'Wallet' })).toContainText('No wallet on a shielded network');
    await expect(page.getByRole('button', { name: 'Use address' })).toBeDisabled();
  });

  test('Receive: asks for a wallet', async ({ page }) => {
    await page.goto('/tools/shielded/receive');
    await expect(page.getByText('Choose a started wallet to show its address.')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Wallet' })).toBeVisible();
  });

  test('Shielded balances: asks for a wallet', async ({ page }) => {
    await page.goto('/tools/shielded/balances');
    await expect(page.getByText('Choose a wallet to see its balance.')).toBeVisible();
  });

  test('Transaction inspector: unblinding sections say what is missing', async ({ page }) => {
    await page.goto('/tools/shielded/inspector');
    const inspect = page.getByRole('button', { name: 'Inspect' });
    await expect(inspect).toBeDisabled();
    await page.getByLabel('Transaction id').fill('abc');
    await expect(page.getByText('64 hex characters expected')).toBeVisible();
    await expect(page.getByText('Inspect a transaction first.')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Unblind', exact: true })).toHaveCount(2);
  });
});
