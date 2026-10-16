/**
 * The fee nano contract flow: a contract funded with 0.02 HTR moves the test
 * wallet's fee-based token in and out, first with the wallet paying each
 * 0.01 HTR fee, then with the contract paying it from those 0.02 HTR:
 *
 *   initialize (deposit 0.02 HTR)
 *   → deposit all of the token, wallet pays → withdraw it all, wallet pays
 *   → deposit it all again, contract pays → withdraw part of it, contract pays
 *
 * The token is the wallet's fee-based token with the largest balance,
 * picked once when the run starts and kept in `flowRun.context`. After each
 * tx confirms, the step checks on chain that the fee was 0.01 HTR, who paid
 * it, and what the contract holds. Passes when the contract's HTR is spent
 * and the wallet holds exactly the part withdrawn last.
 */

import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import type { RootState } from '../store';
import { selectRpcNetwork } from '../store/slices/walletConnectSlice';
import { flowContextSet, type FlowCheck } from '../store/slices/flowRunSlice';
import {
  setFeeInitializeError,
  setFeeInitializeRequest,
  setFeeInitializeResponse,
} from '../store/slices/feeInitializeSlice';
import {
  setFeeDepositError,
  setFeeDepositFormData,
  setFeeDepositRequest,
  setFeeDepositResponse,
} from '../store/slices/feeDepositSlice';
import {
  setFeeWithdrawError,
  setFeeWithdrawFormData,
  setFeeWithdrawRequest,
  setFeeWithdrawResponse,
} from '../store/slices/feeWithdrawSlice';
import { setFeeNanoContractId } from '../store/slices/feeNanoContractSlice';
import type { MethodSliceActions } from '../services/rpcRun';
import { NETWORK_CONFIG } from '../constants/network';
import { blueprintIdFor } from '../utils/blueprints';
import { isAddressOnly } from '../utils/addressOnlyWallet';
import { formatAmount } from '../utils/amount';
import { nanoTxHash } from '../utils/nanoRpcRequests';
import { fetchContractBalance, fetchFullnodeTx } from '../utils/nanoTxConfirmation';
import { nanoTxProblems } from './nanoExpectations';
import { contractBalanceCheck, FEE_PER_OUTPUT, feePaymentChecks, htr, type FeePayer } from './feeChecks';
import type { FlowDefinition, FlowEnv, FlowStep } from './flowRunner';
import { address0Of, rpcFlowPreflight } from './rpcFlowPreflight';

export const FEE_FLOW_ID = 'fee-nano-contract';

/** The HTR the contract starts with: one contract-paid fee for each of the last two steps. */
export const FEE_FLOW_HTR_DEPOSIT = 2n * FEE_PER_OUTPUT;
/** What the wallet spends in HTR: the contract's deposit plus the two fees it pays itself. */
const WALLET_HTR_NEEDED = FEE_FLOW_HTR_DEPOSIT + 2n * FEE_PER_OUTPUT;

/** How long the final check waits for the test wallet to see the last withdrawal. */
const WALLET_SYNC = { tries: 15, intervalMs: 2000 };

/**
 * How much of the deposited `total` (base units) the last step withdraws: a
 * random amount, so runs cover both whole and fractional splits, always
 * leaving some in the contract. Null when `total` can't be split (a single
 * base unit).
 */
export function partialWithdrawAmount(total: bigint, random: () => number = Math.random): bigint | null {
  if (total < 2n) return null;
  // A random amount from 1 to total - 1, clamped since a huge total loses precision as a Number.
  const drawn = BigInt(Math.floor(random() * Number(total - 1n))) + 1n;
  return drawn < total ? drawn : total - 1n;
}

/** What the run picked when it started; set by `prepareFeeFlow`. */
interface FeeFlowContext {
  token: string;
  symbol: string;
  /** The token balance deposited whole, in base units. */
  amount: string;
  /** What the last step withdraws, in base units. */
  partial: string;
}

function contextOf(state: RootState): FeeFlowContext {
  const { token, symbol, amount, partial } = state.flowRun.context;
  if (!token || !amount || !partial) throw new Error('The run has not picked its fee token yet');
  return { token, symbol: symbol || `${token.slice(0, 8)}…`, amount, partial };
}

