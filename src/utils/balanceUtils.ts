/**
 * Balance Utilities
 * Helper functions for displaying BigInt balance values
 * Note: Balances are stored as strings in Redux but exposed as BigInt via selectors
 */

import { numberUtils } from '@hathor/wallet-lib';

/**
 * Default decimal places for HTR token
 */
export const HTR_DECIMAL_PLACES = 2;

/**
 * Formats a BigInt balance to a display string
 * Uses wallet-lib's prettyValue for consistent formatting with thousand separators
 * @param balance - Balance as BigInt (from WalletInfo)
 * @param decimalPlaces - Number of decimal places (default: 2 for HTR)
 * @returns Formatted balance string (e.g., "1,234.56")
 */
export function formatBalance(
  balance: bigint | undefined,
  decimalPlaces: number = HTR_DECIMAL_PLACES
): string {
  if (balance === undefined) return '0.00';
  return numberUtils.prettyValue(balance, decimalPlaces);
}
