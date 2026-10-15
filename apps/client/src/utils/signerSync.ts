/**
 * Which wallets need a signer on the QA server, and which signers to stop.
 *
 * A signer is the copy of a client wallet the QA server runs with the
 * native prover, so it can create shielded outputs. QA never manages one:
 * a seed wallet that is ready on a shielded network gets one, and it goes
 * away when the wallet stops, is removed or moves to another network.
 *
 * A session's id is the wallet's legacy address 0. `owners` (persisted)
 * maps the sessions this client started to their wallet, so a reload can
 * tell its own leftovers from other clients' sessions.
 */

import type { WalletSession } from '@qa-helper/shared/serverApi';
import { NETWORKS, type NetworkKey } from '@qa-helper/shared/networks';
import type { WalletStatus } from '../types/wallet';

export interface SignerWallet {
  id: string;
  network: NetworkKey;
  kind: 'seed' | 'address';
  status: WalletStatus;
  /** Legacy address 0, known once the wallet is ready. */
  firstAddress?: string;
}

export interface SignerSyncInput {
  wallets: SignerWallet[];
  sessions: WalletSession[];
  /** Session id → wallet id, for sessions this client started. */
  owners: Record<string, string>;
  /** Wallets with a start or stop request in flight. */
  busy: ReadonlySet<string>;
  /** Wallets whose last start failed; they wait for an explicit retry. */
  failed: ReadonlySet<string>;
}

export interface SignerSyncPlan {
  start: string[];
  stop: string[];
  /** Running sessions of our wallets that `owners` lost track of. */
  adopt: { sessionId: string; walletId: string }[];
}

/** Starting or running on a shielded network: its signer should stay. */
function wantsSigner(w: SignerWallet): boolean {
  if (w.kind !== 'seed' || !NETWORKS[w.network].supportsShielded) return false;
  return w.status === 'ready' || w.status === 'connecting' || w.status === 'syncing';
}

export function planSignerSync({ wallets, sessions, owners, busy, failed }: SignerSyncInput): SignerSyncPlan {
  const plan: SignerSyncPlan = { start: [], stop: [], adopt: [] };
  const byId = new Map(wallets.map((w) => [w.id, w]));
  const sessionIds = new Set(sessions.map((s) => s.id));

  for (const w of wallets) {
    if (w.status !== 'ready' || !w.firstAddress || !wantsSigner(w)) continue;
    if (sessionIds.has(w.firstAddress)) {
      if (owners[w.firstAddress] !== w.id) plan.adopt.push({ sessionId: w.firstAddress, walletId: w.id });
    } else if (!busy.has(w.id) && !failed.has(w.id)) {
      plan.start.push(w.id);
    }
  }

  for (const s of sessions) {
    const ownerId = owners[s.id];
    if (ownerId === undefined || busy.has(ownerId)) continue;
    const owner = byId.get(ownerId);
    // A wallet still loading after a reload has no address yet; keep its signer.
    const keep = owner !== undefined && wantsSigner(owner) && (!owner.firstAddress || owner.firstAddress === s.id);
    if (!keep) plan.stop.push(s.id);
  }

  return plan;
}