function ncIdOf(state: RootState): string {
  const ncId = state.feeNanoContract.ncId;
  if (!ncId) throw new Error('No fee contract yet: initialize one first');
  return ncId;
}

const fullNodeUrlOf = (state: RootState) => NETWORK_CONFIG[selectRpcNetwork(state)].fullNodeUrl;
const tokenAmount = (value: bigint | string, symbol: string) => `${formatAmount(value, 2)} ${symbol}`;

const depositActions: MethodSliceActions = {
  setRequest: setFeeDepositRequest,
  setResponse: setFeeDepositResponse,
  setError: setFeeDepositError,
};

const withdrawActions: MethodSliceActions = {
  setRequest: setFeeWithdrawRequest,
  setResponse: setFeeWithdrawResponse,
  setError: setFeeWithdrawError,
};

/** What the contract should hold once a step's tx confirmed. */
interface ContractHoldings {
  htr: bigint;
  token: bigint;
}

/** The fee, its payer and the contract's balances after the step's tx. */
function checkFeeStep(payer: FeePayer, holdings: (ctx: FeeFlowContext) => ContractHoldings) {
  return async (txHash: string, env: FlowEnv): Promise<FlowCheck[]> => {
    const state = env.getState();
    const ctx = contextOf(state);
    const url = fullNodeUrlOf(state);
    const ncId = ncIdOf(state);
    const expected = holdings(ctx);
    const [tx, contractHtr, contractToken] = await Promise.all([
      fetchFullnodeTx(url, txHash),
      fetchContractBalance(url, ncId, NATIVE_TOKEN_UID),
      fetchContractBalance(url, ncId, ctx.token),
    ]);
    return [
      ...feePaymentChecks(tx, payer),
      contractBalanceCheck(contractHtr, expected.htr, 'HTR'),
      contractBalanceCheck(contractToken, expected.token, ctx.symbol),
    ];
  };
}

const initializeStep: FlowStep = {
  id: 'initialize',
  title: 'Initialize with 0.02 HTR',
  stageId: 'rpc-fee-initialize',
  actions: {
    setRequest: setFeeInitializeRequest,
    setResponse: setFeeInitializeResponse,
    setError: setFeeInitializeError,
  },
  plan: (state) => {
    const network = selectRpcNetwork(state);
    const blueprintId = blueprintIdFor(network, 'fee');
    if (!blueprintId) throw new Error(`No fee blueprint on ${NETWORK_CONFIG[network].label}`);
    const address = address0Of(state);
    const amount = FEE_FLOW_HTR_DEPOSIT.toString();
    return {
      prefill: { blueprintId, amount, addressIndex: 0, pushTx: true },
      call: (h) => h.getRpcFeeInitialize(blueprintId, amount, address, true),
    };
  },
  validate: (response, state) =>
    nanoTxProblems(response, {
      method: 'initialize',
      headerId: blueprintIdFor(selectRpcNetwork(state), 'fee') ?? '',
      actionAmounts: [FEE_FLOW_HTR_DEPOSIT.toString()],
    }),
  txHash: nanoTxHash,
  onApproved: (dispatch, response, state) => {
    const ncId = nanoTxHash(response);
    const blueprintId = blueprintIdFor(selectRpcNetwork(state), 'fee') ?? undefined;
    if (ncId) dispatch(setFeeNanoContractId({ ncId, blueprintId }));
  },
  checkOnChain: checkFeeStep('none', () => ({ htr: FEE_FLOW_HTR_DEPOSIT, token: 0n })),
};

