
/**
 * Convert a deadline string into a compact human-readable remaining time.
 *
 * Returns:
 * - `''` when `deadlineStr` is `null`/`undefined`/empty
 * - `'invalid date'` when the string cannot be parsed as a date
 * - `'expired'` when the deadline is now or in the past
 * - otherwise a compact duration like `1d 2h 3m` or `45s` (when < 1 minute)
 *
 * @param deadlineStr ISO/UTC or any Date-parsable string (optional)
 * @returns compact relative time string
 *
 * @example
 * // 2 days from now -> "2d"
 * formatTimeUntil(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString());
 *
 * @example
 * // 1 hour 5 minutes from now -> "1h 5m"
 * formatTimeUntil(new Date(Date.now() + (1 * 60 + 5) * 60 * 1000).toISOString());
 *
 * @example
 * // less than a minute -> "45s"
 * formatTimeUntil(new Date(Date.now() + 45 * 1000).toISOString());
 *
 * @example
 * // invalid or missing input
 * formatTimeUntil(undefined); // ""
 * formatTimeUntil("not a date"); // "invalid date"
 */
export function formatTimeUntil(deadlineStr?: string | null): string {
	if (!deadlineStr) return '';
	const deadlineMs = new Date(deadlineStr).getTime();
	if (isNaN(deadlineMs)) return 'invalid date';

	let diff = Math.max(0, deadlineMs - Date.now());
	if (diff === 0) return 'expired';

	const days = Math.floor(diff / (24 * 60 * 60 * 1000));
	diff -= days * 24 * 60 * 60 * 1000;
	const hours = Math.floor(diff / (60 * 60 * 1000));
	diff -= hours * 60 * 60 * 1000;
	const minutes = Math.floor(diff / (60 * 1000));
	diff -= minutes * 60 * 1000;
	const seconds = Math.floor(diff / 1000);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0) parts.push(`${minutes}m`);
	if (parts.length === 0) parts.push(`${seconds}s`);

	return parts.join(' ');
};
