import { NETWORKS, type NetworkKey } from '@qa-helper/shared/networks';
import type { ShieldedCapability, WalletSession } from '@qa-helper/shared/serverApi';
import { ApiError, badRequest, notFound } from './errors.ts';
import type { LibWallet, WalletFactory } from './walletPort.ts';

export const WALLET_PIN = '123456';
export const WALLET_PASSWORD = 'qa-server';

interface Session {
  view: WalletSession;
  wallet: LibWallet;
}

export interface RegistryOptions {
  readyPollMs?: number;
  readyTimeoutMs?: number;
}

/**
 * Running wallets keyed by legacy addr0. Each session moves
 * starting → ready | error. Seeds are handed to the factory and never kept.
 */
export class WalletRegistry {
  private readonly sessions = new Map<string, Session>();
  /**
   * One queue for every send in the process. Per wallet it prevents two sends
   * from selecting the same UTXOs. Across wallets it is needed because the
   * tx-mining URL is a wallet-lib global that is read on every mining poll:
   * a send on another network running meanwhile would redirect this one.
   */
  private sendQueue: Promise<unknown> = Promise.resolve();
  private readonly readyPollMs: number;
  private readonly readyTimeoutMs: number;

  private readonly factory: WalletFactory;

  constructor(factory: WalletFactory, options: RegistryOptions = {}) {
    this.factory = factory;
    this.readyPollMs = options.readyPollMs ?? 250;
    this.readyTimeoutMs = options.readyTimeoutMs ?? 180_000;
  }

  get size(): number {
    return this.sessions.size;
  }

  list(): WalletSession[] {
    return [...this.sessions.values()].map((s) => ({ ...s.view }));
  }

  get(id: string): WalletSession {
    return { ...this.find(id).view };
  }

  /**
   * Starts a wallet in the background, or returns the running session for
   * this seed. A session in `error` is replaced by a fresh start.
   */
  start(seed: string, network: NetworkKey): { session: WalletSession; created: boolean } {
    let id: string;
    try {
      id = this.factory.deriveId(seed, network);
    } catch {
      throw badRequest('Invalid seed');
    }
    const existing = this.sessions.get(id);
    if (existing && existing.view.network !== network) {
      throw new ApiError(
        409,
        'BAD_REQUEST',
        `Wallet ${id} is already running on ${existing.view.network}; DELETE it first`
      );
    }
    if (existing && existing.view.state !== 'error') return { session: { ...existing.view }, created: false };

    const session: Session = {
      wallet: this.factory.create(seed, network),
      view: {
        id,
        network,
        state: 'starting',
        capability: null,
        legacyAddress0: id,
        shieldedAddress0: null,
      },
    };
    this.sessions.set(id, session);
    void this.boot(session);
    return { session: { ...session.view }, created: true };
  }

  private async boot(session: Session): Promise<void> {
    const { wallet, view } = session;
    try {
      this.factory.applyNetworkConfig(view.network);
      await wallet.start({ pinCode: WALLET_PIN, password: WALLET_PASSWORD });
      await this.waitUntilReady(wallet);
      const shielded = NETWORKS[view.network].supportsShielded;
      const capability = shielded ? trimCapability(await wallet.getShieldedCapability()) : null;
      const shieldedAddress0 = shielded ? await wallet.getAddressAtIndex(0, { legacy: false }) : null;
      if (this.sessions.get(view.id) !== session) {
        // Removed while starting: don't leave an orphan connection behind.
        await wallet.stop().catch(() => {});
        return;
      }
      Object.assign(view, { state: 'ready', capability, shieldedAddress0 });
    } catch (err) {
      view.state = 'error';
      view.error = err instanceof Error ? err.message : String(err);
      await wallet.stop().catch(() => {});
    }
  }

  private async waitUntilReady(wallet: LibWallet): Promise<void> {
    const deadline = Date.now() + this.readyTimeoutMs;
    while (!wallet.isReady()) {
      if (Date.now() > deadline) throw new Error(`Wallet not ready after ${this.readyTimeoutMs} ms`);
      await Bun.sleep(this.readyPollMs);
    }
  }

  /** The wallet of a ready session, or 409 WALLET_NOT_READY. */
  ready(id: string): { wallet: LibWallet; session: WalletSession } {
    const s = this.find(id);
    if (s.view.state !== 'ready') {
      throw new ApiError(409, 'WALLET_NOT_READY', `Wallet ${id} is ${s.view.state}`);
    }
    return { wallet: s.wallet, session: s.view };
  }

  /** Runs `fn` after every earlier send has settled, with the wallet's network config applied. */
  enqueueSend<T>(id: string, fn: (wallet: LibWallet) => Promise<T>): Promise<T> {
    const { wallet, session } = this.ready(id);
    const run = this.sendQueue.then(() => {
      this.factory.applyNetworkConfig(session.network);
      return fn(wallet);
    });
    this.sendQueue = run.catch(() => {});
    return run;
  }

  async remove(id: string): Promise<void> {
    const s = this.find(id);
    this.sessions.delete(id);
    await s.wallet.stop().catch(() => {});
  }

  async stopAll(): Promise<void> {
    const all = [...this.sessions.values()];
    this.sessions.clear();
    await Promise.all(all.map((s) => s.wallet.stop().catch(() => {})));
  }

  private find(id: string): Session {
    const s = this.sessions.get(id);
    if (!s) throw notFound(`Unknown wallet ${id}`);
    return s;
  }
}

function trimCapability(c: ShieldedCapability): ShieldedCapability {
  return {
    level: c.level,
    reason: c.reason,
    canReceive: c.canReceive,
    canSpend: c.canSpend,
    historyComplete: c.historyComplete,
  };
}
