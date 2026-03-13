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
