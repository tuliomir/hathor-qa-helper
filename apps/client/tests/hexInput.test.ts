import { describe, expect, test } from 'bun:test';
import { stripWhitespace } from '../src/utils/hexInput';

describe('stripWhitespace', () => {
  test('drops spaces and line breaks pasted around or inside a hex value', () => {
    expect(stripWhitespace(' 4730\n4502 \r\n\t')).toBe('47304502');
  });

  test('leaves other characters for validation to report', () => {
    expect(stripWhitespace('ab-cd')).toBe('ab-cd');
  });
});
