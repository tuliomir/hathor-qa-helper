/** The publisher wallet: the only part of the CLI that signs or sends. */

import type { HathorWallet } from '@hathor/wallet-lib';
import { NATIVE_TOKEN_UID, ON_CHAIN_BLUEPRINTS_VERSION } from '@hathor/wallet-lib/lib/constants';
import type { NetworkKey } from '@qa-helper/shared/networks';
import { createWalletFactory } from '../walletFactory.ts';
import { WALLET_PASSWORD, WALLET_PIN } from '../walletRegistry.ts';
import type { FullnodeApi } from './fullnode.ts';
import type { PublisherInfo } from './plan.ts';

const READY_TIMEOUT_MS = 10 * 60_000;

export interface Publisher {
  info: PublisherInfo;
  /** Builds and signs (but does not send) the tx, for its PoW weight. */
  weightOf(code: string): Promise<number>;
  /** Mines and pushes the tx; returns its hash (the blueprint id). */
  publish(code: string): Promise<string>;
  stop(): Promise<void>;
}

export async function openPublisher(seed: string, network: NetworkKey, log: (msg: string) => void): Promise<Publisher> {
  const factory = createWalletFactory();
  factory.deriveId(seed, network); // throws 'Invalid seed' before any network traffic
  const wallet = factory.create(seed, network) as unknown as HathorWallet;
  factory.applyNetworkConfig(network);

  log('Loading the publisher wallet (a seed with a long history takes minutes)...');
  await wallet.start({ pinCode: WALLET_PIN, password: WALLET_PASSWORD });
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (!wallet.isReady()) {
    if (Date.now() > deadline) {
      await wallet.stop().catch(() => {});
      throw new Error(
        `Publisher wallet not ready after ${READY_TIMEOUT_MS / 60_000} min. Use a seed with less history.`
      );
    }
    await Bun.sleep(500);
  }

  const address = await wallet.getAddressAtIndex(0);
  const [htr] = await wallet.getBalance(NATIVE_TOKEN_UID);
  const htrBalance = htr ? (htr.balance.unlocked + htr.balance.locked).toString() : '0';
  const ocbTxIds: string[] = [];
  for await (const tx of wallet.storage.txHistory()) {
    if (tx.version === ON_CHAIN_BLUEPRINTS_VERSION) ocbTxIds.push(tx.tx_id);
  }

  return {
    info: { address, htrBalance, ocbTxIds },
    async weightOf(code) {
      const send = await wallet.createOnChainBlueprintTransaction(code, address);
      return send.transaction!.weight;
    },
    async publish(code) {
      factory.applyNetworkConfig(network);
      const tx = await wallet.createAndSendOnChainBlueprintTransaction(code, address);
      if (!tx?.hash) throw new Error('wallet-lib returned no transaction hash');
      return tx.hash;
    },
    stop: () => wallet.stop(),
  };
}

/** Waits for the tx's first block (the blueprint is usable only then), then for the next second. */
export async function waitAccepted(api: FullnodeApi, id: string, timeoutMs: number, pollMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const s = await api.tx(id);
    if (s.voided) throw new Error(`Tx ${id} was voided.`);
    if (s.firstBlock) {
      // Like wallet-lib's setup: the next tx must not share this one's timestamp.
      const waitMs = ((s.timestamp ?? 0) + 1) * 1000 - Date.now() + 10;
      if (waitMs > 0) await Bun.sleep(waitMs);
      return;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Tx ${id} has no first block after ${Math.round(timeoutMs / 60_000)} min. Is the network mining?`
      );
    }
    await Bun.sleep(pollMs);
  }
}
