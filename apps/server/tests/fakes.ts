import type { NetworkKey } from '@qa-helper/shared/networks';
import type { LibWallet, WalletFactory } from '../src/walletPort.ts';

export const SEED_A = 'seed-a';
export const SEED_B = 'seed-b';
export const BAD_SEED = 'bad';

type Call = { method: string; args: unknown[] };

/** Controllable stand-in for `HathorWallet`. Every call is recorded in `calls`. */
export class FakeWallet implements LibWallet {
  calls: Call[] = [];
  ready = false;
  startError: Error | null = null;
  sendError: Error | null = null;
  /** When set, start() waits for this promise, keeping the session `starting`. */
  startGate: Promise<void> | null = null;
  /** When set, sends wait for this promise before resolving. */
  sendGate: Promise<void> | null = null;
  private sendCount = 0;
  private resolveStart!: () => void;
  readonly started = new Promise<void>((r) => (this.resolveStart = r));

  readonly seed: string;
  readonly network: NetworkKey;
  private readonly log: string[];

  constructor(seed: string, network: NetworkKey, log: string[]) {
    this.seed = seed;
    this.network = network;
    this.log = log;
  }

  private record(method: string, ...args: unknown[]) {
    this.calls.push({ method, args });
  }

  async start(options: { pinCode: string; password: string }) {
    this.record('start', options);
    if (this.startGate) await this.startGate;
    if (this.startError) throw this.startError;
    this.ready = true;
    this.resolveStart();
    return {};
  }
  isReady() {
    return this.ready;
  }
  async stop() {
    this.record('stop');
    this.ready = false;
  }
  async getAddressAtIndex(index: number, options: { legacy: boolean }) {
    this.record('getAddressAtIndex', index, options);
    return options.legacy ? `W-${this.seed}-${index}` : `K3-${this.seed}-${index}`;
  }
  async getShieldedCapability() {
    return {
      level: 'full' as const,
      reason: null,
      cause: null,
      canReceive: true,
      canSpend: true,
      historyComplete: true,
      undecoded: { count: 0 } as never,
    };
  }
  async getBalance(token: string) {
    this.record('getBalance', token);
    return [
      {
        token: { id: token, name: 'Hathor', symbol: 'HTR' },
        balance: { unlocked: 12345678901234567890n, locked: 5n },
        lockExpires: null,
        tokenAuthorities: { unlocked: { mint: 0n, melt: 0n }, locked: { mint: 0n, melt: 0n } },
      },
    ];
  }
  async getUtxos(options: Parameters<LibWallet['getUtxos']>[0]) {
    this.record('getUtxos', options);
    return {
      total_amount_available: 7n,
      total_utxos_available: 1n,
      total_amount_locked: 3n,
      total_utxos_locked: 1n,
      utxos: [
        { address: 'W-x', amount: 7n, tx_id: 'tx1', locked: false, index: 0 },
        { address: 'W-y', amount: 3n, tx_id: 'tx2', locked: true, index: 2 },
      ],
    };
  }
  async sendManyOutputsTransaction(...args: Parameters<LibWallet['sendManyOutputsTransaction']>) {
    this.record('sendManyOutputsTransaction', ...args);
    const n = ++this.sendCount;
    this.log.push(`send-start:${this.seed}:${n}`);
    if (this.sendGate) await this.sendGate;
    this.log.push(`send-end:${this.seed}:${n}`);
    if (this.sendError) throw this.sendError;
    return { hash: `tx-${this.seed}-${n}` };
  }
  async getShieldedUnblindingForTx(txId: string) {
    this.record('getShieldedUnblindingForTx', txId);
    return { outputs: [{ index: 2, value: 100n, token: '00', vbf: 'ab' }], inputs: [] };
  }
}

/** Fake factory: ids are `W-<seed>-0`; records network-config applications into `log`. */
export class FakeFactory implements WalletFactory {
  wallets: FakeWallet[] = [];
  log: string[] = [];
  /** Applied to each wallet as it is created. */
  configure: (w: FakeWallet) => void = () => {};

  deriveId(seed: string) {
    if (seed === BAD_SEED) throw new Error('Invalid words');
    return `W-${seed}-0`;
  }
  create(seed: string, network: NetworkKey) {
    const w = new FakeWallet(seed, network, this.log);
    this.configure(w);
    this.wallets.push(w);
    return w;
  }
  applyNetworkConfig(network: NetworkKey) {
    this.log.push(`config:${network}`);
  }
  last() {
    return this.wallets[this.wallets.length - 1];
  }
}
