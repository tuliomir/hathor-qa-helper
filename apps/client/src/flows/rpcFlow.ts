/**
 * The RPC flow: every core WalletConnect RPC request, in the order of
 * hathor-wallet-mobile's QA/QA_REOWN.md, against the test wallet. The QA
 * connects the wallet first; the run reads its information, asks for
 * addresses, balance and a signature, sends transactions, creates deposit
 * and fee tokens (and two invalid ones the wallet must refuse), then
 * scatters the HTR and lists UTXOs through three filters.
 *
 * The UTXO filters run last: they need the custom token created earlier,
 * and the scattered UTXOs must not be spent by later sends. The test wallet
 * runs from its seed in the app, so the run derives the addresses it
 * expects, compares balances, and scatters the HTR itself.
 */

import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import helpers from '@hathor/wallet-lib/lib/utils/helpers';
import Network from '@hathor/wallet-lib/lib/models/network';
import { Buffer } from 'buffer';
import type { RootState } from '../store';
import { selectRpcNetwork } from '../store/slices/walletConnectSlice';
import { flowContextSet, type FlowCheck } from '../store/slices/flowRunSlice';
import {
  setWalletInformationError,
  setWalletInformationRequest,
  setWalletInformationResponse,
} from '../store/slices/walletInformationSlice';
import {
  setConnectedNetworkError,
  setConnectedNetworkRequest,
  setConnectedNetworkResponse,
} from '../store/slices/connectedNetworkSlice';
import { setGetAddressError, setGetAddressRequest, setGetAddressResponse } from '../store/slices/getAddressSlice';
import { setGetBalanceError, setGetBalanceRequest, setGetBalanceResponse } from '../store/slices/getBalanceSlice';
import { setGetUtxosError, setGetUtxosRequest, setGetUtxosResponse } from '../store/slices/getUtxosSlice';
import {
  setSignWithAddressError,
  setSignWithAddressRequest,
  setSignWithAddressResponse,
} from '../store/slices/signWithAddressSlice';
import {
  setSendTransactionError,
  setSendTransactionRequest,
  setSendTransactionResponse,
  type SendTransactionOutput,
} from '../store/slices/sendTransactionSlice';
import { setCreateTokenError, setCreateTokenRequest, setCreateTokenResponse } from '../store/slices/createTokenSlice';
import type { CreateTokenParams } from '../services/rpcHandlers';
import type { MethodSliceActions } from '../services/rpcRun';
import { NETWORK_CONFIG } from '../constants/network';
import { formatAmount } from '../utils/amount';
import { fetchFullnodeTx, fetchTokenInfo } from '../utils/nanoTxConfirmation';
import {
  addressAnswer,
  balanceProblems,
  connectedNetworkProblems,
  createdTokenProblems,
  dataOutputCheck,
  feeHeaderCheck,
  htrUtxoFilterCases,
  paysCheck,
  pushedTxHash,
  RPC_FLOW_NETWORK,
  sentTxProblems,
  signProblems,
  tokenOnChainChecks,
  unpushedTxProblems,
  utxoFilterProblems,
  utxosAnswer,
  walletInformationProblems,
  type TokenExpectation,
  type UtxoFilterCase,
} from './rpcChecks';
import {
  untestedRejections,
  type FlowDefinition,
  type FlowEnv,
  type FlowStep,
  type FlowWallet,
  type RpcFlowStep,
} from './flowRunner';
import { address0Of, rpcFlowPreflight, SEED_WALLET_NEEDED } from './rpcFlowPreflight';

export const RPC_FLOW_ID = 'rpc-requests';

/** HTR the test wallet needs (base units): the sends and token creations, and enough left to scatter. */
export const RPC_FLOW_MIN_HTR = 20n;
/** Addresses below the gap limit: the wallet derived them all. */
const ADDRESS_INDEXES = 20;
const MESSAGE = 'Hello, Hathor!';
const SEND_VALUE = 1n;
const SEND_DATA = 'QA flow data output';
const FEE_TOKEN_DATA = 'QA flow fee token data';
/** 1.00 of each token created. */
const TOKEN_AMOUNT = 100n;