/** A deposit of the whole token balance; the contract pays the fee from its HTR or the wallet does. */
function depositStep(
  id: string,
  title: string,
  payer: 'wallet' | 'contract',
  after: ContractHoldings['htr']
): FlowStep {
  const contractPaysFees = payer === 'contract';
  const htrWithdrawAmount = FEE_PER_OUTPUT.toString();
  return {
    id,
    title,
    stageId: 'rpc-fee-deposit',
    actions: depositActions,
    plan: (state) => {
      const ncId = ncIdOf(state);
      const { token, amount } = contextOf(state);
      const address = address0Of(state);
      return {
        prefill: {
          ncId,
          feeToken: token,
          amount,
          addressIndex: 0,
          contractPaysFees,
          htrWithdrawAmount,
          pushTx: true,
        },
        call: (h) => h.getRpcFeeDeposit(ncId, token, amount, address, true, contractPaysFees, htrWithdrawAmount),
      };
    },
    validate: (response, state) =>
      nanoTxProblems(response, {
        method: 'noop',
        headerId: ncIdOf(state),
        actionAmounts: contractPaysFees ? [htrWithdrawAmount, contextOf(state).amount] : [contextOf(state).amount],
      }),
    txHash: nanoTxHash,
    onApproved: (dispatch, _response, state) => {
      const { token, amount } = contextOf(state);
      // Withdraw prefills from here, as after a manual deposit.
      dispatch(setFeeDepositFormData({ ncId: ncIdOf(state), amount, token, addressIndex: 0 }));
    },
    checkOnChain: checkFeeStep(payer, (ctx) => ({ htr: after, token: BigInt(ctx.amount) })),
  };
}

/** A withdrawal of `amountOf` the token to address 0, the fee paid like in `depositStep`. */
function withdrawStep(
  id: string,
  title: string,
  payer: 'wallet' | 'contract',
  amountOf: (ctx: FeeFlowContext) => string,
  after: ContractHoldings['htr']
): FlowStep {
  const contractPaysFees = payer === 'contract';
  const htrWithdrawAmount = FEE_PER_OUTPUT.toString();
  return {
    id,
    title,
    stageId: 'rpc-fee-withdraw',
    actions: withdrawActions,
    plan: (state) => {
      const ncId = ncIdOf(state);
      const ctx = contextOf(state);
      const amount = amountOf(ctx);
      const address = address0Of(state);
      return {
        prefill: {
          ncId,
          feeToken: ctx.token,
          amount,
          addressIndex: 0,
          contractPaysFees,
          htrWithdrawAmount,
          pushTx: true,
        },
        call: (h) => h.getRpcFeeWithdraw(ncId, ctx.token, amount, address, true, contractPaysFees, htrWithdrawAmount),
      };
    },
    validate: (response, state) => {
      const amount = amountOf(contextOf(state));
      return nanoTxProblems(response, {
        method: 'noop',
        headerId: ncIdOf(state),
        actionAmounts: contractPaysFees ? [htrWithdrawAmount, amount] : [amount],
      });
    },
    txHash: nanoTxHash,
    onApproved: (dispatch, _response, state) => {
      const ctx = contextOf(state);
      dispatch(
        setFeeWithdrawFormData({ address: address0Of(state), amount: amountOf(ctx), token: ctx.token, pushTx: true })
      );
    },
    checkOnChain: checkFeeStep(payer, (ctx) => ({
      htr: after,
      token: BigInt(ctx.amount) - BigInt(amountOf(ctx)),
    })),
  };
}

const STEPS: FlowStep[] = [
  initializeStep,
  depositStep('deposit-wallet-pays', 'Deposit all, wallet pays the fee', 'wallet', FEE_FLOW_HTR_DEPOSIT),
  withdrawStep(
    'withdraw-wallet-pays',
    'Withdraw all, wallet pays the fee',
    'wallet',
    (ctx) => ctx.amount,
    FEE_FLOW_HTR_DEPOSIT
  ),
  depositStep('deposit-contract-pays', 'Deposit all, contract pays the fee', 'contract', FEE_PER_OUTPUT),
  withdrawStep('withdraw-partial', 'Withdraw part, contract pays the fee', 'contract', (ctx) => ctx.partial, 0n),
];

/** Why the fee flow can't run now, or null. */
export function feeFlowPreflight(state: RootState): string | null {
  const reason = rpcFlowPreflight(state, 'fee', 'fee flow');
  if (reason) return reason;
  const id = state.walletSelection.testWalletId;
  const wallet = id ? state.walletStore.wallets[id] : undefined;
  if (!wallet || isAddressOnly(wallet.metadata) || wallet.status !== 'ready') {
    return 'Start the test wallet from its seed: the flow reads its fee-token balances';
  }
  return null;
}

/**
 * Picks the fee-based token with the largest balance and how much of it the
 * last step withdraws, unless an earlier start of this run already did.
 */
