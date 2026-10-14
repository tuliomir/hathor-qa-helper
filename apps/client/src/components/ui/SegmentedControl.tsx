/**
 * SegmentedControl — single choice as a row of joined buttons.
 * `role="radiogroup"` with roving focus: arrows/Home/End move focus,
 * Space/Enter select (see utils/segmentedControl.ts).
 */

import React, { useRef, useState } from 'react';
import { segmentedKeyDown } from '../../utils/segmentedControl';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  /** Why the option is disabled; shown on hover and to screen readers. */
  reason?: string;
  /** `shielded` selects with the veil colours instead of primary. */
  tone?: 'default' | 'shielded';
}

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  'aria-label': string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  size = 'md',
  disabled = false,
  className = '',
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const tabStop = focusIndex ?? selectedIndex;
  const opts = disabled ? options.map((o) => ({ ...o, disabled: true })) : options;

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const result = segmentedKeyDown(opts, index, e.key);
    if (!result) return;
    e.preventDefault();
    if ('focus' in result) {
      setFocusIndex(result.focus);
      refs.current[result.focus]?.focus();
    } else {
      onChange(opts[result.select].value);
    }
  };

  const height = size === 'sm' ? 'h-7 px-2 text-caption' : 'h-[30px] px-2.5 text-body';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      className={`inline-flex max-w-full flex-wrap overflow-hidden rounded-field border border-field-border bg-base-100 ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusIndex(null);
      }}
    >
      {opts.map((opt, i) => {
        const checked = opt.value === value;
        const selectedClass =
          opt.tone === 'shielded'
            ? 'bg-tint-shielded text-accent font-semibold'
            : 'bg-tint-info text-primary font-semibold';
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-disabled={opt.disabled || undefined}
            aria-description={opt.disabled && opt.reason ? opt.reason : undefined}
            title={opt.disabled ? opt.reason : undefined}
            tabIndex={i === tabStop ? 0 : -1}
            onClick={() => !opt.disabled && onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onFocus={() => setFocusIndex(i)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap border-l border-base-300 first:border-l-0 transition-colors duration-[120ms] ${height} ${
              checked ? selectedClass : 'text-base-content hover:bg-base-200'
            } ${opt.disabled ? 'cursor-not-allowed text-ink-muted opacity-60 hover:bg-transparent' : 'cursor-pointer'}`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
