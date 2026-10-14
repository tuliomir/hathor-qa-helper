import { describe, expect, test } from 'bun:test';
import { capabilityDisplay } from '../src/utils/capabilityDisplay';

describe('capabilityDisplay', () => {
  test('full only when this context can create shielded outputs', () => {
    expect(capabilityDisplay('full', true)).toMatchObject({
      level: 'full',
      segments: 3,
      word: 'Full',
      receiveOnly: false,
    });
  });

  test('the browser trap: lib says full, provider cannot prove, so it shows view and receive-only', () => {
    expect(capabilityDisplay('full', false)).toMatchObject({
      level: 'view',
      segments: 2,
      word: 'View',
      receiveOnly: true,
    });
  });

  test('lower levels are shown as reported', () => {
    expect(capabilityDisplay('view', false)).toMatchObject({ level: 'view', segments: 2, receiveOnly: false });
    expect(capabilityDisplay('watch', false)).toMatchObject({ level: 'watch', segments: 1, word: 'Watch' });
    expect(capabilityDisplay('none', true)).toMatchObject({ level: 'none', segments: 0, word: 'None' });
  });

  test('unknown capability reads as none', () => {
    expect(capabilityDisplay(undefined, false)).toMatchObject({ level: 'none', segments: 0 });
  });

  test('the tooltip says what the level allows and names the downgrade', () => {
    expect(capabilityDisplay('view', false).title).toBe('Can decrypt shielded amounts');
    expect(capabilityDisplay('full', false).title).toContain("can't create shielded outputs here");
  });

  test("the tooltip carries wallet-lib's reason when there is one", () => {
    expect(capabilityDisplay('none', false, 'no-provider').title).toBe('No shielded support (no-provider)');
    expect(capabilityDisplay('watch', false, 'scan-key-locked').title).toBe(
      'Sees that shielded outputs exist (scan-key-locked)'
    );
    expect(capabilityDisplay('none', false, null).title).toBe('No shielded support');
  });
});
