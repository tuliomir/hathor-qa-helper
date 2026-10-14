import { describe, expect, test } from 'bun:test';
import { firstUnmetReason, sortRequirements, type Requirement } from '../src/utils/requirements';

const met: Requirement = { id: 'a', short: 'Test wallet', label: 'Test wallet ready', met: true };
const pending: Requirement = { id: 'b', short: 'Test wallet', label: 'Test wallet syncing', met: 'pending' };
const unmet: Requirement = {
  id: 'c',
  short: 'RPC session',
  label: 'RPC session not connected',
  met: false,
  action: 'Connect an RPC session',
};

describe('sortRequirements', () => {
  test('unmet first, then pending, then met; stable within a group', () => {
    expect(sortRequirements([met, pending, unmet]).map((r) => r.id)).toEqual(['c', 'b', 'a']);
  });
});

describe('firstUnmetReason', () => {
  test('null when everything is met', () => {
    expect(firstUnmetReason([met])).toBeNull();
    expect(firstUnmetReason([])).toBeNull();
  });

  test('uses the action of the first unmet requirement', () => {
    expect(firstUnmetReason([met, unmet])).toBe('Connect an RPC session');
  });

  test('falls back to the label, and pending counts as unmet', () => {
    expect(firstUnmetReason([pending])).toBe('Test wallet syncing');
  });

  test('unmet wins over pending regardless of order', () => {
    expect(firstUnmetReason([pending, unmet])).toBe('Connect an RPC session');
  });
});