/** What the run picked when it started; set by `prepareRpcFlow`, plus what the steps found. */
interface RpcFlowContext {
  /** The index Get address (by index) asks for, and the address the wallet must answer. */
  index: number;
  indexAddress: string;
  /** The index Sign with address signs with. */
  signIndex: number;
  signAddress: string;
  /** An address outside the test wallet, for the invalid external mint authority. */
  externalAddress: string;
  /** Appended to the token symbols, so each run creates new ones. */
  suffix: string;
  /** The deposit token created by the run, once it is. */
  depositToken?: string;
  /** The scattered HTR UTXOs, once scattered (base units). */
  scattered?: bigint[];
}

function contextOf(state: RootState): RpcFlowContext {
  const c = state.flowRun.context;
  if (!c.indexAddress || !c.signAddress || !c.externalAddress)
    throw new Error('The run has not picked its addresses yet');
  return {
    index: Number(c.index),
    indexAddress: c.indexAddress,
    signIndex: Number(c.signIndex),
    signAddress: c.signAddress,
    externalAddress: c.externalAddress,
    suffix: c.suffix ?? '',
    depositToken: c.depositToken || undefined,
    scattered: c.scattered ? c.scattered.split(',').map(BigInt) : undefined,
  };
}

function walletOf(env: FlowEnv): FlowWallet {
  const wallet = env.testWallet();
  if (!wallet) throw new Error(SEED_WALLET_NEEDED);
  return wallet;
}

const fullNodeUrlOf = (state: RootState) => NETWORK_CONFIG[selectRpcNetwork(state)].fullNodeUrl;
const htr = (value: bigint) => `${formatAmount(value, 2)} HTR`;
const asChecks = (problems: string[], ok: string): FlowCheck[] =>
  problems.length > 0 ? problems.map((text) => ({ ok: false, text })) : [{ ok: true, text: ok }];

const ACTIONS = {
  walletInformation: {
    setRequest: setWalletInformationRequest,
    setResponse: setWalletInformationResponse,
    setError: setWalletInformationError,
  },
  connectedNetwork: {
    setRequest: setConnectedNetworkRequest,
    setResponse: setConnectedNetworkResponse,
    setError: setConnectedNetworkError,
  },
  getAddress: { setRequest: setGetAddressRequest, setResponse: setGetAddressResponse, setError: setGetAddressError },
  getBalance: { setRequest: setGetBalanceRequest, setResponse: setGetBalanceResponse, setError: setGetBalanceError },
  getUtxos: { setRequest: setGetUtxosRequest, setResponse: setGetUtxosResponse, setError: setGetUtxosError },
  signWithAddress: {
    setRequest: setSignWithAddressRequest,
    setResponse: setSignWithAddressResponse,
    setError: setSignWithAddressError,
  },
  sendTransaction: {
    setRequest: setSendTransactionRequest,
    setResponse: setSendTransactionResponse,
    setError: setSendTransactionError,
  },
  createToken: {
    setRequest: setCreateTokenRequest,
    setResponse: setCreateTokenResponse,
    setError: setCreateTokenError,
  },
} satisfies Record<string, MethodSliceActions>;

const walletInformationStep: RpcFlowStep = {
  id: 'wallet-information',
  title: 'Get wallet information',
  stageId: 'rpc-basic-info',
  expects: 'no-prompt',
  actions: ACTIONS.walletInformation,
  plan: () => ({ prefill: {}, call: (h) => h.getRpcWalletInformation() }),
  validate: (response, state) => walletInformationProblems(response, { address0: address0Of(state) }),
};

const connectedNetworkStep: RpcFlowStep = {
  id: 'connected-network',
  title: 'Get connected network',
  stageId: 'rpc-basic-info',
  expects: 'no-prompt',
  actions: ACTIONS.connectedNetwork,
  plan: () => ({ prefill: {}, call: (h) => h.getRpcConnectedNetwork() }),
  validate: (response) => connectedNetworkProblems(response),
};

