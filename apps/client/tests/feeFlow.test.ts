import { afterEach, beforeAll, describe, expect, test } from 'bun:test';
import { configureStore } from '@reduxjs/toolkit';
import flowRunReducer from '../src/store/slices/flowRunSlice';
import feeNanoContractReducer from '../src/store/slices/feeNanoContractSlice';
import feeInitializeReducer from '../src/store/slices/feeInitializeSlice';
import feeDepositReducer from '../src/store/slices/feeDepositSlice';
import feeWithdrawReducer from '../src/store/slices/feeWithdrawSlice';
import { flowRunSettled, startFlow, type FlowEnv, type FlowWallet } from '../src/flows/flowRunner';
import { runRpc, type RpcHandlers } from '../src/services/rpcRun';
import { contractBalanceCheck, feePaymentChecks } from '../src/flows/feeChecks';
import type { FullnodeTx } from '../src/utils/nanoTxConfirmation';
import type { RootState } from '../src/store';

type FeeFlowModule = typeof import('../src/flows/feeFlow');
let FEE_FLOW: FeeFlowModule['FEE_FLOW'];
let feeFlowPreflight: FeeFlowModule['feeFlowPreflight'];
let partialWithdrawAmount: FeeFlowModule['partialWithdrawAmount'];

beforeAll(async () => {
  // constants/walletConnect reads window.location at import.
  // @ts-expect-error - minimal window for the test environment
  globalThis.window ??= { location: { origin: 'http://localhost:5173' } };
  ({ FEE_FLOW, feeFlowPreflight, partialWithdrawAmount } = await import('../src/flows/feeFlow'));
});

const ADDR = 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN';
const BLUEPRINT = '00000000f9f4b9c025cfd757e1cbd662b3eefdc44e0a16cc54906ccf07f8ba8c';
const hash = (n: number) => n.toString(16).padStart(64, '0');
const NC_ID = hash(1);
const SMALL = hash(0xa);
const BIG = hash(0xb);
const NOT_FEE = hash(0xc);
const REJECTED = { code: 5002, message: 'Rejected by the user' };

/** Testnet txs of a fee contract, as `transaction?id=` returns them (trimmed). */
const WALLET_PAID_DEPOSIT: FullnodeTx = {
  fees: [{ token_uid: '00', amount: 1 }],
  inputs: [
    { token: BIG, value: 9999 },
    { token: '00', value: 1 },
  ],
  outputs: [],
  nc_context: { actions: [{ type: 'deposit', token_uid: BIG, amount: 9999 }] },
};
const CONTRACT_PAID_DEPOSIT: FullnodeTx = {
  fees: [{ token_uid: '00', amount: 1 }],
  inputs: [{ token: BIG, value: 99 }],
  outputs: [],
  nc_context: {
    actions: [
      { type: 'withdrawal', token_uid: '00', amount: 1 },
      { type: 'deposit', token_uid: BIG, amount: 99 },
    ],
  },
};

/**
 * `transaction?id=` names each input's and output's token only by
 * `token_data`: 0 for HTR, n for `tokens[n - 1]`.
 */
function asTransactionEndpoint(tx: FullnodeTx): FullnodeTx {
  const tokens = [...new Set([...(tx.inputs ?? []), ...(tx.outputs ?? [])].map((e) => e.token!))].filter(
    (t) => t !== '00'
  );
  const strip = ({ token, value }: { token?: string; value: number | string }) => ({
    value,
    token_data: token === '00' ? 0 : tokens.indexOf(token!) + 1,
  });
  return {
    ...tx,
    inputs: tx.inputs?.map(strip),
    outputs: tx.outputs?.map(strip),
    tokens: tokens.map((uid) => ({ uid, name: 'Fee token', symbol: 'FEE' })),
  };
}

/** A wallet-paid deposit on testnet, as `transaction?id=` returned it (trimmed). */
const REAL_WALLET_PAID_DEPOSIT: FullnodeTx = {
  fees: [{ token_uid: '00', amount: 1 }],
  inputs: [
    { value: 987054, token_data: 1 },
    { value: 1, token_data: 0 },
  ],
  outputs: [],
  tokens: [{ uid: '0060a6c49a755f4b0514f9fde0caf2688ab92dadd7e8c3a266d81145593d9e79' }],
  nc_context: {
    actions: [
      {
        type: 'deposit',
        token_uid: '0060a6c49a755f4b0514f9fde0caf2688ab92dadd7e8c3a266d81145593d9e79',
        amount: 987054,
      },
    ],
  },
};

