/**
 * AmountInput — accepts the decimal amount ("12.50") and reports base
 * units as a decimal string ("1250"), BigInt-safe. The base-unit value is
 * shown as a hint because QA often checks the raw value in requests.
 * Above-balance is a warning, not an error: insufficient-funds tests must
 * stay sendable.
 */

import { useEffect, useId, useState } from 'react';
import { DECIMAL_PLACES } from '@hathor/wallet-lib/lib/constants';
import { Field } from '../ui/Field';
import { formatAmount, parseAmount } from '../../utils/amount';

export interface AmountToken {
  uid: string;
  symbol: string;
  /** Defaults to wallet-lib's DECIMAL_PLACES (2). */
  decimals?: number;
}

export interface AmountInputProps {
  /** Base units as a decimal string; '' when empty or invalid. */
  value: string;
  onChange: (baseUnits: string) => void;
  token?: AmountToken;
  label?: string;
  /** Renders a Max button that fills this value (base units). */
  max?: bigint | string | (() => Promise<bigint | string | null>);
  /** Shows a warning when the amount exceeds it (base units). */
  balance?: bigint | string | null;
  allowZero?: boolean;
  disabled?: boolean;
  id?: string;
  hint?: string;
  className?: string;
}

const HTR: AmountToken = { uid: '00', symbol: 'HTR' };
const INTEGER_RE = /^\d+$/;

function textFor(value: string, decimals: number): string {
  return INTEGER_RE.test(value) ? formatAmount(value, decimals) : value;
}

export function AmountInput({
  value,
  onChange,
  token = HTR,
  label = 'Amount',
  max,
  balance,
  allowZero = false,
  disabled = false,
  id,
  hint,
  className = '',
}: AmountInputProps) {
  const decimals = token.decimals ?? DECIMAL_PLACES;
  const autoId = useId();
  const inputId = id ?? autoId;
  const [text, setText] = useState(() => textFor(value, decimals));
  const [loadingMax, setLoadingMax] = useState(false);

  const parsed = parseAmount(text, decimals);

  // Follow external changes (Max, reset, restored form data).
  useEffect(() => {
    const current = parsed.ok ? parsed.value.toString() : '';
    if (current !== value) setText(value === '' ? '' : textFor(value, decimals));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  const handleText = (next: string) => {
    setText(next);
    const r = parseAmount(next, decimals);
    onChange(r.ok ? r.value.toString() : '');
  };

  const handleMax = async () => {
    if (max === undefined) return;
    setLoadingMax(true);
    try {
      const v = typeof max === 'function' ? await max() : max;
      if (v !== null && v !== undefined) {
        setText(formatAmount(v, decimals));
        onChange(BigInt(v).toString());
      }
    } catch (err) {
      console.error('Failed to read the maximum amount:', err);
    } finally {
      setLoadingMax(false);
    }
  };

  let error: string | undefined;
  let warning: string | undefined;
  if (!parsed.ok && parsed.error !== 'empty') error = parsed.message;
  if (parsed.ok && parsed.value === 0n && !allowZero) error = 'Amount must be greater than zero';
  if (parsed.ok && balance !== undefined && balance !== null && parsed.value > BigInt(balance)) {
    warning = `Above the available balance (${formatAmount(balance, decimals)} ${token.symbol}); sending will fail with insufficient funds`;
  }
  const baseHint = parsed.ok ? `= ${parsed.value.toString()} base units` : hint;

  return (
    <Field
      label={label}
      htmlFor={inputId}
      hint={baseHint}
      error={error}
      warning={warning}
      className={className}
      wireControl={false}
      trailing={
        max !== undefined ? (
          <button
            type="button"
            className="btn btn-secondary btn-xs"
            onClick={handleMax}
            disabled={disabled || loadingMax}
            aria-label={`Fill the maximum ${token.symbol} amount`}
          >
            {loadingMax ? <span className="loading loading-spinner loading-xs" aria-hidden="true" /> : 'Max'}
          </button>
        ) : undefined
      }
    >
      <label className={`input w-full ${error ? 'input-error' : ''}`}>
        <input
          id={inputId}
          aria-describedby={baseHint || error || warning ? `${inputId}-hint` : undefined}
          aria-invalid={error ? true : undefined}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={text}
          disabled={disabled}
          placeholder={formatAmount(0n, decimals)}
          onChange={(e) => handleText(e.target.value)}
          className="grow text-right font-mono text-data tabular-nums"
        />
        <span className="text-body text-ink-muted">{token.symbol}</span>
      </label>
    </Field>
  );
}

export default AmountInput;
