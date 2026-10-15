/**
 * Hex values (signatures, ids) can't contain whitespace, but pasting from a
 * chat or a code block often adds a trailing line break. Clean them at the
 * input so previews and requests get the same value.
 */
export function stripWhitespace(value: string): string {
  return value.replace(/\s+/g, '');
}
