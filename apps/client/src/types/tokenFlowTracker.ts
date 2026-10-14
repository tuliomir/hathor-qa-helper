/**
 * Type definitions for the Token Flow Tracker service
 *
 * The token flow tracker analyzes transaction history to calculate
 * net token balances per external address, tracking both sent and
 * received amounts to determine actual token distribution.
 */

/**
 * Represents an unspent token output that can be spent/returned
 */
export interface UnspentOutput {
  /** Transaction ID containing this output */
  txId: string;
  /** Index of the output within the transaction */
  outputIndex: number;
  /** Amount of tokens in this output */
  amount: number;
}

/**
 * Token flow data for a specific external address
 */
export interface AddressTokenFlow {
  /** The external address */
  address: string;
  /** Net balance: sent - received (positive = they hold our tokens) */
  netBalance: number;
  /** Total amount sent to this address */
  totalSent: number;
  /** Total amount received back from this address */
  totalReceived: number;
  /** Unspent outputs at this address (tokens still available there) */
  unspentOutputs: UnspentOutput[];
  /** Wallet ID from addressDatabase lookup (if known) */
  walletId?: string;
}

/**
 * Complete result of tracking token flow for a specific token
 */
export interface TokenFlowResult {
  /** The token UID that was tracked */
  tokenUid: string;
  /** Flow data for each external address with positive net balance */
  addressFlows: AddressTokenFlow[];
  /** Total tokens held externally (sum of positive net balances) */
  totalExternalBalance: number;
  /** Any errors encountered during tracking */
  errors: string[];
}
