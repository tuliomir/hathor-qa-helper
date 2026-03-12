/**
 * Cleanup Token Categorizer
 *
 * Pure functions that categorize tokens for cleanup operations.
 * Extracted from TestWalletCleanup component for testability.
 */

export interface CleanupTokenInfo {
  uid: string;
  symbol: string;
  name: string;
  balance: bigint;
  meltableAmount: number;
  remainder: number;
  hasMeltAuthority: boolean;
  canReturnToSender: boolean;
  isSwapToken: boolean;
  isFeeToken: boolean;
  originalSender?: string;
}

/** Tokens that have melt authority and can be melted (excludes swap and fee tokens) */
export function getMeltableTokens(tokens: CleanupTokenInfo[]): CleanupTokenInfo[] {
  return tokens.filter(
    (t) => !t.isSwapToken && !t.isFeeToken && t.hasMeltAuthority && t.meltableAmount > 0
  );
}

/** Swap tokens that will be transferred to the funding wallet */
export function getSwapTokens(tokens: CleanupTokenInfo[]): CleanupTokenInfo[] {
  return tokens.filter((t) => t.isSwapToken && t.balance > 0n);
}

/** Fee tokens that will be left in the wallet (cost HTR to transfer) */
export function getFeeTokens(tokens: CleanupTokenInfo[]): CleanupTokenInfo[] {
  return tokens.filter((t) => t.isFeeToken && t.balance > 0n);
}

/** Tokens that can be returned to their original sender */
export function getReturnableTokens(tokens: CleanupTokenInfo[]): CleanupTokenInfo[] {
  return tokens.filter((t) => t.canReturnToSender && t.originalSender);
}

/** Tokens that will remain in the wallet after cleanup (excludes swap and fee tokens) */
export function getRemainingTokens(tokens: CleanupTokenInfo[]): CleanupTokenInfo[] {
  return tokens.filter(
    (t) =>
      !t.isSwapToken &&
      !t.isFeeToken &&
      (!t.hasMeltAuthority || t.remainder > 0 || (t.hasMeltAuthority && t.meltableAmount === 0))
  );
}

/** Non-swap, non-fee tokens (shown in the main "Tokens to Melt" table) */
export function getDisplayableTokens(tokens: CleanupTokenInfo[]): CleanupTokenInfo[] {
  return tokens.filter((t) => !t.isSwapToken && !t.isFeeToken);
}
