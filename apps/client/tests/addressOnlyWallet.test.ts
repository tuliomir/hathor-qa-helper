import { describe, expect, test } from 'bun:test';
import {
  addressOnlyError,
  addressOnlyTokenOptions,
  isAddressOnly,
  walletAddress0,
} from '../src/utils/addressOnlyWallet';
import type { WalletMetadata } from '../src/types/walletStore';

const TESTNET_ADDR = 'WgYxrPPFXgMRefkMAbZwKJkUYeyqon4stw';
const MAINNET_ADDR = 'HQQ4MoYk6j4WfN9VMkaRKAmWn1UiQqw46x';

const seed: WalletMetadata = { id: 's', friendlyName: 'Seed', seedWords: 'a b c', network: 'TESTNET', createdAt: 1 };
const addressOnly: WalletMetadata = {
  id: 'a',
  friendlyName: 'Passkey wallet',
  seedWords: '',
  network: 'TESTNET',
  createdAt: 1,
  kind: 'address',
  address0: TESTNET_ADDR,
};

describe('isAddressOnly', () => {
  test('wallets saved before the kind existed are seed wallets', () => {
    expect(isAddressOnly(seed)).toBe(false);
    expect(isAddressOnly({ ...seed, kind: 'seed' })).toBe(false);
    expect(isAddressOnly(addressOnly)).toBe(true);
  });
});

describe('walletAddress0', () => {
  test('address-only wallets use their saved address', () => {
    expect(walletAddress0({ metadata: addressOnly })).toBe(TESTNET_ADDR);
  });

  test('seed wallets know it once started', () => {
    expect(walletAddress0({ metadata: seed })).toBeNull();
    expect(walletAddress0({ metadata: seed, firstAddress: 'W123' })).toBe('W123');
  });

  test('no wallet, no address', () => {
    expect(walletAddress0(undefined)).toBeNull();
  });
});

describe('addressOnlyError', () => {
  test('accepts a transparent address on its network', () => {
    expect(addressOnlyError(TESTNET_ADDR, 'TESTNET')).toBeNull();
    expect(addressOnlyError(MAINNET_ADDR, 'MAINNET')).toBeNull();
  });

  test('rejects another network, typos and empty input', () => {
    expect(addressOnlyError(MAINNET_ADDR, 'TESTNET')).toMatch(/mainnet/i);
    expect(addressOnlyError(TESTNET_ADDR.slice(0, -1) + 'x', 'TESTNET')).toMatch(/checksum/i);
    expect(addressOnlyError('  ', 'TESTNET')).toMatch(/enter/i);
  });
});

describe('addressOnlyTokenOptions', () => {
  const UID = '00b6e7cfa5e1e2b6d0b3a6e3c8a9d1f2e4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9';

  test('names from the configuration string first', () => {
    const known = [{ uid: UID, name: 'Registry', symbol: 'REG' }];
    expect(addressOnlyTokenOptions([{ uid: UID, name: 'Config', symbol: 'CFG' }], known)).toEqual([
      { uid: UID, name: 'Config', symbol: 'CFG' },
    ]);
  });

  test('falls back to the token registry, then a shortened UID', () => {
    const known = [{ uid: UID, name: 'Registry', symbol: 'REG' }];
    expect(addressOnlyTokenOptions([{ uid: UID }], known)).toEqual([{ uid: UID, name: 'Registry', symbol: 'REG' }]);
    expect(addressOnlyTokenOptions([{ uid: UID }], [])).toEqual([{ uid: UID, name: 'Unknown', symbol: '00b6e7cf…' }]);
  });
});
