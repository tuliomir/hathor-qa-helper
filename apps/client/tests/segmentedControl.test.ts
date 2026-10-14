import { describe, expect, test } from 'bun:test';
import { segmentedKeyDown } from '../src/utils/segmentedControl';

const three = [{}, {}, {}];

describe('segmentedKeyDown', () => {
  test('ArrowRight and ArrowDown move focus to the next option', () => {
    expect(segmentedKeyDown(three, 0, 'ArrowRight')).toEqual({ focus: 1 });
    expect(segmentedKeyDown(three, 1, 'ArrowDown')).toEqual({ focus: 2 });
  });

  test('ArrowLeft and ArrowUp move focus to the previous option', () => {
    expect(segmentedKeyDown(three, 2, 'ArrowLeft')).toEqual({ focus: 1 });
    expect(segmentedKeyDown(three, 1, 'ArrowUp')).toEqual({ focus: 0 });
  });

  test('arrows wrap around', () => {
    expect(segmentedKeyDown(three, 2, 'ArrowRight')).toEqual({ focus: 0 });
    expect(segmentedKeyDown(three, 0, 'ArrowLeft')).toEqual({ focus: 2 });
  });

  test('arrows skip disabled options', () => {
    const opts = [{}, { disabled: true }, {}];
    expect(segmentedKeyDown(opts, 0, 'ArrowRight')).toEqual({ focus: 2 });
    expect(segmentedKeyDown(opts, 2, 'ArrowLeft')).toEqual({ focus: 0 });
  });

  test('Home and End go to the first and last enabled options', () => {
    const opts = [{ disabled: true }, {}, {}, { disabled: true }];
    expect(segmentedKeyDown(opts, 2, 'Home')).toEqual({ focus: 1 });
    expect(segmentedKeyDown(opts, 1, 'End')).toEqual({ focus: 2 });
  });

  test('Space and Enter select the focused option', () => {
    expect(segmentedKeyDown(three, 1, ' ')).toEqual({ select: 1 });
    expect(segmentedKeyDown(three, 2, 'Enter')).toEqual({ select: 2 });
  });

  test('Space on a disabled option does nothing', () => {
    expect(segmentedKeyDown([{}, { disabled: true }], 1, ' ')).toBeNull();
  });

  test('all options disabled: arrows do nothing', () => {
    const opts = [{ disabled: true }, { disabled: true }];
    expect(segmentedKeyDown(opts, 0, 'ArrowRight')).toBeNull();
    expect(segmentedKeyDown(opts, 0, 'Home')).toBeNull();
  });

  test('a single enabled option keeps focus', () => {
    expect(segmentedKeyDown([{}], 0, 'ArrowRight')).toEqual({ focus: 0 });
  });

  test('other keys are ignored', () => {
    expect(segmentedKeyDown(three, 0, 'Tab')).toBeNull();
    expect(segmentedKeyDown(three, 0, 'a')).toBeNull();
  });
});
