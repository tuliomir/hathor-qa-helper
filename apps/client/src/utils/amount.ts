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

/**
 * Cash-register entry: every digit typed shifts in from the right, so "500"
 * reads 5.00 and "30" reads 0.30 with 2 decimals. `nextText` is the field's
 * raw text after an edit; anything but digits is ignored. Deleting down to
 * zero empties the field, or backspace would be stuck on 0.00.
 */
export function keyedAmount(
  previousText: string,
  nextText: string,
  decimals: number
): { text: string; value: bigint | null } {
  const digits = nextText.replace(/\D/g, '');
  if (digits === '') return { text: '', value: null };
  const value = BigInt(digits);
  if (value === 0n && nextText.length < previousText.length) return { text: '', value: null };
  return { text: formatAmount(value, decimals), value };
}

/**
 * Base units for pasted text that is already a decimal amount ("12.5"), so a
 * value copied from an explorer or balance is not read as base units. Null
 * for anything else, which then goes through keyedAmount.
 */
export function pastedAmount(text: string, decimals: number): bigint | null {
  if (!text.includes('.')) return null;
  const parsed = parseAmount(text, decimals);
  return parsed.ok ? parsed.value : null;
}
