import { describe, expect, test } from 'bun:test';
import { getConfigurationString, parseConfigurationString, parseTokenInput } from '../src/utils/tokenConfigString';

const UID = '00b6e7cfa5e1e2b6d0b3a6e3c8a9d1f2e4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9';

describe('parseConfigurationString', () => {
  test('round-trips getConfigurationString', () => {
    const config = getConfigurationString(UID, 'Fee Token 15', 'FI15');
    expect(parseConfigurationString(config)).toEqual({
      ok: true,
      token: { uid: UID, name: 'Fee Token 15', symbol: 'FI15' },
    });
  });

  test('names may contain colons', () => {
    const config = getConfigurationString(UID, 'A: B', 'AB');
    expect(parseConfigurationString(config)).toMatchObject({ ok: true, token: { name: 'A: B', symbol: 'AB' } });
  });

  test('rejects a wrong checksum', () => {
    const config = getConfigurationString(UID, 'Token', 'TKN').replace(/:[0-9a-f]{8}\]$/, ':00000000]');
    expect(parseConfigurationString(config)).toMatchObject({ ok: false, error: expect.stringMatching(/checksum/i) });
  });

  test('rejects malformed strings', () => {
    expect(parseConfigurationString('[Token:TKN]')).toMatchObject({ ok: false });
  });
});

describe('parseTokenInput', () => {
  test('accepts a token UID', () => {
    expect(parseTokenInput(`  ${UID.toUpperCase()} `)).toEqual({ ok: true, token: { uid: UID } });
  });

  test('accepts a configuration string', () => {
    expect(parseTokenInput(getConfigurationString(UID, 'Token', 'TKN'))).toEqual({
      ok: true,
      token: { uid: UID, name: 'Token', symbol: 'TKN' },
    });
  });

  test('rejects HTR, short UIDs and other text', () => {
    expect(parseTokenInput('00')).toMatchObject({ ok: false, error: expect.stringMatching(/HTR/) });
    expect(parseTokenInput('abc')).toMatchObject({ ok: false });
    expect(parseTokenInput('')).toMatchObject({ ok: false });
  });
});
