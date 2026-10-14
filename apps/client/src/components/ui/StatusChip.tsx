/**
 * StatusChip — status dot plus word in a pill with the tone's tint.
 * The tone comes from `statusTone(status)` unless given explicitly.
 */

import { statusTone, type StatusTone } from '../../utils/statusTone';
import { StatusDot } from './StatusDot';

const CHIP: Record<StatusTone, string> = {
  idle: 'bg-base-200 text-ink-muted',
  progress: 'bg-tint-warning text-warning-ink',
  success: 'bg-tint-success text-success',
  warning: 'bg-tint-warning text-warning-ink',
  error: 'bg-tint-error text-error',
  'dry-run': 'bg-base-100 text-base-content border border-dashed border-field-border',
  info: 'bg-tint-info text-info',
};

export interface StatusChipProps {
  /** Raw status (e.g. wallet status); also the label unless `label` is set. */
  status: string;
  label?: string;
  tone?: StatusTone;
  className?: string;
  title?: string;
}

export function StatusChip({ status, label, tone, className = '', title }: StatusChipProps) {
  const t = tone ?? statusTone(status);
  return (
    <span
      title={title}
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-caption font-semibold ${CHIP[t]} ${className}`}
    >
      <StatusDot tone={t} />
      {label ?? status}
    </span>
  );
}

export default StatusChip;
