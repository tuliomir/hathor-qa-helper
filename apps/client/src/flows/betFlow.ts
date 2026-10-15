/**
 * The bet nano contract flow: initialize → place bet → sign oracle data →
 * set result → withdraw, all from address 0 and with `push_tx` on, as in
 * hathor-wallet-mobile's QA/QA_REOWN.md. Each step reads what it needs from
 * the slices the bet stages share (contract ID, deposit, oracle signature),
 * so a run picks up whatever the user did by hand before resuming.
 *
 * Passes when the contract's balance is back to zero: the bettor won and
 * withdrew the whole deposit.
 */

import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import type { RootState } from '../store';
import {
  selectRpcNetwork,
  selectRpcSessionIsMainnet,
  selectWalletConnectFirstAddress,
} from '../store/slices/walletConnectSlice';
import {
  setBetInitializeError,
  setBetInitializeRequest,
  setBetInitializeResponse,
} from '../store/slices/betInitializeSlice';
import {
  setBetDepositError,
  setBetDepositFormData,
  setBetDepositRequest,
  setBetDepositResponse,
} from '../store/slices/betDepositSlice';
import {
  setSignOracleDataError,
  setSignOracleDataFormData,
  setSignOracleDataRequest,
  setSignOracleDataResponse,
} from '../store/slices/signOracleDataSlice';
import {
  setSetBetResultError,
  setSetBetResultFormData,
  setSetBetResultRequest,
  setSetBetResultResponse,
} from '../store/slices/setBetResultSlice';
import {
  setBetWithdrawError,
  setBetWithdrawFormData,
  setBetWithdrawRequest,
  setBetWithdrawResponse,
} from '../store/slices/betWithdrawSlice';
import { setBetNanoContractId } from '../store/slices/betNanoContractSlice';
import { NETWORK_CONFIG } from '../constants/network';
import { blueprintIdFor } from '../utils/blueprints';
import { BET_DEFAULTS, defaultBetDeadline } from '../utils/betHelpers';
import { walletAddress0 } from '../utils/addressOnlyWallet';
import { nanoTxHash } from '../utils/nanoRpcRequests';
import { oracleSignatureOf } from '../utils/rpcCoreRequests';
import { fetchContractBalance } from '../utils/nanoTxConfirmation';
import { nanoTxProblems, signOracleDataProblems } from './nanoExpectations';
import type { FlowDefinition, FlowEnv, FlowStep } from './flowRunner';

export const BET_FLOW_ID = 'bet-nano-contract';

/** The test wallet's address 0: oracle, bettor and withdrawer. */
function address0Of(state: RootState): string {
  const id = state.walletSelection.testWalletId;
  const address = walletAddress0(id ? state.walletStore.wallets[id] : undefined);
  if (!address) throw new Error('The test wallet has no address 0 yet');
  return address;
}

function ncIdOf(state: RootState): string {
  const ncId = state.betNanoContract.ncId;
  if (!ncId) throw new Error('No bet contract yet: initialize one first');
  return ncId;
}

const tokenOf = (state: RootState) => state.betNanoContract.token || NATIVE_TOKEN_UID;
const depositAmountOf = (state: RootState) => state.betDeposit.amount || BET_DEFAULTS.amount;
/** The result the oracle signs and sets: the one the deposit bet on. */
const resultOf = (state: RootState) => state.betDeposit.betChoice || BET_DEFAULTS.betChoice;

