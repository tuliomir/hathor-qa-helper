/**
 * A seed's Hathor Next address, checked against the one the testnet-alpha
 * backend returned when it registered that seed (2026-11-26; a throwaway,
 * unfunded test seed).
 */

import { describe, expect, test } from 'bun:test';
import { nextAddressOf } from '../src/services/hathorNext/address';

const WORDS =
  'rigid miracle author treat barrel essay minute ill taxi thank method pave melt submit humor witness provide diesel trial head message inhale come close';

describe('nextAddressOf', () => {
  test("matches the backend's registration", async () => {
    expect(await nextAddressOf(WORDS)).toBe(
      'samba1zac5a7gdxce87g07ga3kd0wxpan7yez0weymsppsjncm8dyam7sq2grydmpaa4tlsnj8wk98pqp4xdm48zrrzenclq8tjg70dnc56stcrd7t90'
    );
  });
});
