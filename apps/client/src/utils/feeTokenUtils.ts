/**
 * Fee Token Utilities
 *
 * Centralized logic for identifying fee-based tokens.
 * Fee tokens are created with version "fee" (TokenVersion.FEE) and require HTR to transfer.
 */

import { TokenVersion } from '@hathor/wallet-lib/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WalletInstance = any;

/**
 * Check if a token is a fee-based token by reading its version from wallet storage.
 */
export async function isFeeToken(walletInstance: WalletInstance, tokenUid: string): Promise<boolean> {
  try {
    const storedToken = await walletInstance.storage.getToken(tokenUid);
    return storedToken?.version === TokenVersion.FEE;
  } catch {
    return false;
  }
}

/**
 * Check if a token is a fee-based token by asking the full node, for wallets
 * without storage (address-only wallets). The node reports the version.
 */
export async function isFeeTokenOnNode(fullNodeUrl: string, tokenUid: string): Promise<boolean> {
  try {
    const res = await fetch(`${fullNodeUrl}thin_wallet/token?id=${encodeURIComponent(tokenUid)}`);
    const data = (await res.json()) as { success?: boolean; version?: number | null };
    return data.success === true && data.version === TokenVersion.FEE;
  } catch {
    return false;
  }
}
