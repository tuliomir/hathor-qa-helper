/** Middle truncation and grouping for identifiers (hashes, addresses). */

/** `head…tail`, or the value unchanged when truncating would not shorten it. */
export function truncateMiddle(value: string, head: number, tail: number): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${tail > 0 ? value.slice(-tail) : ''}`;
}

/** Splits a value into blocks of `size` characters, joined by spaces by default. */
export function groupChars(value: string, size: number): string;
export function groupChars(value: string, size: number, opts: { asArray: true }): string[];
export function groupChars(value: string, size: number, opts?: { asArray?: boolean }): string | string[] {
  const blocks: string[] = [];
  for (let i = 0; i < value.length; i += size) blocks.push(value.slice(i, i + size));
  return opts?.asArray ? blocks : blocks.join(' ');
}
