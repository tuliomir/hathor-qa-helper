import { describe, expect, test } from 'bun:test';
import { defaultMainnetLabel, executeButtonLabel, executeClick, needsArming } from '../src/utils/executeArming';

const testnet = { isMainnet: false, isDryRun: false };
const mainnet = { isMainnet: true, isDryRun: false };
const mainnetDry = { isMainnet: true, isDryRun: true };

describe('needsArming', () => {
  test('only on mainnet and not in dry run', () => {
    expect(needsArming(testnet)).toBe(false);
    expect(needsArming(mainnet)).toBe(true);
    expect(needsArming(mainnetDry)).toBe(false);
  });
});

describe('executeClick', () => {
  test('testnet fires on the first click', () => {
    expect(executeClick('idle', testnet)).toEqual({ state: 'idle', fire: true });
  });

  test('mainnet dry run fires on the first click', () => {
    expect(executeClick('idle', mainnetDry)).toEqual({ state: 'idle', fire: true });
  });

  test('mainnet: the first click arms, the second fires and disarms', () => {
    const first = executeClick('idle', mainnet);
    expect(first).toEqual({ state: 'armed', fire: false });
    expect(executeClick(first.state, mainnet)).toEqual({ state: 'idle', fire: true });
  });

  test('an armed bar fires straight away if the context stops needing arming', () => {
    expect(executeClick('armed', testnet)).toEqual({ state: 'idle', fire: true });
  });
});

describe('labels', () => {
  test('default mainnet labels', () => {
    expect(defaultMainnetLabel('Send transaction')).toBe('Send on mainnet');
    expect(defaultMainnetLabel('Create token')).toBe('Create token on mainnet');
  });

  test('button label per state', () => {
    expect(executeButtonLabel('Send transaction', testnet, 'idle')).toBe('Send transaction');
    expect(executeButtonLabel('Send transaction', mainnetDry, 'idle')).toBe('Send transaction');
    expect(executeButtonLabel('Send transaction', mainnet, 'idle')).toBe('Send on mainnet');
    expect(executeButtonLabel('Send transaction', mainnet, 'armed')).toBe('Click again to send on mainnet');
    expect(executeButtonLabel('Create token', mainnet, 'armed')).toBe('Click again to create token on mainnet');
    expect(executeButtonLabel('Melt', mainnet, 'idle', 'Melt on mainnet now')).toBe('Melt on mainnet now');
  });
});
