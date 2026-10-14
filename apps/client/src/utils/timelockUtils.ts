/**
 * Timelock Utilities
 *
 * Shared helpers for converting between datetime-local strings and unix timestamps.
 */

/** Returns an ISO datetime-local string (YYYY-MM-DDTHH:MM) offset from now by the given minutes. */
export function defaultTimelockValue(minutesFromNow: number): string {
  const date = new Date(Date.now() + minutesFromNow * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Converts an ISO datetime-local string to a unix timestamp in seconds. Returns undefined if empty. */
export function timelockToUnix(value: string): number | undefined {
  if (!value) return undefined;
  return Math.floor(new Date(value).getTime() / 1000);
}
