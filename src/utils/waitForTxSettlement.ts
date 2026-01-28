/**
 * Transaction Settlement Utilities
 *
 * After sending a transaction, there are three stages:
 * 1. Mining completion (runFromMining()) - Tx broadcast to network
 * 2. Wallet internal sync (new-tx event) - UTXOs, balances, caches updated
 * 3. Block confirmation (first_block) - Tx included in a block
 *
 * Simple transactions (sends, melts, mints): Wait for stage 2
 * NC transactions: Wait for stage 3
 */

import { store } from '../store';
import type { WalletEvent } from '../store/slices/walletStoreSlice';
import { selectLatestEventForTx } from '../store/slices/walletStoreSlice';

export interface WaitForTxOptions {
  /** Timeout in milliseconds. Default: 30000 (30s) for settlement, 120000 (2min) for confirmation */
  timeoutMs?: number;
  /** Delay after event is received to ensure internal processing completes. Default: 100ms */
  postEventDelayMs?: number;
}

/**
 * Wait for a transaction to settle internally in the wallet.
 *
 * This waits for the wallet-lib to receive the `new-tx` event and
 * process its internal state (UTXOs, balances, caches).
 *
 * Use this for simple transactions (sends, melts, mints).
 * For NC transactions that need to read/write NC state, use `waitForTxConfirmation` instead.
 *
 * @param txHash - The transaction hash to wait for
 * @param options - Configuration options
 * @returns The wallet event when received
 * @throws Error if timeout is reached
 *
 * @example
 * ```typescript
 * const txResponse = await sendTx.runFromMining();
 * const txHash = txResponse?.hash;
 * if (txHash) {
 *   await waitForTxSettlement(txHash);
 *   // Now safe to check balances, make another tx, etc.
 * }
 * ```
 */
export async function waitForTxSettlement(
  txHash: string,
  options: WaitForTxOptions = {}
): Promise<WalletEvent> {
  const { timeoutMs = 30000, postEventDelayMs = 100 } = options;

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let unsubscribe: (() => void) | null = null;

    const cleanup = () => {
      if (unsubscribe) unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };

    const checkForEvent = async () => {
      const state = store.getState();
      const event = selectLatestEventForTx(state, txHash);

      if (event) {
        cleanup();
        // Wait for internal processing to complete
        if (postEventDelayMs > 0) {
          await new Promise((r) => setTimeout(r, postEventDelayMs));
        }
        resolve(event);
        return true;
      }
      return false;
    };

    // Check immediately in case event already exists
    checkForEvent().then((found) => {
      if (found) return;

      // Subscribe to store changes
      unsubscribe = store.subscribe(() => {
        checkForEvent();
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for tx ${txHash.slice(0, 8)}... to settle after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  });
}

/**
 * Wait for a transaction to be confirmed in a block.
 *
 * This waits for the transaction to have a `first_block` value,
 * indicating it has been included in a block.
 *
 * Only needed for nano contract transactions where you need to
 * read/write NC state after the transaction.
 *
 * @param txHash - The transaction hash to wait for
 * @param options - Configuration options
 * @returns The wallet event when confirmed
 * @throws Error if timeout is reached or transaction is voided
 *
 * @example
 * ```typescript
 * const response = await rpcClient.call('nc_initialize', params);
 * const ncTxHash = response.hash;
 *
 * await waitForTxConfirmation(ncTxHash);
 * // Now safe to call NC methods or read NC state
 * ```
 */
export async function waitForTxConfirmation(
  txHash: string,
  options: WaitForTxOptions = {}
): Promise<WalletEvent> {
  const { timeoutMs = 120000, postEventDelayMs = 100 } = options;

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let unsubscribe: (() => void) | null = null;

    const cleanup = () => {
      if (unsubscribe) unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };

    const checkForConfirmation = async () => {
      const state = store.getState();
      const event = selectLatestEventForTx(state, txHash);

      if (event && event.data && typeof event.data === 'object') {
        const data = event.data as { first_block?: string; firstBlock?: string; is_voided?: boolean; voided?: boolean };
        const firstBlock = data.first_block ?? data.firstBlock;
        const isVoided = data.is_voided ?? data.voided;

        if (isVoided) {
          cleanup();
          reject(new Error(`Transaction ${txHash.slice(0, 8)}... was voided`));
          return true;
        }

        if (firstBlock) {
          cleanup();
          // Wait for internal processing to complete
          if (postEventDelayMs > 0) {
            await new Promise((r) => setTimeout(r, postEventDelayMs));
          }
          resolve(event);
          return true;
        }
      }
      return false;
    };

    // Check immediately
    checkForConfirmation().then((done) => {
      if (done) return;

      // Subscribe to store changes
      unsubscribe = store.subscribe(() => {
        checkForConfirmation();
      });

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout waiting for tx ${txHash.slice(0, 8)}... confirmation after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  });
}

/**
 * Get the latest event for a transaction (non-blocking).
 *
 * @param txHash - The transaction hash to look up
 * @returns The latest event or null if not found
 */
export function getLatestTxEvent(txHash: string): WalletEvent | null {
  const state = store.getState();
  return selectLatestEventForTx(state, txHash);
}
