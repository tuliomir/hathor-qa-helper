/**
 * Decimal ↔ base-unit conversion for token amounts, BigInt end to end.
 * Hathor tokens use 2 decimals (wallet-lib DECIMAL_PLACES); the helpers
 * take any `decimals` so other precisions work too.
 */

export type ParseAmountResult =
  | { ok: true; value: bigint }
  | { ok: false; error: 'empty' | 'invalid' | 'negative' | 'decimals'; message: string };

const DECIMAL_RE = /^(\d*)(?:\.(\d*))?$/;

/** Parses "12.50" into base units (1250n for 2 decimals). No grouping, no exponents. */
export function parseAmount(text: string, decimals: number): ParseAmountResult {
  const s = text.trim();
  if (s === '') return { ok: false, error: 'empty', message: 'Enter an amount' };
  if (s.startsWith('-')) {
    const rest = parseAmount(s.slice(1), decimals);
    return rest.ok || rest.error === 'decimals'
      ? { ok: false, error: 'negative', message: "Amount can't be negative" }
      : rest;
  }
  const match = DECIMAL_RE.exec(s);
  if (!match || (match[1] === '' && !match[2])) return { ok: false, error: 'invalid', message: 'Not a number' };

  const [, whole, fraction = ''] = match;
  if (fraction.length > decimals) {
    return { ok: false, error: 'decimals', message: `Too many decimals: at most ${decimals}` };
  }
  const digits = `${whole || '0'}${fraction.padEnd(decimals, '0')}`;
  return { ok: true, value: BigInt(digits) };
}

/** Formats base units as a decimal string with exactly `decimals` places. */
export function formatAmount(value: bigint | string, decimals: number, opts?: { grouping?: boolean }): string {
  const v = typeof value === 'bigint' ? value : BigInt(value);
  const negative = v < 0n;
  const digits = (negative ? -v : v).toString().padStart(decimals + 1, '0');
  let whole = decimals > 0 ? digits.slice(0, -decimals) : digits;
  const fraction = decimals > 0 ? digits.slice(-decimals) : '';
  if (opts?.grouping) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}
