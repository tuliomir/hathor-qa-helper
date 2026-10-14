/**
 * HTTP contract between the client and the local QA server (`apps/server`).
 *
 * Amounts always travel as decimal strings: BigInt never crosses JSON.
 */

import type { NetworkKey } from './networks.ts';

export const QA_SERVER_DEFAULT_PORT = 5180;
/** Client dev-proxy prefix that forwards to the QA server. */
export const QA_SERVER_PROXY_PREFIX = '/qa-server';

export const SHIELDED_OUTPUT_MODES = ['AMOUNT_SHIELDED', 'FULLY_SHIELDED'] as const;
export type ShieldedOutputModeName = (typeof SHIELDED_OUTPUT_MODES)[number];
export type ChangeOutputModeName = ShieldedOutputModeName | 'TRANSPARENT';

export type ShieldedCapabilityLevel = 'none' | 'watch' | 'view' | 'full';

/** Mirrors wallet-lib's `IShieldedCapability`, trimmed to what the UI shows. */
export interface ShieldedCapability {
  level: ShieldedCapabilityLevel;
  reason: string | null;
  canReceive: boolean;
  canSpend: boolean;
  historyComplete: boolean;
}

export type WalletSessionState = 'starting' | 'ready' | 'error';

export interface WalletSession {
  /** Legacy (transparent) address at index 0. */
  id: string;
  network: NetworkKey;
  state: WalletSessionState;
  error?: string;
  capability: ShieldedCapability | null;
  legacyAddress0: string;
  shieldedAddress0: string | null;
}

export interface HealthResponse {
  ok: true;
  version: string;
  networks: NetworkKey[];
  sessions: number;
}

export interface StartWalletRequest {
  seed: string;
  network: NetworkKey;
}

export type AddressKind = 'legacy' | 'shielded';

export interface AddressResponse {
  index: number;
  kind: AddressKind;
  address: string;
}

export interface BalanceResponse {
  token: string;
  unlocked: string;
  locked: string;
}

export interface SendOutput {
  address: string;
  value: string;
  /** Token UID; defaults to HTR (`00`). */
  token?: string;
  shielded?: ShieldedOutputModeName;
}

export interface SendRequest {
  outputs: SendOutput[];
  changeShieldedMode?: ChangeOutputModeName;
}

export interface SendResponse {
  txId: string;
}

export interface UtxoEntry {
  txId: string;
  index: number;
  token: string;
  address: string;
  value: string;
  shielded: boolean;
  locked: boolean;
}

export interface UtxosResponse {
  utxos: UtxoEntry[];
}

/** `getShieldedUnblindingForTx` result with BigInts stringified. */
export type UnblindingResponse = Record<string, unknown>;

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'WALLET_NOT_READY'
  | 'INSUFFICIENT_FUNDS'
  | 'LIB_ERROR'
  | 'INTERNAL';

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export const QA_SERVER_ROUTES = {
  health: '/health',
  wallets: '/wallets',
  wallet: (id: string) => `/wallets/${encodeURIComponent(id)}`,
  address: (id: string) => `/wallets/${encodeURIComponent(id)}/addresses`,
  balance: (id: string) => `/wallets/${encodeURIComponent(id)}/balance`,
  utxos: (id: string) => `/wallets/${encodeURIComponent(id)}/utxos`,
  send: (id: string) => `/wallets/${encodeURIComponent(id)}/send`,
  unblinding: (id: string, txId: string) =>
    `/wallets/${encodeURIComponent(id)}/tx/${encodeURIComponent(txId)}/unblinding`,
} as const;
