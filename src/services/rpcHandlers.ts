/**
 * RPC Method Handlers
 *
 * This file contains all the RPC method handlers that interact with wallet RPC servers via WalletConnect.
 * These handlers are responsible for making RPC requests through WalletConnect client.
 */

import type Client from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import { HATHOR_TESTNET_CHAIN } from '../constants/walletConnect';

export interface RpcHandlerDependencies {
  client: Client;  // WalletConnect client
  session: SessionTypes.Struct; // Active WalletConnect session
  balanceTokens?: string[];
  dryRun?: boolean;  // If true, skip actual RPC call
}

const DEFAULT_NETWORK = 'testnet';

/**
 * Create RPC handler functions
 */
export const createRpcHandlers = (deps: RpcHandlerDependencies) => {
  const { client, session, balanceTokens = ['00'], dryRun = false } = deps;

  return {
    /**
     * Get Balance
     * Retrieves balances for specified tokens
     */
    getRpcBalance: async () => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Filter empty tokens
      const filteredTokens = balanceTokens.filter((token) => token.trim() !== '');

      // Build request params
      const requestParams = {
        method: 'htr_getBalance',
        params: {
          network: DEFAULT_NETWORK,
          tokens: filteredTokens,
        },
      };

      try {
        let result;

        if (dryRun) {
          // Dry run: don't actually call RPC
          result = null;
        } else {
          // Make the RPC request via WalletConnect
          result = await client.request({
            topic: session.topic,
            chainId: HATHOR_TESTNET_CHAIN,
            request: requestParams,
          });
        }

        // Return both request and response
        return {
          request: requestParams,
          response: result,
        };
      } catch (error) {
        // Attach request to error so UI can display it
        const errorWithRequest = error as any;
        errorWithRequest.requestParams = requestParams;
        throw errorWithRequest;
      }
    },
  };
};
