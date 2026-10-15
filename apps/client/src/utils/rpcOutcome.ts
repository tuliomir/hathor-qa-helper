/**
 * Classifies how a WalletConnect RPC request ended. The mobile wallet
 * answers a rejected prompt with JSON-RPC error 5002 "Rejected by the user"
 * (hathor-wallet-mobile `sagas/reown.js`); dismissing its "tx failed, retry?"
 * modal sends the same error, so the two can't be told apart here.
 */

import { RpcRunError } from '../services/rpcRun';
import { extractErrorMessage } from './errorUtils';

export const RPC_USER_REJECTED_CODE = 5002;
export const RPC_USER_REJECTED_MESSAGE = 'Rejected by the user';

export type RpcErrorOutcome =
  /** A rejection on the wallet; `valid` when code and message are the expected ones. */
  | { kind: 'rejected'; valid: boolean; code: number; message: string }
  | { kind: 'error'; code: number | null; message: string };

export function classifyRpcError(error: unknown): RpcErrorOutcome {
  const original = error instanceof RpcRunError ? error.original : error;
  const rawCode = (original as { code?: unknown } | null)?.code;
  const code = typeof rawCode === 'number' ? rawCode : null;
  const message = extractErrorMessage(original);
  if (code === RPC_USER_REJECTED_CODE) {
    return { kind: 'rejected', valid: message === RPC_USER_REJECTED_MESSAGE, code, message };
  }
  return { kind: 'error', code, message };
}
