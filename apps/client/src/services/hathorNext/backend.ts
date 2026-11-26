/**
 * A QA Helper wallet on the Hathor Next backend, the way hathor-wallet-mobile
 * connects (src/multichain/next/backendClient.js): check the backend's pins,
 * register the wallet's public keys (idempotent), log in with the auth key,
 * then move HTR to Hathor Next with a burn the backend builds and this
 * wallet checks and signs.
 *
 * The keys come from the wallet's seed, so the wallet's Hathor Next address
 * is the one the mobile wallet shows for the same seed.
 */

import type { HathorWallet } from '@hathor/wallet-lib';
import { Network } from '@hathor/wallet-lib';
import type { HathorNextChain } from '@qa-helper/shared/networks';
import { BURN_DATA_VALUE, checkBurn, inputDataOf } from './burn';
import {
  bytesToHex,
  deriveAccount,
  encodeAddress,
  hexToBytes,
  keysMessage,
  keysOf,
  loginMessage,
  mnemonicToSeed,
  normalizeNextAddress,
  schnorrSign,
  walletIdOf,
  type NextKeys,
} from './kit';

const REQUEST_TIMEOUT_MS = 30_000;
/** Log in again this long before the session expires. */
const SESSION_RENEW_MARGIN_S = 60;

export class BackendError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'BackendError';
  }
}

/** A transfer as the backend reports it. */
export interface NextTransferStatus {
  id: string;
  /** awaiting_signatures, cancelled, failed, arrived, or a stage on the way. */
  status: string;
  amount?: string;
  destination?: string;
  confirmations?: number;
  needed?: number;
  burn_tx_id?: string | null;
  mint_tx_id?: string | null;
  reason?: string | null;
  created_at?: number;
}

/** Transfers that are over, one way or the other. */
export const FINAL_TRANSFER_STATUSES = new Set(['arrived', 'failed', 'cancelled']);

interface Session {
  token: string;
  expires_at: number;
}

async function request<T>(
  baseUrl: string,
  method: string,
  path: string,
  { body, token }: { body?: unknown; token?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;
  let response: Response;
  let text: string;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    text = await response.text();
  } catch (e) {
    throw new BackendError(0, `The Hathor Next backend could not be reached: ${e instanceof Error ? e.message : e}`);
  }
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? (text.slice(0, 200) || `HTTP ${response.status}`);
    throw new BackendError(response.status, message);
  }
  return data as T;
}

interface RemoteConfig {
  hathor?: { network?: string };
  next?: { network_id?: number; native_token?: string; service_view_pub?: string };
  transfer?: { transfer_address?: string; destination_network?: string; mint_token?: string; confirmations?: number };
}

/** The first pin the backend's config breaks, or null. */
export function pinMismatch(chain: HathorNextChain, nodeNetwork: string, remote: RemoteConfig): string | null {
  const checks: [string, unknown, unknown][] = [
    ['hathor.network', remote.hathor?.network, nodeNetwork],
    ['next.network_id', remote.next?.network_id, chain.networkId],
    ['next.native_token', remote.next?.native_token, chain.nativeToken],
    ['next.service_view_pub', remote.next?.service_view_pub, chain.serviceViewPub],
    ['transfer.transfer_address', remote.transfer?.transfer_address, chain.transferAddress],
    ['transfer.destination_network', remote.transfer?.destination_network, chain.destinationNetwork],
    ['transfer.mint_token', remote.transfer?.mint_token, chain.mintToken],
  ];
  const wrong = checks.find(([, got, want]) => got !== want);
  return wrong ? `${wrong[0]} is ${JSON.stringify(wrong[1])}, expected ${JSON.stringify(wrong[2])}` : null;
}

export interface NextWalletSession {
  walletId: string;
  /** This wallet's own Hathor Next address. */
  address: string;
  /** Whether the backend still scans the chain for this wallet's history. */
  sweeping: boolean;
  balance(): Promise<unknown>;
  /** Burns `amount` HTR (base units) from `wallet` so it arrives at `destination` on Hathor Next. */
  transfer(params: {
    wallet: HathorWallet;
    amount: bigint;
    destination: string;
    pinCode: string;
  }): Promise<NextTransferStatus>;
  getTransfer(transferId: string): Promise<NextTransferStatus>;
  getTransfers(): Promise<NextTransferStatus[]>;
}

export interface ConnectParams {
  chain: HathorNextChain;
  /** The backend's URL from here (a dev proxy in dev). */
  backendUrl: string;
  /** The Hathor Network name the backend must name (testnet-juliet). */
  nodeNetwork: string;
  seedWords: string;
}

const nowS = () => Math.floor(Date.now() / 1000);

