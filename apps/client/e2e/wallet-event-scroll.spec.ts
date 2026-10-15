import { expect, test, type Page } from '@playwright/test';

/**
 * A transaction reaching a running wallet must not scroll the stage back to
 * the top. Stages used to re-run effects keyed on the whole wallet record,
 * which every new-tx replaces (events, balance), and hide their content
 * behind a loading state meanwhile: the pane shrank and its scroll was
 * clamped.
 *
 * Starts a fresh, empty testnet wallet, so it needs the testnet full node.
 * Reaches app modules by their dev-server URLs, so it runs against `bun dev` only.
 */

const WALLET_ID = 'e2e-scroll';

declare global {
  interface Window {
    /** Imports an app module from the URL the page loaded, so it shares the app's instance. */
    __appModule: (part: string) => Promise<Record<string, any>>; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

async function startFreshWallet(page: Page, path: string) {
  await page.addInitScript(() => {
    window.__appModule = (part) => {
      const url = performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .find((n) => n.includes(part));
      if (!url) throw new Error(`module not loaded: ${part}`);
      return import(/* @vite-ignore */ url);
    };
  });
  await page.goto(path);
  const seed = await page.evaluate(async () => {
    const lib = await window.__appModule('/@hathor_wallet-lib.js?');
    return (lib.walletUtils ?? lib.default.walletUtils).generateWalletWords() as string;
  });
  await page.evaluate(
    ([id, seedWords]) => {
      localStorage.setItem(
        'qa-helper-wallets',
        JSON.stringify([{ id, friendlyName: 'E2E scroll', seedWords, network: 'TESTNET', kind: 'seed', createdAt: 1 }])
      );
      localStorage.setItem('qa-helper-wallet-selection', JSON.stringify({ fundingWalletId: id, testWalletId: id }));
    },
    [WALLET_ID, seed]
  );
  await page.reload();
  await page.waitForFunction(
    async (id) => {
      const { walletInstancesMap } = await window.__appModule('/src/store/slices/walletStoreSlice.ts');
      return walletInstancesMap.get(id)?.isReady?.() === true;
    },
    WALLET_ID,
    { timeout: 90_000, polling: 1_000 }
  );
}

/**
 * Scrolls the stage pane to the bottom, delivers a transaction (the wallet's
 * new-tx listeners plus the balance change a real one brings) and returns the
 * lowest scroll position seen. Reading scrollTop on every DOM change forces
 * layout, as a frame painted mid-update would.
 */
async function lowestScrollOnNewTx(page: Page) {
  return page.evaluate(async (id) => {
    const pane = document.querySelector<HTMLElement>('[data-testid="stage-content"]')!;
    pane.scrollTop = pane.scrollHeight;
    await new Promise((r) => setTimeout(r, 300));
    const before = pane.scrollTop;
    let lowest = before;
    const observer = new MutationObserver(() => (lowest = Math.min(lowest, pane.scrollTop)));
    observer.observe(pane, { childList: true, subtree: true, characterData: true });

    const { walletInstancesMap, updateWalletBalance } = await window.__appModule('/src/store/slices/walletStoreSlice.ts');
    const { store } = await window.__appModule('/src/store/index.ts');
    walletInstancesMap.get(id).emit('new-tx', { tx_id: 'e2e', inputs: [], outputs: [] });
    store.dispatch(updateWalletBalance({ id, balance: '12345' }));

    await new Promise((r) => setTimeout(r, 1_500));
    observer.disconnect();
    return { before, lowest };
  }, WALLET_ID);
}

test.describe('Wallet events keep the scroll position', () => {
  test.setTimeout(120_000);
  test.use({ viewport: { width: 1280, height: 700 } });

  test('Address validation', async ({ page }) => {
    await startFreshWallet(page, '/tools/main/address-validation');
    await expect(page.getByText('Address at index 0').first()).toBeVisible();
    const { before, lowest } = await lowestScrollOnNewTx(page);
    expect(before).toBeGreaterThan(200);
    expect(lowest).toBe(before);
  });
});