const initializeStep: FlowStep = {
  id: 'initialize',
  title: 'Initialize bet',
  stageId: 'rpc-bet-initialize',
  actions: {
    setRequest: setBetInitializeRequest,
    setResponse: setBetInitializeResponse,
    setError: setBetInitializeError,
  },
  plan: (state) => {
    const network = selectRpcNetwork(state);
    const blueprintId = blueprintIdFor(network, 'bet');
    if (!blueprintId) throw new Error(`No bet blueprint on ${NETWORK_CONFIG[network].label}`);
    const oracle = address0Of(state);
    const token = NATIVE_TOKEN_UID;
    // The same string the stage's deadline field holds, parsed the same way.
    const deadline = defaultBetDeadline();
    return {
      prefill: { blueprintId, token, deadline, addressIndex: 0, pushTx: true },
      call: (h) => h.getRpcInitializeBet(blueprintId, oracle, token, new Date(deadline), true, network),
    };
  },
  validate: (response, state) =>
    nanoTxProblems(response, {
      method: 'initialize',
      headerId: blueprintIdFor(selectRpcNetwork(state), 'bet') ?? '',
      caller: address0Of(state),
    }),
  txHash: nanoTxHash,
  onApproved: (dispatch, response, state) => {
    const ncId = nanoTxHash(response);
    const blueprintId = blueprintIdFor(selectRpcNetwork(state), 'bet') ?? undefined;
    if (ncId) dispatch(setBetNanoContractId({ ncId, blueprintId, token: NATIVE_TOKEN_UID }));
  },
};

const depositStep: FlowStep = {
  id: 'deposit',
  title: 'Place bet',
  stageId: 'rpc-bet-deposit',
  actions: {
    setRequest: setBetDepositRequest,
    setResponse: ({ response, duration }) =>
      setBetDepositResponse({ response, duration, betChoice: BET_DEFAULTS.betChoice }),
    setError: setBetDepositError,
  },
  plan: (state) => {
    const ncId = ncIdOf(state);
    const address = address0Of(state);
    const token = tokenOf(state);
    const { betChoice, amount } = BET_DEFAULTS;
    return {
      prefill: { ncId, betChoice, amount, token, addressIndex: 0, pushTx: true },
      call: (h) => h.getRpcBetDeposit(ncId, betChoice, Number(amount), address, token, true),
    };
  },
  validate: (response, state) =>
    nanoTxProblems(response, {
      method: 'bet',
      headerId: ncIdOf(state),
      caller: address0Of(state),
      actionAmounts: [BET_DEFAULTS.amount],
    }),
  txHash: nanoTxHash,
  onApproved: (dispatch, _response, state) => {
    // Withdraw prefills from here, as after a manual deposit.
    dispatch(
      setBetDepositFormData({
        ncId: ncIdOf(state),
        amount: BET_DEFAULTS.amount,
        token: tokenOf(state),
        addressIndex: 0,
      })
    );
  },
};

const signOracleStep: FlowStep = {
  id: 'sign-oracle-data',
  title: 'Sign oracle data',
  stageId: 'rpc-sign-oracle-data',
  actions: {
    setRequest: setSignOracleDataRequest,
    setResponse: setSignOracleDataResponse,
    setError: setSignOracleDataError,
  },
  plan: (state) => {
    const ncId = ncIdOf(state);
    const oracle = address0Of(state);
    const data = resultOf(state);
    return {
      prefill: { ncId, data, addressIndex: 0 },
      call: (h) => h.getRpcSignOracleData(ncId, oracle, data),
    };
  },
  validate: (response, state) => signOracleDataProblems(response, { data: resultOf(state), oracle: address0Of(state) }),
  onApproved: (dispatch, _response, state) => {
    dispatch(setSignOracleDataFormData({ ncId: ncIdOf(state), addressIndex: 0, data: resultOf(state) }));
  },
};

