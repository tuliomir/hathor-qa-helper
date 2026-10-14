/**
 * One mapping from every status word the app shows (wallet, transaction,
 * RPC/Snap session, helper server, dry run) to a visual tone. StatusDot and
 * StatusChip render the tone; the word itself is always shown next to it.
 */

/** `warning` is a steady caution (e.g. a network mismatch), unlike the animated `progress`. */
export type StatusTone = 'idle' | 'progress' | 'success' | 'warning' | 'error' | 'dry-run' | 'info';

const TONES: Record<string, StatusTone> = {
  // idle, not started
  idle: 'idle',
  'not started': 'idle',
  stopped: 'idle',
  disconnected: 'idle',
  'not connected': 'idle',
  unknown: 'idle',
  off: 'idle',
  // in progress
  connecting: 'progress',
  syncing: 'progress',
  starting: 'progress',
  checking: 'progress',
  pending: 'progress',
  sending: 'progress',
  waiting: 'progress',
  unconfirmed: 'progress',
  // success
  ready: 'success',
  connected: 'success',
  confirmed: 'success',
  valid: 'success',
  online: 'success',
  ok: 'success',
  on: 'success',
  sent: 'success',
  success: 'success',
  // caution
  warning: 'warning',
  mismatch: 'warning',
  // failure
  error: 'error',
  failed: 'error',
  voided: 'error',
  rejected: 'error',
  offline: 'error',
  // dry run
  'dry-run': 'dry-run',
  'dry run': 'dry-run',
  'not sent': 'dry-run',
  // informational
  info: 'info',
};

export function statusTone(status: string | null | undefined): StatusTone {
  if (!status) return 'idle';
  const key = status.trim().toLowerCase();
  if (key in TONES) return TONES[key];
  if (key.startsWith('waiting')) return 'progress';
  return 'idle';
}
