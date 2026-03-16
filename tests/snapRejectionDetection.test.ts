/**
 * Tests for snap user rejection detection
 *
 * MetaMask returns different error shapes depending on whether the user
 * rejected at the MetaMask dialog level (code 4001) or inside the snap's
 * custom UI (PromptRejectedError wrapped in SnapError, code -32603).
 */

import { describe, expect, test } from 'bun:test';
import { isSnapUserRejection } from '../src/utils/snapErrors';

describe('isSnapUserRejection', () => {
  // MetaMask dialog rejection (code 4001)
  test('detects MetaMask dialog rejection via code 4001', () => {
    expect(isSnapUserRejection({ code: 4001, message: 'User rejected' })).toBe(true);
  });

  // Snap PromptRejectedError wrapped by MetaMask
  test('detects PromptRejectedError in nested data.cause', () => {
    const err = {
      code: -32603,
      message: 'Snap Error',
      data: {
        cause: {
          message: 'User rejected prompt',
          data: { errorType: 'PromptRejectedError' },
        },
      },
    };
    expect(isSnapUserRejection(err)).toBe(true);
  });

  test('detects PromptRejectedError in flat data', () => {
    const err = {
      code: -32603,
      message: 'Snap Error',
      data: {
        message: 'User rejected prompt',
        errorType: 'PromptRejectedError',
      },
    };
    expect(isSnapUserRejection(err)).toBe(true);
  });

  test('detects rejection when message contains "reject" at top level', () => {
    expect(isSnapUserRejection(new Error('User rejected prompt'))).toBe(true);
  });

  test('detects pin prompt rejection', () => {
    const err = {
      code: -32603,
      message: 'Snap Error',
      data: { cause: { message: 'Pin prompt rejected' } },
    };
    expect(isSnapUserRejection(err)).toBe(true);
  });

  test('detects rejection in Error with nested data', () => {
    const err = Object.assign(new Error('Snap Error'), {
      data: { cause: { message: 'User rejected prompt' } },
    });
    expect(isSnapUserRejection(err)).toBe(true);
  });

  // Non-rejections
  test('does not flag generic errors', () => {
    expect(isSnapUserRejection(new Error('Network timeout'))).toBe(false);
  });

  test('does not flag snap errors without rejection', () => {
    const err = {
      code: -32603,
      message: 'Snap Error',
      data: { cause: { message: 'Insufficient funds' } },
    };
    expect(isSnapUserRejection(err)).toBe(false);
  });

  test('handles null/undefined', () => {
    expect(isSnapUserRejection(null)).toBe(false);
    expect(isSnapUserRejection(undefined)).toBe(false);
  });

  test('handles plain string errors', () => {
    expect(isSnapUserRejection('User rejected the request')).toBe(true);
    expect(isSnapUserRejection('Something went wrong')).toBe(false);
  });
});
