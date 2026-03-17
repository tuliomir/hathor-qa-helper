/**
 * Create Token version defaults and suffix swap logic
 *
 * Extracted from RpcCreateTokenCard for testability.
 */

import type { CreateTokenVersion } from '../services/rpcHandlers';

export const BASE_NAME = 'Test Token';
export const BASE_SYMBOL = 'TST';

export const VERSION_DEFAULTS: Record<
  CreateTokenVersion,
  { nameSuffix: string; symbolSuffix: string; amount: string }
> = {
  '':      { nameSuffix: '',           symbolSuffix: '',  amount: '100' },
  deposit: { nameSuffix: ' - Deposit', symbolSuffix: 'D', amount: '100' },
  fee:     { nameSuffix: ' - Fee',     symbolSuffix: 'F', amount: '9999' },
};

/**
 * Swap version suffixes on name, symbol, and amount when the user changes
 * the token version. Preserves user edits to the base portion.
 *
 * @param currentName  Current token name
 * @param oldVersion   Version being switched away from
 * @param newVersion   Version being switched to
 * @param currentSymbol Current token symbol (optional, defaults to '')
 * @param currentAmount Current amount string (optional, defaults to old default)
 */
export function swapVersionSuffix(
  currentName: string,
  oldVersion: CreateTokenVersion,
  newVersion: CreateTokenVersion,
  currentSymbol = '',
  currentAmount?: string,
): { name: string; symbol: string; amount: string } {
  const oldDefaults = VERSION_DEFAULTS[oldVersion];
  const newDefaults = VERSION_DEFAULTS[newVersion];

  // Swap name suffix — only if name currently ends with the old suffix.
  // Guard: empty suffix matches everything via endsWith(''), so skip the
  // swap when the old suffix is empty (nothing to strip).
  let newName = currentName;
  if (oldDefaults.nameSuffix && currentName.endsWith(oldDefaults.nameSuffix)) {
    newName = currentName.slice(0, -oldDefaults.nameSuffix.length) + newDefaults.nameSuffix;
  } else if (!oldDefaults.nameSuffix) {
    // Old version had no suffix — just append the new one
    newName = currentName + newDefaults.nameSuffix;
  }

  // Swap symbol suffix — same guard for empty suffix
  let newSymbol = currentSymbol;
  if (oldDefaults.symbolSuffix && currentSymbol.endsWith(oldDefaults.symbolSuffix)) {
    newSymbol = currentSymbol.slice(0, -oldDefaults.symbolSuffix.length) + newDefaults.symbolSuffix;
  } else if (!oldDefaults.symbolSuffix) {
    newSymbol = currentSymbol + newDefaults.symbolSuffix;
  }
  newSymbol = newSymbol.slice(0, 5);

  // Swap amount only if it still matches the old default
  const resolvedAmount = currentAmount ?? oldDefaults.amount;
  const newAmount = resolvedAmount === oldDefaults.amount ? newDefaults.amount : resolvedAmount;

  return { name: newName, symbol: newSymbol, amount: newAmount };
}
