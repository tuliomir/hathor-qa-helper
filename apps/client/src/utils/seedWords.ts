/**
 * Seed words by position: parsing OCR output (with word boxes), splitting
 * and editing the seed text, and per-position BIP39 validation.
 *
 * Tokenization matches wallet-lib's `wordsValid`: any run of characters
 * outside [A-Za-z0-9] separates words.
 */

// @ts-expect-error - bitcore-mnemonic doesn't have TypeScript definitions
import Mnemonic from 'bitcore-mnemonic';
import { didYouMean } from './walletUtils';
import type { Rect } from './imageViewport';

/** Tesseract's box format: corners in pixels of the image that was recognized. */
export interface Bbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  bbox: Bbox | null;
}

export interface SeedWordBox {
  word: string;
  bbox: Bbox | null;
}

export interface SeedWordIssue {
  /** 0-based position in the seed. */
  index: number;
  word: string;
  /** Closest BIP39 word, or '' when none is close enough. */
  suggestion: string;
}

const SEED_LENGTH = 24;
const WORD_RE = /[A-Za-z0-9]+/g;

export function splitSeedWords(text: string): string[] {
  return text.match(WORD_RE) ?? [];
}

/** Replaces the word at `index`, leaving every other character of `text` as it was. */
export function replaceWordAt(text: string, index: number, word: string): string {
  if (index < 0) return text;
  let i = 0;
  for (const m of text.matchAll(WORD_RE)) {
    if (i === index) {
      const start = m.index ?? 0;
      return text.slice(0, start) + word + text.slice(start + m[0].length);
    }
    i++;
  }
  return text;
}

export function validateSeedWords(
  words: string[],
  wordList: string[] = Mnemonic.Words.ENGLISH as string[]
): SeedWordIssue[] {
  const valid = new Set(wordList.map((w) => w.toLowerCase()));
  const issues: SeedWordIssue[] = [];
  words.forEach((word, index) => {
    if (!valid.has(word.toLowerCase())) {
      issues.push({ index, word, suggestion: didYouMean(word, wordList) });
    }
  });
  return issues;
}

export function bboxToRect(b: Bbox): Rect {
  return { x: b.x0, y: b.y0, width: b.x1 - b.x0, height: b.y1 - b.y0 };
}

interface Candidate extends SeedWordBox {
  label: number | null;
}

/**
 * Picks the seed words out of OCR tokens in reading order.
 *
 * Cleaning: list numbers (`1.`, `1)`, `1.word`) become position labels,
 * punctuation is stripped, words are lowercased, and only alphabetic
 * tokens of 3–14 letters are kept.
 *
 * Ordering: when the numbers are unambiguous (no repeats, and either every
 * word is numbered or at least 12 are), words are ordered by number. This
 * fixes two- and three-column layouts whatever order OCR read them in, and
 * drops unnumbered header/footer text. Otherwise reading order is kept.
 */
export function parseSeedWordsFromOcr(tokens: OcrWord[]): SeedWordBox[] {
  const candidates: Candidate[] = [];
  let pendingLabel: number | null = null;

  for (const token of tokens) {
    for (const part of token.text.split(/[^\w]+/)) {
      if (!part) continue;
      if (/^\d+$/.test(part)) {
        const n = Number(part);
        pendingLabel = n >= 1 && n <= SEED_LENGTH ? n : null;
        continue;
      }
      const word = part.toLowerCase();
      if (/^[a-z]{3,14}$/.test(word)) {
        candidates.push({ word, bbox: token.bbox, label: pendingLabel });
        pendingLabel = null;
      }
    }
  }

  const labelled = candidates.filter((c) => c.label !== null);
  const uniqueLabels = new Set(labelled.map((c) => c.label)).size === labelled.length;
  const useLabels =
    labelled.length > 0 && uniqueLabels && (labelled.length === candidates.length || labelled.length >= 12);

  const ordered = useLabels ? [...labelled].sort((a, b) => (a.label ?? 0) - (b.label ?? 0)) : candidates;
  return ordered.slice(0, SEED_LENGTH).map(({ word, bbox }) => ({ word, bbox }));
}

/** Text-only fallback for when OCR returned no word data. */
export function parseSeedWordsFromText(text: string): SeedWordBox[] {
  const tokens = text
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ({ text: t, bbox: null }));
  return parseSeedWordsFromOcr(tokens);
}
