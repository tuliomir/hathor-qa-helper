/**
 * RPC Method Handlers
 *
 * This file contains all the RPC method handlers that interact with wallet RPC servers via WalletConnect.
 * These handlers are responsible for making RPC requests through WalletConnect client.
 */

import type Client from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import { HATHOR_TESTNET_CHAIN } from '../constants/walletConnect';
import { getOracleBuffer } from '../utils/betHelpers';

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

    /**
     * Sign with Address
     * Signs a message using a specific address
     */
    getRpcSignWithAddress: async (message: string, addressIndex: number) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Build request params
      const requestParams = {
        method: 'htr_signWithAddress',
        params: {
          network: DEFAULT_NETWORK,
          message,
          addressIndex,
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

    /**
     * Initialize Bet
     * Initialize a new bet nano contract
     */
    getRpcInitializeBet: async (
      blueprintId: string,
      oracleAddress: string,
      token: string,
      deadline: Date,
      pushTx: boolean
    ) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Convert oracle address to buffer hex string
      const oracleBuffer = getOracleBuffer(oracleAddress);

      // Convert Date to unix timestamp (seconds)
      const timestamp = Math.floor(deadline.getTime() / 1000);

      const invokeParams = {
        network: DEFAULT_NETWORK,
        method: 'initialize',
        blueprint_id: blueprintId,
        actions: [],
        args: [oracleBuffer, token, timestamp],
        push_tx: pushTx,
        nc_id: null,
      };

      const requestParams = {
        method: 'htr_sendNanoContractTx',
        params: invokeParams,
      };

      try {
        let response;

        if (dryRun) {
          // Dry run: don't actually call RPC
          response = null;
        } else {
          // Make the RPC request via WalletConnect
          response = await client.request({
            topic: session.topic,
            chainId: HATHOR_TESTNET_CHAIN,
            request: requestParams,
          });
        }

        // Return both request and response
        return {
          request: requestParams,
          response,
        };
      } catch (error) {
        // Attach request to error so UI can display it
        const errorWithRequest = error as any;
        errorWithRequest.requestParams = requestParams;
        throw errorWithRequest;
      }
    },

    /**
     * Place Bet (Deposit)
     * Place a bet on an existing bet nano contract
     */
    getRpcBetDeposit: async (
      ncId: string,
      betChoice: string,
      amount: number,
      address: string,
      token: string,
      pushTx: boolean
    ) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      const invokeParams = {
        network: DEFAULT_NETWORK,
        method: 'bet',
        nc_id: ncId,
        actions: [
          {
            type: 'deposit',
            token,
            amount: amount.toString(),
            changeAddress: address,
          },
        ],
        args: [address, betChoice],
        push_tx: pushTx,
      };

      const requestParams = {
        method: 'htr_sendNanoContractTx',
        params: invokeParams,
      };

      try {
        let response;

        if (dryRun) {
          // Dry run: don't actually call RPC
          response = null;
        } else {
          // Make the RPC request via WalletConnect
          response = await client.request({
            topic: session.topic,
            chainId: HATHOR_TESTNET_CHAIN,
            request: requestParams,
          });
        }

        // Return both request and response
        return {
          request: requestParams,
          response,
        };
      } catch (error) {
        // Attach request to error so UI can display it
        const errorWithRequest = error as any;
        errorWithRequest.requestParams = requestParams;
        throw errorWithRequest;
      }
    },

    /**
     * Set Bet Result
     * Set the result for a bet nano contract (oracle action)
     */
    getRpcSetBetResult: async (
      ncId: string,
      oracle: string,
      result: string,
      pushTx: boolean
    ) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // First, sign the oracle data
      const signRequestParams = {
        method: 'htr_signOracleData',
        params: {
          network: DEFAULT_NETWORK,
          nc_id: ncId,
          data: result,
          oracle,
        },
      };

      let signedData: string;
      try {
        if (dryRun) {
          // In dry-run mode, use a placeholder signed data
          signedData = '<signed_oracle_data_placeholder>';
        } else {
          const signResponse = await client.request({
            topic: session.topic,
            chainId: HATHOR_TESTNET_CHAIN,
            request: signRequestParams,
          });

          // Parse the signed data from the response
          if ((signResponse as any)?.response?.signedData) {
            signedData = (signResponse as any).response.signedData;
          } else {
            throw new Error('Failed to extract signed data from oracle signature response');
          }
        }
      } catch (error) {
        console.error('Failed to sign oracle data:', error);
        const errorWithRequest = error as any;
        errorWithRequest.requestParams = signRequestParams;
        throw errorWithRequest;
      }

      // Now send the set_result transaction with the signed data
      const invokeParams = {
        network: DEFAULT_NETWORK,
        method: 'set_result',
        nc_id: ncId,
        actions: [],
        args: [signedData],
        push_tx: pushTx,
      };

      const requestParams = {
        method: 'htr_sendNanoContractTx',
        params: invokeParams,
      };

      try {
        let response;

        if (dryRun) {
          // Dry run: don't actually call RPC
          response = null;
        } else {
          // Make the RPC request via WalletConnect
          response = await client.request({
            topic: session.topic,
            chainId: HATHOR_TESTNET_CHAIN,
            request: requestParams,
          });
        }

        // Return both request and response
        return {
          request: requestParams,
          response,
        };
      } catch (error) {
        // Attach request to error so UI can display it
        const errorWithRequest = error as any;
        errorWithRequest.requestParams = requestParams;
        throw errorWithRequest;
      }
    },

    /**
     * Withdraw Bet Prize
     * Withdraw prize from a bet nano contract
     */
    getRpcBetWithdraw: async (
      ncId: string,
      address: string,
      amount: number,
      token: string,
      pushTx: boolean
    ) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      const invokeParams = {
        network: DEFAULT_NETWORK,
        method: 'withdraw',
        nc_id: ncId,
        actions: [
          {
            type: 'withdrawal',
            address,
            amount: amount.toString(),
            token,
            changeAddress: address,
          },
        ],
        args: [],
        push_tx: pushTx,
      };

      const requestParams = {
        method: 'htr_sendNanoContractTx',
        params: invokeParams,
      };

      try {
        let response;

        if (dryRun) {
          // Dry run: don't actually call RPC
          response = null;
        } else {
          // Make the RPC request via WalletConnect
          response = await client.request({
            topic: session.topic,
            chainId: HATHOR_TESTNET_CHAIN,
            request: requestParams,
          });
        }

        // Return both request and response
        return {
          request: requestParams,
          response,
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
