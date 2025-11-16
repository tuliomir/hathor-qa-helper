/**
 * Balance Utilities
 * Helper functions for converting and displaying BigInt balance values
 */

import { numberUtils } from '@hathor/wallet-lib';

/**
 * Default decimal places for HTR token
 */
export const HTR_DECIMAL_PLACES = 2;

/**
 * Converts a balance string to BigInt
 * @param balanceString - Balance as string (from Redux state)
 * @returns BigInt representation of the balance
 */
export function balanceToBigInt(balanceString: string | undefined): bigint {
  if (!balanceString) return 0n;
  try {
    return BigInt(balanceString);
  } catch {
    return 0n;
  }
}

/**
 * Converts a BigInt balance to a formatted display string
 * Uses wallet-lib's prettyValue for consistent formatting
 * @param balanceString - Balance as string (from Redux state)
 * @param decimalPlaces - Number of decimal places (default: 2 for HTR)
 * @returns Formatted balance string (e.g., "1,234.56")
 */
export function formatBalance(
  balanceString: string | undefined,
  decimalPlaces: number = HTR_DECIMAL_PLACES
): string {
  const balanceBigInt = balanceToBigInt(balanceString);
  return numberUtils.prettyValue(balanceBigInt, decimalPlaces);
}

/**
 * Compares two balance strings
 * @param balance1 - First balance as string
 * @param balance2 - Second balance as string
 * @returns -1 if balance1 < balance2, 0 if equal, 1 if balance1 > balance2
 */
export function compareBalances(
  balance1: string | undefined,
  balance2: string | undefined
): number {
  const b1 = balanceToBigInt(balance1);
  const b2 = balanceToBigInt(balance2);

  if (b1 < b2) return -1;
  if (b1 > b2) return 1;
  return 0;
}

/**
 * Checks if a balance is greater than zero
 * @param balanceString - Balance as string
 * @returns true if balance > 0
 */
export function hasBalance(balanceString: string | undefined): boolean {
  return balanceToBigInt(balanceString) > 0n;
}

/**
 * Adds two balance strings
 * @param balance1 - First balance as string
 * @param balance2 - Second balance as string
 * @returns Sum as string
 */
export function addBalances(
  balance1: string | undefined,
  balance2: string | undefined
): string {
  const b1 = balanceToBigInt(balance1);
  const b2 = balanceToBigInt(balance2);
  return (b1 + b2).toString();
}

/**
 * Subtracts balance2 from balance1
 * @param balance1 - First balance as string
 * @param balance2 - Second balance as string
 * @returns Difference as string
 */
export function subtractBalances(
  balance1: string | undefined,
  balance2: string | undefined
): string {
  const b1 = balanceToBigInt(balance1);
  const b2 = balanceToBigInt(balance2);
  return (b1 - b2).toString();
}
