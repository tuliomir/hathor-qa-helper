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

  // MetaMask EthereumRpcError — Error subclass with .data as own property
  // that may not be traversed by simple object iteration
  test('detects rejection in EthereumRpcError-like Error with code and data', () => {
    class RpcError extends Error {
      code: number;
      data: unknown;
      constructor(message: string, code: number, data: unknown) {
        super(message);
        this.code = code;
        this.data = data;
      }
    }
    const err = new RpcError('Snap Error', -32603, {
      cause: { message: 'User rejected prompt' },
    });
    expect(isSnapUserRejection(err)).toBe(true);
  });

  // Error with only a generic message but rejection info deep in stringified form
  test('detects rejection via JSON.stringify fallback when nested in opaque structure', () => {
    const err = new Error('Internal JSON-RPC error.');
    Object.defineProperty(err, 'data', {
      value: { originalError: { message: 'User rejected prompt' } },
      enumerable: false,
    });
    expect(isSnapUserRejection(err)).toBe(true);
  });

  // MetaMask sometimes returns the error message as "request() method"
  test('does not false-positive on MetaMask internal error messages', () => {
    expect(isSnapUserRejection(new Error('Internal JSON-RPC error.'))).toBe(false);
  });

  // Exact error shape from MetaMask snap rejection (real-world capture)
  test('detects exact MetaMask snap rejection shape with code -32603 and PromptRejectedError', () => {
    const err = {
      code: -32603,
      message: 'User rejected prompt',
      data: {
        errorType: 'PromptRejectedError',
        cause: null,
      },
      stack: 'SnapError: User rejected prompt\n  at ...',
    };
    expect(isSnapUserRejection(err)).toBe(true);
  });

  // Same shape but with "Snap Error" as top-level message (MetaMask wrapping)
  test('detects rejection when top message is "Snap Error" but data has PromptRejectedError', () => {
    const err = {
      code: -32603,
      message: 'Snap Error',
      data: {
        errorType: 'PromptRejectedError',
        cause: null,
      },
    };
    expect(isSnapUserRejection(err)).toBe(true);
  });
});
