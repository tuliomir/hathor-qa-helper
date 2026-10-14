/**
 * Request builders for the core WalletConnect RPC stages. Each mirrors the
 * matching rpcHandlers method, so cards can show a live preview and dry run
 * works without a session.
 */

import type { AddressRequestType } from '../store/slices/getAddressSlice';
import type { CreateTokenParams } from '../services/rpcHandlers';

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

export function buildSignWithAddressRequest(message: string, addressIndex: number) {
  return { method: 'htr_signWithAddress', params: { network: NETWORK, message, addressIndex } };
}

export function buildSignOracleDataRequest(ncId: string, oracle: string, data: string) {
  return { method: 'htr_signOracleData', params: { network: NETWORK, nc_id: ncId, data, oracle } };
}

/** The oracle signature in an htr_signOracleData response, wrapped or not. */
export function oracleSignatureOf(response: unknown): string | null {
  const r = unwrapResponse<{ signedData?: unknown }>(response);
  const signed = r?.signedData;
  if (typeof signed === 'string') return signed;
  if (signed && typeof signed === 'object' && typeof (signed as { signature?: unknown }).signature === 'string') {
    return (signed as { signature: string }).signature;
  }
  return null;
}

/** Mirrors rpcHandlers.getRpcCreateToken: optional fields only when set. */
export function buildCreateTokenRequest(p: CreateTokenParams) {
  const params: Record<string, unknown> = {
    network: NETWORK,
    name: p.name,
    symbol: p.symbol,
    amount: p.amount,
    create_mint: p.create_mint,
    create_melt: p.create_melt,
  };
  if (p.version) params.version = p.version;
  if (p.change_address.trim()) params.change_address = p.change_address;
  if (p.mint_authority_address.trim()) params.mint_authority_address = p.mint_authority_address;
  if (p.allow_external_mint_authority_address) params.allow_external_mint_authority_address = true;
  if (p.melt_authority_address.trim()) params.melt_authority_address = p.melt_authority_address;
  if (p.allow_external_melt_authority_address) params.allow_external_melt_authority_address = true;
  const data = p.data.filter((d) => d.trim() !== '');
  if (data.length > 0) params.data = data;
  return { method: 'htr_createToken', params };
}