describe('feePaymentChecks', () => {
  test('reads tokens from token_data, as transaction?id= gives them', () => {
    expect(feePaymentChecks(REAL_WALLET_PAID_DEPOSIT, 'wallet')).toEqual([
      { ok: true, text: 'Fee: 0.01 HTR' },
      { ok: true, text: 'Paid by the wallet: its HTR went down by 0.01 HTR' },
    ]);
    expect(feePaymentChecks(asTransactionEndpoint(CONTRACT_PAID_DEPOSIT), 'contract').every((c) => c.ok)).toBe(true);
  });

  test('skips authority outputs: their value is a permission mask', () => {
    const tx: FullnodeTx = {
      ...REAL_WALLET_PAID_DEPOSIT,
      outputs: [{ value: 3, token_data: 0x81 }],
    };
    expect(feePaymentChecks(tx, 'wallet').every((c) => c.ok)).toBe(true);
  });

  test('a fee the wallet paid from its HTR', () => {
    expect(feePaymentChecks(WALLET_PAID_DEPOSIT, 'wallet').every((c) => c.ok)).toBe(true);
    expect(feePaymentChecks(WALLET_PAID_DEPOSIT, 'contract').filter((c) => !c.ok)).toHaveLength(1);
  });

  test('a fee the contract paid with an HTR withdrawal', () => {
    expect(feePaymentChecks(CONTRACT_PAID_DEPOSIT, 'contract').every((c) => c.ok)).toBe(true);
    expect(feePaymentChecks(CONTRACT_PAID_DEPOSIT, 'wallet').filter((c) => !c.ok)).toHaveLength(1);
  });

  test('a wrong fee amount and a deposit with HTR change', () => {
    const tx: FullnodeTx = {
      fees: [{ token_uid: '00', amount: 2 }],
      inputs: [{ token: '00', value: 10 }],
      outputs: [{ token: '00', value: 6 }],
      nc_context: { actions: [{ type: 'deposit', token_uid: '00', amount: 2 }] },
    };
    expect(feePaymentChecks(tx, 'wallet').map((c) => c.ok)).toEqual([false, false]);
    expect(feePaymentChecks({ ...tx, fees: [] }, 'none')).toEqual([{ ok: true, text: 'No fee charged' }]);
  });

  test('contract balance', () => {
    expect(contractBalanceCheck(1n, 1n, 'HTR')).toEqual({ ok: true, text: 'The contract holds 0.01 HTR' });
    expect(contractBalanceCheck(2n, 0n, 'FEE').ok).toBe(false);
  });
});

describe('partialWithdrawAmount', () => {
  test('withdraws part of the deposit and leaves the rest, at both ends of the draw', () => {
    for (const total of [2n, 99n, 100n, 101n, 1234n, 50000n, 2n ** 62n]) {
      for (const random of [() => 0, () => 0.5, () => 0.999999999999]) {
        const partial = partialWithdrawAmount(total, random);
        expect(partial).not.toBeNull();
        expect(partial! > 0n && partial! < total).toBe(true);
      }
    }
    expect(partialWithdrawAmount(1234n, () => 0)).toBe(1n);
    expect(partialWithdrawAmount(1234n, () => 0.999999999999)).toBe(1233n);
  });

  test('cannot split a single base unit', () => {
    expect(partialWithdrawAmount(1n)).toBeNull();
  });
});

const nanoTx = (txHash: string, method: string, id: string, amounts: string[]) => ({
  type: 0,
  response: {
    hash: txHash,
    headers: [
      { id, method, actions: amounts.map((amount) => ({ amount })), address: { base58: ADDR } },
      { entries: [{ tokenIndex: 0, amount: 1n }] },
    ],
  },
});

const fixed = {
  walletConnect: {
    client: {},
    session: { topic: 't', namespaces: { hathor: { accounts: [`hathor:testnet:${ADDR}`] } } },
    chains: ['hathor:testnet'],
  },
  walletSelection: { testWalletId: 'w1' },
  walletStore: { wallets: { w1: { metadata: { kind: 'seed' }, status: 'ready', firstAddress: ADDR } } },
  rpc: { isDryRun: false },
  tokens: { tokens: [{ uid: BIG, symbol: 'BIGF', name: 'Big fee' }] },
};

/**
 * A wallet and fullnode that move the funds for real: each approved request
 * updates the balances and records the tx as the fullnode would show it.
 * Every request is rejected once first.
 */
