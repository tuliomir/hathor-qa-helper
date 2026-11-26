import { beforeAll, describe, expect, it } from 'bun:test';

type Slice = typeof import('../src/store/slices/walletConnectSlice');
let selectRpcSessionIsMainnet: Slice['selectRpcSessionIsMainnet'];
let selectRpcNetwork: Slice['selectRpcNetwork'];

beforeAll(async () => {
  // constants/walletConnect reads window.location at import.
  // @ts-expect-error - minimal window for the test environment
  globalThis.window ??= { location: { origin: 'http://localhost:5173' } };
  ({ selectRpcSessionIsMainnet, selectRpcNetwork } = await import('../src/store/slices/walletConnectSlice'));
});

const state = (chains: string[]) => ({ walletConnect: { chains } });

describe('selectRpcSessionIsMainnet', () => {
  it('is false for the testnet chain QA Helper requests', () => {
    expect(selectRpcSessionIsMainnet(state(['hathor:testnet']))).toBe(false);
  });

  it('is false without a session', () => {
    expect(selectRpcSessionIsMainnet(state([]))).toBe(false);
  });

  it('is true when the session approved the mainnet chain', () => {
    expect(selectRpcSessionIsMainnet(state(['hathor:mainnet']))).toBe(true);
    expect(selectRpcSessionIsMainnet(state(['hathor:testnet', 'hathor:mainnet']))).toBe(true);
  });
});

describe('selectRpcNetwork', () => {
  const state = (preferredNetwork: 'TESTNET' | 'NEXT_TESTNET', testWalletNetwork?: 'TESTNET' | 'NEXT_TESTNET') => ({
    walletConnect: { chains: ['hathor:testnet'] },
    network: { preferredNetwork },
    walletSelection: { testWalletId: testWalletNetwork ? 'w1' : null, fundingWalletId: null },
    walletStore: { wallets: testWalletNetwork ? { w1: { metadata: { network: testWalletNetwork } } } : {} },
  });

  it("follows the test wallet's network over a stale saved choice, as the header does", () => {
    expect(selectRpcNetwork(state('NEXT_TESTNET', 'TESTNET'))).toBe('TESTNET');
    expect(selectRpcNetwork(state('TESTNET', 'NEXT_TESTNET'))).toBe('NEXT_TESTNET');
    expect(selectRpcNetwork(state('NEXT_TESTNET'))).toBe('NEXT_TESTNET');
  });
});
