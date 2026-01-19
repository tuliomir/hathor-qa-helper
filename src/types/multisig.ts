/**
 * Type definitions for multisig wallet management
 */

import type { WalletStatus } from './wallet';

/**
 * Represents a participant in the multisig wallet configuration
 */
export interface MultisigParticipant {
  /** Unique identifier for this participant (e.g., "participant-0") */
  id: string;
  /** Human-friendly name (e.g., "Alice", "Bob") */
  friendlyName: string;
  /** Index into MULTISIG_CONFIG.seeds array */
  seedIndex: number;
  /** Current wallet status */
  status: WalletStatus;
  /** First address of this participant's multisig wallet */
  firstAddress?: string;
  /** Balance stored as string for Redux serializability */
  balance?: string;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Collected signature from a participant
 */
export interface CollectedSignature {
  /** ID of the participant who provided this signature */
  participantId: string;
  /** The signature data */
  signature: string;
}

/**
 * State machine for multisig transaction flow
 */
export type MultisigTransactionStep =
  | 'idle'
  | 'creating'
  | 'signing'
  | 'assembling'
  | 'sending'
  | 'complete'
  | 'error';

/**
 * State for an in-progress multisig transaction
 */
export interface MultisigTransactionState {
  /** Current step in the transaction flow */
  step: MultisigTransactionStep;
  /** Transaction hex to be signed */
  txHex?: string;
  /** IDs of participants selected to sign */
  selectedSigners: string[];
  /** Signatures collected so far */
  collectedSignatures: CollectedSignature[];
  /** Error message if step is 'error' */
  error?: string;
  /** Result after successful send */
  result?: {
    hash: string;
  };
}

/**
 * Parameters for creating a multisig transaction
 */
export interface CreateMultisigTransactionParams {
  /** ID of the participant whose wallet will be used to create the tx proposal */
  fromParticipantId: string;
  /** Destination address */
  destination: string;
  /** Amount in smallest unit (as string for BigInt compatibility) */
  amount: string;
}

/**
 * Parameters for collecting a signature
 */
export interface CollectSignatureParams {
  /** ID of the participant to sign */
  participantId: string;
  /** Transaction hex to sign */
  txHex: string;
}

/**
 * Parameters for assembling and sending the transaction
 */
export interface AssembleAndSendParams {
  /** ID of the participant whose wallet will assemble and send */
  participantId: string;
  /** Transaction hex */
  txHex: string;
  /** Collected signatures from participants */
  signatures: string[];
}
