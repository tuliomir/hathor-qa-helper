/**
 * TxStatus Component
 * Displays transaction status badge with smart data fetching
 *
 * Data Fetching Strategy (priority order):
 * 1. Redux wallet events (instant updates for new transactions)
 * 2. Component cache (avoid redundant API calls)
 * 3. Wallet cache via getTx() (fast, no HTTP)
 * 4. Full node via getFullTxById() (only for unconfirmed txs)
 *
 * Two-Step Fetch Strategy:
 * Step 1: Check wallet cache with getTx()
 *   - If first_block exists → transaction is confirmed, use cached data
 *   - Avoids HTTP calls for already-confirmed transactions
 *
 * Step 2: If no first_block, poll full node with getFullTxById()
 *   - Fetches fresh data to detect recent confirmations
 *   - Only runs for genuinely unconfirmed transactions
 *   - Re-checks every 5 seconds until confirmed
 *
 * IMPORTANT: Wallet API Methods for Transaction Data
 *
 * - getFullTxById(hash): Fetches FRESH data from full node via HTTP
 *   - Response: { success, tx: FullNodeTx, meta: FullNodeMeta, ... }
 *   - meta.first_block: Block hash where tx was confirmed (null if unconfirmed)
 *   - meta.voided_by: Array of tx hashes that voided this tx (empty if not voided)
 *   - Always gets the latest confirmation status from the network
 *   - Use when you MUST have up-to-date confirmation/voided status
 *
 * - getTx(hash): Returns transaction data from WALLET CACHE (fast, may be stale)
 *   - Response: { tx_id, version, timestamp, is_voided, first_block, inputs, outputs, ... }
 *   - Does NOT fetch from server, uses wallet's internal cache
 *   - Good for checking if tx is already confirmed (first_block present)
 *   - Will NOT show NEW confirmations after wallet initialization
 *
 * - getTxById(hash): Returns BASIC transaction data with token metadata
 *   - Response: { success, tx: {...}, txTokens: [...] }
 *   - Primarily for token information, not for transaction status
 *   - Use when you need token metadata (txTokens array)
 *
 * Why This Approach?
 * - Wallet events (new-tx, update-tx) do NOT fire when a transaction gets confirmed
 * - The wallet only notifies on new transactions, not on block confirmations
 * - We must poll the full node to detect confirmation updates
 * - But we optimize by checking wallet cache first to avoid unnecessary HTTP calls
 *
 * Caching Strategy:
 * - Valid/Voided transactions: Cached indefinitely (won't change)
 * - Unconfirmed transactions: 5-second TTL (re-check for confirmation)
 */

import { useState, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectLatestEventForTx, walletInstancesMap } from '../../store/slices/walletStoreSlice';
import { getTransactionStatus, getStatusColorClass, type TransactionStatus } from '../../utils/transactionStatus';

interface TxStatusProps {
  hash: string;
  walletId?: string; // Optional: if provided, only check this wallet's instance
}

// Global cache for getTxById results to avoid repeated API calls
// Key: txHash, Value: { status, timestamp }
// Only Unconfirmed transactions have TTL - Valid/Voided are cached indefinitely
const txStatusCache = new Map<string, { status: TransactionStatus; timestamp: number }>();
const UNCONFIRMED_CACHE_TTL = 5000; // 5 seconds TTL only for Unconfirmed status

