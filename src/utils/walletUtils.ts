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
 * Suggests the closest valid invalidWord from the BIP39 invalidWord list
 * @param invalidWord
 * @param validWordSet
 */
export function didYouMean(invalidWord: string, validWordSet: string[] = Mnemonic.Words.ENGLISH): string {
	// Normalize input
	const word = (invalidWord || '').trim().toLowerCase();
	if (!word) return '';

	// Normalize validWordSet into an array of lowercase strings
	let wordList: string[] = [];
	if (Array.isArray(validWordSet)) {
		wordList = (validWordSet as any[])
			.map(w => (typeof w === 'string' ? w.toLowerCase() : String(w).toLowerCase()));
	} else if (validWordSet && typeof validWordSet === 'object') {
		wordList = Object.values(validWordSet as any)
			.filter(v => typeof v === 'string')
			.map(v => v.toLowerCase());
	}

	const validSet = new Set(wordList);
	// If already valid, return original input (preserve user casing)
	if (validSet.has(word)) return invalidWord;

	// Levenshtein distance implementation (iterative, O(n*m) time, O(min(n,m)) memory)
	function levenshtein(a: string, b: string): number {
		if (a === b) return 0;
		const la = a.length;
		const lb = b.length;
		if (la === 0) return lb;
		if (lb === 0) return la;

		// Ensure a is the shorter to use less memory
		if (la > lb) return levenshtein(b, a);

		let prev = new Array(la + 1);
		for (let i = 0; i <= la; i++) prev[i] = i;

		for (let j = 1; j <= lb; j++) {
			const cur = new Array(la + 1);
			cur[0] = j;
			const bj = b.charAt(j - 1);
			for (let i = 1; i <= la; i++) {
				const cost = a.charAt(i - 1) === bj ? 0 : 1;
				cur[i] = Math.min(
					prev[i] + 1, // deletion
					cur[i - 1] + 1, // insertion
					prev[i - 1] + cost // substitution
				);
			}
			prev = cur;
		}
		return prev[la];
	}

	// Dynamic threshold: allow more edits for longer words
	const len = word.length;
	const threshold = len <= 4 ? 1 : len <= 7 ? 2 : 3;

	let bestWord = '';
	let bestDist = Number.POSITIVE_INFINITY;

	for (const candidate of wordList) {
		// cheap length filter: if length difference already exceeds threshold, skip
		if (Math.abs(candidate.length - len) > threshold) continue;

		// small heuristic: first letter mismatch increases distance expectation, but we still compute
		const dist = levenshtein(word, candidate);
		if (dist < bestDist) {
			bestDist = dist;
			bestWord = candidate;
			// perfect match early exit
			if (bestDist === 0) break;
		}
	}

	if (bestDist <= threshold) return bestWord;
	return '';
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
