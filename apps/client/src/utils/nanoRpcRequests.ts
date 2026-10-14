/**
 * htr_sendNanoContractTx request building for the bet and fee RPC stages.
 * Each builder mirrors the matching rpcHandlers method, so the live preview
 * and a dry run without a session show what would be sent.
 */

const METHOD = 'htr_sendNanoContractTx';
const NETWORK = 'testnet';

export interface NanoRpcRequest {
  method: string;
  params: Record<string, unknown>;
}

const request = (params: Record<string, unknown>): NanoRpcRequest => ({
  method: METHOD,
  params: { network: NETWORK, ...params },
});

/** Mirrors getRpcInitializeBet; `oracleScript` is getOracleBuffer(oracle address). */
export function buildInitializeBetRequest(p: {
  blueprintId: string;
  oracleScript: string;
  token: string;
  timestamp: number | string;
  pushTx: boolean;
}): NanoRpcRequest {
  return request({
    method: 'initialize',
    blueprint_id: p.blueprintId,
    actions: [],
    args: [p.oracleScript, p.token, p.timestamp],
    push_tx: p.pushTx,
    nc_id: null,
  });
}

/** Mirrors getRpcBetDeposit. */
export function buildBetDepositRequest(p: {
  ncId: string;
  betChoice: string;
  amount: number;
  address: string;
  token: string;
  pushTx: boolean;
}): NanoRpcRequest {
  return request({
    method: 'bet',
    nc_id: p.ncId,
    actions: [{ type: 'deposit', token: p.token, amount: p.amount.toString(), changeAddress: p.address }],
    args: [p.address, p.betChoice],
    push_tx: p.pushTx,
  });
}

/** Mirrors getRpcSetBetResult. */
export function buildSetBetResultRequest(p: {
  ncId: string;
  result: string;
  oracleSignature: string;
  pushTx: boolean;
}): NanoRpcRequest {
  return request({
    method: 'set_result',
    nc_id: p.ncId,
    actions: [],
    args: [{ type: 'str', signature: p.oracleSignature || '<oracle_signature>', value: p.result }],
    push_tx: p.pushTx,
  });
}

/** Mirrors getRpcBetWithdraw. */
export function buildBetWithdrawRequest(p: {
  ncId: string;
  address: string;
  amount: number;
  token: string;
  pushTx: boolean;
}): NanoRpcRequest {
  return request({
    method: 'withdraw',
    nc_id: p.ncId,
    actions: [
      { type: 'withdrawal', address: p.address, amount: p.amount.toString(), token: p.token, changeAddress: p.address },
    ],
    args: [],
    push_tx: p.pushTx,
  });
}

/** Mirrors getRpcFeeInitialize. */
export function buildFeeInitializeRequest(p: {
  blueprintId: string;
  amount: string;
  changeAddress: string;
  pushTx: boolean;
}): NanoRpcRequest {
  return request({
    method: 'initialize',
    blueprint_id: p.blueprintId,
    actions: [{ type: 'deposit', token: '00', amount: p.amount, changeAddress: p.changeAddress }],
    args: [],
    push_tx: p.pushTx,
    nc_id: null,
  });
}

interface FeeMoveParams {
  ncId: string;
  feeToken: string;
  amount: string;
  pushTx: boolean;
  contractPaysFees: boolean;
  htrWithdrawAmount: string;
}

function feeRequest(p: FeeMoveParams, address: string, action: Record<string, unknown>): NanoRpcRequest {
  const actions: unknown[] = [];
  if (p.contractPaysFees) {
    actions.push({ type: 'withdrawal', token: '00', amount: p.htrWithdrawAmount, address });
  }
  actions.push(action);
  return request({
    method: 'noop',
    nc_id: p.ncId,
    actions,
    args: [],
    push_tx: p.pushTx,
    ...(p.contractPaysFees ? { contract_pays_fees: true } : {}),
  });
}

/** Mirrors getRpcFeeDeposit. */
export function buildFeeDepositRequest(p: FeeMoveParams & { changeAddress: string }): NanoRpcRequest {
  return feeRequest(p, p.changeAddress, {
    type: 'deposit',
    token: p.feeToken,
    amount: p.amount,
    changeAddress: p.changeAddress,
  });
}

/** Mirrors getRpcFeeWithdraw. */
export function buildFeeWithdrawRequest(p: FeeMoveParams & { address: string }): NanoRpcRequest {
  return feeRequest(p, p.address, { type: 'withdrawal', token: p.feeToken, amount: p.amount, address: p.address });
}

/** Tx hash of an htr_sendNanoContractTx response (`{ response: { hash } }`). */
export function nanoTxHash(response: unknown): string | null {
  const hash = (response as { response?: { hash?: unknown } } | null)?.response?.hash;
  return typeof hash === 'string' ? hash : null;
}
