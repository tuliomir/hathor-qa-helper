/**
 * Tests for the scatter funds algorithm
 *
 * Splits a wallet balance into multiple UTXOs with distinct amounts
 * for testing UTXO filters (amountBiggerThan / amountSmallerThan).
 */

import { describe, expect, test } from 'bun:test';
import { computeScatterOutputs, MAX_SCATTER_OUTPUTS } from '../src/utils/scatterFunds';

describe('computeScatterOutputs', () => {
  test('returns empty array when balance is 0', () => {
    expect(computeScatterOutputs(0n)).toEqual([]);
  });

  test('returns empty array when balance is less than minimum (6)', () => {
    expect(computeScatterOutputs(5n)).toEqual([]);
  });

  test('minimum case: balance=6 produces outputs [1, 2, 3]', () => {
    const outputs = computeScatterOutputs(6n);
    expect(outputs).toEqual([1n, 2n, 3n]);
  });

  test('balance=10 produces outputs [1, 2, 3, 4] (sum=10)', () => {
    const outputs = computeScatterOutputs(10n);
    expect(outputs).toEqual([1n, 2n, 3n, 4n]);
  });

  test('balance=7 produces [1, 2, 4] — remainder added to last', () => {
    // n=3: sum 1+2+3=6, remainder=1 → last becomes 3+1=4
    const outputs = computeScatterOutputs(7n);
    expect(outputs.length).toBe(3);
    expect(outputs[0]).toBe(1n);
    expect(outputs[1]).toBe(2n);
    expect(outputs[2]).toBe(4n); // 3 + remainder 1
    expect(outputs.reduce((a, b) => a + b, 0n)).toBe(7n);
  });

  test('all outputs are unique', () => {
    const outputs = computeScatterOutputs(100n);
    const unique = new Set(outputs.map(String));
    expect(unique.size).toBe(outputs.length);
  });

  test('sum of outputs equals the input balance', () => {
    for (const balance of [6n, 10n, 50n, 100n, 500n, 1000n, 32385n]) {
      const outputs = computeScatterOutputs(balance);
      const sum = outputs.reduce((a, b) => a + b, 0n);
      expect(sum).toBe(balance);
    }
  });

  test('all outputs are positive', () => {
    const outputs = computeScatterOutputs(100n);
    for (const o of outputs) {
      expect(o).toBeGreaterThan(0n);
    }
  });

  test('outputs are sorted ascending', () => {
    const outputs = computeScatterOutputs(500n);
    for (let i = 1; i < outputs.length; i++) {
      expect(outputs[i]).toBeGreaterThan(outputs[i - 1]);
    }
  });

  test('respects MAX_SCATTER_OUTPUTS limit', () => {
    // Very large balance that would need >254 outputs
    const outputs = computeScatterOutputs(100000n);
    expect(outputs.length).toBeLessThanOrEqual(MAX_SCATTER_OUTPUTS);
    expect(outputs.reduce((a, b) => a + b, 0n)).toBe(100000n);
  });

  test('at max outputs, remainder goes to last output', () => {
    // sum(1..254) = 254*255/2 = 32385
    // balance = 40000 → n=254, remainder = 40000 - 32385 = 7615
    // last output = 254 + 7615 = 7869
    const outputs = computeScatterOutputs(40000n);
    expect(outputs.length).toBe(MAX_SCATTER_OUTPUTS);
    expect(outputs[0]).toBe(1n);
    expect(outputs[outputs.length - 1]).toBe(254n + (40000n - 32385n));
    expect(outputs.reduce((a, b) => a + b, 0n)).toBe(40000n);
  });

  test('produces at least 3 outputs when balance >= 6', () => {
    for (const balance of [6n, 7n, 8n, 9n, 10n, 20n]) {
      const outputs = computeScatterOutputs(balance);
      expect(outputs.length).toBeGreaterThanOrEqual(3);
    }
  });

  test('maximizes output count for given balance', () => {
    // balance=15: sum(1..5)=15, so exactly 5 outputs
    const outputs = computeScatterOutputs(15n);
    expect(outputs.length).toBe(5);
    expect(outputs).toEqual([1n, 2n, 3n, 4n, 5n]);
  });
});
