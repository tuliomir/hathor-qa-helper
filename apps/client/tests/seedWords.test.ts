import { describe, expect, test } from 'bun:test';
import {
  bboxToRect,
  parseSeedWordsFromOcr,
  parseSeedWordsFromText,
  replaceWordAt,
  splitSeedWords,
  validateSeedWords,
  type OcrWord,
} from '../src/utils/seedWords';

const box = (n: number) => ({ x0: n, y0: n, x1: n + 10, y1: n + 5 });
const ocr = (...texts: string[]): OcrWord[] => texts.map((text, i) => ({ text, bbox: box(i * 10) }));
const words = (parsed: { word: string }[]) => parsed.map((p) => p.word);

const BIP39_24 = [
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
  'account',
  'accuse',
  'achieve',
  'acid',
  'acoustic',
  'acquire',
  'across',
  'act',
  'action',
  'actor',
  'actress',
  'actual',
];

describe('splitSeedWords', () => {
  test('splits on any non-alphanumeric run, like wallet-lib does', () => {
    expect(splitSeedWords('  abandon,ability\n\nable  about ')).toEqual(['abandon', 'ability', 'able', 'about']);
  });

  test('returns an empty list for blank text', () => {
    expect(splitSeedWords('   \n')).toEqual([]);
  });
});

describe('replaceWordAt', () => {
  test('replaces only the word at that position when the word repeats', () => {
    expect(replaceWordAt('shake able shake', 2, 'snake')).toEqual('shake able snake');
  });

  test('keeps the surrounding whitespace and line breaks', () => {
    expect(replaceWordAt('abandon\n  shakr ability', 1, 'shake')).toEqual('abandon\n  shake ability');
  });

  test('round-trips through splitSeedWords at stable positions', () => {
    const text = 'one two three four';
    const next = replaceWordAt(text, 1, 'deux');
    expect(splitSeedWords(next)).toEqual(['one', 'deux', 'three', 'four']);
  });

  test('leaves the text unchanged for an out-of-range index', () => {
    expect(replaceWordAt('one two', 5, 'x')).toEqual('one two');
    expect(replaceWordAt('one two', -1, 'x')).toEqual('one two');
  });

  test('replacing with an empty string removes the word', () => {
    expect(splitSeedWords(replaceWordAt('one two three', 1, ''))).toEqual(['one', 'three']);
  });
});

describe('validateSeedWords', () => {
  const list = ['abandon', 'ability', 'shake', 'snake', 'able'];

  test('reports each invalid word with its position and a suggestion', () => {
    expect(validateSeedWords(['abandon', 'shakr', 'able', 'zzzzzzzz'], list)).toEqual([
      { index: 1, word: 'shakr', suggestion: 'shake' },
      { index: 3, word: 'zzzzzzzz', suggestion: '' },
    ]);
  });

  test('reports a repeated invalid word once per position', () => {
    expect(validateSeedWords(['shakr', 'able', 'shakr'], list).map((i) => i.index)).toEqual([0, 2]);
  });

  test('is case-insensitive', () => {
    expect(validateSeedWords(['Abandon', 'ABLE'], list)).toEqual([]);
  });

  test('defaults to the BIP39 English list', () => {
    expect(validateSeedWords(BIP39_24)).toEqual([]);
    expect(validateSeedWords(['abandon', 'abilty'])).toEqual([{ index: 1, word: 'abilty', suggestion: 'ability' }]);
  });
});

describe('bboxToRect', () => {
  test('converts corners to x/y/width/height', () => {
    expect(bboxToRect({ x0: 10, y0: 20, x1: 40, y1: 25 })).toEqual({ x: 10, y: 20, width: 30, height: 5 });
  });
});

