/**
 * Utility functions for wallet operations
 */

// @ts-expect-error - bitcore-mnemonic doesn't have TypeScript definitions
import Mnemonic from 'bitcore-mnemonic';

/**
 * Generates a new BIP39 mnemonic seed phrase
 * @returns A 24-word seed phrase
 */
export function generateSeed(): string {
  const mnemonic = new Mnemonic();
  return mnemonic.phrase;
}

/**
 * Validates a BIP39 mnemonic seed phrase
 * @param seedPhrase - The seed phrase to validate
 * @returns true if the seed phrase is valid, false otherwise
 */
export function validateSeed(seedPhrase: string): boolean {
  try {
    return Mnemonic.isValid(seedPhrase);
  } catch {
    return false;
  }
}

/**
 * Gets the word count of a seed phrase
 * @param seedPhrase - The seed phrase to count
 * @returns Number of words in the seed phrase
 */
export function getSeedWordCount(seedPhrase: string): number {
  return seedPhrase.trim().split(/\s+/).length;
}