/** An `htr_getAddress` request; `check` compares the answer with the test wallet. */
function addressStep(
  id: string,
  title: string,
  type: 'first_empty' | 'index' | 'client',
  review: string,
  check: (answer: { address: string; index: number }, wallet: FlowWallet, ctx: RpcFlowContext) => Promise<FlowCheck[]>
): RpcFlowStep {
  return {
    id,
    title,
    stageId: 'rpc-get-address',
    actions: ACTIONS.getAddress,
    review,
    plan: (state) => {
      const index = type === 'index' ? contextOf(state).index : undefined;
      return {
        prefill: { requestType: type, ...(index !== undefined ? { index } : {}) },
        call: (h) => h.getRpcGetAddress(type, index),
      };
    },
    validate: (response) => addressAnswer(response).problems,
    checkAnswer: async (response, env) => {
      const { answer } = addressAnswer(response);
      if (!answer) return [{ ok: false, text: 'The answer has no address' }];
      return check(answer, walletOf(env), contextOf(env.getState()));
    },
  };
}

/** The address is the wallet's, at the index the answer gives. */
async function ownAddressChecks(answer: { address: string; index: number }, wallet: FlowWallet): Promise<FlowCheck[]> {
  const index = await wallet.addressIndex(answer.address);
  if (index === null) return [{ ok: false, text: `${answer.address} is not the test wallet's` }];
  return index === answer.index
    ? [{ ok: true, text: `${answer.address.slice(0, 8)}… is the test wallet's address ${index}` }]
    : [{ ok: false, text: `The wallet says index ${answer.index}, the address is at index ${index}` }];
}

const firstEmptyAddressStep = addressStep(
  'address-first-empty',
  'Get address: first empty',
  'first_empty',
  'Did the phone show the request for its first empty address?',
  async (answer, wallet) => {
    const checks = await ownAddressChecks(answer, wallet);
    if (checks.some((c) => !c.ok)) return checks;
    const txs = await wallet.addressTxCount(answer.address);
    return [
      ...checks,
      txs === 0
        ? { ok: true, text: 'The address has never been used' }
        : { ok: false, text: `The address is not empty: it has ${txs} txs` },
    ];
  }
);

const indexAddressStep = addressStep(
  'address-index',
  'Get address: by index',
  'index',
  'Did the phone show the requested address index?',
  async (answer, _wallet, ctx) => [
    answer.index === ctx.index && answer.address === ctx.indexAddress
      ? { ok: true, text: `Address ${ctx.index} is ${ctx.indexAddress.slice(0, 8)}…, as the test wallet derives it` }
      : {
          ok: false,
          text: `Expected address ${ctx.index} (${ctx.indexAddress}), got ${answer.address} at index ${answer.index}`,
        },
  ]
);

const clientAddressStep = addressStep(
  'address-client',
  'Get address: you choose',
  'client',
  'Did the phone let you pick the address from a list?',
  (answer, wallet) => ownAddressChecks(answer, wallet)
);

const balanceStep: RpcFlowStep = {
  id: 'balance',
  title: 'Get balance (HTR)',
  stageId: 'rpc-get-balance',
  expects: 'no-prompt',
  actions: ACTIONS.getBalance,
  plan: () => ({ prefill: {}, call: (h) => h.getRpcBalance() }),
  validate: () => [],
  checkAnswer: async (response, env) => {
    const unlocked = await walletOf(env).balance(NATIVE_TOKEN_UID);
    return asChecks(balanceProblems(response, { unlocked }), `${htr(unlocked)} unlocked, as the test wallet has`);
  },
};

