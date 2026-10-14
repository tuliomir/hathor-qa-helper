/**
 * Smoke tests for betHelpers
 * Tests bet nano contract utility functions
 */

import { describe, test, expect } from 'bun:test';
import { safeStringify } from '../src/utils/betHelpers';

describe('betHelpers', () => {
  describe('safeStringify', () => {
    test('stringifies simple object', () => {
      const obj = { name: 'test', value: 123 };
      const result = safeStringify(obj);

      expect(result).toBe('{"name":"test","value":123}');
    });

    test('handles objects with BigInt values', () => {
      const obj = { amount: BigInt(1000000000000) };
      const result = safeStringify(obj);

      expect(result).toBe('{"amount":"1000000000000"}');
    });

    test('handles nested objects with BigInt', () => {
      const obj = {
        transaction: {
          value: BigInt(500),
          fee: BigInt(1),
        },
      };
      const result = safeStringify(obj);

      expect(result).toContain('"value":"500"');
      expect(result).toContain('"fee":"1"');
    });

    test('handles arrays with BigInt values', () => {
      const obj = {
        values: [BigInt(100), BigInt(200), BigInt(300)],
      };
      const result = safeStringify(obj);

      expect(result).toBe('{"values":["100","200","300"]}');
    });

    test('handles mixed types', () => {
      const obj = {
        name: 'Test',
        count: 42,
        bigValue: BigInt(9007199254740992),
        isActive: true,
        data: null,
      };
      const result = safeStringify(obj);

      expect(result).toContain('"name":"Test"');
      expect(result).toContain('"count":42');
      expect(result).toContain('"bigValue":"9007199254740992"');
      expect(result).toContain('"isActive":true');
      expect(result).toContain('"data":null');
    });

    test('applies spacing when specified', () => {
      const obj = { a: 1, b: 2 };
      const result = safeStringify(obj, 2);

      expect(result).toContain('\n');
      expect(result).toContain('  ');
    });

    test('handles empty object', () => {
      const result = safeStringify({});
      expect(result).toBe('{}');
    });

    test('handles empty array', () => {
      const result = safeStringify([]);
      expect(result).toBe('[]');
    });

    test('handles null', () => {
      const result = safeStringify(null);
      expect(result).toBe('null');
    });

    test('handles string', () => {
      const result = safeStringify('hello');
      expect(result).toBe('"hello"');
    });

    test('handles number', () => {
      const result = safeStringify(42);
      expect(result).toBe('42');
    });

    test('handles boolean', () => {
      expect(safeStringify(true)).toBe('true');
      expect(safeStringify(false)).toBe('false');
    });

    test('handles deeply nested BigInt', () => {
      const obj = {
        level1: {
          level2: {
            level3: {
              value: BigInt(999),
            },
          },
        },
      };
      const result = safeStringify(obj);

      expect(result).toContain('"value":"999"');
    });

    test('handles very large BigInt values', () => {
      // Maximum safe integer is 9007199254740991
      // BigInt can handle much larger
      const obj = { huge: BigInt('99999999999999999999999999999') };
      const result = safeStringify(obj);

      expect(result).toBe('{"huge":"99999999999999999999999999999"}');
    });
  });
});
