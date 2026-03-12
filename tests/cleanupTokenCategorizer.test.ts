/**
 * Tests for cleanup token categorization.
 *
 * Validates that tokens are correctly categorized into:
 * - meltable (have melt authority, not swap/fee)
 * - swap (transfer to funding wallet)
 * - fee (left in wallet — cost HTR to move)
 * - returnable (can be sent back to original sender)
 * - remaining (will stay in wallet after cleanup)
 * - displayable (shown in main "Tokens to Melt" table)
 */

import { describe, test, expect } from 'bun:test';
import {
  getMeltableTokens,
  getSwapTokens,
  getFeeTokens,
  getReturnableTokens,
  getRemainingTokens,
  getDisplayableTokens,
  type CleanupTokenInfo,
} from '../src/services/cleanupTokenCategorizer';

// ---------------------------------------------------------------------------
// Helpers — create tokens with sensible defaults
// ---------------------------------------------------------------------------
const baseToken = (overrides: Partial<CleanupTokenInfo> & { uid: string }): CleanupTokenInfo => ({
  symbol: 'TKN',
  name: 'Token',
  balance: 100n,
  meltableAmount: 100,
  remainder: 0,
  hasMeltAuthority: false,
  canReturnToSender: false,
  isSwapToken: false,
  isFeeToken: false,
  ...overrides,
});

const meltableToken = (uid = 'A'): CleanupTokenInfo =>
  baseToken({ uid, symbol: `MLT_${uid}`, hasMeltAuthority: true, meltableAmount: 100 });

const swapToken = (uid = 'S'): CleanupTokenInfo =>
  baseToken({ uid, symbol: `SWP_${uid}`, isSwapToken: true, meltableAmount: 0 });

const feeToken = (uid = 'F'): CleanupTokenInfo =>
  baseToken({ uid, symbol: `FEE_${uid}`, isFeeToken: true, meltableAmount: 0 });

const returnableToken = (uid = 'R'): CleanupTokenInfo =>
  baseToken({
    uid,
    symbol: `RET_${uid}`,
    canReturnToSender: true,
    originalSender: 'WOriginalSenderAddr',
    hasMeltAuthority: false,
    meltableAmount: 0,
  });

// ===========================================================================
// Tests
// ===========================================================================

