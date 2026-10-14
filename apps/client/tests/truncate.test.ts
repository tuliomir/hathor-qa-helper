import { describe, expect, test } from 'bun:test';
import { groupChars, truncateMiddle } from '../src/utils/truncate';

const HASH = '0000a3f1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071829309c0e77b2';

describe('truncateMiddle', () => {
  test('keeps head and tail around an ellipsis', () => {
    expect(truncateMiddle(HASH, 8, 8)).toBe('0000a3f1…9c0e77b2');
    expect(truncateMiddle('WZMJS5eeCEgiqxNK1QRbE1HR4wFQwmCjJV', 6, 6)).toBe('WZMJS5…wmCjJV');
  });

  test('returns short values unchanged', () => {
    expect(truncateMiddle('abcdef', 3, 3)).toBe('abcdef');
    expect(truncateMiddle('abcdefg', 3, 3)).toBe('abcdefg');
    expect(truncateMiddle('', 8, 8)).toBe('');
  });

  test('truncates when it saves at least two characters', () => {
    expect(truncateMiddle('abcdefgh', 3, 3)).toBe('abc…fgh');
  });

  test('zero head or tail', () => {
    expect(truncateMiddle('abcdefghij', 0, 3)).toBe('…hij');
    expect(truncateMiddle('abcdefghij', 3, 0)).toBe('abc…');
  });
});

describe('groupChars', () => {
  test('groups in blocks with a trailing partial block', () => {
    expect(groupChars('abcdefghij', 4)).toBe('abcd efgh ij');
    expect(groupChars('abcdefgh', 4)).toBe('abcd efgh');
    expect(groupChars('', 4)).toBe('');
  });

  test('returns blocks as an array when asked', () => {
    expect(groupChars('abcdefghij', 4, { asArray: true })).toEqual(['abcd', 'efgh', 'ij']);
  });
});
