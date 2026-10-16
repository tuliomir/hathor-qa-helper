import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import bitcore from 'bitcore-lib';
import Network from '@hathor/wallet-lib/lib/models/network';
import Address from '@hathor/wallet-lib/lib/models/address';
import P2PKH from '@hathor/wallet-lib/lib/models/p2pkh';
import ScriptData from '@hathor/wallet-lib/lib/models/script_data';
import Output from '@hathor/wallet-lib/lib/models/output';
import Input from '@hathor/wallet-lib/lib/models/input';
import Transaction from '@hathor/wallet-lib/lib/models/transaction';
import { signMessage } from '@hathor/wallet-lib/lib/utils/crypto';
import flowRunReducer from '../src/store/slices/flowRunSlice';
import walletInformationReducer from '../src/store/slices/walletInformationSlice';
import connectedNetworkReducer from '../src/store/slices/connectedNetworkSlice';
import getAddressReducer from '../src/store/slices/getAddressSlice';
import getBalanceReducer from '../src/store/slices/getBalanceSlice';
import getUtxosReducer from '../src/store/slices/getUtxosSlice';
import signWithAddressReducer from '../src/store/slices/signWithAddressSlice';
import sendTransactionReducer from '../src/store/slices/sendTransactionSlice';
import createTokenReducer from '../src/store/slices/createTokenSlice';
import { flowRunSettled, startFlow, type FlowEnv, type FlowWallet } from '../src/flows/flowRunner';
import { runRpc, type RpcHandlers } from '../src/services/rpcRun';
import type { CreateTokenParams } from '../src/services/rpcHandlers';
import type { SendTransactionOutput } from '../src/store/slices/sendTransactionSlice';
import type { RootState } from '../src/store';

type RpcFlowModule = typeof import('../src/flows/rpcFlow');
let RPC_FLOW: RpcFlowModule['RPC_FLOW'];
let rpcRequestsFlowPreflight: RpcFlowModule['rpcRequestsFlowPreflight'];

beforeAll(async () => {
  // constants/walletConnect reads window.location at import.
  // @ts-expect-error - minimal window for the test environment
  globalThis.window ??= { location: { origin: 'http://localhost:5173' } };
  ({ RPC_FLOW, rpcRequestsFlowPreflight } = await import('../src/flows/rpcFlow'));
});

const network = new Network('testnet');
const keys = Array.from({ length: 25 }, () => new bitcore.PrivateKey(undefined, network.bitcoreNetwork));
const ADDRS = keys.map((k) => k.toAddress(network.bitcoreNetwork).toString());
const FIRST_EMPTY = 5;
const CHOSEN = 3;
const REJECTED = { code: 5002, message: 'Rejected by the user' };
const INVALID = { code: 8000, message: 'Invalid token request' };
const hash = (n: number) => n.toString(16).padStart(64, '0');

const fixed = {
  walletConnect: {
    client: {},
    session: { topic: 't', namespaces: { hathor: { accounts: [`hathor:testnet:${ADDRS[0]}`] } } },
    chains: ['hathor:testnet'],
  },
  walletSelection: { testWalletId: 'w1' },
  walletStore: { wallets: { w1: { metadata: { kind: 'seed' }, status: 'ready', firstAddress: ADDRS[0] } } },
  rpc: { isDryRun: false },
};

interface FullnodeTxRecord {
  fees: { token_uid: string; amount: number }[];
  outputs: { value: number; token_data: number; script: string; decoded: { address?: string } }[];
}

/**
 * A phone that rejects each prompted request once, then answers like the
 * mobile wallet; the two invalid tokens come back as errors. Txs it pushes
 * land on a fake fullnode.
 */
