/**
 * StatusDot — 8px status light. The shape carries the tone so it reads in
 * greyscale; it is decorative, so the status word must render next to it.
 */

import type { StatusTone } from '../../utils/statusTone';

const SHAPE: Record<StatusTone, string> = {
  idle: 'border-[1.5px] border-ink-muted',
  progress:
    'border-2 border-warning border-t-transparent animate-spin motion-reduce:animate-none motion-reduce:border-t-warning motion-reduce:border-r-transparent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  'dry-run': 'border-[1.5px] border-dashed border-ink-muted',
  info: 'bg-info',
};

export function StatusDot({ tone, className = '' }: { tone: StatusTone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-2 w-2 flex-none items-center justify-center rounded-full ${SHAPE[tone]} ${className}`}
    >
      {tone === 'error' && <span className="h-[1.5px] w-[5px] bg-base-100" />}
    </span>
  );
}

export default StatusDot;