function setup(opts: { bigBalance?: bigint; htr?: bigint; contractFeeTaker?: 'wallet' | 'contract' } = {}) {
  const store = configureStore({
    reducer: {
      flowRun: flowRunReducer,
      feeNanoContract: feeNanoContractReducer,
      feeInitialize: feeInitializeReducer,
      feeDeposit: feeDepositReducer,
      feeWithdraw: feeWithdrawReducer,
    },
  });
  const getState = () => ({ ...store.getState(), ...fixed }) as unknown as RootState;

  const wallet: Record<string, bigint> = {
    '00': opts.htr ?? 100n,
    [SMALL]: 5n,
    [BIG]: opts.bigBalance ?? 1234n,
    [NOT_FEE]: 9999n,
  };
  const contract: Record<string, bigint> = { '00': 0n };
  const txs: Record<string, FullnodeTx> = {};
  let nextTx = 2;

  // The HTR side of a tx: who pays the fee.
  const feeSide = (payer: 'wallet' | 'contract') => {
    if (payer === 'contract') {
      contract['00'] -= 1n;
      return { inputs: [], outputs: [], actions: [{ type: 'withdrawal', token_uid: '00', amount: 1 }] };
    }
    wallet['00'] -= 1n;
    return { inputs: [{ token: '00', value: 3 }], outputs: [{ token: '00', value: 2 }], actions: [] };
  };

  const sent: { method: string; args: unknown[] }[] = [];
  // Each step sends once (rejected), then again (approved).
  const answer = (method: string, args: unknown[], approve: () => unknown) => {
    sent.push({ method, args });
    const request = { method: 'htr_sendNanoContractTx', params: {} };
    if (sent.filter((s) => s.method === method).length % 2 === 1) {
      return Promise.reject(Object.assign({ ...REJECTED }, { requestParams: request }));
    }
    return Promise.resolve({ request, response: approve() });
  };

  const handlers = {
    getRpcFeeInitialize: (...args: unknown[]) =>
      answer('initialize', args, () => {
        const amount = BigInt(args[1] as string);
        wallet['00'] -= amount;
        contract['00'] += amount;
        txs[NC_ID] = {
          fees: [],
          inputs: [{ token: '00', value: 10 }],
          outputs: [{ token: '00', value: 10 - Number(amount) }],
          nc_context: { actions: [{ type: 'deposit', token_uid: '00', amount: Number(amount) }] },
        };
        return nanoTx(NC_ID, 'initialize', BLUEPRINT, [amount.toString()]);
      }),
    getRpcFeeDeposit: (...args: unknown[]) =>
      answer('deposit', args, () => {
        const [, token, amountText, , , contractPays] = args as [string, string, string, string, boolean, boolean];
        const amount = BigInt(amountText);
        const fee = feeSide(opts.contractFeeTaker ?? (contractPays ? 'contract' : 'wallet'));
        wallet[token] -= amount;
        contract[token] = (contract[token] ?? 0n) + amount;
        const txHash = hash(nextTx++);
        txs[txHash] = {
          fees: [{ token_uid: '00', amount: 1 }],
          inputs: [...fee.inputs, { token, value: Number(amount) }],
          outputs: fee.outputs,
          nc_context: { actions: [...fee.actions, { type: 'deposit', token_uid: token, amount: Number(amount) }] },
        };
        return nanoTx(txHash, 'noop', NC_ID, contractPays ? ['1', amountText] : [amountText]);
      }),
    getRpcFeeWithdraw: (...args: unknown[]) =>
      answer('withdraw', args, () => {
        const [, token, amountText, , , contractPays] = args as [string, string, string, string, boolean, boolean];
        const amount = BigInt(amountText);
        const fee = feeSide(contractPays ? 'contract' : 'wallet');
        wallet[token] += amount;
        contract[token] -= amount;
        const txHash = hash(nextTx++);
        txs[txHash] = {
          fees: [{ token_uid: '00', amount: 1 }],
          inputs: fee.inputs,
          outputs: [...fee.outputs, { token, value: Number(amount) }],
          nc_context: { actions: [...fee.actions, { type: 'withdrawal', token_uid: token, amount: Number(amount) }] },
        };
        return nanoTx(txHash, 'noop', NC_ID, contractPays ? ['1', amountText] : [amountText]);
      }),
  } as unknown as RpcHandlers;

  globalThis.fetch = (async (url: string) => {
    const u = new URL(url);
    if (u.pathname.endsWith('/transaction')) {
      const tx = txs[u.searchParams.get('id')!];
      return { json: async () => (tx ? { success: true, tx: asTransactionEndpoint(tx) } : { success: false }) };
    }
    const token = u.searchParams.get('balances[]')!;
    return {
      json: async () => ({ success: true, balances: { [token]: { value: String(contract[token] ?? 0n) } } }),
    };
  }) as unknown as typeof fetch;

  const testWallet: FlowWallet = {
    tokenUids: async () => Object.keys(wallet),
    balance: async (uid) => wallet[uid] ?? 0n,
    isFeeToken: async (uid) => uid === SMALL || uid === BIG,
  };

  const env: FlowEnv = {
    getState,
    dispatch: store.dispatch,
    navigate: () => {},
    send: (call) => runRpc(handlers, call),
    waitForTx: async () => ({ state: 'confirmed', firstBlock: 'block' }),
    testWallet: () => testWallet,
    sleep: async () => {},
    now: () => 1000,
  };
  return { store, env, sent, wallet, contract };
}

