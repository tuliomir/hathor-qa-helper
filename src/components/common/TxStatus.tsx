/**
 * TxStatus Component
 * Displays transaction status badge with smart data fetching
 *
 * Data sources (in priority order):
 * 1. Redux wallet events (latest event for this tx)
 * 2. Wallet getTx() with smart caching
 * 3. Event listener updates (automatic via Redux)
 *
 * IMPORTANT: Wallet API Methods
 *
 * getTx(hash) vs getTxById(hash):
 * - getTx(hash): Returns FULL transaction data including confirmation status
 *   - Response structure: { tx_id, version, timestamp, is_voided, first_block, inputs, outputs, ... }
 *   - Contains is_voided and first_block fields needed to determine status
 *   - Use this when you need to check transaction confirmation status
 *
 * - getTxById(hash): Returns BASIC transaction data WITHOUT confirmation status
 *   - Response structure: { success, tx: {...}, txTokens: [...] }
 *   - Does NOT contain is_voided or first_block in the main tx object
 *   - Use this only when you need token metadata (txTokens array)
 *
 * Caching Strategy:
 * - Valid/Voided transactions: Cached indefinitely (only change via Redux events)
 * - Unconfirmed transactions: 5-second TTL (may become confirmed)
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
      const eventStatus = getTransactionStatus({
        firstBlock: latestEvent.data.firstBlock,
        first_block: latestEvent.data.first_block,
        voided: latestEvent.data.voided,
        is_voided: latestEvent.data.is_voided,
      });
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
        // Use getTx() instead of getTxById() - getTx() includes status fields (first_block, is_voided)
        // while getTxById() only returns basic transaction data without confirmation status
        const txData = await walletInstance.getTx(hash);
        console.log(`[TxStatus ${hash.slice(0, 8)}] getTx() response:`, txData);

        // getTx() returns the transaction data directly at the top level
        // Structure: { tx_id, version, timestamp, is_voided, first_block, inputs, outputs, ... }
        if (txData && txData.tx_id) {
          const txStatus = getTransactionStatus({
            first_block: txData.first_block,
            is_voided: txData.is_voided,
          });

          console.log(`[TxStatus ${hash.slice(0, 8)}] Computed status: ${txStatus} from tx data:`, {
            first_block: txData.first_block,
            is_voided: txData.is_voided,
          });

          // Cache the result
          txStatusCache.set(hash, {
            status: txStatus,
            timestamp: Date.now(),
          });

          setStatus(txStatus);
        } else {
          console.log(`[TxStatus ${hash.slice(0, 8)}] getTx() failed or returned invalid data:`, txData);
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
