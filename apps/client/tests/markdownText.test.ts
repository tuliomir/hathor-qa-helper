import { describe, expect, test } from 'bun:test';
import { tokenize } from '../src/utils/markdownTokens';

describe('MarkdownText tokenize', () => {
  test('inline code between backticks', () => {
    expect(tokenize('Go to `Settings`, then `Change Network`.')).toEqual([
      { type: 'text', content: 'Go to ' },
      { type: 'code', content: 'Settings' },
      { type: 'text', content: ', then ' },
      { type: 'code', content: 'Change Network' },
      { type: 'text', content: '.' },
    ]);
  });

  test('markers inside code are not parsed', () => {
    expect(tokenize('`**raw**`')).toEqual([{ type: 'code', content: '**raw**' }]);
  });

  test('a lone backtick stays text', () => {
    expect(tokenize('it`s')).toEqual([{ type: 'text', content: 'it`s' }]);
  });

  test('existing markers still work', () => {
    expect(tokenize('**a** *b*\n[c](https://x.y)')).toEqual([
      { type: 'bold', content: 'a' },
      { type: 'text', content: ' ' },
      { type: 'italic', content: 'b' },
      { type: 'linebreak', content: '' },
      { type: 'link', content: 'c', url: 'https://x.y' },
    ]);
  });
});