const signStep: RpcFlowStep = {
  id: 'sign-with-address',
  title: 'Sign with address',
  stageId: 'rpc-sign-with-address',
  actions: ACTIONS.signWithAddress,
  review: `Did the phone show the message "${MESSAGE}" and the address it signs with?`,
  plan: (state) => {
    const { signIndex } = contextOf(state);
    return {
      prefill: { message: MESSAGE, addressIndex: String(signIndex) },
      call: (h) => h.getRpcSignWithAddress(MESSAGE, signIndex),
    };
  },
  validate: (response, state) => {
    const { signAddress, signIndex } = contextOf(state);
    return signProblems(response, { message: MESSAGE, address: signAddress, index: signIndex });
  },
};

/** An `htr_sendTransaction` request with `outputs`. */
function sendStep(
  id: string,
  title: string,
  pushTx: boolean,
  outputsOf: (ctx: RpcFlowContext) => SendTransactionOutput[],
  rest: Pick<RpcFlowStep, 'validate' | 'review' | 'checkOnChain'>
): RpcFlowStep {
  return {
    id,
    title,
    stageId: 'rpc-send-transaction',
    actions: ACTIONS.sendTransaction,
    plan: (state) => {
      const outputs = outputsOf(contextOf(state));
      return { prefill: { pushTx, outputs }, call: (h) => h.getRpcSendTransaction(outputs, pushTx) };
    },
    txHash: pushTx ? pushedTxHash : undefined,
    ...rest,
  };
}

const paymentOutputs = (ctx: RpcFlowContext): SendTransactionOutput[] => [
  { type: 'token', address: ctx.indexAddress, value: SEND_VALUE.toString(), token: NATIVE_TOKEN_UID },
];

const unpushedSendStep = sendStep('send-unpushed', 'Send tx, not pushed', false, paymentOutputs, {
  review: 'Did the phone show the 0.01 HTR output and its address?',
  validate: (response, state) =>
    unpushedTxProblems(response, { address: contextOf(state).indexAddress, value: SEND_VALUE }),
});

const pushedSendStep = sendStep('send-pushed', 'Send tx, pushed', true, paymentOutputs, {
  review: 'Did the phone show the 0.01 HTR output and its address?',
  validate: (response, state) =>
    sentTxProblems(response, { address: contextOf(state).indexAddress, value: SEND_VALUE }),
  checkOnChain: async (txHash, env) => {
    const tx = await fetchFullnodeTx(fullNodeUrlOf(env.getState()), txHash);
    return [paysCheck(tx, { address: contextOf(env.getState()).indexAddress, value: SEND_VALUE })];
  },
});

const dataSendStep = sendStep('send-data', 'Send tx, data output', true, () => [{ type: 'data', data: SEND_DATA }], {
  review: `Did the phone show the data output "${SEND_DATA}"?`,
  validate: (response) => sentTxProblems(response),
  checkOnChain: async (txHash, env) => {
    const tx = await fetchFullnodeTx(fullNodeUrlOf(env.getState()), txHash);
    return [dataOutputCheck(tx, SEND_DATA)];
  },
});

interface TokenSpec {
  version: 'deposit' | 'fee';
  name: string;
  symbol: (suffix: string) => string;
  mint: boolean;
  melt: boolean;
  data?: string;
  /** The fee header the creation must carry; null for "some HTR fee". */
  fee: bigint | null;
}

function tokenParams(spec: TokenSpec, ctx: RpcFlowContext, address0: string): CreateTokenParams {
  return {
    name: spec.name,
    symbol: spec.symbol(ctx.suffix),
    amount: TOKEN_AMOUNT.toString(),
    version: spec.version,
    change_address: address0,
    create_mint: spec.mint,
    mint_authority_address: '',
    allow_external_mint_authority_address: false,
    create_melt: spec.melt,
    melt_authority_address: '',
    allow_external_melt_authority_address: false,
    data: spec.data ? [spec.data] : [],
  };
}

const tokenExpectation = (spec: TokenSpec, ctx: RpcFlowContext): TokenExpectation => ({
  name: spec.name,
  symbol: spec.symbol(ctx.suffix),
  amount: TOKEN_AMOUNT,
  mint: spec.mint,
  melt: spec.melt,
});

