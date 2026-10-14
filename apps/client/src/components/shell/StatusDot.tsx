/**
 * StatusDot (shell-local)
 *
 * Minimal status light for the shell: hollow ring when idle, sweeping ring in
 * progress, filled when ready, filled with a bar on error. Pair it with a
 * word; the dot is never the only signal.
 *
 * TODO: swap for the shared `ui/StatusDot` primitive once it lands (T6).
 */

export type StatusTone = 'idle' | 'progress' | 'ok' | 'warning' | 'error';

const TONE_CLASS: Record<StatusTone, string> = {
  idle: 'border-[1.5px] border-ink-muted',
  progress: 'border-2 border-warning border-t-transparent motion-safe:animate-spin motion-reduce:border-r-transparent',
  ok: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

export default function StatusDot({ tone, className = '' }: { tone: StatusTone; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-tone={tone}
      className={`relative inline-block w-2 h-2 rounded-full flex-none ${TONE_CLASS[tone]} ${className}`}
    >
      {tone === 'error' && <span className="absolute inset-x-[1px] top-[3px] h-[2px] bg-error-content rounded" />}
    </span>
  );
}