function setup(opts: { usedFirstEmpty?: boolean } = {}) {
  const store = configureStore({
    reducer: {
      flowRun: flowRunReducer,
      walletInformation: walletInformationReducer,
      connectedNetwork: connectedNetworkReducer,
      getAddress: getAddressReducer,
      getBalance: getBalanceReducer,
      getUtxos: getUtxosReducer,
      signWithAddress: signWithAddressReducer,
      sendTransaction: sendTransactionReducer,
      createToken: createTokenReducer,
    },
  });
  const getState = () => ({ ...store.getState(), ...fixed }) as unknown as RootState;

  const txs: Record<string, FullnodeTxRecord> = {};
  const tokens: Record<string, { version: number; total: number; mint: unknown[]; melt: unknown[] }> = {};
  let nextTx = 10;
  let scattered: bigint[] = [];
  let depositToken = '';
  const sent: string[] = [];
  const seen = new Set<string>();

  /** Rejects the first time it sees `request`, if it prompts. */
  const phone = (request: string, prompts: boolean, answer: () => unknown) => {
    sent.push(request);
    const params = { method: request, params: {} };
    if (prompts && !seen.has(request)) {
      seen.add(request);
      return Promise.reject(Object.assign({ ...REJECTED }, { requestParams: params }));
    }
    return Promise.resolve({ request: params, response: answer() });
  };

  const scriptOf = (o: SendTransactionOutput) =>
    o.type === 'data'
      ? new ScriptData(o.data!).createScript()
      : new P2PKH(new Address(o.address!, { network })).createScript();

  const handlers = {
    getRpcWalletInformation: () =>
      phone('wallet-information', false, () => ({ type: 12, response: { network: 'testnet', address0: ADDRS[0] } })),
    getRpcConnectedNetwork: () =>
      phone('connected-network', false, () => ({ type: 4, response: { network: 'testnet', genesisHash: '' } })),
    getRpcGetAddress: (type: string, index?: number) =>
      phone(`address:${type}`, true, () => {
        const i = type === 'index' ? index! : type === 'client' ? CHOSEN : FIRST_EMPTY;
        return { type: 2, response: { address: ADDRS[i], index: i, addressPath: `m/44'/280'/0'/0/${i}` } };
      }),
    getRpcBalance: () =>
      phone('balance', false, () => ({
        type: 3,
        response: [{ token: { id: '00' }, balance: { unlocked: '20', locked: '0' } }],
      })),
    getRpcSignWithAddress: (message: string, index: number) =>
      phone('sign', true, () => ({
        type: 1,
        response: {
          message,
          signature: signMessage(message, keys[index]),
          address: { address: ADDRS[index], index, addressPath: `m/44'/280'/0'/0/${index}` },
        },
      })),
    getRpcSendTransaction: (outputs: SendTransactionOutput[], pushTx: boolean) =>
      phone(`send:${pushTx}:${outputs[0].type}`, true, () => {
        const scripts = outputs.map((o) => new Output(BigInt(o.value ?? 1), scriptOf(o)));
        if (!pushTx) return { type: 8, response: new Transaction([new Input(hash(1), 0)], scripts).toHex() };
        const txHash = hash(nextTx++);
        txs[txHash] = {
          fees: [],
          outputs: outputs.map((o, i) => ({
            value: Number(o.value ?? 1),
            token_data: 0,
            script: scripts[i].script.toString('base64'),
            decoded: o.type === 'data' ? {} : { address: o.address },
          })),
        };
        return {
          type: 8,
          response: {
            hash: txHash,
            outputs: outputs.map((o) => ({
              value: o.value ?? '1',
              tokenData: 0,
              decodedScript: o.type === 'data' ? {} : { address: { base58: o.address } },
            })),
          },
        };
      }),
    getRpcCreateToken: (params: CreateTokenParams) => {
      const invalid =
        (!params.create_mint && params.mint_authority_address) ||
        (params.mint_authority_address && !ADDRS.includes(params.mint_authority_address));
      if (invalid) {
        sent.push(`token:${params.symbol}:invalid`);
        return Promise.reject(Object.assign({ ...INVALID }, { requestParams: { method: 'htr_createToken', params } }));
      }
      return phone(`token:${params.symbol}`, true, () => {
        const txHash = hash(nextTx++);
        if (params.version !== 'fee') depositToken = txHash;
        tokens[txHash] = {
          version: params.version === 'fee' ? 2 : 1,
          total: Number(params.amount),
          mint: params.create_mint ? [{}] : [],
          melt: params.create_melt ? [{}] : [],
        };
        const data = params.data.map((d) => new ScriptData(d).createScript().toString('base64'));
        txs[txHash] = {
          fees: params.version === 'fee' ? [{ token_uid: '00', amount: 1 + data.length }] : [],
          outputs: data.map((script) => ({ value: 1, token_data: 0, script, decoded: {} })),
        };
        return {
          type: 6,
          response: {
            hash: txHash,
            name: params.name,
            symbol: params.symbol,
            outputs: [
              { value: params.amount, tokenData: 1 },
              ...(params.create_mint ? [{ value: '1', tokenData: 129 }] : []),
              ...(params.create_melt ? [{ value: '2', tokenData: 129 }] : []),
            ],
          },
        };
      });
    },
    getRpcGetUtxos: (token: string, maxUtxos: number, smaller: number | null, bigger: number | null) =>
      phone(`utxos:${token}:${bigger}:${smaller}`, true, () => {
        // Filters strictly, like both wallet facades.
        const pool = token === '00' ? scattered : token === depositToken ? [100n] : [];
        const utxos = pool
          .filter((a) => (bigger === null || a > BigInt(bigger)) && (smaller === null || a < BigInt(smaller)))
          .slice(0, maxUtxos)
          .map((amount, index) => ({
            address: ADDRS[0],
            amount: amount.toString(),
            tx_id: hash(2),
            locked: false,
            index,
          }));
        const total = utxos.reduce((sum, u) => sum + BigInt(u.amount), 0n);
        return { type: 5, response: { total_amount_available: total.toString(), utxos } };
      }),
  } as unknown as RpcHandlers;

  globalThis.fetch = (async (url: string) => {
    const u = new URL(url);
    const id = u.searchParams.get('id')!;
    if (u.pathname.endsWith('/transaction')) {
      return { json: async () => (txs[id] ? { success: true, tx: txs[id] } : { success: false }) };
    }
    if (u.pathname.endsWith('/thin_wallet/token')) {
      return { json: async () => (tokens[id] ? { success: true, ...tokens[id] } : { success: false }) };
    }
    throw new Error(`Unexpected fetch ${url}`);
  }) as unknown as typeof fetch;

  const wallet: FlowWallet = {
    tokenUids: async () => ['00'],
    balance: async () => 20n,
    isFeeToken: async () => false,
    addressAt: async (index) => ADDRS[index],
    addressIndex: async (address) => (ADDRS.includes(address) ? ADDRS.indexOf(address) : null),
    addressTxCount: async (address) =>
      address === ADDRS[FIRST_EMPTY] && !opts.usedFirstEmpty ? 0 : 1 + ADDRS.indexOf(address),
    scatterHtr: async () => {
      scattered = [1n, 2n, 3n, 4n, 5n];
      sent.push('scatter');
      return { txHash: hash(3), amounts: scattered };
    },
  };

  const env: FlowEnv = {
    getState,
    dispatch: store.dispatch,
    navigate: () => {},
    send: (call) => runRpc(handlers, call),
    waitForTx: async () => ({ state: 'confirmed', firstBlock: 'block' }),
    testWallet: () => wallet,
    askReview: async () => ({ ok: true, note: '' }),
    sleep: async () => {},
    now: () => 1000,
  };
  return { store, env, sent };
}

