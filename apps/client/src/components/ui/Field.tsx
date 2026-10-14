/**
 * Field — label, control, hint and error with consistent spacing. The
 * control is the single child; Field wires `id`, `aria-describedby` and
 * `aria-invalid` onto it.
 */

import React, { useId } from 'react';

export interface FieldProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  /** Replaces the hint and marks the control invalid. */
  error?: React.ReactNode;
  /** Shown after the hint without marking the control invalid. */
  warning?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  /** Right of the label, e.g. a unit or a quick action. */
  trailing?: React.ReactNode;
  className?: string;
  /**
   * Wire id/aria props onto the child (default). Turn off when the child
   * wraps the control; then set `id={htmlFor}` and
   * `aria-describedby={`${htmlFor}-hint`}` on the control yourself.
   */
  wireControl?: boolean;
  children: React.ReactElement<Record<string, unknown>>;
}

export function Field({
  label,
  hint,
  error,
  warning,
  required,
  htmlFor,
  trailing,
  className = '',
  wireControl = true,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = htmlFor ?? (children.props.id as string | undefined) ?? autoId;
  const hintId = `${id}-hint`;
  const describedBy = error || hint || warning ? hintId : undefined;

  const control = !wireControl
    ? children
    : React.cloneElement(children, {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      });

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-body font-medium">
          {label}
          {required && (
            <span className="text-ink-muted" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </label>
        {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      </div>
      {control}
      {(error || hint || warning) && (
        <div id={hintId} className="flex flex-col gap-0.5">
          {error ? (
            <span className="text-caption text-error">{error}</span>
          ) : (
            hint && <span className="text-caption text-ink-muted">{hint}</span>
          )}
          {warning && <span className="text-caption text-warning-ink">{warning}</span>}
        </div>
      )}
    </div>
  );
}

export default Field;