/** An `htr_createToken` request the wallet must carry out. */
function createTokenStep(id: string, title: string, spec: TokenSpec, review: string): RpcFlowStep {
  return {
    id,
    title,
    stageId: 'rpc-create-token',
    actions: ACTIONS.createToken,
    review,
    plan: (state) => {
      const params = tokenParams(spec, contextOf(state), address0Of(state));
      return { prefill: { params }, call: (h) => h.getRpcCreateToken(params) };
    },
    validate: (response, state) => createdTokenProblems(response, tokenExpectation(spec, contextOf(state))),
    txHash: pushedTxHash,
    onApproved: (dispatch, response) => {
      const hash = pushedTxHash(response);
      if (spec.version === 'deposit' && hash) dispatch(flowContextSet({ depositToken: hash }));
    },
    checkOnChain: async (txHash, env) => {
      const state = env.getState();
      const url = fullNodeUrlOf(state);
      const [tx, info] = await Promise.all([fetchFullnodeTx(url, txHash), fetchTokenInfo(url, txHash)]);
      return [
        ...tokenOnChainChecks(info, { ...tokenExpectation(spec, contextOf(state)), version: spec.version }),
        ...(spec.version === 'fee' ? [feeHeaderCheck(tx, spec.fee)] : []),
        ...(spec.data ? [dataOutputCheck(tx, spec.data)] : []),
      ];
    },
  };
}

const DEPOSIT_TOKEN: TokenSpec = {
  version: 'deposit',
  name: 'QA Flow Deposit',
  symbol: (s) => `QD${s}`,
  mint: false,
  melt: true,
  fee: 0n,
};

const createDepositTokenStep = createTokenStep(
  'create-deposit-token',
  'Create deposit token (melt only)',
  DEPOSIT_TOKEN,
  'Did the phone show the token name, symbol, amount and only a melt authority?'
);

/**
 * An invalid `htr_createToken` request: the wallet can't carry it out and
 * the user is forced to reject it. What the wallet answers is not pinned
 * yet: the first runs record it (code and message in the attempt log).
 */
function invalidTokenStep(
  id: string,
  title: string,
  mintAddress: (ctx: RpcFlowContext, address0: string) => string,
  createMint: boolean,
  review: string
): RpcFlowStep {
  return {
    id,
    title,
    stageId: 'rpc-create-token',
    expects: 'refusal',
    actions: ACTIONS.createToken,
    review,
    plan: (state) => {
      const ctx = contextOf(state);
      const address0 = address0Of(state);
      const params: CreateTokenParams = {
        ...tokenParams(DEPOSIT_TOKEN, ctx, address0),
        create_mint: createMint,
        mint_authority_address: mintAddress(ctx, address0),
      };
      return { prefill: { params }, call: (h) => h.getRpcCreateToken(params) };
    },
    validate: () => [],
  };
}

const invalidMintAddressStep = invalidTokenStep(
  'create-token-invalid-mint',
  'Create token: mint address without mint',
  (_ctx, address0) => address0,
  false,
  'Did the phone explain why it cannot create this token (a mint address without a mint authority)?'
);

const invalidExternalMintStep = invalidTokenStep(
  'create-token-external-mint',
  'Create token: external mint address',
  (ctx) => ctx.externalAddress,
  true,
  'Did the phone explain why it cannot create this token (a mint authority to an external address)?'
);

const createFeeTokenStep = createTokenStep(
  'create-fee-token',
  'Create fee token (no authorities)',
  { version: 'fee', name: 'QA Flow Fee', symbol: (s) => `QF${s}`, mint: false, melt: false, fee: 1n },
  'Did the phone show a fee token with no mint or melt authority, and its 0.01 HTR fee?'
);

const createFeeTokenDataStep = createTokenStep(
  'create-fee-token-data',
  'Create fee token data output',
  {
    version: 'fee',
    name: 'QA Flow Fee Data',
    symbol: (s) => `QX${s}`,
    mint: true,
    melt: true,
    data: FEE_TOKEN_DATA,
    fee: null,
  },
  `Did the phone show a fee token with mint and melt authorities, its fee and the data output "${FEE_TOKEN_DATA}"?`
);