describe('parseSeedWordsFromOcr', () => {
  test('drops list numbers in their own tokens and keeps the word boxes', () => {
    const parsed = parseSeedWordsFromOcr(ocr('1.', 'abandon', '2)', 'ability'));
    expect(parsed).toEqual([
      { word: 'abandon', bbox: box(10) },
      { word: 'ability', bbox: box(30) },
    ]);
  });

  test('handles a number glued to the word', () => {
    expect(words(parseSeedWordsFromOcr(ocr('1.abandon', '2)ability', '3:able')))).toEqual([
      'abandon',
      'ability',
      'able',
    ]);
  });

  test('strips punctuation and lowercases', () => {
    expect(words(parseSeedWordsFromOcr(ocr('Abandon,', '"ABILITY".', 'able;')))).toEqual([
      'abandon',
      'ability',
      'able',
    ]);
  });

  test('drops OCR junk: short, long, symbols and mixed digits', () => {
    expect(
      words(parseSeedWordsFromOcr(ocr('|', '—', 'a', 'ab', 'abandon', 'l2x', 'abcdefghijklmno', 'act', '©')))
    ).toEqual(['abandon', 'act']);
  });

  test('keeps reading order when the words are not numbered', () => {
    expect(words(parseSeedWordsFromOcr(ocr('Recovery', 'phrase', 'abandon', 'ability')))).toEqual([
      'recovery',
      'phrase',
      'abandon',
      'ability',
    ]);
  });

  test('returns at most 24 words', () => {
    const many = Array.from({ length: 30 }, () => 'abandon');
    expect(parseSeedWordsFromOcr(ocr(...many))).toHaveLength(24);
  });

  test('orders a two-column layout read row by row by its numbers', () => {
    // 1 13 / 2 14 / … / 12 24
    const tokens: string[] = [];
    for (let row = 0; row < 12; row++) {
      tokens.push(`${row + 1}.`, BIP39_24[row], `${row + 13}.`, BIP39_24[row + 12]);
    }
    expect(words(parseSeedWordsFromOcr(ocr(...tokens)))).toEqual(BIP39_24);
  });

  test('orders a three-column layout read column by column by its numbers', () => {
    // columns 1–8, 9–16, 17–24 with numbers in reading order of columns
    const tokens: string[] = [];
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 8; row++) {
        const n = col * 8 + row + 1;
        tokens.push(`${n}`, BIP39_24[n - 1]);
      }
    }
    expect(words(parseSeedWordsFromOcr(ocr(...tokens)))).toEqual(BIP39_24);
  });

  test('a numbered list drops unnumbered header and footer words', () => {
    const tokens = ['Your', 'recovery', 'phrase'];
    BIP39_24.forEach((w, i) => tokens.push(`${i + 1}.`, w));
    tokens.push('Continue');
    const parsed = parseSeedWordsFromOcr(ocr(...tokens));
    expect(words(parsed)).toEqual(BIP39_24);
    // boxes follow their words
    expect(parsed[0].bbox).toEqual(box(40));
  });

  test('falls back to reading order when numbers repeat', () => {
    const tokens: string[] = [];
    BIP39_24.slice(0, 12).forEach((w, i) => tokens.push(`${i + 1}.`, w));
    tokens[2] = '1.'; // OCR read "2." as "1."
    expect(words(parseSeedWordsFromOcr(ocr(...tokens)))).toEqual(BIP39_24.slice(0, 12));
  });

  test('ignores numbers outside 1–24 as labels', () => {
    expect(words(parseSeedWordsFromOcr(ocr('2024', 'abandon', '99', 'ability')))).toEqual(['abandon', 'ability']);
  });
});

describe('parseSeedWordsFromText', () => {
  test('parses a numbered multi-line list without boxes', () => {
    expect(parseSeedWordsFromText('1. abandon\n2) ability\n\n3- able')).toEqual([
      { word: 'abandon', bbox: null },
      { word: 'ability', bbox: null },
      { word: 'able', bbox: null },
    ]);
  });

  test('handles two columns on one line', () => {
    expect(words(parseSeedWordsFromText('1. abandon   3. able\n2. ability   4. about'))).toEqual([
      'abandon',
      'ability',
      'able',
      'about',
    ]);
  });
});
