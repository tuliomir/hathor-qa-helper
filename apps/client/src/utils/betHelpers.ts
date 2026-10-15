/**
 * Bet Helper Functions
 *
 * Utility functions for bet nano contract operations
 */

import { nanoUtils, Network } from '@hathor/wallet-lib';
import { DEFAULT_NETWORK, NETWORK_CONFIG, type NetworkKey } from '../constants/network';

/**
 * Converts an oracle address to a buffer hex string
 * Used in Initialize Bet RPC to convert oracle address parameter
 */
export function getOracleBuffer(address: string, networkKey: NetworkKey = DEFAULT_NETWORK): string {
  const network = new Network(NETWORK_CONFIG[networkKey].name);
  return nanoUtils.getOracleBuffer(address, network).toString('hex');
}

/**
 * Helper function to safely stringify objects containing BigInt values
 */
export const safeStringify = (obj: unknown, space?: number): string => {
  return JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value), space);
};

/** What the bet stages and the bet flow fill in by default (QA_REOWN.md's bet section). */
export const BET_DEFAULTS = {
  /** The winning result: the deposit bets on it and the oracle signs it. */
  betChoice: 'Result_1',
  /** Deposit amount, in base units. */
  amount: '1',
} as const;

/** Default bet deadline: an hour from now, in the deadline field's `YYYY-MM-DDTHH:mm` format. */
export function defaultBetDeadline(now: number = Date.now()): string {
  return new Date(now + 3600 * 1000).toISOString().slice(0, 16);
}
