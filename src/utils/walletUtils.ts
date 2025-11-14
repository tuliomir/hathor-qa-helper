/**
 * Utility functions for wallet operations
 */

// @ts-expect-error - bitcore-mnemonic doesn't have TypeScript definitions
import Mnemonic from 'bitcore-mnemonic';
import hathorLib from '@hathor/wallet-lib';

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
 */
export function treatSeedWords(seedPhrase: string) {
  const returnObject = { valid: false, treatedWords: '', error: '', invalidWords: [] as string[] };

  try {
    const { valid, words } = hathorLib.walletUtils.wordsValid(seedPhrase);
    if (!valid) {
      returnObject.error = 'Invalid seed phrase';
      return returnObject;
    }
    returnObject.valid = true;
    returnObject.treatedWords = words;
    return returnObject;
  } catch (err) {
    // Check if error has invalidWords property
    if (err && typeof err === 'object' && 'invalidWords' in err) {
      const invalidWords = (err as { invalidWords: string[] }).invalidWords;
      returnObject.invalidWords = Array.isArray(invalidWords) ? invalidWords : [];
    }

    if (err instanceof Error) {
      returnObject.error = err.message;
    } else {
      returnObject.error = String(err);
    }
    return returnObject;
  }
}