export async function connectNextWallet({
  chain,
  backendUrl,
  nodeNetwork,
  seedWords,
}: ConnectParams): Promise<NextWalletSession> {
  const remote = await request<RemoteConfig>(backendUrl, 'GET', '/v1/config');
  const wrong = pinMismatch(chain, nodeNetwork, remote);
  if (wrong) throw new Error(`The Hathor Next backend is on another network: ${wrong}.`);

  const keys: NextKeys = keysOf(deriveAccount(await mnemonicToSeed(seedWords)).b);
  const walletIdBytes = walletIdOf(hexToBytes(chain.serviceViewPub), keys.pubB);
  const walletId = bytesToHex(walletIdBytes);
  const address = encodeAddress(chain.serviceViewPub, bytesToHex(keys.pubB));

  const ts = nowS();
  const message = keysMessage(keys.pubB, keys.authPub, keys.readPub, ts);
  const registration = await request<{
    wallet_id: string;
    pub_a: string;
    address: string;
    balance_sweep?: unknown;
    scanned_from_epoch?: number | null;
  }>(backendUrl, 'POST', '/v1/wallets', {
    body: {
      pub_b: bytesToHex(keys.pubB),
      auth_pub: bytesToHex(keys.authPub),
      read_pub: bytesToHex(keys.readPub),
      ts,
      sig_b: bytesToHex(schnorrSign(keys.b, message)),
      sig_auth: bytesToHex(schnorrSign(keys.auth, message)),
    },
  });
  if (
    registration.wallet_id !== walletId ||
    registration.pub_a !== chain.serviceViewPub ||
    registration.address !== address
  ) {
    throw new Error('The Hathor Next backend registered another wallet than this one.');
  }

  let session: Session | null = null;
  const login = async () => {
    const loginTs = nowS();
    const sig = schnorrSign(keys.auth, loginMessage(walletIdBytes, 'full', loginTs));
    session = await request<Session>(backendUrl, 'POST', `/v1/wallets/${walletId}/session`, {
      body: { ts: loginTs, scope: 'full', sig: bytesToHex(sig) },
    });
  };
  /** A call with a live session, logging in again once when the backend refuses it. */
  const authed = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
    if (!session || session.expires_at - SESSION_RENEW_MARGIN_S <= nowS()) await login();
    try {
      return await request<T>(backendUrl, method, path, { body, token: session!.token });
    } catch (e) {
      if (!(e instanceof BackendError) || e.status !== 401) throw e;
      await login();
      return request<T>(backendUrl, method, path, { body, token: session!.token });
    }
  };
  await login();

  const getTransfer = (id: string) => authed<NextTransferStatus>('GET', `/v1/transfers/${encodeURIComponent(id)}`);

  return {
    walletId,
    address,
    sweeping: Boolean(registration.balance_sweep) || registration.scanned_from_epoch === null,
    balance: () => authed('GET', `/v1/wallets/${walletId}/balance`),
    getTransfer,
    getTransfers: async () => {
      const listed = await authed<NextTransferStatus[] | { transfers: NextTransferStatus[] }>(
        'GET',
        `/v1/wallets/${walletId}/transfers`
      );
      return Array.isArray(listed) ? listed : (listed?.transfers ?? []);
    },

    async transfer({ wallet, amount, destination, pinCode }) {
      if (amount <= 0n) throw new Error('The amount must be positive.');
      const normalized = normalizeNextAddress(destination);
      if ('error' in normalized) throw new Error(`Not a Hathor Next address: ${normalized.error}`);

      const { utxos, changeAmount } = await wallet.getUtxosForAmount(amount + BURN_DATA_VALUE, { token: '00' });
      const changeAddress = changeAmount > 0n ? (await wallet.getCurrentAddress()).address : null;
      const chosen = utxos.map((u) => ({ txId: u.txId, index: u.index, value: BigInt(u.value) }));

      const created = await authed<NextTransferStatus & { unsigned_tx: string }>(
        'POST',
        `/v1/wallets/${walletId}/transfers`,
        {
          intent_id: bytesToHex(crypto.getRandomValues(new Uint8Array(16))),
          amount: amount.toString(),
          utxos: chosen.map((u) => ({ tx_id: u.txId, index: u.index })),
          change_address: changeAddress,
          destination: normalized.address,
        }
      );

      let inputData: string[];
      try {
        const tx = checkBurn(created.unsigned_tx, {
          network: new Network('testnet'),
          utxos: chosen,
          amount,
          transferAddress: chain.transferAddress,
          changeAddress,
          destinationNetwork: chain.destinationNetwork,
          destination: normalized.address,
        });
        inputData = inputDataOf(await wallet.signTx(tx, { pinCode }));
      } catch (e) {
        // Refused before signing: nothing was burned, so the backend can drop it.
        await authed('DELETE', `/v1/transfers/${encodeURIComponent(created.id)}`).catch(() => undefined);
        throw e;
      }
      if (changeAddress) await wallet.getCurrentAddress({ markAsUsed: true });
      return authed<NextTransferStatus>('POST', `/v1/transfers/${encodeURIComponent(created.id)}/signatures`, {
        input_data: inputData,
      });
    },
  };
}