export default function TxStatus({ hash, walletId }: TxStatusProps) {
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check Redux events first (automatically updates when new events arrive)
  const latestEvent = useAppSelector((state) => selectLatestEventForTx(state, hash));

  // Use event ID as dependency to avoid infinite loop (selector returns new object reference each time)
  const eventId = latestEvent?.id;

  // Derive status from Redux event if available
  useEffect(() => {
    if (latestEvent?.data) {
      console.log(`[TxStatus ${hash.slice(0, 8)}] Deriving status from Redux event:`, latestEvent.data);
      const eventStatus = getTransactionStatus(latestEvent.data);
      console.log(`[TxStatus ${hash.slice(0, 8)}] Status from event: ${eventStatus}`);
      setStatus(eventStatus);
      return;
    }

    // No event in Redux, fall back to getTxById with caching
    async function fetchTxStatus() {
      // Check cache first
      const cached = txStatusCache.get(hash);
      if (cached) {
        // Only apply TTL to Unconfirmed transactions
        // Valid and Voided are cached indefinitely (only change via events)
        if (cached.status !== 'Unconfirmed') {
          console.log(`[TxStatus ${hash.slice(0, 8)}] Using cached ${cached.status} (no TTL for confirmed txs)`);
          setStatus(cached.status);
          return;
        }

        // For Unconfirmed, check TTL
        if (Date.now() - cached.timestamp < UNCONFIRMED_CACHE_TTL) {
          console.log(`[TxStatus ${hash.slice(0, 8)}] Using cached Unconfirmed (within TTL)`);
          setStatus(cached.status);
          return;
        }

        console.log(`[TxStatus ${hash.slice(0, 8)}] Cache expired for Unconfirmed, re-fetching`);
      }

      // Get wallet instance (use provided walletId or first available wallet)
      let walletInstance = null;
      if (walletId) {
        walletInstance = walletInstancesMap.get(walletId);
      } else {
        // Use first available wallet instance
        const instances = Array.from(walletInstancesMap.values());
        walletInstance = instances.find((w) => w !== null) || null;
      }

      if (!walletInstance) {
        // No wallet available, can't fetch status
        console.log(`[TxStatus ${hash.slice(0, 8)}] No wallet instance available`);
        setStatus(null);
        return;
      }

      setIsLoading(true);
      try {
        // Step 1: Try getTx() from wallet cache first (fast, no HTTP call)
        const txData = await walletInstance.getTx(hash);
        console.log(`[TxStatus ${hash.slice(0, 8)}] getTx() from wallet cache:`, txData);

        // If wallet cache has first_block, the transaction is already confirmed
        // Use this cached data to avoid unnecessary HTTP calls
        if (txData && txData.first_block) {
          console.log(`[TxStatus ${hash.slice(0, 8)}] Found first_block in wallet cache, using cached data`);

          const txStatus = getTransactionStatus({
            first_block: txData.first_block,
            is_voided: txData.is_voided,
          });

          console.log(`[TxStatus ${hash.slice(0, 8)}] Status from wallet cache: ${txStatus}`, {
            first_block: txData.first_block,
            is_voided: txData.is_voided,
          });

          // Cache the result
          txStatusCache.set(hash, {
            status: txStatus,
            timestamp: Date.now(),
          });

          setStatus(txStatus);
          return;
        }

        // Step 2: No first_block in cache - transaction is unconfirmed
        // Fetch fresh data from full node to check for recent confirmation
        console.log(`[TxStatus ${hash.slice(0, 8)}] No first_block in wallet cache, fetching from full node`);
        const response = await walletInstance.getFullTxById(hash);
        console.log(`[TxStatus ${hash.slice(0, 8)}] getFullTxById() response:`, response);

        if (response.success && response.meta) {
          // Extract status from FullNodeMeta
          // - first_block: if present (string), tx is confirmed in this block
          // - voided_by: array of txs that voided this one (if not empty, tx is voided)
          const isVoided = response.meta.voided_by && response.meta.voided_by.length > 0;
          const firstBlock = response.meta.first_block;

          const txStatus = getTransactionStatus({
            first_block: firstBlock,
            is_voided: isVoided,
          });

          console.log(`[TxStatus ${hash.slice(0, 8)}] Computed status from full node: ${txStatus}`, {
            first_block: firstBlock,
            voided_by: response.meta.voided_by,
            is_voided: isVoided,
          });

          // Cache the result
          txStatusCache.set(hash, {
            status: txStatus,
            timestamp: Date.now(),
          });

          setStatus(txStatus);
        } else {
          console.log(`[TxStatus ${hash.slice(0, 8)}] getFullTxById() failed:`, response);
          setStatus(null);
        }
      } catch (err) {
        console.error(`[TxStatus ${hash.slice(0, 8)}] Error fetching status:`, err);
        setStatus(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTxStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, hash, walletId]); // Use eventId instead of latestEvent to prevent infinite loop

  if (isLoading) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
        Loading...
      </span>
    );
  }

  if (!status) {
    return (
      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
        Unknown
      </span>
    );
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColorClass(status)}`}>
      {status}
    </span>
  );
}
