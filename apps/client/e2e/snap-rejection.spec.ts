/**
 * Snap Rejection E2E Tests
 *
 * Tests MetaMask snap error handling using a mocked window.ethereum provider.
 * No real MetaMask extension needed — the mock is injected before the app loads.
 *
 * Covers: successful calls, user rejections (code 4001), PromptRejectedError
 * (code -32603), generic snap errors, and null responses.
 */

import { test, expect } from '@playwright/test';
import { getMockProviderScript, MOCK_SNAP_ID } from './helpers/mock-metamask-provider';

// Extend Window type for the mock API
declare global {
  interface Window {
    __mockMetaMask: {
      setNextResponse: (response: unknown) => void;
      setNextError: (error: unknown) => void;
      getCallLog: () => Array<{
        snapId: string;
        method: string;
        params: unknown;
        timestamp: number;
      }>;
      clearCallLog: () => void;
      reset: () => void;
    };
  }
}

/**
 * Helper: connect the snap and navigate to the Get Network page via sidebar.
 * Keeps within the SPA so Redux state (snap connection) persists.
 */
async function connectAndNavigateToGetNetwork(page: import('@playwright/test').Page) {
  await page.addInitScript({ content: getMockProviderScript() });
  await page.goto('/tools/snaps/connection');
  await expect(page.getByRole('button', { name: /Connect Snap/i })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /Connect Snap/i }).click();
  await expect(page.getByText('Disconnect')).toBeVisible({ timeout: 5000 });

  // Navigate to "Get network" via the stage nav (SPA navigation preserves Redux state).
  const getNetworkLink = page.getByRole('navigation', { name: 'Stages' }).getByRole('link', { name: 'Get network' });
  await expect(getNetworkLink).toBeVisible({ timeout: 3000 });
  await getNetworkLink.click();

  await expect(executeButton(page)).toBeVisible({ timeout: 5000 });
}

// Locator helpers: MethodCard marks its outcome region with data-result.
const executeButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Get network', exact: true });

const successIndicator = (page: import('@playwright/test').Page) => page.locator('[data-result="success"]');

const rejectionBanner = (page: import('@playwright/test').Page) =>
  page.locator('[data-result="rejected"]', { hasText: 'Rejected in MetaMask' });

const rejectionMessage = (page: import('@playwright/test').Page) =>
  page.locator('[data-result="rejected"]', { hasText: 'prompt was declined' });

const errorSection = (page: import('@playwright/test').Page) => page.locator('[data-result="error"]');

test.describe('Snap rejection detection', () => {
  test('snap connection succeeds with mock provider', async ({ page }) => {
    await page.addInitScript({ content: getMockProviderScript() });
    await page.goto('/tools/snaps/connection');
    await expect(page.getByRole('button', { name: /Connect Snap/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Connect Snap/i }).click();

    await expect(page.getByText('Connected Snap')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(MOCK_SNAP_ID).first()).toBeVisible();
  });

  test('successful snap call shows success display', async ({ page }) => {
    await connectAndNavigateToGetNetwork(page);

    await page.evaluate(() => {
      window.__mockMetaMask.setNextResponse(JSON.stringify({ success: true, response: { network: 'testnet' } }));
    });

    await executeButton(page).click();

    await expect(successIndicator(page)).toBeVisible({ timeout: 5000 });
  });

  test('MetaMask dialog rejection (code 4001) shows rejection banner', async ({ page }) => {
    await connectAndNavigateToGetNetwork(page);

    await page.evaluate(() => {
      const err = new Error('User rejected the request.');
      (err as unknown as Record<string, unknown>).code = 4001;
      window.__mockMetaMask.setNextError(err);
    });

    await executeButton(page).click();

    await expect(rejectionBanner(page)).toBeVisible({ timeout: 5000 });
    await expect(rejectionMessage(page)).toBeVisible();
  });

  test('Snap PromptRejectedError (code -32603) shows rejection banner', async ({ page }) => {
    await connectAndNavigateToGetNetwork(page);

    await page.evaluate(() => {
      const err = {
        code: -32603,
        message: 'User rejected the prompt.',
        data: {
          errorType: 'PromptRejectedError',
          cause: null,
        },
      };
      window.__mockMetaMask.setNextError(err);
    });

    await executeButton(page).click();

    await expect(rejectionBanner(page)).toBeVisible({ timeout: 5000 });
    await expect(rejectionMessage(page)).toBeVisible();
  });

  test('generic snap error shows red error display', async ({ page }) => {
    await connectAndNavigateToGetNetwork(page);

    await page.evaluate(() => {
      const err = new Error('Insufficient funds for transaction');
      (err as unknown as Record<string, unknown>).code = -32603;
      window.__mockMetaMask.setNextError(err);
    });

    await executeButton(page).click();

    await expect(errorSection(page)).toBeVisible({ timeout: 5000 });
    await expect(errorSection(page).getByText(/Insufficient funds/i)).toBeVisible();
    await expect(rejectionBanner(page)).not.toBeVisible();
  });

  test('null response is not shown as error', async ({ page }) => {
    await connectAndNavigateToGetNetwork(page);

    await page.evaluate(() => {
      window.__mockMetaMask.setNextResponse(null);
    });

    await executeButton(page).click();

    // null is a legitimate response — the success toast fires, no error/rejection shown.
    // With a null response MethodCard renders no outcome region; the toast confirms success.
    await expect(page.getByText(/Get network succeeded/i)).toBeVisible({ timeout: 5000 });
    await expect(rejectionBanner(page)).not.toBeVisible();
    await expect(errorSection(page)).not.toBeVisible();
  });

  test('error thrown by provider.request propagates (not swallowed)', async ({ page }) => {
    await connectAndNavigateToGetNetwork(page);

    await page.evaluate(() => {
      const err = new Error('Pin prompt rejected by user');
      (err as unknown as Record<string, unknown>).code = 4001;
      window.__mockMetaMask.setNextError(err);
    });

    await executeButton(page).click();

    await expect(rejectionBanner(page)).toBeVisible({ timeout: 5000 });
  });
});
