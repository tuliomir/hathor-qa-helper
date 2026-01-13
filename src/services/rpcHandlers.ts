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

export interface CreateTokenParams {
  name: string;
  symbol: string;
  amount: string;
  change_address: string;
  create_mint: boolean;
  mint_authority_address: string;
  allow_external_mint_authority_address: boolean;
  create_melt: boolean;
  melt_authority_address: string;
  allow_external_melt_authority_address: boolean;
  data: string[];
}

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
     * Get Wallet Information
     * Retrieves wallet network and first address
     */
    getRpcWalletInformation: async () => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Build request params
      const requestParams = {
        method: 'htr_getWalletInformation',
        params: {
          network: DEFAULT_NETWORK,
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
     * Get Connected Network
     * Retrieves the connected network information
     */
    getRpcConnectedNetwork: async () => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Build request params
      const requestParams = {
        method: 'htr_getConnectedNetwork',
        params: {
          network: DEFAULT_NETWORK,
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
     * Get Address
     * Retrieves an address based on type (first_empty, index, or client)
     */
    getRpcGetAddress: async (type: 'first_empty' | 'index' | 'client', index?: number) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Build request params based on type
      const params: any = {
        network: DEFAULT_NETWORK,
        type,
      };

      // Add index if type is 'index'
      if (type === 'index') {
        if (index === undefined) {
          throw new Error('Index is required when type is "index"');
        }
        params.index = index;
      }

      const requestParams = {
        method: 'htr_getAddress',
        params,
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
     * Create Token
     * Creates a new custom token with optional mint/melt authorities
     */
    getRpcCreateToken: async (params: CreateTokenParams) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      const invokeParams: any = {
        network: DEFAULT_NETWORK,
        name: params.name,
        symbol: params.symbol,
        amount: params.amount,
        create_mint: params.create_mint,
        create_melt: params.create_melt,
      };

      if (params.change_address && params.change_address.trim()) {
        invokeParams.change_address = params.change_address;
      }
      if (params.create_mint && params.mint_authority_address && params.mint_authority_address.trim()) {
        invokeParams.mint_authority_address = params.mint_authority_address;
      }
      if (params.create_mint) {
        invokeParams.allow_external_mint_authority_address = params.allow_external_mint_authority_address;
      }
      if (params.create_melt && params.melt_authority_address && params.melt_authority_address.trim()) {
        invokeParams.melt_authority_address = params.melt_authority_address;
      }
      if (params.create_melt) {
        invokeParams.allow_external_melt_authority_address = params.allow_external_melt_authority_address;
      }
      if (params.data && params.data.length > 0) {
        const filteredData = params.data.filter((d) => d.trim() !== '');
        if (filteredData.length > 0) {
          invokeParams.data = filteredData;
        }
      }

      const requestParams = {
        method: 'htr_createToken',
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
     * Initialize Bet
     * Initialize a new bet nano contract
     */
    getRpcInitializeBet: async (
      blueprintId: string,
      oracleAddress: string,
      token: string,
      deadline: Date,
      pushTx: boolean,
    ) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Convert oracle address to buffer hex string
      const oracleBuffer = getOracleBuffer(oracleAddress);

      // Convert Date to unix timestamp (seconds)
      const timestamp = Math.floor(deadline.getTime() / 1000);

      const invokeParams: any = {
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
     * Sign Oracle Data
     * Sign data as oracle for a nano contract
     */
    getRpcSignOracleData: async (
      ncId: string,
      oracle: string,
      data: string
    ) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Build the sign oracle data request
      const requestParams = {
        method: 'htr_signOracleData',
        params: {
          network: DEFAULT_NETWORK,
          nc_id: ncId,
          data: data,
          oracle: oracle,
        },
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

        return {
          request: requestParams,
          response,
        };
      } catch (error) {
        console.error('Failed to sign oracle data:', error);
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
      _oracle: string,
      result: string,
      oracleSignature: string,
      pushTx: boolean
    ) => {
      if (!session || !client) {
        throw new Error('WalletConnect session not available');
      }

      // Use the provided oracle signature (will be calculated asynchronously in future updates)
      // For now, the signature must be provided manually
      const signedData = oracleSignature || '<oracle_signature>';

      // Send the set_result transaction with the oracle signature
      const invokeParams = {
        network: DEFAULT_NETWORK,
        method: 'set_result',
        nc_id: ncId,
        actions: [],
        args: [{ type: 'str', signature: signedData, value: result }],
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