const realFetch = globalThis.fetch;
afterEach(async () => {
  await flowRunSettled();
  globalThis.fetch = realFetch;
});

describe('RPC flow', () => {
  test('runs every request against the test wallet and passes', async () => {
    const h = setup();
    expect(startFlow(RPC_FLOW, h.env)).toBeNull();
    await flowRunSettled();

    const run = h.store.getState().flowRun;
    expect(run.reason).toBeNull();
    expect(run.status).toBe('passed');
    expect(run.verdict?.detail).toBe('Every request was answered as expected.');
    for (const step of run.steps) {
      expect([step.id, step.status]).toEqual([step.id, 'done']);
      expect(step.checks.every((c) => c.ok)).toBe(true);
    }

    const index = Number(run.context.index);
    expect(index).toBeGreaterThanOrEqual(1);
    expect(index).toBeLessThan(20);
    expect(run.context.indexAddress).toBe(ADDRS[index]);
    expect(Number(run.context.signIndex)).toBeLessThan(20);
    expect(run.context.scattered).toBe('1,2,3,4,5');

    // Prompted requests are rejected once; the others and the invalid tokens are sent once.
    const stepsBy = (expects: string) => run.steps.filter((s) => s.expects === expects);
    for (const s of stepsBy('approval')) expect(s.attempts.map((a) => a.outcome)).toEqual(['rejected', 'approved']);
    for (const s of stepsBy('no-prompt')) expect(s.attempts.map((a) => a.outcome)).toEqual(['approved']);
    expect(stepsBy('refusal').map((s) => s.attempts.map((a) => [a.outcome, a.asExpected, a.code]))).toEqual([
      [['error', true, 8000]],
      [['error', true, 8000]],
    ]);
    expect(stepsBy('local').map((s) => s.txHash)).toEqual([hash(3)]);

    const checkTexts = (id: string) => run.steps.find((s) => s.id === id)!.checks.map((c) => c.text);
    expect(checkTexts('address-first-empty')).toContain('The address has never been used');
    expect(checkTexts('create-fee-token')).toContain('Fee: 0.01 HTR');
    expect(checkTexts('create-fee-token-data')).toContain('Has the data output "QA flow fee token data"');
    expect(checkTexts('utxos-htr-above')).toEqual(['UTXOs of 0.03, 0.04, 0.05, as the filter expects']);
    expect(checkTexts('utxos-htr-between')).toEqual(['UTXOs of 0.02, 0.03, as the filter expects']);
  });

  test('pauses when the first empty address was used before', async () => {
    const h = setup({ usedFirstEmpty: true });
    startFlow(RPC_FLOW, h.env);
    await flowRunSettled();

    const run = h.store.getState().flowRun;
    expect(run.status).toBe('paused');
    expect(run.steps[run.currentStep].id).toBe('address-first-empty');
    expect(run.reason).toContain('The address is not empty');
  });

  test('needs a seed wallet and 0.20 HTR', async () => {
    const addressOnly = {
      ...fixed,
      walletStore: { wallets: { w1: { metadata: { kind: 'address', address0: ADDRS[0] }, status: 'address-only' } } },
    };
    expect(rpcRequestsFlowPreflight(fixed as unknown as RootState)).toBeNull();
    expect(rpcRequestsFlowPreflight(addressOnly as unknown as RootState)).toContain('Start the test wallet');

    const h = setup();
    const poor = { ...h.env.testWallet()!, balance: async () => 19n };
    startFlow(RPC_FLOW, { ...h.env, testWallet: () => poor });
    await flowRunSettled();
    expect(h.store.getState().flowRun.reason).toBe('The test wallet needs at least 0.20 HTR and has 0.19 HTR');
    expect(h.sent).toEqual([]);
  });
});
