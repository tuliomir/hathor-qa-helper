import { expect, test } from '@playwright/test';
import { createConsoleCollector } from './helpers/console-collector';

test.use({ actionTimeout: 3_000 });

// Every QA server call answers like the dev proxy does when nothing listens
// (204 from the health middleware), so these tests see a stopped server even
// when one is running locally.
test.beforeEach(async ({ page }) => {
  await page.route('**/qa-server/**', (route) => route.fulfill({ status: 204 }));
});

test.describe('Shielded stages, QA server stopped', () => {
  test('sidebar navigates through the Shielded family', async ({ page }) => {
    await page.goto('/tools/shielded/qa-server');
    const nav = page.getByRole('navigation', { name: 'Stages' });
    const family = nav.getByRole('region', { name: 'Shielded' });
    await expect(family.getByRole('button', { name: /^Shielded outputs\b/ })).toHaveAttribute('aria-expanded', 'true');

    for (const [title, slug] of [
      ['Shielded send', 'send'],
      ['Shielded balances', 'balances'],
      ['Transaction inspector', 'inspector'],
      ['QA server', 'qa-server'],
    ] as const) {
      await nav.getByRole('link', { name: title, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/tools/shielded/${slug}$`));
      await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
      await expect(page).toHaveTitle(`${title} | Shielded | QA Helper`);
    }
  });

  test('QA server: shows the start command and blocks starting', async ({ page }) => {
    const collector = createConsoleCollector(page);
    await page.goto('/tools/shielded/qa-server');
    const preconditions = page.getByRole('list', { name: 'Preconditions' });
    await expect(preconditions).toContainText('QA server not running');
    await expect(page.getByText('The QA server is not running').first()).toBeVisible();
    await expect(page.getByText('bun run dev:server').first()).toBeVisible();
    await expect(page.getByText("This sends the wallet's seed to the local QA server")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start on server' })).toBeDisabled();
    await expect(page.getByText('Start the QA server first').first()).toBeVisible();
    await expect(page.getByText('Sessions appear here once the QA server is running.').first()).toBeVisible();
    collector.assertNoCriticalErrors('QA server');
  });

  test('Shielded send: preconditions and a disabled send', async ({ page }) => {
    await page.goto('/tools/shielded/send');
    const preconditions = page.getByRole('list', { name: 'Preconditions' });
    await expect(preconditions).toContainText('QA server not running');
    await expect(preconditions).toContainText('No server session selected');
    await expect(page.getByRole('button', { name: 'Send transaction' })).toBeDisabled();
    for (const preset of ['Shield (amount)', 'Shield (full)', 'Unshield', 'Shielded to shielded']) {
      await expect(page.getByRole('button', { name: preset, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('radiogroup', { name: 'Change privacy' })).toBeVisible();
  });

  test('Shielded send: one shielded output explains the two-output minimum', async ({ page }) => {
    await page.goto('/tools/shielded/send');
    await page.getByRole('button', { name: 'Shield (amount)' }).click();
    await expect(page.getByText('One shielded output')).toBeVisible();
  });

  test('Shielded balances: server side not available', async ({ page }) => {
    await page.goto('/tools/shielded/balances');
    await expect(page.getByText('The server side appears once the QA server is running.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Browser', exact: true })).toBeVisible();
  });

  test('Transaction inspector: unblinding sections say what is missing', async ({ page }) => {
    await page.goto('/tools/shielded/inspector');
    const inspect = page.getByRole('button', { name: 'Inspect' });
    await expect(inspect).toBeDisabled();
    await page.getByLabel('Transaction id').fill('abc');
    await expect(page.getByText('64 hex characters expected')).toBeVisible();
    await expect(page.getByText('Not available: start the QA server to unblind with a server wallet.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Unblind on server' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Unblind in browser' })).toBeDisabled();
  });
});