const scatterStep: FlowStep = {
  kind: 'local',
  id: 'scatter',
  title: 'Scatter the HTR into UTXOs',
  stageId: 'rpc-get-utxos',
  perform: async (env) => {
    const { txHash, amounts } = await walletOf(env).scatterHtr();
    env.dispatch(flowContextSet({ scattered: amounts.join(',') }));
    return { txHash };
  },
  checkOnChain: async (_txHash, env) => {
    const { scattered = [] } = contextOf(env.getState());
    return [{ ok: true, text: `UTXOs of ${scattered.map((a) => formatAmount(a, 2)).join(', ')} HTR` }];
  },
};

/** An `htr_getUtxos` request; `filterOf` picks its filter from what the run did. */
function utxosStep(
  id: string,
  title: string,
  filterOf: (ctx: RpcFlowContext) => { token: string; case: UtxoFilterCase },
  review: string
): RpcFlowStep {
  return {
    id,
    title,
    stageId: 'rpc-get-utxos',
    actions: ACTIONS.getUtxos,
    review,
    plan: (state) => {
      const { token, case: c } = filterOf(contextOf(state));
      const asText = (v: bigint | null) => (v === null ? '' : v.toString());
      return {
        prefill: {
          tokenUid: token,
          maxUtxos: c.maxUtxos,
          amountBiggerThan: asText(c.amountBiggerThan),
          amountSmallerThan: asText(c.amountSmallerThan),
        },
        call: (h) =>
          h.getRpcGetUtxos(
            token,
            c.maxUtxos,
            c.amountSmallerThan === null ? null : Number(c.amountSmallerThan),
            c.amountBiggerThan === null ? null : Number(c.amountBiggerThan)
          ),
      };
    },
    validate: (response) => utxosAnswer(response).problems,
    checkAnswer: async (response, env) => {
      const wallet = walletOf(env);
      const { case: c } = filterOf(contextOf(env.getState()));
      const { utxos } = utxosAnswer(response);
      const mine = new Set<string>();
      for (const address of new Set(utxos.map((u) => u.address))) {
        if ((await wallet.addressIndex(address)) !== null) mine.add(address);
      }
      const amounts = utxos.map((u) => formatAmount(u.amount, 2)).join(', ') || 'none';
      return asChecks(
        utxoFilterProblems(utxos, c, (a) => mine.has(a)),
        `UTXOs of ${amounts}, as the filter expects`
      );
    },
  };
}

const scatteredOf = (ctx: RpcFlowContext) => {
  if (!ctx.scattered) throw new Error('No scattered UTXOs yet: scatter the HTR first');
  return htrUtxoFilterCases(ctx.scattered);
};

const tokenUtxosStep = utxosStep(
  'utxos-token',
  'Get UTXOs: custom token',
  (ctx) => {
    if (!ctx.depositToken) throw new Error('No deposit token yet: create it first');
    // Created in one output of 1.00 and never spent since.
    return {
      token: ctx.depositToken,
      case: { maxUtxos: 255, amountBiggerThan: null, amountSmallerThan: null, matching: [TOKEN_AMOUNT], count: 1 },
    };
  },
  'Did the phone show the custom token and the filters it lists UTXOs with?'
);

const htrAboveUtxosStep = utxosStep(
  'utxos-htr-above',
  'Get UTXOs: HTR greater than',
  (ctx) => ({ token: NATIVE_TOKEN_UID, case: scatteredOf(ctx).above }),
  'Did the phone show the "greater than" filter?'
);

const htrBetweenUtxosStep = utxosStep(
  'utxos-htr-between',
  'Get UTXOs: HTR between two amounts',
  (ctx) => ({ token: NATIVE_TOKEN_UID, case: scatteredOf(ctx).between }),
  'Did the phone show both the "greater than" and "smaller than" filters, and the 2-UTXO limit?'
);

