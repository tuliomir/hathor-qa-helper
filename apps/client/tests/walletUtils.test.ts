/**
 * Smoke tests for walletUtils
 * Tests wallet-related utility functions
 */

import { describe, test, expect } from 'bun:test';
import { didYouMean } from '../src/utils/walletUtils';

describe('walletUtils', () => {
  describe('didYouMean', () => {
    // Use a sample word list for testing (subset of BIP39 words)
    const sampleWordList = [
      'abandon', 'ability', 'able', 'about', 'above', 'absent',
      'abstract', 'absurd', 'abuse', 'access', 'accident',
      'account', 'accuse', 'achieve', 'acid', 'acoustic',
      'acquire', 'across', 'act', 'action', 'actor',
      'actual', 'adapt', 'add', 'addict', 'address',
      'adjust', 'admit', 'adult', 'advance', 'advice',
      'aerobic', 'affair', 'afford', 'afraid', 'again',
      'age', 'agent', 'agree', 'ahead', 'aim',
      'air', 'airport', 'aisle', 'alarm', 'album',
      'alcohol', 'alert', 'alien', 'all', 'alley',
    ];

    test('returns empty string for empty input', () => {
      const result = didYouMean('', sampleWordList);
      expect(result).toBe('');
    });

    test('returns empty string for null-ish input', () => {
      // @ts-expect-error - testing null input
      const result = didYouMean(null, sampleWordList);
      expect(result).toBe('');
    });

    test('returns original word if it is valid', () => {
      const result = didYouMean('abandon', sampleWordList);
      expect(result).toBe('abandon');
    });

    test('suggests close match for typo', () => {
      const result = didYouMean('abandn', sampleWordList);
      expect(result).toBe('abandon');
    });

    test('suggests close match for misspelling', () => {
      const result = didYouMean('abillity', sampleWordList);
      expect(result).toBe('ability');
    });

    test('is case insensitive', () => {
      const result = didYouMean('ABANDON', sampleWordList);
      // Should return the original if valid (case preserved)
      expect(result.toLowerCase()).toBe('abandon');
    });

    test('returns empty string when no close match found', () => {
      const result = didYouMean('xyzabc123', sampleWordList);
      expect(result).toBe('');
    });

    test('handles single character typos', () => {
      const result = didYouMean('abile', sampleWordList);
      // Should suggest "able" as it's 1 edit away
      expect(result).toBe('able');
    });

    test('handles words with extra character', () => {
      const result = didYouMean('ablee', sampleWordList);
      expect(result).toBe('able');
    });

    test('handles words with missing character', () => {
      const result = didYouMean('abl', sampleWordList);
      expect(result).toBe('able');
    });

    test('works with object-style word lists', () => {
      const objectWordList = {
        0: 'abandon',
        1: 'ability',
        2: 'able',
      };

      const result = didYouMean('abandn', objectWordList as unknown as string[]);
      expect(result).toBe('abandon');
    });

    test('handles short words correctly', () => {
      const result = didYouMean('ac', sampleWordList);
      // Short words should have tighter threshold
      expect(['act', '']).toContain(result);
    });

    test('handles longer words with more tolerance', () => {
      const result = didYouMean('abstroct', sampleWordList);
      expect(result).toBe('abstract');
    });
  });
});
