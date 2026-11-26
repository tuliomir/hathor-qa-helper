/**
 * RPC follows the chain the wallet approved: the session proposal offers
 * every chain, and each request carries the approved chain and its network.
 */

import { describe, expect, test } from 'bun:test';
import { RPC_CHAINS, rpcChain, rpcChainNetworkName, networkKeyOfChain } from '../src/constants/hathorChains';

// rpcHandlers and RpcMethodCard pull in walletConnect constants, which read window.location.
// @ts-expect-error - minimal window for the test environment
globalThis.window ??= { location: { origin: 'http://localhost:5173' } };
const { createRpcHandlers } = await import('../src/services/rpcHandlers');
const { withSessionNetwork } = await import('../src/utils/rpcCoreRequests');

describe('rpcChain', () => {
  test('offers testnet and mainnet', () => {
    expect([...RPC_CHAINS]).toEqual(['hathor:testnet', 'hathor:mainnet']);
  });

  test('follows the approved chain', () => {
    expect(rpcChain(['hathor:testnet'])).toBe('hathor:testnet');
    expect(rpcChainNetworkName('hathor:testnet')).toBe('testnet');
    expect(networkKeyOfChain('hathor:testnet')).toBe('TESTNET');
    expect(rpcChain([])).toBe('hathor:testnet');
  });

  test('a testnet chain acts on Next testnet while that is the active network', () => {
    // A wallet on testnet-juliet approves hathor:testnet too.
    expect(networkKeyOfChain('hathor:testnet', 'NEXT_TESTNET')).toBe('NEXT_TESTNET');
    expect(networkKeyOfChain('hathor:testnet', 'SHIELDED_TESTNET')).toBe('TESTNET');
    expect(networkKeyOfChain('hathor:mainnet', 'NEXT_TESTNET')).toBe('MAINNET');
  });

  test('mainnet wins whenever it was approved', () => {
    expect(rpcChain(['hathor:testnet', 'hathor:mainnet'])).toBe('hathor:mainnet');
  });
});

describe('rpcHandlers send to the session chain', () => {
  function recordingClient() {
    const calls: { chainId: string; request: { method: string; params: { network?: string } } }[] = [];
    return {
      calls,
      client: {
        request: async (args: (typeof calls)[number]) => {
          calls.push(args);
          return { ok: true };
        },
      },
    };
  }

  const sessionOn = (chain: string) => ({ topic: 't', namespaces: { hathor: { chains: [chain] } } });

  test('a mainnet session sends hathor:mainnet with network mainnet', async () => {
    const { client, calls } = recordingClient();
    const handlers = createRpcHandlers({ client: client as never, session: sessionOn('hathor:mainnet') as never });
    await handlers.getRpcWalletInformation();
    await handlers.getRpcBalance();
    expect(calls.map((c) => c.chainId)).toEqual(['hathor:mainnet', 'hathor:mainnet']);
    expect(calls.map((c) => c.request.params.network)).toEqual(['mainnet', 'mainnet']);
  });

  test('a testnet session keeps sending testnet', async () => {
    const { client, calls } = recordingClient();
    const handlers = createRpcHandlers({ client: client as never, session: sessionOn('hathor:testnet') as never });
    await handlers.getRpcWalletInformation();
    expect(calls[0].chainId).toBe('hathor:testnet');
    expect(calls[0].request.params.network).toBe('testnet');
  });
});

describe('withSessionNetwork', () => {
  test('stamps the session network on a preview that names one', () => {
    const preview = { method: 'htr_getBalance', params: { network: 'testnet', tokens: ['00'] } };
    expect(withSessionNetwork(preview, 'mainnet')).toEqual({
      method: 'htr_getBalance',
      params: { network: 'mainnet', tokens: ['00'] },
    });
  });

  test('leaves requests without a network alone', () => {
    const preview = { method: 'htr_custom', params: { foo: 1 } };
    expect(withSessionNetwork(preview, 'mainnet')).toBe(preview);
    expect(withSessionNetwork(null, 'mainnet')).toBeNull();
  });
});
