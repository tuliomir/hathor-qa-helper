/**
 * Tests for the active-network model: network kinds, the preferred network
 * and how the active network is derived from the selected wallets.
 */

import { describe, expect, test } from 'bun:test';
import { NETWORK_CONFIG, networkKind, type NetworkKey } from '../src/constants/network';
import networkReducer, {
  resolveActiveNetwork,
  selectActiveNetwork,
  selectActiveNetworkInfo,
  selectActiveNetworkKind,
  setPreferredNetwork,
} from '../src/store/slices/networkSlice';
import type { RootState } from '../src/store';

function fakeState({
  preferred = 'TESTNET',
  test,
  funding,
}: {
  preferred?: NetworkKey;
  test?: NetworkKey;
  funding?: NetworkKey;
}): RootState {
  const wallets: Record<string, { metadata: { network: NetworkKey } }> = {};
  if (test) wallets.t = { metadata: { network: test } };
  if (funding) wallets.f = { metadata: { network: funding } };
  return {
    network: { preferredNetwork: preferred },
    walletSelection: { testWalletId: test ? 't' : null, fundingWalletId: funding ? 'f' : null },
    walletStore: { wallets },
  } as unknown as RootState;
}

describe('network kinds', () => {
  test('maps every network key to its kind', () => {
    expect(networkKind('TESTNET')).toBe('test');
    expect(networkKind('SHIELDED_TESTNET')).toBe('shielded-test');
    expect(networkKind('MAINNET')).toBe('main');
  });

  test('NETWORK_CONFIG carries kind and short label', () => {
    expect(NETWORK_CONFIG.TESTNET.kind).toBe('test');
    expect(NETWORK_CONFIG.SHIELDED_TESTNET.kind).toBe('shielded-test');
    expect(NETWORK_CONFIG.MAINNET.kind).toBe('main');
    expect(NETWORK_CONFIG.TESTNET.shortLabel).toBe('Test');
    expect(NETWORK_CONFIG.SHIELDED_TESTNET.shortLabel).toBe('Shielded');
    expect(NETWORK_CONFIG.MAINNET.shortLabel).toBe('Main');
  });

  test('only the shielded kind supports shielded outputs', () => {
    for (const config of Object.values(NETWORK_CONFIG)) {
      expect(config.kind === 'shielded-test').toBe(config.supportsShielded);
    }
  });
});

describe('networkSlice', () => {
  test('defaults the preferred network to testnet', () => {
    expect(networkReducer(undefined, { type: 'init' }).preferredNetwork).toBe('TESTNET');
  });

  test('setPreferredNetwork changes the preference', () => {
    const state = networkReducer(undefined, setPreferredNetwork('MAINNET'));
    expect(state.preferredNetwork).toBe('MAINNET');
  });

  test('ignores unknown network keys', () => {
    const state = networkReducer(undefined, setPreferredNetwork('BOGUS' as NetworkKey));
    expect(state.preferredNetwork).toBe('TESTNET');
  });
});

describe('resolveActiveNetwork', () => {
  test('follows the test wallet first', () => {
    expect(
      resolveActiveNetwork({
        testWalletNetwork: 'SHIELDED_TESTNET',
        fundingWalletNetwork: 'TESTNET',
        preferred: 'MAINNET',
      })
    ).toEqual({ network: 'SHIELDED_TESTNET', source: 'test-wallet' });
  });

  test('falls back to the funding wallet', () => {
    expect(
      resolveActiveNetwork({ testWalletNetwork: null, fundingWalletNetwork: 'MAINNET', preferred: 'TESTNET' })
    ).toEqual({
      network: 'MAINNET',
      source: 'funding-wallet',
    });
  });

  test('falls back to the preference when no wallet is selected', () => {
    expect(resolveActiveNetwork({ preferred: 'SHIELDED_TESTNET' })).toEqual({
      network: 'SHIELDED_TESTNET',
      source: 'preference',
    });
  });
});

describe('active network selectors', () => {
  test('derive from the selected test wallet', () => {
    const state = fakeState({ preferred: 'TESTNET', test: 'MAINNET', funding: 'TESTNET' });
    expect(selectActiveNetwork(state)).toBe('MAINNET');
    expect(selectActiveNetworkKind(state)).toBe('main');
    expect(selectActiveNetworkInfo(state).source).toBe('test-wallet');
  });

  test('use the preference without wallets', () => {
    const state = fakeState({ preferred: 'SHIELDED_TESTNET' });
    expect(selectActiveNetwork(state)).toBe('SHIELDED_TESTNET');
    expect(selectActiveNetworkKind(state)).toBe('shielded-test');
  });

  test('ignore a selected id whose wallet no longer exists', () => {
    const state = {
      ...fakeState({ preferred: 'MAINNET' }),
      walletSelection: { testWalletId: 'gone', fundingWalletId: null },
    } as unknown as RootState;
    expect(selectActiveNetworkInfo(state)).toEqual({ network: 'MAINNET', source: 'preference' });
  });

  test('return a stable object while inputs are unchanged', () => {
    const state = fakeState({ test: 'TESTNET' });
    expect(selectActiveNetworkInfo(state)).toBe(selectActiveNetworkInfo(state));
  });
});
