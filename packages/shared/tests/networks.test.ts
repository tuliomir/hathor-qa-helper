import { describe, expect, test } from 'bun:test';
import { NETWORKS, NETWORK_KEYS, isNetworkKey } from '../src/networks.ts';

describe('NETWORKS', () => {
  test('every key matches its definition', () => {
    for (const key of NETWORK_KEYS) expect(NETWORKS[key].key).toBe(key);
  });

  test('shielded testnet uses the lib testnet name and its own tx mining', () => {
    const net = NETWORKS.SHIELDED_TESTNET;
    expect(net.libName).toBe('testnet');
    expect(net.supportsShielded).toBe(true);
    expect(net.txMiningUrl).not.toBe(NETWORKS.TESTNET.txMiningUrl);
    expect(net.blueprints).toBeUndefined();
  });

  test('isNetworkKey rejects unknown values', () => {
    expect(isNetworkKey('SHIELDED_TESTNET')).toBe(true);
    expect(isNetworkKey('testnet')).toBe(false);
    expect(isNetworkKey(undefined)).toBe(false);
  });
});