const setResultStep: FlowStep = {
  id: 'set-result',
  title: 'Set bet result',
  stageId: 'rpc-set-bet-result',
  actions: {
    setRequest: setSetBetResultRequest,
    setResponse: setSetBetResultResponse,
    setError: setSetBetResultError,
  },
  plan: (state) => {
    const ncId = ncIdOf(state);
    const oracle = address0Of(state);
    const result = resultOf(state);
    const oracleSignature = oracleSignatureOf(state.signOracleData.rawResponse);
    if (!oracleSignature) throw new Error('No oracle signature yet: sign the oracle data first');
    return {
      prefill: { ncId, result, oracleSignature, addressIndex: 0, pushTx: true },
      call: (h) => h.getRpcSetBetResult(ncId, oracle, result, oracleSignature, true),
    };
  },
  validate: (response, state) =>
    nanoTxProblems(response, { method: 'set_result', headerId: ncIdOf(state), caller: address0Of(state) }),
  txHash: nanoTxHash,
  onApproved: (dispatch, _response, state) => {
    dispatch(
      setSetBetResultFormData({
        ncId: ncIdOf(state),
        addressIndex: 0,
        result: resultOf(state),
        oracleSignature: oracleSignatureOf(state.signOracleData.rawResponse) ?? '',
        pushTx: true,
      })
    );
  },
};

const withdrawStep: FlowStep = {
  id: 'withdraw',
  title: 'Withdraw prize',
  stageId: 'rpc-bet-withdraw',
  actions: {
    setRequest: setBetWithdrawRequest,
    setResponse: setBetWithdrawResponse,
    setError: setBetWithdrawError,
  },
  plan: (state) => {
    const ncId = ncIdOf(state);
    const address = address0Of(state);
    const amount = depositAmountOf(state);
    const token = tokenOf(state);
    return {
      prefill: { ncId, addressIndex: 0, amount, token, pushTx: true },
      call: (h) => h.getRpcBetWithdraw(ncId, address, Number(amount), token, true),
    };
  },
  validate: (response, state) =>
    nanoTxProblems(response, {
      method: 'withdraw',
      headerId: ncIdOf(state),
      caller: address0Of(state),
      actionAmounts: [depositAmountOf(state)],
    }),
  txHash: nanoTxHash,
  onApproved: (dispatch, _response, state) => {
    dispatch(
      setBetWithdrawFormData({
        address: address0Of(state),
        amount: depositAmountOf(state),
        token: tokenOf(state),
        pushTx: true,
      })
    );
  },
};

/** Why the bet flow can't run now, or null. */
export function betFlowPreflight(state: RootState): string | null {
  if (state.rpc.isDryRun) return 'Turn dry run off: the flow sends real requests';
  if (!state.walletConnect.session) return 'Connect the wallet over RPC first';
  if (selectRpcSessionIsMainnet(state)) return 'The bet flow runs on testnets only';
  const network = selectRpcNetwork(state);
  if (!blueprintIdFor(network, 'bet')) return `No bet blueprint on ${NETWORK_CONFIG[network].label}`;
  let address0: string;
  try {
    address0 = address0Of(state);
  } catch (err) {
    return (err as Error).message;
  }
  const connected = selectWalletConnectFirstAddress(state);
  if (connected.toLowerCase() !== address0.toLowerCase()) {
    return 'The connected wallet is not the test wallet (address 0 differs)';
  }
  return null;
}

/** Passes when the contract holds nothing: the whole deposit came back. */
async function verifyBetFlow(env: FlowEnv) {
  const state = env.getState();
  const ncId = ncIdOf(state);
  const token = tokenOf(state);
  const network = selectRpcNetwork(state);
  const balance = await fetchContractBalance(NETWORK_CONFIG[network].fullNodeUrl, ncId, token);
  const uncovered = state.flowRun.steps
    .filter((s) => s.status === 'done' && !s.attempts.some((a) => a.outcome === 'rejected'))
    .map((s) => s.title);
  const coverage = uncovered.length > 0 ? ` Rejection not tested on: ${uncovered.join(', ')}.` : '';
  return balance === 0n
    ? { passed: true, detail: `The contract balance is back to 0: the prize came back to your wallet.${coverage}` }
    : { passed: false, detail: `The contract still holds ${balance} (base units of ${token}).${coverage}` };
}

export const BET_FLOW: FlowDefinition = {
  id: BET_FLOW_ID,
  title: 'Bet nano contract',
  steps: [initializeStep, depositStep, signOracleStep, setResultStep, withdrawStep],
  preflight: betFlowPreflight,
  verify: verifyBetFlow,
};
