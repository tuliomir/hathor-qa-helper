import { describe, expect, test } from 'bun:test';
import { addressMatchRequirement } from '../src/utils/addressMatch';

const A = 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN';
const B = 'WZ7pDnkPnxbs14GHdUFivFzPbzitwNtvZo';
const FIX = '/tools/rpc/connection';

describe('addressMatchRequirement', () => {
  test('is null until both addresses are known', () => {
    expect(addressMatchRequirement(null, A, FIX)).toBeNull();
    expect(addressMatchRequirement(A, null, FIX)).toBeNull();
  });

  test('is met when the addresses match, ignoring case', () => {
    expect(addressMatchRequirement(A, A.toLowerCase(), FIX)?.met).toBe(true);
  });

  test('is unmet with an action and a fix link when they differ', () => {
    const r = addressMatchRequirement(A, B, FIX);
    expect(r?.met).toBe(false);
    expect(r?.action).toBeTruthy();
    expect(r?.fix?.to).toBe(FIX);
  });
});
