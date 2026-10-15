import { describe, expect, it } from 'bun:test';
import { SHIELDED_OUTPUT_FEE, estimateShieldedFee } from '../src/fees';

const t = (value = '10') => ({ privacy: 'TRANSPARENT' as const, value });
const as = (value = '10') => ({ privacy: 'AMOUNT_SHIELDED' as const, value });
const fs = (value = '10') => ({ privacy: 'FULLY_SHIELDED' as const, value });

describe('SHIELDED_OUTPUT_FEE', () => {
  it('matches wallet-lib: 1 base unit amount-shielded, 2 fully shielded', () => {
    expect(SHIELDED_OUTPUT_FEE.AMOUNT_SHIELDED).toBe(1n);
    expect(SHIELDED_OUTPUT_FEE.FULLY_SHIELDED).toBe(2n);
  });
});

describe('estimateShieldedFee', () => {
  it('charges nothing for transparent outputs', () => {
    expect(estimateShieldedFee([t(), t()])).toEqual({ requested: 0, onChain: 0, padding: 'none', minFee: 0n });
  });

  it('splits a lone shielded output and charges its mode twice', () => {
    expect(estimateShieldedFee([t(), fs('10')])).toEqual({ requested: 1, onChain: 2, padding: 'split', minFee: 4n });
  });

  it('shields the change when the lone output is 1 base unit', () => {
    expect(estimateShieldedFee([as('1')])).toMatchObject({ padding: 'change', onChain: 2, minFee: 2n });
  });

  it('sums mixed modes without padding from two outputs on', () => {
    expect(estimateShieldedFee([as(), fs(), t()])).toEqual({ requested: 2, onChain: 2, padding: 'none', minFee: 3n });
  });
});
