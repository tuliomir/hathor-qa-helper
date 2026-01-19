/**
 * Multisig Redux Slice
 *
 * Manages multisig participant wallets and transaction state
 */

import { createAsyncThunk, createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit';
// @ts-expect-error - Hathor wallet lib doesn't have TypeScript definitions
import HathorWallet from '@hathor/wallet-lib/lib/new/wallet.js';
import Connection from '@hathor/wallet-lib/lib/new/connection.js';
import SendTransaction from '@hathor/wallet-lib/lib/new/sendTransaction.js';
import transactionUtils from '@hathor/wallet-lib/lib/utils/transaction.js';
import { NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';
import { MULTISIG_CONFIG, MULTISIG_TOTAL_PARTICIPANTS } from '../../constants/multisig';
import { NETWORK_CONFIG, type NetworkType, WALLET_CONFIG } from '../../constants/network';
import type { CollectedSignature, MultisigParticipant, MultisigTransactionState, } from '../../types/multisig';
import type { RootState } from '../index';

/**
 * Map to store multisig wallet instances (outside Redux for non-serializable objects)
 */
export const multisigWalletInstancesMap = new Map<string, HathorWallet | null>();

/**
 * State type for the multisig slice
 */
interface MultisigState {
  /** All participants, keyed by participant ID */
  participants: Record<string, MultisigParticipant>;
  /** Currently selected participant for operations */
  selectedParticipantId: string | null;
  /** Current transaction state */
  transaction: MultisigTransactionState;
  /** Network to use for multisig wallets */
  network: NetworkType;
}

/**
 * Generate initial participants based on MULTISIG_CONFIG
 */
function generateInitialParticipants(): Record<string, MultisigParticipant> {
  const participants: Record<string, MultisigParticipant> = {};

  for (let i = 0; i < MULTISIG_TOTAL_PARTICIPANTS; i++) {
    const id = `participant-${i}`;
    participants[id] = {
      id,
      friendlyName: MULTISIG_CONFIG.participantNames[i],
      seedIndex: i,
      status: 'idle',
    };
  }

  return participants;
}

const initialState: MultisigState = {
  participants: generateInitialParticipants(),
  selectedParticipantId: null,
  transaction: {
    step: 'idle',
    selectedSigners: [],
    collectedSignatures: [],
  },
  network: 'TESTNET',
};

/**
 * Async Thunk: Start a multisig participant wallet
 */
export const startMultisigParticipant = createAsyncThunk(
  'multisig/startParticipant',
  async (participantId: string, { getState, dispatch }) => {
    const state = getState() as RootState;
    const participant = state.multisig.participants[participantId];
    const network = state.multisig.network;

    if (!participant) {
      throw new Error(`Participant ${participantId} not found`);
    }

    // Update status to connecting
    dispatch(updateParticipantStatus({ id: participantId, status: 'connecting' }));

    try {
      // Get network configuration
      const networkConfig = NETWORK_CONFIG[network];
      if (!networkConfig) {
        throw new Error(`Invalid network: ${network}`);
      }

      // Create connection to Hathor network
      const connection = new Connection({
        network: networkConfig.name,
        servers: [networkConfig.fullNodeUrl],
        connectionTimeout: WALLET_CONFIG.CONNECTION_TIMEOUT,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      // Get the seed for this participant
      const seed = MULTISIG_CONFIG.seeds[participant.seedIndex];

      // Create multisig wallet configuration
      const walletInstance = new HathorWallet({
        seed,
        connection,
        password: WALLET_CONFIG.DEFAULT_PASSWORD,
        pinCode: WALLET_CONFIG.DEFAULT_PIN_CODE,
        multisig: {
          pubkeys: MULTISIG_CONFIG.pubkeys,
          numSignatures: MULTISIG_CONFIG.numSignatures,
        },
      });

      // Store instance in the external map
      multisigWalletInstancesMap.set(participantId, walletInstance);

      // Start the wallet
      await walletInstance.start();

      // Update status to syncing
      dispatch(updateParticipantStatus({ id: participantId, status: 'syncing' }));

      // Wait for wallet to be ready
      await new Promise<void>((resolve) => {
        const checkReady = () => {
          if (walletInstance && walletInstance.isReady()) {
            resolve();
          } else {
            setTimeout(checkReady, WALLET_CONFIG.SYNC_CHECK_INTERVAL);
          }
        };
        checkReady();
      });

      // Get the first address
      const firstAddress = await walletInstance.getAddressAtIndex(0);

      // Get HTR balance
      const balanceData = await walletInstance.getBalance(NATIVE_TOKEN_UID);
      const balanceBigInt = balanceData && balanceData[0] ? balanceData[0].balance.unlocked : 0n;
      const balanceString = balanceBigInt.toString();

      // Update status to ready
      dispatch(
        updateParticipantStatus({
          id: participantId,
          status: 'ready',
          firstAddress,
        })
      );

      // Update balance
      dispatch(updateParticipantBalance({ id: participantId, balance: balanceString }));

      return { participantId, firstAddress, balance: balanceString };
    } catch (error) {
      // Cleanup on error
      const instance = multisigWalletInstancesMap.get(participantId);
      if (instance) {
        await instance.stop().catch((err: unknown) =>
          console.error('Error stopping wallet after failed start:', err)
        );
        multisigWalletInstancesMap.delete(participantId);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      dispatch(
        updateParticipantStatus({
          id: participantId,
          status: 'error',
          error: errorMessage,
        })
      );
      throw error;
    }
  }
);

/**
 * Async Thunk: Stop a multisig participant wallet
 */
export const stopMultisigParticipant = createAsyncThunk(
  'multisig/stopParticipant',
  async (participantId: string, { dispatch }) => {
    const instance = multisigWalletInstancesMap.get(participantId);

    if (instance) {
      try {
        await instance.stop();
        multisigWalletInstancesMap.delete(participantId);
        dispatch(updateParticipantStatus({ id: participantId, status: 'idle' }));
        dispatch(updateParticipantBalance({ id: participantId, balance: undefined }));
      } catch (error) {
        console.error(`Failed to stop multisig wallet ${participantId}:`, error);
        throw error;
      }
    }

    return { participantId };
  }
);

/**
 * Async Thunk: Refresh a participant's balance
 */
export const refreshParticipantBalance = createAsyncThunk(
  'multisig/refreshBalance',
  async (participantId: string, { dispatch }) => {
    const instance = multisigWalletInstancesMap.get(participantId);

    if (!instance) {
      throw new Error(`Wallet instance ${participantId} not found`);
    }

    try {
      const balanceData = await instance.getBalance(NATIVE_TOKEN_UID);
      const balanceBigInt = balanceData && balanceData[0] ? balanceData[0].balance.unlocked : 0n;
      const balanceString = balanceBigInt.toString();

      dispatch(updateParticipantBalance({ id: participantId, balance: balanceString }));

      return { participantId, balance: balanceString };
    } catch (error) {
      console.error(`Failed to refresh balance for ${participantId}:`, error);
      throw error;
    }
  }
);

/**
 * Async Thunk: Create a multisig transaction (build tx proposal)
 */
export const createMultisigTransaction = createAsyncThunk(
  'multisig/createTransaction',
  async (
    {
      fromParticipantId,
      destination,
      amount,
    }: { fromParticipantId: string; destination: string; amount: string },
    { dispatch, getState }
  ) => {
    const state = getState() as RootState;
    const participant = state.multisig.participants[fromParticipantId];

    if (!participant) {
      throw new Error(`Participant ${fromParticipantId} not found`);
    }

    const instance = multisigWalletInstancesMap.get(fromParticipantId);
    if (!instance) {
      throw new Error(`Wallet instance for ${fromParticipantId} not found`);
    }

    dispatch(setTransactionStep('creating'));

    try {
      const network = instance.getNetworkObject();

      // Build transaction proposal
      // Let SendTransaction automatically select UTXOs by not specifying inputs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const outputs: any[] = [
        {
          address: destination,
          value: BigInt(amount),
          token: NATIVE_TOKEN_UID,
        },
      ];

      const sendTransaction = new SendTransaction({
        storage: instance.storage,
        outputs,
        // Don't specify inputs - let the wallet automatically select UTXOs
      });

      // Prepare and get hex
      const txData = await sendTransaction.prepareTxData();
      const tx = transactionUtils.createTransactionFromData({ version: 1, ...txData }, network);
      const txHex = tx.toHex();

      dispatch(setTransactionHex(txHex));
      dispatch(setTransactionStep('signing'));

      return { txHex };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setTransactionError(errorMessage));
      throw error;
    }
  }
);

/**
 * Async Thunk: Collect a signature from a participant
 */
export const collectSignature = createAsyncThunk(
  'multisig/collectSignature',
  async (
    { participantId, txHex }: { participantId: string; txHex: string },
    { dispatch }
  ) => {
    const instance = multisigWalletInstancesMap.get(participantId);

    if (!instance) {
      throw new Error(`Wallet instance for ${participantId} not found`);
    }

    try {
      const signature = await instance.getAllSignatures(txHex, WALLET_CONFIG.DEFAULT_PIN_CODE);

      dispatch(addCollectedSignature({ participantId, signature }));

      return { participantId, signature };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to collect signature from ${participantId}:`, errorMessage);
      throw error;
    }
  }
);

/**
 * Async Thunk: Assemble and send the multisig transaction
 */
export const assembleAndSendTransaction = createAsyncThunk(
  'multisig/assembleAndSend',
  async (
    {
      participantId,
      txHex,
      signatures,
    }: { participantId: string; txHex: string; signatures: string[] },
    { dispatch }
  ) => {
    const instance = multisigWalletInstancesMap.get(participantId);

    if (!instance) {
      throw new Error(`Wallet instance for ${participantId} not found`);
    }

    dispatch(setTransactionStep('assembling'));

    try {
      // Assemble transaction with signatures
      const assembledTx = await instance.assemblePartialTransaction(txHex, signatures);
      assembledTx.prepareToSend();

      dispatch(setTransactionStep('sending'));

      // Create SendTransaction with the assembled transaction
      const finalTx = new SendTransaction({
        storage: instance.storage,
        transaction: assembledTx,
      });

      // Mine and broadcast
      const result = await finalTx.runFromMining();

      if (!result.hash) {
        throw new Error('Transaction was mined but no hash was returned');
      }

      dispatch(setTransactionResult({ hash: result.hash }));
      dispatch(setTransactionStep('complete'));

      return { hash: result.hash };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      dispatch(setTransactionError(errorMessage));
      throw error;
    }
  }
);

const multisigSlice = createSlice({
  name: 'multisig',
  initialState,
  reducers: {
    updateParticipantStatus: (
      state,
      action: PayloadAction<{
        id: string;
        status: MultisigParticipant['status'];
        firstAddress?: string;
        error?: string;
      }>
    ) => {
      const { id, status, firstAddress, error } = action.payload;
      const participant = state.participants[id];

      if (participant) {
        participant.status = status;
        if (firstAddress) {
          participant.firstAddress = firstAddress;
        }
        if (error !== undefined) {
          participant.error = error;
        }
        // Clear error when status changes to non-error
        if (status !== 'error') {
          participant.error = undefined;
        }
      }
    },

    updateParticipantBalance: (
      state,
      action: PayloadAction<{ id: string; balance?: string }>
    ) => {
      const { id, balance } = action.payload;
      const participant = state.participants[id];

      if (participant) {
        participant.balance = balance;
      }
    },

    setSelectedParticipant: (state, action: PayloadAction<string | null>) => {
      state.selectedParticipantId = action.payload;
    },

    setNetwork: (state, action: PayloadAction<NetworkType>) => {
      state.network = action.payload;
    },

    // Transaction state management
    setTransactionStep: (state, action: PayloadAction<MultisigTransactionState['step']>) => {
      state.transaction.step = action.payload;
    },

    setTransactionHex: (state, action: PayloadAction<string>) => {
      state.transaction.txHex = action.payload;
    },

    setSelectedSigners: (state, action: PayloadAction<string[]>) => {
      state.transaction.selectedSigners = action.payload;
    },

    toggleSigner: (state, action: PayloadAction<string>) => {
      const signerId = action.payload;
      const index = state.transaction.selectedSigners.indexOf(signerId);

      if (index === -1) {
        state.transaction.selectedSigners.push(signerId);
      } else {
        state.transaction.selectedSigners.splice(index, 1);
      }
    },

    addCollectedSignature: (state, action: PayloadAction<CollectedSignature>) => {
      state.transaction.collectedSignatures.push(action.payload);
    },

    setTransactionError: (state, action: PayloadAction<string>) => {
      state.transaction.step = 'error';
      state.transaction.error = action.payload;
    },

    setTransactionResult: (state, action: PayloadAction<{ hash: string }>) => {
      state.transaction.result = action.payload;
    },

    resetTransaction: (state) => {
      state.transaction = {
        step: 'idle',
        selectedSigners: [],
        collectedSignatures: [],
      };
    },
  },
});

export const {
  updateParticipantStatus,
  updateParticipantBalance,
  setSelectedParticipant,
  setNetwork,
  setTransactionStep,
  setTransactionHex,
  setSelectedSigners,
  toggleSigner,
  addCollectedSignature,
  setTransactionError,
  setTransactionResult,
  resetTransaction,
} = multisigSlice.actions;

export default multisigSlice.reducer;

/**
 * Selectors (memoized to prevent unnecessary rerenders)
 */
const selectParticipantsRecord = (state: RootState) => state.multisig.participants;

export const selectParticipants = createSelector(
  [selectParticipantsRecord],
  (participants) => Object.values(participants)
);

export const selectReadyParticipants = createSelector(
  [selectParticipants],
  (participants) => participants.filter((p) => p.status === 'ready')
);

export const selectSelectedSigners = (state: RootState) =>
  state.multisig.transaction.selectedSigners;

export const selectTransaction = (state: RootState) => state.multisig.transaction;

export const selectMultisigNetwork = (state: RootState) => state.multisig.network;