const STEPS: FlowStep[] = [
  walletInformationStep,
  connectedNetworkStep,
  firstEmptyAddressStep,
  indexAddressStep,
  clientAddressStep,
  balanceStep,
  signStep,
  unpushedSendStep,
  pushedSendStep,
  dataSendStep,
  createDepositTokenStep,
  invalidMintAddressStep,
  invalidExternalMintStep,
  createFeeTokenStep,
  createFeeTokenDataStep,
  scatterStep,
  tokenUtxosStep,
  htrAboveUtxosStep,
  htrBetweenUtxosStep,
];

/** Why the RPC flow can't run now, or null. */
export function rpcRequestsFlowPreflight(state: RootState): string | null {
  return rpcFlowPreflight(state, 'RPC flow', { seedWallet: true });
}

const randomIndex = (random: () => number) => Math.floor(random() * ADDRESS_INDEXES);

/** A valid address no wallet owns: 20 random bytes as a P2PKH hash. */
function externalAddress(random: () => number): string {
  const hash = Buffer.from(Array.from({ length: 20 }, () => Math.floor(random() * 256)));
  return helpers.encodeAddress(hash, new Network(RPC_FLOW_NETWORK)).base58;
}

/**
 * Checks the HTR budget and picks the run's random values (the address
 * indexes, the token symbols), unless an earlier start of this run did.
 */
export async function prepareRpcFlow(env: FlowEnv, random: () => number = Math.random): Promise<void> {
  if (env.getState().flowRun.context.indexAddress) return;
  const wallet = walletOf(env);
  const balance = await wallet.balance(NATIVE_TOKEN_UID);
  if (balance < RPC_FLOW_MIN_HTR) {
    throw new Error(`The test wallet needs at least ${htr(RPC_FLOW_MIN_HTR)} and has ${htr(balance)}`);
  }
  // Index 0 is address 0, which every other step already uses.
  const index = 1 + Math.floor(random() * (ADDRESS_INDEXES - 1));
  const signIndex = randomIndex(random);
  const suffix = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(random() * 26))).join('');
  env.dispatch(
    flowContextSet({
      index: String(index),
      indexAddress: await wallet.addressAt(index),
      signIndex: String(signIndex),
      signAddress: await wallet.addressAt(signIndex),
      externalAddress: externalAddress(random),
      suffix,
      depositToken: '',
      scattered: '',
    })
  );
}

function summarizeRpcFlow(context: Record<string, string>): string | null {
  if (!context.indexAddress) return null;
  const token = context.depositToken ? ` · deposit token ${context.depositToken.slice(0, 8)}…` : '';
  return `Address index ${context.index}, signing with index ${context.signIndex}, tokens ending in ${context.suffix}${token}`;
}

/** Passes when every step was done and no wallet screen was flagged. */
async function verifyRpcFlow(env: FlowEnv) {
  const steps = env.getState().flowRun.steps;
  const flagged = steps.filter((s) => s.review && !s.review.ok).map((s) => s.title);
  const skipped = steps.filter((s) => s.status === 'skipped').map((s) => s.title);
  const uncovered = untestedRejections(steps);
  const notes = [
    skipped.length > 0 ? ` Skipped: ${skipped.join(', ')}.` : '',
    uncovered.length > 0 ? ` Rejection not tested on: ${uncovered.join(', ')}.` : '',
  ].join('');
  return flagged.length === 0
    ? { passed: true, detail: `Every request was answered as expected.${notes}` }
    : { passed: false, detail: `You flagged the wallet's screen on: ${flagged.join(', ')}.${notes}` };
}

export const RPC_FLOW: FlowDefinition = {
  id: RPC_FLOW_ID,
  title: 'RPC requests',
  steps: STEPS,
  preflight: rpcRequestsFlowPreflight,
  prepare: (env) => prepareRpcFlow(env),
  summary: summarizeRpcFlow,
  verify: verifyRpcFlow,
};
