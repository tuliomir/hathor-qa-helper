/**
 * Bet Helper Functions
 *
 * Utility functions for bet nano contract operations
 */

import { nanoUtils, Network } from '@hathor/wallet-lib';

/**
 * Converts an oracle address to a buffer hex string
 * Used in Initialize Bet RPC to convert oracle address parameter
 */
export function getOracleBuffer(address: string): string {
  const network = new Network('testnet');
  return nanoUtils.getOracleBuffer(address, network).toString('hex');
}

/**
 * Helper function to safely stringify objects containing BigInt values
 */
export const safeStringify = (obj: any, space?: number): string => {
  return JSON.stringify(
    obj,
    (_, value) => (typeof value === 'bigint' ? value.toString() : value),
    space
  );
};
