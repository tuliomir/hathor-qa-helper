import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import flowRunReducer from '../src/store/slices/flowRunSlice';
import betNanoContractReducer from '../src/store/slices/betNanoContractSlice';
import betInitializeReducer from '../src/store/slices/betInitializeSlice';
import betDepositReducer from '../src/store/slices/betDepositSlice';
import signOracleDataReducer from '../src/store/slices/signOracleDataSlice';
import setBetResultReducer from '../src/store/slices/setBetResultSlice';
import betWithdrawReducer from '../src/store/slices/betWithdrawSlice';
import { flowRunSettled, startFlow, type FlowEnv } from '../src/flows/flowRunner';
import { runRpc, type RpcHandlers } from '../src/services/rpcRun';
import type { RootState } from '../src/store';

type BetFlowModule = typeof import('../src/flows/betFlow');
let BET_FLOW: BetFlowModule['BET_FLOW'];
let betFlowPreflight: BetFlowModule['betFlowPreflight'];

beforeAll(async () => {
  // constants/walletConnect reads window.location at import.
  // @ts-expect-error - minimal window for the test environment
  globalThis.window ??= { location: { origin: 'http://localhost:5173' } };
  ({ BET_FLOW, betFlowPreflight } = await import('../src/flows/betFlow'));
});

const ADDR = 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN';
const BLUEPRINT = '0000019865eda743812c566ce6ad3ac49c5f90796b73aa2792a09b7655ac5a5e';
const hash = (n: number) => n.toString(16).padStart(64, '0');
const NC_ID = hash(1);
const REJECTED = { code: 5002, message: 'Rejected by the user' };

const nanoTx = (txHash: string, method: string, id: string, amounts?: string[]) => ({
  type: 0,
  response: {
    hash: txHash,
    headers: [
      {
        id,
        method,
        args: { type: 'Buffer', data: [1] },
        ...(amounts ? { actions: amounts.map((amount) => ({ type: 1, amount, tokenIndex: 0 })) } : {}),
        address: { base58: ADDR, network: { name: 'testnet' } },
      },
    ],
  },
});

/** The session, test wallet and dry-run flag the flow reads; the rest is real slices. */
const fixed = {
  walletConnect: {
    client: {},
    session: { topic: 't', namespaces: { hathor: { accounts: [`hathor:testnet:${ADDR}`] } } },
    chains: ['hathor:testnet'],
  },
  walletSelection: { testWalletId: 'w1' },
  walletStore: { wallets: { w1: { metadata: { kind: 'seed' }, firstAddress: ADDR } } },
  rpc: { isDryRun: false },
};

function setup() {
  const store = configureStore({
    reducer: {
      flowRun: flowRunReducer,
      betNanoContract: betNanoContractReducer,
      betInitialize: betInitializeReducer,
      betDeposit: betDepositReducer,
      signOracleData: signOracleDataReducer,
      setBetResult: setBetResultReducer,
      betWithdraw: betWithdrawReducer,
    },
  });
  const getState = () => ({ ...store.getState(), ...fixed }) as unknown as RootState;

  const sent: { method: string; args: unknown[] }[] = [];
  const answered = new Set<string>();
  // Rejects every method once, then answers like the mobile wallet (QA_REOWN.md).
  const answer = (method: string, args: unknown[], response: unknown) => {
    sent.push({ method, args });
    const request = { method, params: {} };
    if (!answered.has(method)) {
      answered.add(method);
      return Promise.reject(Object.assign({ ...REJECTED }, { requestParams: request }));
    }
    return Promise.resolve({ request, response });
  };
  const handlers = {
    getRpcInitializeBet: (...args: unknown[]) => answer('initialize', args, nanoTx(NC_ID, 'initialize', BLUEPRINT)),
    getRpcBetDeposit: (...args: unknown[]) => answer('bet', args, nanoTx(hash(2), 'bet', NC_ID, ['1'])),
    getRpcSignOracleData: (...args: unknown[]) =>
      answer('sign', args, {
        type: 7,
        response: { data: '1x0', signedData: { type: 'str', signature: 'abcdef', value: 'Result_1' }, oracle: ADDR },
      }),
    getRpcSetBetResult: (...args: unknown[]) => answer('set_result', args, nanoTx(hash(3), 'set_result', NC_ID)),
    getRpcBetWithdraw: (...args: unknown[]) => answer('withdraw', args, nanoTx(hash(4), 'withdraw', NC_ID, ['1'])),
  } as unknown as RpcHandlers;

  const navigations: string[] = [];
  const env: FlowEnv = {
    getState,
    dispatch: store.dispatch,
    navigate: (stageId) => navigations.push(stageId),
    send: (call) => runRpc(handlers, call),
    waitForTx: async () => ({ state: 'confirmed', firstBlock: 'block' }),
    testWallet: () => null,
    askReview: async () => ({ ok: true, note: '' }),
    sleep: async () => {},
    now: () => 1000,
  };
  return { store, env, sent, navigations, getState };
}