export async function prepareFeeFlow(env: FlowEnv): Promise<void> {
  if (env.getState().flowRun.context.token) return;
  const wallet = env.testWallet();
  if (!wallet) throw new Error('Start the test wallet from its seed: the flow reads its fee-token balances');

  const htrBalance = await wallet.balance(NATIVE_TOKEN_UID);
  if (htrBalance < WALLET_HTR_NEEDED) {
    throw new Error(`The test wallet needs ${htr(WALLET_HTR_NEEDED)} and has ${htr(htrBalance)}`);
  }

  let best: { uid: string; balance: bigint } | null = null;
  for (const uid of await wallet.tokenUids()) {
    if (uid === NATIVE_TOKEN_UID || !(await wallet.isFeeToken(uid))) continue;
    const balance = await wallet.balance(uid);
    if (balance > 0n && (!best || balance > best.balance)) best = { uid, balance };
  }
  if (!best) throw new Error('The test wallet holds no fee-based token: create one first');

  const partial = partialWithdrawAmount(best.balance);
  if (partial === null || partial <= 0n || partial >= best.balance) {
    throw new Error(`Can't split ${formatAmount(best.balance, 2)} of the fee token for a partial withdrawal`);
  }
  const symbol = env.getState().tokens.tokens.find((t) => t.uid === best.uid)?.symbol ?? `${best.uid.slice(0, 8)}…`;
  env.dispatch(
    flowContextSet({ token: best.uid, symbol, amount: best.balance.toString(), partial: partial.toString() })
  );
}

function summarizeFeeFlow(context: Record<string, string>): string | null {
  const { token, symbol, amount, partial } = context;
  if (!token || !amount || !partial) return null;
  return `Token ${symbol} (${token.slice(0, 8)}…): moves ${tokenAmount(amount, symbol)}, withdraws ${tokenAmount(partial, symbol)} at the end`;
}

/** Passes when the contract spent its HTR on fees and the wallet holds just the part withdrawn last. */
async function verifyFeeFlow(env: FlowEnv) {
  const state = env.getState();
  const ctx = contextOf(state);
  const ncId = ncIdOf(state);
  const url = fullNodeUrlOf(state);
  const wallet = env.testWallet();
  if (!wallet) throw new Error('The test wallet stopped: start it to read its balance');

  // The wallet may not have seen the last tx yet.
  const expected = BigInt(ctx.partial);
  let walletBalance = await wallet.balance(ctx.token);
  for (let i = 1; i < WALLET_SYNC.tries && walletBalance !== expected; i += 1) {
    await env.sleep(WALLET_SYNC.intervalMs);
    walletBalance = await wallet.balance(ctx.token);
  }
  const contractHtr = await fetchContractBalance(url, ncId, NATIVE_TOKEN_UID);

  const uncovered = state.flowRun.steps
    .filter((s) => s.status === 'done' && !s.attempts.some((a) => a.outcome === 'rejected'))
    .map((s) => s.title);
  const coverage = uncovered.length > 0 ? ` Rejection not tested on: ${uncovered.join(', ')}.` : '';

  const problems: string[] = [];
  if (walletBalance !== expected) {
    problems.push(
      `The wallet holds ${tokenAmount(walletBalance, ctx.symbol)}, expected the ${tokenAmount(expected, ctx.symbol)} withdrawn last.`
    );
  }
  if (contractHtr !== 0n)
    problems.push(`The contract still holds ${htr(contractHtr)}: it should have spent it on fees.`);
  return problems.length === 0
    ? {
        passed: true,
        detail: `Every fee was 0.01 HTR from the right payer, the contract spent its 0.02 HTR, and the wallet holds the ${tokenAmount(expected, ctx.symbol)} withdrawn last.${coverage}`,
      }
    : { passed: false, detail: `${problems.join(' ')}${coverage}` };
}

export const FEE_FLOW: FlowDefinition = {
  id: FEE_FLOW_ID,
  title: 'Fee nano contract',
  steps: STEPS,
  preflight: feeFlowPreflight,
  prepare: prepareFeeFlow,
  summary: summarizeFeeFlow,
  verify: verifyFeeFlow,
};