describe('cleanupTokenCategorizer', () => {
  // -------------------------------------------------------------------------
  // getMeltableTokens
  // -------------------------------------------------------------------------
  describe('getMeltableTokens', () => {
    test('returns tokens with melt authority and positive meltableAmount', () => {
      const tokens = [meltableToken('A'), meltableToken('B')];
      expect(getMeltableTokens(tokens)).toHaveLength(2);
    });

    test('excludes swap tokens even if they have melt authority', () => {
      const swapWithAuthority = baseToken({
        uid: 'S',
        isSwapToken: true,
        hasMeltAuthority: true,
        meltableAmount: 100,
      });
      expect(getMeltableTokens([swapWithAuthority])).toHaveLength(0);
    });

    test('excludes fee tokens even if they have melt authority', () => {
      const feeWithAuthority = baseToken({
        uid: 'F',
        isFeeToken: true,
        hasMeltAuthority: true,
        meltableAmount: 100,
      });
      expect(getMeltableTokens([feeWithAuthority])).toHaveLength(0);
    });

    test('excludes tokens with zero meltableAmount', () => {
      const zeroMelt = baseToken({ uid: 'Z', hasMeltAuthority: true, meltableAmount: 0, balance: 50n });
      expect(getMeltableTokens([zeroMelt])).toHaveLength(0);
    });

    test('excludes tokens without melt authority', () => {
      const noAuthority = baseToken({ uid: 'N', hasMeltAuthority: false, meltableAmount: 100 });
      expect(getMeltableTokens([noAuthority])).toHaveLength(0);
    });

    test('returns empty for empty input', () => {
      expect(getMeltableTokens([])).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getSwapTokens
  // -------------------------------------------------------------------------
  describe('getSwapTokens', () => {
    test('returns swap tokens with positive balance', () => {
      expect(getSwapTokens([swapToken('S1')])).toHaveLength(1);
    });

    test('excludes swap tokens with zero balance', () => {
      const zeroBalance = { ...swapToken('S'), balance: 0n };
      expect(getSwapTokens([zeroBalance])).toHaveLength(0);
    });

    test('does not return non-swap tokens', () => {
      expect(getSwapTokens([meltableToken(), feeToken()])).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getFeeTokens
  // -------------------------------------------------------------------------
  describe('getFeeTokens', () => {
    test('returns fee tokens with positive balance', () => {
      expect(getFeeTokens([feeToken('F1')])).toHaveLength(1);
    });

    test('excludes fee tokens with zero balance', () => {
      const zeroBalance = { ...feeToken('F'), balance: 0n };
      expect(getFeeTokens([zeroBalance])).toHaveLength(0);
    });

    test('does not return non-fee tokens', () => {
      expect(getFeeTokens([meltableToken(), swapToken()])).toHaveLength(0);
    });

    test('fee tokens are never in meltable list', () => {
      const tokens = [feeToken('F1'), feeToken('F2'), meltableToken('A')];
      const meltable = getMeltableTokens(tokens);
      const fee = getFeeTokens(tokens);

      expect(fee).toHaveLength(2);
      expect(meltable).toHaveLength(1);
      // No overlap
      const feeUids = fee.map((t) => t.uid);
      const meltUids = meltable.map((t) => t.uid);
      expect(feeUids.filter((uid) => meltUids.includes(uid))).toHaveLength(0);
    });

    test('fee tokens are never in swap list', () => {
      const tokens = [feeToken('F'), swapToken('S')];
      const fee = getFeeTokens(tokens);
      const swap = getSwapTokens(tokens);

      expect(fee).toHaveLength(1);
      expect(swap).toHaveLength(1);
      expect(fee[0].uid).toBe('F');
      expect(swap[0].uid).toBe('S');
    });
  });

  // -------------------------------------------------------------------------
  // getReturnableTokens
  // -------------------------------------------------------------------------
  describe('getReturnableTokens', () => {
    test('returns tokens that can be returned to sender', () => {
      expect(getReturnableTokens([returnableToken('R')])).toHaveLength(1);
    });

    test('excludes tokens without originalSender', () => {
      const noSender = baseToken({ uid: 'X', canReturnToSender: true });
      expect(getReturnableTokens([noSender])).toHaveLength(0);
    });

    test('excludes tokens with canReturnToSender=false', () => {
      const noReturn = baseToken({ uid: 'X', canReturnToSender: false, originalSender: 'addr' });
      expect(getReturnableTokens([noReturn])).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getRemainingTokens
  // -------------------------------------------------------------------------
  describe('getRemainingTokens', () => {
    test('includes tokens without melt authority', () => {
      const noAuth = baseToken({ uid: 'N', hasMeltAuthority: false });
      expect(getRemainingTokens([noAuth])).toHaveLength(1);
    });

    test('includes tokens with remainder > 0', () => {
      const withRemainder = baseToken({ uid: 'R', hasMeltAuthority: true, meltableAmount: 100, remainder: 50 });
      expect(getRemainingTokens([withRemainder])).toHaveLength(1);
    });

    test('includes tokens with melt authority but zero meltableAmount', () => {
      const zeroMelt = baseToken({ uid: 'Z', hasMeltAuthority: true, meltableAmount: 0, balance: 50n });
      expect(getRemainingTokens([zeroMelt])).toHaveLength(1);
    });

    test('excludes fully meltable tokens (no remainder)', () => {
      const fullyMeltable = baseToken({ uid: 'M', hasMeltAuthority: true, meltableAmount: 100, remainder: 0 });
      expect(getRemainingTokens([fullyMeltable])).toHaveLength(0);
    });

    test('excludes swap tokens', () => {
      const swap = { ...swapToken('S'), hasMeltAuthority: false };
      expect(getRemainingTokens([swap])).toHaveLength(0);
    });

    test('excludes fee tokens', () => {
      const fee = { ...feeToken('F'), hasMeltAuthority: false };
      expect(getRemainingTokens([fee])).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // getDisplayableTokens
  // -------------------------------------------------------------------------
  describe('getDisplayableTokens', () => {
    test('returns non-swap, non-fee tokens', () => {
      const tokens = [meltableToken('A'), returnableToken('R')];
      expect(getDisplayableTokens(tokens)).toHaveLength(2);
    });

    test('excludes swap tokens', () => {
      expect(getDisplayableTokens([swapToken('S')])).toHaveLength(0);
    });

    test('excludes fee tokens', () => {
      expect(getDisplayableTokens([feeToken('F')])).toHaveLength(0);
    });

    test('includes tokens regardless of melt authority', () => {
      const noAuth = baseToken({ uid: 'N', hasMeltAuthority: false });
      const withAuth = meltableToken('A');
      expect(getDisplayableTokens([noAuth, withAuth])).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // Mixed scenarios — categories are mutually exclusive
  // -------------------------------------------------------------------------
  describe('mutual exclusivity', () => {
    const allTokenTypes = [
      meltableToken('M'),
      swapToken('S'),
      feeToken('F'),
      returnableToken('R'),
    ];

    test('fee tokens appear only in fee list, never meltable or swap', () => {
      const meltable = getMeltableTokens(allTokenTypes);
      const swap = getSwapTokens(allTokenTypes);
      const fee = getFeeTokens(allTokenTypes);

      expect(fee.map((t) => t.uid)).toEqual(['F']);
      expect(meltable.every((t) => t.uid !== 'F')).toBe(true);
      expect(swap.every((t) => t.uid !== 'F')).toBe(true);
    });

    test('swap tokens appear only in swap list, never meltable or fee', () => {
      const meltable = getMeltableTokens(allTokenTypes);
      const swap = getSwapTokens(allTokenTypes);
      const fee = getFeeTokens(allTokenTypes);

      expect(swap.map((t) => t.uid)).toEqual(['S']);
      expect(meltable.every((t) => t.uid !== 'S')).toBe(true);
      expect(fee.every((t) => t.uid !== 'S')).toBe(true);
    });

    test('meltable tokens appear only in meltable list', () => {
      const meltable = getMeltableTokens(allTokenTypes);
      const swap = getSwapTokens(allTokenTypes);
      const fee = getFeeTokens(allTokenTypes);

      expect(meltable.map((t) => t.uid)).toEqual(['M']);
      expect(swap.every((t) => t.uid !== 'M')).toBe(true);
      expect(fee.every((t) => t.uid !== 'M')).toBe(true);
    });

    test('displayable tokens exclude swap and fee', () => {
      const displayable = getDisplayableTokens(allTokenTypes);
      expect(displayable.map((t) => t.uid).sort()).toEqual(['M', 'R']);
    });
  });

  // -------------------------------------------------------------------------
  // Edge case: token that is both swap and fee (should not happen, but defend)
  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    test('token flagged as both swap and fee appears in neither meltable list', () => {
      const weird = baseToken({ uid: 'W', isSwapToken: true, isFeeToken: true });
      expect(getMeltableTokens([weird])).toHaveLength(0);
      // It would appear in swap list (isSwapToken check comes first)
      expect(getSwapTokens([weird])).toHaveLength(1);
      // It also appears in fee list (independent check)
      expect(getFeeTokens([weird])).toHaveLength(1);
    });

    test('all empty lists for empty input', () => {
      expect(getMeltableTokens([])).toHaveLength(0);
      expect(getSwapTokens([])).toHaveLength(0);
      expect(getFeeTokens([])).toHaveLength(0);
      expect(getReturnableTokens([])).toHaveLength(0);
      expect(getRemainingTokens([])).toHaveLength(0);
      expect(getDisplayableTokens([])).toHaveLength(0);
    });
  });
});
