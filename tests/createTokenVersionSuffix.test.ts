/**
 * Tests for Create Token version suffix swap logic
 *
 * Validates that switching between deposit/fee/(none) versions correctly
 * swaps the name suffix (" - Deposit" / " - Fee" / "") and symbol suffix
 * ("D" / "F" / ""), preserving the user's base name/symbol.
 */

import { describe, expect, test } from 'bun:test';
import { swapVersionSuffix, VERSION_DEFAULTS } from '../src/utils/createTokenDefaults';

describe('Create Token version suffix swap', () => {
  // --- Name suffix ---

  test('deposit → fee: swaps name suffix', () => {
    const result = swapVersionSuffix('Test Token - Deposit', 'deposit', 'fee');
    expect(result.name).toBe('Test Token - Fee');
  });

  test('fee → deposit: swaps name suffix', () => {
    const result = swapVersionSuffix('Test Token - Fee', 'fee', 'deposit');
    expect(result.name).toBe('Test Token - Deposit');
  });

  test('deposit → none: strips name suffix', () => {
    const result = swapVersionSuffix('Test Token - Deposit', 'deposit', '');
    expect(result.name).toBe('Test Token');
  });

  test('fee → none: strips name suffix', () => {
    const result = swapVersionSuffix('Test Token - Fee', 'fee', '');
    expect(result.name).toBe('Test Token');
  });

  test('none → deposit: adds name suffix, preserves base', () => {
    const result = swapVersionSuffix('Test Token', '', 'deposit');
    expect(result.name).toBe('Test Token - Deposit');
  });

  test('none → fee: adds name suffix, preserves base', () => {
    const result = swapVersionSuffix('Test Token', '', 'fee');
    expect(result.name).toBe('Test Token - Fee');
  });

  test('custom name preserved when switching versions', () => {
    const result = swapVersionSuffix('My Custom Name - Deposit', 'deposit', 'fee');
    expect(result.name).toBe('My Custom Name - Fee');
  });

  test('fully custom name (no suffix match) is untouched', () => {
    const result = swapVersionSuffix('Something Else', 'deposit', 'fee');
    expect(result.name).toBe('Something Else');
  });

  // --- Symbol suffix ---

  test('deposit → fee: swaps symbol suffix', () => {
    const result = swapVersionSuffix('n', 'deposit', 'fee', 'TSTD');
    expect(result.symbol).toBe('TSTF');
  });

  test('fee → deposit: swaps symbol suffix', () => {
    const result = swapVersionSuffix('n', 'fee', 'deposit', 'TSTF');
    expect(result.symbol).toBe('TSTD');
  });

  test('deposit → none: strips symbol suffix', () => {
    const result = swapVersionSuffix('n', 'deposit', '', 'TSTD');
    expect(result.symbol).toBe('TST');
  });

  test('none → deposit: adds symbol suffix, preserves base', () => {
    const result = swapVersionSuffix('n', '', 'deposit', 'TST');
    expect(result.symbol).toBe('TSTD');
  });

  test('none → fee: adds symbol suffix, preserves base', () => {
    const result = swapVersionSuffix('n', '', 'fee', 'TST');
    expect(result.symbol).toBe('TSTF');
  });

  test('symbol truncated to 5 chars', () => {
    const result = swapVersionSuffix('n', '', 'deposit', 'ABCDE');
    expect(result.symbol).toBe('ABCDE');
    expect(result.symbol.length).toBeLessThanOrEqual(5);
  });

  // --- Amount ---

  test('amount swaps when still at old default', () => {
    const result = swapVersionSuffix('n', 'deposit', 'fee', 's', '100');
    expect(result.amount).toBe('9999');
  });

  test('amount swaps from fee default to deposit default', () => {
    const result = swapVersionSuffix('n', 'fee', 'deposit', 's', '9999');
    expect(result.amount).toBe('100');
  });

  test('custom amount is preserved when switching', () => {
    const result = swapVersionSuffix('n', 'deposit', 'fee', 's', '500');
    expect(result.amount).toBe('500');
  });

  // --- VERSION_DEFAULTS ---

  test('VERSION_DEFAULTS has entries for all versions', () => {
    expect(VERSION_DEFAULTS['']).toBeDefined();
    expect(VERSION_DEFAULTS['deposit']).toBeDefined();
    expect(VERSION_DEFAULTS['fee']).toBeDefined();
  });

  test('deposit defaults', () => {
    expect(VERSION_DEFAULTS.deposit.nameSuffix).toBe(' - Deposit');
    expect(VERSION_DEFAULTS.deposit.symbolSuffix).toBe('D');
    expect(VERSION_DEFAULTS.deposit.amount).toBe('100');
  });

  test('fee defaults', () => {
    expect(VERSION_DEFAULTS.fee.nameSuffix).toBe(' - Fee');
    expect(VERSION_DEFAULTS.fee.symbolSuffix).toBe('F');
    expect(VERSION_DEFAULTS.fee.amount).toBe('9999');
  });

  test('none defaults have empty suffixes', () => {
    expect(VERSION_DEFAULTS[''].nameSuffix).toBe('');
    expect(VERSION_DEFAULTS[''].symbolSuffix).toBe('');
  });
});