const realFetch = globalThis.fetch;
afterEach(async () => {
  globalThis.fetch = realFetch;
  await flowRunSettled();
});

function mockContractBalance(value: string) {
  globalThis.fetch = (async () => ({
    json: async () => ({ success: true, balances: { '00': { value } } }),
  })) as unknown as typeof fetch;
}

describe('bet flow', () => {
  test('runs initialize → withdraw, rejecting each step once, and passes when the contract is empty', async () => {
    mockContractBalance('0');
    const h = setup();
    expect(startFlow(BET_FLOW, h.env)).toBeNull();
    await flowRunSettled();

    const run = h.store.getState().flowRun;
    expect(run.status).toBe('passed');
    expect(run.verdict?.detail).toContain('back to 0');
    expect(run.verdict?.detail).not.toContain('Rejection not tested');
    for (const step of run.steps) {
      expect(step.status).toBe('done');
      expect(step.attempts.map((a) => [a.outcome, a.asExpected])).toEqual([
        ['rejected', true],
        ['approved', true],
      ]);
    }
    expect(h.navigations).toEqual([
      'rpc-bet-initialize',
      'rpc-bet-initialize',
      'rpc-bet-deposit',
      'rpc-bet-deposit',
      'rpc-sign-oracle-data',
      'rpc-sign-oracle-data',
      'rpc-set-bet-result',
      'rpc-set-bet-result',
      'rpc-bet-withdraw',
      'rpc-bet-withdraw',
    ]);

    // Each step uses what the previous ones produced.
    const last = (method: string) => h.sent.filter((s) => s.method === method).at(-1)!.args;
    expect(last('initialize').slice(0, 3)).toEqual([BLUEPRINT, ADDR, '00']);
    expect(last('initialize')[4]).toBe(true);
    expect(last('bet')).toEqual([NC_ID, 'Result_1', 1, ADDR, '00', true]);
    expect(last('sign')).toEqual([NC_ID, ADDR, 'Result_1']);
    expect(last('set_result')).toEqual([NC_ID, ADDR, 'Result_1', 'abcdef', true]);
    expect(last('withdraw')).toEqual([NC_ID, ADDR, 1, '00', true]);

    // The stages find the run's results where a manual send leaves them.
    const state = h.store.getState();
    expect(state.betNanoContract.ncId).toBe(NC_ID);
    expect(state.betDeposit.betChoice).toBe('Result_1');
    expect(state.betWithdraw.rawResponse).toEqual(nanoTx(hash(4), 'withdraw', NC_ID, ['1']));
    expect(state.flowRun.prefill['rpc-set-bet-result']?.values).toMatchObject({
      ncId: NC_ID,
      oracleSignature: 'abcdef',
      pushTx: true,
    });
  });

  test('fails when the contract still holds funds', async () => {
    mockContractBalance('1');
    const h = setup();
    startFlow(BET_FLOW, h.env);
    await flowRunSettled();

    const run = h.store.getState().flowRun;
    expect(run.status).toBe('failed');
    expect(run.verdict?.detail).toContain('still holds 1');
  });
});

describe('betFlowPreflight', () => {
  const base = { ...fixed } as unknown as RootState;

  test('is ready with a session on the test wallet', () => {
    expect(betFlowPreflight(base)).toBeNull();
  });

  test('refuses dry run, no session, mainnet and another wallet', () => {
    expect(betFlowPreflight({ ...base, rpc: { isDryRun: true } } as RootState)).toContain('dry run');
    expect(
      betFlowPreflight({ ...base, walletConnect: { ...fixed.walletConnect, session: null } } as unknown as RootState)
    ).toContain('Connect');
    expect(
      betFlowPreflight({
        ...base,
        walletConnect: { ...fixed.walletConnect, chains: ['hathor:mainnet'] },
      } as unknown as RootState)
    ).toContain('testnets only');
    expect(
      betFlowPreflight({
        ...base,
        walletStore: { wallets: { w1: { metadata: { kind: 'seed' }, firstAddress: 'WOther' } } },
      } as unknown as RootState)
    ).toContain('not the test wallet');
  });
});
