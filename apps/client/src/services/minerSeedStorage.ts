/**
 * Miner seeds, one per network, kept apart from every other wallet seed.
 *
 * Only the Fund from Miner stage reads this key. The wallet list, default
 * wallets and cloud sync never see it, so a miner seed can't end up in a
 * `HathorWallet.start()` and its very long history load.
 */

import type { NetworkKey } from '@qa-helper/shared/networks';

export const MINER_SEEDS_KEY = 'qa-helper:miner-seeds';

type MinerSeeds = Partial<Record<NetworkKey, string>>;

function readAll(): MinerSeeds {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(MINER_SEEDS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? (parsed as MinerSeeds) : {};
  } catch {
    return {};
  }
}

function writeAll(seeds: MinerSeeds): void {
  try {
    localStorage.setItem(MINER_SEEDS_KEY, JSON.stringify(seeds));
  } catch (error) {
    console.error('Failed to save the miner seed:', error);
  }
}

export function loadMinerSeed(network: NetworkKey): string {
  return readAll()[network] ?? '';
}

export function saveMinerSeed(network: NetworkKey, seed: string): void {
  writeAll({ ...readAll(), [network]: seed });
}

export function forgetMinerSeed(network: NetworkKey): void {
  const seeds = readAll();
  delete seeds[network];
  writeAll(seeds);
}
