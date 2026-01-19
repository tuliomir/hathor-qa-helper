/**
 * Token Flow Tracker Service
 *
 * Analyzes transaction history to calculate net token balances per external address.
 * Tracks both sent and received amounts, and identifies unspent outputs.
 *
 * Key insight: A simple "first outgoing transaction" approach doesn't account for:
 * - Partial returns (sent 30, received 20 back = net 10 still external)
 * - Multiple addresses receiving tokens
 * - Unspent outputs showing current token holders
 *
 * This service processes ALL transactions to build an accurate picture.
 */

import type { AddressTokenFlow, TokenFlowResult, UnspentOutput, } from '../types/tokenFlowTracker';
import { findWalletByAddress } from './addressDatabase';

// Transaction types matching IHistoryTx from wallet-lib
interface HistoryOutput {
  value: number;
  token_data: number;
  decoded: {
    type: string;
    address: string;
  };
}

interface HistoryInput {
  tx_id: string;
  index: number;
  value: number;
  token_data: number;
  decoded: {
    type: string;
    address: string;
  };
}

interface HistoryTx {
  tx_id: string;
  timestamp: number;
  inputs: HistoryInput[];
  outputs: HistoryOutput[];
  tokens?: string[];
}

// Internal tracking structure for each address
interface AddressTracker {
  sent: number;
  received: number;
  // Potential unspent outputs: key = "txId:outputIndex"
  potentialUnspent: Map<string, UnspentOutput>;
}

/**
 * Tracks token flow for a specific token across all transactions.
 * Returns detailed flow data including net balances and unspent outputs.
 *
 * @param walletInstance - The wallet instance to query
 * @param tokenUid - The token UID to track
 * @returns TokenFlowResult with all address flows and totals
 */
export async function trackTokenFlow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  walletInstance: any,
  tokenUid: string
): Promise<TokenFlowResult> {
  const errors: string[] = [];
  const addressTrackers = new Map<string, AddressTracker>();
  const spentOutputs = new Set<string>(); // "txId:outputIndex" format

  try {
    // Step 1: Collect all wallet addresses
    const walletAddresses = new Set<string>();
    try {
      for await (const addr of walletInstance.getAllAddresses()) {
        walletAddresses.add(addr.address);
      }
    } catch (err) {
      console.warn('[TokenFlow] Could not collect all wallet addresses:', err);
      // At minimum, add address 0
      try {
        const addr0 = await walletInstance.getAddressAtIndex(0);
        walletAddresses.add(addr0);
      } catch {
        errors.push('Failed to get wallet addresses');
      }
    }

    // Step 2: Get transaction history and sort chronologically (oldest first)
    const txHistory = await walletInstance.getTxHistory();
    const sortedHistory = [...txHistory].sort(
      (a: { timestamp?: number }, b: { timestamp?: number }) =>
        (a.timestamp || 0) - (b.timestamp || 0)
    );

    // Step 3: Process each transaction
    for (const tx of sortedHistory) {
      const txId = tx.tx_id || tx.txId;
      if (!txId) continue;

      try {
        const fullTx = (await walletInstance.getTx(txId)) as HistoryTx | null;
        if (!fullTx) continue;

        // Check if this transaction involves the target token
        const tokenIndex = fullTx.tokens?.indexOf(tokenUid);
        if (tokenIndex === undefined || tokenIndex === -1) continue;

        // token_data is 1-indexed for custom tokens (0 = HTR)
        const expectedTokenData = tokenIndex + 1;

        // Process inputs - mark outputs as spent and track received amounts
        for (const input of fullTx.inputs || []) {
          if (input.token_data !== expectedTokenData) continue;

          // Mark the referenced output as spent
          const spentKey = `${input.tx_id}:${input.index}`;
          spentOutputs.add(spentKey);

          // If input is from an EXTERNAL address, this means tokens are coming BACK to wallet
          const inputAddress = input.decoded?.address;
          if (inputAddress && !walletAddresses.has(inputAddress)) {
            const tracker = getOrCreateTracker(addressTrackers, inputAddress);
            tracker.received += input.value;
          }
        }

        // Process outputs - track sent amounts and potential unspent outputs
        for (let outputIndex = 0; outputIndex < (fullTx.outputs?.length || 0); outputIndex++) {
          const output = fullTx.outputs[outputIndex];
          if (output.token_data !== expectedTokenData) continue;

          const outputAddress = output.decoded?.address;
          if (!outputAddress) continue;

          // If output is to an EXTERNAL address, tokens are going OUT
          if (!walletAddresses.has(outputAddress)) {
            const tracker = getOrCreateTracker(addressTrackers, outputAddress);
            tracker.sent += output.value;

            // Track as potential unspent output
            const outputKey = `${txId}:${outputIndex}`;
            tracker.potentialUnspent.set(outputKey, {
              txId,
              outputIndex,
              amount: output.value,
            });
          }
        }
      } catch (err) {
        console.warn(`[TokenFlow] Could not process tx ${txId.slice(0, 8)}:`, err);
      }
    }

    // Step 4: Build results - filter spent outputs and calculate net balances
    const addressFlows: AddressTokenFlow[] = [];

    for (const [address, tracker] of addressTrackers) {
      // Filter out spent outputs
      const unspentOutputs: UnspentOutput[] = [];
      for (const [outputKey, output] of tracker.potentialUnspent) {
        if (!spentOutputs.has(outputKey)) {
          unspentOutputs.push(output);
        }
      }

      const netBalance = tracker.sent - tracker.received;

      // Only include addresses with positive net balance (they still hold tokens)
      if (netBalance > 0) {
        // Look up wallet ID from address database
        let walletId: string | undefined;
        try {
          const foundWalletId = await findWalletByAddress(address);
          if (foundWalletId) {
            walletId = foundWalletId;
          }
        } catch {
          // Non-critical: continue without wallet ID
        }

        addressFlows.push({
          address,
          netBalance,
          totalSent: tracker.sent,
          totalReceived: tracker.received,
          unspentOutputs,
          walletId,
        });
      }
    }

    // Sort by net balance descending (largest holders first)
    addressFlows.sort((a, b) => b.netBalance - a.netBalance);

    // Calculate total external balance
    const totalExternalBalance = addressFlows.reduce(
      (sum, flow) => sum + flow.netBalance,
      0
    );

    console.log(
      `[TokenFlow] Token ${tokenUid.slice(0, 8)}: ${addressFlows.length} external addresses, ${totalExternalBalance} total external balance`
    );

    return {
      tokenUid,
      addressFlows,
      totalExternalBalance,
      errors,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[TokenFlow] Error tracking token ${tokenUid}:`, err);
    errors.push(`Failed to track token flow: ${errorMessage}`);

    return {
      tokenUid,
      addressFlows: [],
      totalExternalBalance: 0,
      errors,
    };
  }
}

/**
 * Helper to get or create an address tracker
 */
function getOrCreateTracker(
  trackers: Map<string, AddressTracker>,
  address: string
): AddressTracker {
  let tracker = trackers.get(address);
  if (!tracker) {
    tracker = {
      sent: 0,
      received: 0,
      potentialUnspent: new Map(),
    };
    trackers.set(address, tracker);
  }
  return tracker;
}
