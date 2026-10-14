/**
 * Request builders for the core WalletConnect RPC stages. Each mirrors the
 * matching rpcHandlers method, so cards can show a live preview and dry run
 * works without a session.
 */

import type { AddressRequestType } from '../store/slices/getAddressSlice';

const NETWORK = 'testnet';

export const WALLET_INFORMATION_REQUEST = { method: 'htr_getWalletInformation', params: { network: NETWORK } };
export const CONNECTED_NETWORK_REQUEST = { method: 'htr_getConnectedNetwork', params: { network: NETWORK } };

export function buildGetAddressRequest(type: AddressRequestType, index: number) {
  return {
    method: 'htr_getAddress',
    params: { network: NETWORK, type, ...(type === 'index' ? { index } : {}) },
  };
}

export function buildGetBalanceRequest(tokenUids: string[]) {
  return {
    method: 'htr_getBalance',
    params: { network: NETWORK, tokens: tokenUids.filter((t) => t.trim() !== '') },
  };
}

export interface UtxoFilters {
  tokenUid: string;
  maxUtxos: number;
  /** Base units as a decimal string; '' for no filter. */
  amountSmallerThan: string;
  amountBiggerThan: string;
}

export const toFilterNumber = (v: string): number | null => (v ? parseInt(v, 10) : null);

export function buildGetUtxosRequest(f: UtxoFilters) {
  const smaller = toFilterNumber(f.amountSmallerThan);
  const bigger = toFilterNumber(f.amountBiggerThan);
  return {
    method: 'htr_getUtxos',
    params: {
      network: NETWORK,
      token: f.tokenUid,
      maxUtxos: f.maxUtxos,
      ...(smaller !== null ? { amountSmallerThan: smaller } : {}),
      ...(bigger !== null ? { amountBiggerThan: bigger } : {}),
    },
  };
}

/** `{ type, response: T }` payloads (type-tagged RPC responses) or T itself. */
export function unwrapResponse<T>(response: unknown): T | null {
  if (!response || typeof response !== 'object') return null;
  const r = response as { response?: unknown };
  return (r.response && typeof r.response === 'object' ? r.response : response) as T;
}
