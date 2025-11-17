/**
 * Balance Utilities
 * Helper functions for displaying BigInt balance values
 * Note: Balances are stored as strings in Redux but exposed as BigInt via selectors
 */

import { numberUtils } from '@hathor/wallet-lib';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants'

/**
 * Formats a BigInt balance to a display string
 * Uses wallet-lib's prettyValue for consistent formatting with thousand separators
 * @param balance - Balance as BigInt (from WalletInfo)
 * @param decimalPlaces - Number of decimal places (default: 2 for HTR)
 * @returns Formatted balance string (e.g., "1,234.56")
 */
export function formatBalance(
  balance: bigint | string | undefined,
  decimalPlaces: number = DECIMAL_PLACES
): string {
  if (balance === undefined) return '0.00';
  // Ensure prettyValue receives a bigint (convert from string when necessary)
  if (typeof balance === 'string') {
    try {
      return numberUtils.prettyValue(BigInt(balance), decimalPlaces);
    } catch (_e) {
      // Fallback: attempt to parse as number if BigInt conversion fails
      return numberUtils.prettyValue(BigInt(Math.floor(Number(balance))), decimalPlaces);
    }
  }
  return numberUtils.prettyValue(balance, decimalPlaces);
}
