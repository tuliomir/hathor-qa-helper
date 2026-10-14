import { describe, expect, test } from 'bun:test';
import { findDesignViolations } from '../scripts/design-lint';

describe('findDesignViolations', () => {
  test('flags raw palette classes with their line and match', () => {
    const src = 'const a = 1;\n<div className="p-2 bg-blue-50 text-red-900">x</div>\n';
    expect(findDesignViolations(src)).toEqual([
      { line: 2, match: 'bg-blue-50' },
      { line: 2, match: 'text-red-900' },
    ]);
  });

  test('flags the retired layout and legacy classes', () => {
    for (const cls of ['mb-7.5', 'mt-7.5', 'card-primary', 'text-2xs', 'break-all', 'window.confirm']) {
      expect(findDesignViolations(`x ${cls} y`)).toEqual([{ line: 1, match: cls }]);
    }
  });

  test('accepts theme tokens and lookalikes', () => {
    const ok = [
      'bg-base-200 text-ink-muted border-base-300',
      'text-warning-ink bg-tint-warning',
      'bg-primary text-primary-content',
      'hover:bg-base-200 break-words [overflow-wrap:anywhere]',
      'abg-blue-50', // not a class boundary
    ].join('\n');
    expect(findDesignViolations(ok)).toEqual([]);
  });
});
