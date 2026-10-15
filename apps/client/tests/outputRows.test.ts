import { describe, expect, test } from 'bun:test';
import { newOutputRow, outputRowErrors, outputSummary, toSendOutputs, type OutputRow } from '../src/utils/outputRows';

const T = 'WZMJS5eeCEgiqxNK1QRbE1HR4wFQwmCjJV';
const S = 'K3KokZRo7DyNRRiyijpsVix2VADrd4HeA8vWLR5itAj81BVC4Vv7xoXbrYyKYwsLMWhefXqXKgJvC6HcVkDuJ7AJ7qUMS7fVc';
const TOKEN = '0000a3f1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071829309c0e77b2';

const row = (over: Partial<OutputRow>): OutputRow => ({ ...newOutputRow(), ...over });

describe('newOutputRow', () => {
  test('defaults to a transparent HTR token output with a unique id', () => {
    const a = newOutputRow();
    const b = newOutputRow();
    expect(a).toMatchObject({ type: 'token', address: '', value: '', token: '00', privacy: 'TRANSPARENT' });
    expect(a.id).not.toBe(b.id);
  });
});

describe('toSendOutputs', () => {
  test('maps rows 1:1 onto SendOutput, shielded only when not transparent', () => {
    const rows = [
      row({ address: T, value: '500' }),
      row({ address: S, value: '250', privacy: 'AMOUNT_SHIELDED' }),
      row({ address: ` ${S} `, value: '4000', token: TOKEN, privacy: 'FULLY_SHIELDED' }),
    ];
    expect(toSendOutputs(rows)).toEqual([
      { address: T, value: '500', token: '00' },
      { address: S, value: '250', token: '00', shielded: 'AMOUNT_SHIELDED' },
      { address: S, value: '4000', token: TOKEN, shielded: 'FULLY_SHIELDED' },
    ]);
  });

  test('values stay decimal strings, BigInt-safe', () => {
    const [out] = toSendOutputs([row({ address: T, value: '123456789012345678901234567890' })]);
    expect(out.value).toBe('123456789012345678901234567890');
  });

  test('throws with every row problem listed', () => {
    const rows = [row({ address: '', value: '1' }), row({ address: T, value: '' })];
    expect(() => toSendOutputs(rows)).toThrow('Output 1: recipient address missing; Output 2: amount missing');
  });

  test('rejects rows the server contract cannot express', () => {
    expect(() => toSendOutputs([row({ type: 'data', data: 'hello' })])).toThrow(
      'Output 1: data outputs are not supported here'
    );
    expect(() => toSendOutputs([row({ address: T, value: '1', timelock: '2030-01-01T00:00' })])).toThrow(
      'Output 1: timelocks are not supported here'
    );
  });

  test('rejects zero and non-integer base units', () => {
    expect(() => toSendOutputs([row({ address: T, value: '0' })])).toThrow(
      'Output 1: amount must be greater than zero'
    );
    expect(() => toSendOutputs([row({ address: T, value: '1.5' })])).toThrow(
      'Output 1: amount must be a whole number of base units'
    );
  });

  test('empty list is an error', () => {
    expect(() => toSendOutputs([])).toThrow('Add at least one output');
  });
});

describe('outputRowErrors', () => {
  test('null for valid rows; data rows are fine when allowed', () => {
    expect(outputRowErrors([row({ address: T, value: '1' })])).toEqual([null]);
    expect(outputRowErrors([row({ type: 'data', data: 'x' })], { allowData: true, allowTimelock: true })).toEqual([
      null,
    ]);
    expect(outputRowErrors([row({ type: 'data', data: '' })], { allowData: true, allowTimelock: true })).toEqual([
      'data missing',
    ]);
  });

  test('zero amounts only when allowed', () => {
    const zero = [row({ address: T, value: '0' })];
    expect(outputRowErrors(zero)).toEqual(['amount must be greater than zero']);
    expect(outputRowErrors(zero, { allowData: false, allowTimelock: false, allowZero: true })).toEqual([null]);
  });
});

describe('outputSummary', () => {
  test('counts outputs and shielded ones, totals per token', () => {
    const s = outputSummary([
      row({ address: T, value: '500' }),
      row({ address: S, value: '250', privacy: 'AMOUNT_SHIELDED' }),
      row({ address: S, value: '4000', token: TOKEN, privacy: 'FULLY_SHIELDED' }),
      row({ type: 'data', data: 'x' }),
      row({ address: T, value: 'oops' }),
    ]);
    expect(s.count).toBe(5);
    expect(s.shielded).toBe(2);
    expect(s.totals).toEqual([
      { token: '00', value: 750n },
      { token: TOKEN, value: 4000n },
    ]);
  });
});

describe('shielded row rules', () => {
  test('rejects a shielded mode on a legacy address', () => {
    const row = newOutputRow({ address: T, value: '5', privacy: 'AMOUNT_SHIELDED' });
    expect(outputRowErrors([row])[0]).toBe('a shielded output needs a shielded (K3…) address');
  });

  test('rejects shielded amounts of 2^40 base units or more', () => {
    const row = newOutputRow({ address: S, value: String(1n << 40n), privacy: 'FULLY_SHIELDED' });
    expect(outputRowErrors([row])[0]).toBe('shielded amounts must be below 2^40 base units');
  });
});
