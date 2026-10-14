import { beforeAll, describe, expect, it } from 'bun:test';

type Selector = typeof import('../src/store/slices/walletConnectSlice').selectRpcSessionIsMainnet;
let selectRpcSessionIsMainnet: Selector;

beforeAll(async () => {
  // constants/walletConnect reads window.location at import.
  // @ts-expect-error - minimal window for the test environment
  globalThis.window ??= { location: { origin: 'http://localhost:5173' } };
  ({ selectRpcSessionIsMainnet } = await import('../src/store/slices/walletConnectSlice'));
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
