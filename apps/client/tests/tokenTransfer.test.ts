import { describe, expect, test } from 'bun:test';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { buildTransferTemplate } from '../src/services/tokenTransfer';

const TO = 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN';
const CHANGE = 'WPhehTyNHTPz954CskfuSgLEfuKXbXeK3f';
const FEE_TOKEN = 'ab'.repeat(32);

const actions = (template: unknown) => template as Array<Record<string, unknown>>;

describe('buildTransferTemplate', () => {
  test('one output per entry, in order, amounts in base units', () => {
    const t = actions(
      buildTransferTemplate(
        [
          { address: TO, amount: 100n },
          { address: TO, amount: 5n, token: FEE_TOKEN },
        ],
        CHANGE
      )
    );
    const outputs = t.filter((a) => a.type === 'output/token');
    expect(outputs.map((o) => [o.address, o.amount, o.token])).toEqual([
      [TO, 100n, NATIVE_TOKEN_UID],
      [TO, 5n, FEE_TOKEN],
    ]);
  });

  test('ends with one complete action that sends change back and lets wallet-lib add fees', () => {
    const t = actions(buildTransferTemplate([{ address: TO, amount: 1n, token: FEE_TOKEN }], CHANGE));
    const complete = t.filter((a) => a.type === 'action/complete');
    expect(complete).toHaveLength(1);
    expect(t[t.length - 1]).toBe(complete[0]);
    // wallet-lib charges only fee-version tokens, so this is safe for HTR and deposit tokens too.
    expect(complete[0]).toMatchObject({ changeAddress: CHANGE, calculateFee: true });
  });

  test('accepts number amounts', () => {
    const [output] = actions(buildTransferTemplate([{ address: TO, amount: 7 }], CHANGE));
    expect(output.amount).toBe(7n);
  });

  test('refuses an empty transfer', () => {
    expect(() => buildTransferTemplate([], CHANGE)).toThrow();
  });
});