const realFetch = globalThis.fetch;
afterEach(async () => {
  await flowRunSettled();
  globalThis.fetch = realFetch;
});

describe('fee flow', () => {
  test('moves the largest fee token in and out, checks every fee, and passes', async () => {
    const h = setup();
    expect(startFlow(FEE_FLOW, h.env)).toBeNull();
    await flowRunSettled();

    const run = h.store.getState().flowRun;
    expect(run.reason).toBeNull();
    expect(run.status).toBe('passed');
    const partial = BigInt(run.context.partial);
    expect(partial > 0n && partial < 1234n).toBe(true);
    expect(run.context).toEqual({ token: BIG, symbol: 'BIGF', amount: '1234', partial: partial.toString() });

    for (const step of run.steps) {
      expect(step.status).toBe('done');
      expect(step.attempts.map((a) => [a.outcome, a.asExpected])).toEqual([
        ['rejected', true],
        ['approved', true],
      ]);
      expect(step.checks.length).toBeGreaterThan(0);
      expect(step.checks.every((c) => c.ok)).toBe(true);
    }
    expect(run.steps[3].checks.map((c) => c.text)).toContain(
      'Paid by the contract: 0.01 HTR withdrawn from its balance, none from the wallet'
    );

    const last = (method: string) => h.sent.filter((s) => s.method === method).at(-1)!.args;
    expect(last('initialize')).toEqual([BLUEPRINT, '2', ADDR, true]);
    expect(last('withdraw')).toEqual([NC_ID, BIG, partial.toString(), ADDR, true, true, '1']);

    // The contract spent its 0.02 HTR on the last two fees; the wallet paid 0.04 HTR in all.
    expect(h.contract['00']).toBe(0n);
    expect(h.wallet['00']).toBe(96n);
    expect(h.wallet[BIG]).toBe(partial);
    expect(h.contract[BIG]).toBe(1234n - partial);
    expect(h.store.getState().feeNanoContract.ncId).toBe(NC_ID);
  });

  test('pauses when the wallet pays a fee the contract should have paid', async () => {
    const h = setup({ contractFeeTaker: 'wallet' });
    startFlow(FEE_FLOW, h.env);
    await flowRunSettled();

    const run = h.store.getState().flowRun;
    expect(run.status).toBe('paused');
    expect(run.currentStep).toBe(3);
    expect(run.reason).toContain('Expected the contract to pay the fee');
  });

  test('pauses before sending anything without enough HTR', async () => {
    const h = setup({ htr: 3n });
    startFlow(FEE_FLOW, h.env);
    await flowRunSettled();

    const run = h.store.getState().flowRun;
    expect(run.status).toBe('paused');
    expect(run.reason).toContain('needs 0.04 HTR');
    expect(h.sent).toEqual([]);
  });
});

describe('feeFlowPreflight', () => {
  test('needs the test wallet running from its seed', () => {
    expect(feeFlowPreflight(fixed as unknown as RootState)).toBeNull();
    const stopped = { ...fixed, walletStore: { wallets: { w1: { ...fixed.walletStore.wallets.w1, status: 'idle' } } } };
    expect(feeFlowPreflight(stopped as unknown as RootState)).toContain('Start the test wallet');
    const addressOnly = {
      ...fixed,
      walletStore: { wallets: { w1: { metadata: { kind: 'address', address0: ADDR }, status: 'address-only' } } },
    };
    expect(feeFlowPreflight(addressOnly as unknown as RootState)).toContain('Start the test wallet');
  });
});
