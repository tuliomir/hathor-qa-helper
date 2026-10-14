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
