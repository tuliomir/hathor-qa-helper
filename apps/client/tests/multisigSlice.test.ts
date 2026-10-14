/**
 * Smoke tests for multisigSlice
 * Tests multisig wallet management Redux slice reducers and selectors
 */

import { describe, expect, test } from 'bun:test';
import multisigReducer, {
  addCollectedSignature,
  resetTransaction,
  selectMultisigNetwork,
  selectParticipants,
  selectReadyParticipants,
  selectSelectedSigners,
  selectTransaction,
  setNetwork,
  setTransactionError,
  setTransactionHex,
  setTransactionResult,
  setTransactionStep,
  toggleSigner,
  updateParticipantBalance,
  updateParticipantStatus,
} from '../src/store/slices/multisigSlice';
import { MULTISIG_CONFIG, MULTISIG_TOTAL_PARTICIPANTS } from '../src/constants/multisig';
import type { RootState } from '../src/store';

// Helper to create a mock RootState with multisig state
const createMockRootState = (multisigState: ReturnType<typeof multisigReducer>): RootState => ({
  multisig: multisigState,
} as RootState);

describe('multisigSlice', () => {
  // Get initial state by calling reducer with undefined
  const getInitialState = () => multisigReducer(undefined, { type: 'unknown' });

  describe('initial state', () => {
    test('has correct number of participants', () => {
      const state = getInitialState();
      const participantIds = Object.keys(state.participants);
      expect(participantIds.length).toBe(MULTISIG_TOTAL_PARTICIPANTS);
    });

    test('all participants have idle status initially', () => {
      const state = getInitialState();
      Object.values(state.participants).forEach((participant) => {
        expect(participant.status).toBe('idle');
      });
    });

    test('participants have correct seed indices', () => {
      const state = getInitialState();
      Object.values(state.participants).forEach((participant, index) => {
        expect(participant.seedIndex).toBe(index);
      });
    });

    test('participants have friendly names from config', () => {
      const state = getInitialState();
      Object.values(state.participants).forEach((participant) => {
        expect(MULTISIG_CONFIG.participantNames).toContain(participant.friendlyName);
      });
    });

    test('transaction is in idle state', () => {
      const state = getInitialState();
      expect(state.transaction.step).toBe('idle');
      expect(state.transaction.selectedSigners).toEqual([]);
      expect(state.transaction.collectedSignatures).toEqual([]);
    });

    test('network defaults to TESTNET', () => {
      const state = getInitialState();
      expect(state.network).toBe('TESTNET');
    });
  });

  describe('updateParticipantStatus', () => {
    test('updates participant status', () => {
      const initialState = getInitialState();
      const state = multisigReducer(
        initialState,
        updateParticipantStatus({ id: 'participant-0', status: 'connecting' })
      );

      expect(state.participants['participant-0'].status).toBe('connecting');
    });

    test('updates participant status to ready with first address', () => {
      const initialState = getInitialState();
      const state = multisigReducer(
        initialState,
        updateParticipantStatus({
          id: 'participant-0',
          status: 'ready',
          firstAddress: 'wRxmoq2bDxViPqFGmAsZVBwHNwjEyFj9zz',
        })
      );

      expect(state.participants['participant-0'].status).toBe('ready');
      expect(state.participants['participant-0'].firstAddress).toBe('wRxmoq2bDxViPqFGmAsZVBwHNwjEyFj9zz');
    });

    test('updates participant status to error with error message', () => {
      const initialState = getInitialState();
      const state = multisigReducer(
        initialState,
        updateParticipantStatus({
          id: 'participant-0',
          status: 'error',
          error: 'Connection failed',
        })
      );

      expect(state.participants['participant-0'].status).toBe('error');
      expect(state.participants['participant-0'].error).toBe('Connection failed');
    });

    test('clears error when status changes to non-error', () => {
      let state = getInitialState();
      state = multisigReducer(
        state,
        updateParticipantStatus({
          id: 'participant-0',
          status: 'error',
          error: 'Some error',
        })
      );
      state = multisigReducer(
        state,
        updateParticipantStatus({
          id: 'participant-0',
          status: 'connecting',
        })
      );

      expect(state.participants['participant-0'].status).toBe('connecting');
      expect(state.participants['participant-0'].error).toBeUndefined();
    });
  });

  describe('updateParticipantBalance', () => {
    test('updates participant balance', () => {
      const initialState = getInitialState();
      const state = multisigReducer(
        initialState,
        updateParticipantBalance({ id: 'participant-0', balance: '1000000' })
      );

      expect(state.participants['participant-0'].balance).toBe('1000000');
    });

    test('can clear balance by setting undefined', () => {
      let state = getInitialState();
      state = multisigReducer(
        state,
        updateParticipantBalance({ id: 'participant-0', balance: '1000000' })
      );
      state = multisigReducer(
        state,
        updateParticipantBalance({ id: 'participant-0', balance: undefined })
      );

      expect(state.participants['participant-0'].balance).toBeUndefined();
    });
  });

  describe('setNetwork', () => {
    test('changes network to MAINNET', () => {
      const initialState = getInitialState();
      const state = multisigReducer(initialState, setNetwork('MAINNET'));

      expect(state.network).toBe('MAINNET');
    });

    test('changes network back to TESTNET', () => {
      let state = getInitialState();
      state = multisigReducer(state, setNetwork('MAINNET'));
      state = multisigReducer(state, setNetwork('TESTNET'));

      expect(state.network).toBe('TESTNET');
    });
  });

  describe('toggleSigner', () => {
    test('adds signer when not selected', () => {
      const initialState = getInitialState();
      const state = multisigReducer(initialState, toggleSigner('participant-0'));

      expect(state.transaction.selectedSigners).toContain('participant-0');
    });

    test('removes signer when already selected', () => {
      let state = getInitialState();
      state = multisigReducer(state, toggleSigner('participant-0'));
      state = multisigReducer(state, toggleSigner('participant-0'));

      expect(state.transaction.selectedSigners).not.toContain('participant-0');
    });

    test('can add multiple signers', () => {
      let state = getInitialState();
      state = multisigReducer(state, toggleSigner('participant-0'));
      state = multisigReducer(state, toggleSigner('participant-1'));
      state = multisigReducer(state, toggleSigner('participant-2'));

      expect(state.transaction.selectedSigners).toHaveLength(3);
      expect(state.transaction.selectedSigners).toContain('participant-0');
      expect(state.transaction.selectedSigners).toContain('participant-1');
      expect(state.transaction.selectedSigners).toContain('participant-2');
    });
  });

  describe('transaction state management', () => {
    test('setTransactionStep updates step', () => {
      const initialState = getInitialState();
      const state = multisigReducer(initialState, setTransactionStep('creating'));

      expect(state.transaction.step).toBe('creating');
    });

    test('setTransactionHex updates txHex', () => {
      const initialState = getInitialState();
      const txHex = '0001020304...';
      const state = multisigReducer(initialState, setTransactionHex(txHex));

      expect(state.transaction.txHex).toBe(txHex);
    });

    test('addCollectedSignature adds signature', () => {
      const initialState = getInitialState();
      const state = multisigReducer(
        initialState,
        addCollectedSignature({ participantId: 'participant-0', signature: 'sig1' })
      );

      expect(state.transaction.collectedSignatures).toHaveLength(1);
      expect(state.transaction.collectedSignatures[0].participantId).toBe('participant-0');
      expect(state.transaction.collectedSignatures[0].signature).toBe('sig1');
    });

    test('can collect multiple signatures', () => {
      let state = getInitialState();
      state = multisigReducer(
        state,
        addCollectedSignature({ participantId: 'participant-0', signature: 'sig1' })
      );
      state = multisigReducer(
        state,
        addCollectedSignature({ participantId: 'participant-1', signature: 'sig2' })
      );

      expect(state.transaction.collectedSignatures).toHaveLength(2);
    });

    test('setTransactionError sets error and step', () => {
      const initialState = getInitialState();
      const state = multisigReducer(initialState, setTransactionError('Something went wrong'));

      expect(state.transaction.step).toBe('error');
      expect(state.transaction.error).toBe('Something went wrong');
    });

    test('setTransactionResult sets result', () => {
      const initialState = getInitialState();
      const hash = '00000000abc123...';
      const state = multisigReducer(initialState, setTransactionResult({ hash }));

      expect(state.transaction.result).toEqual({ hash });
    });

    test('resetTransaction clears all transaction state', () => {
      let state = getInitialState();
      state = multisigReducer(state, setTransactionStep('signing'));
      state = multisigReducer(state, setTransactionHex('0001020304'));
      state = multisigReducer(state, toggleSigner('participant-0'));
      state = multisigReducer(state, toggleSigner('participant-1'));
      state = multisigReducer(
        state,
        addCollectedSignature({ participantId: 'participant-0', signature: 'sig1' })
      );

      state = multisigReducer(state, resetTransaction());

      expect(state.transaction.step).toBe('idle');
      expect(state.transaction.txHex).toBeUndefined();
      expect(state.transaction.selectedSigners).toEqual([]);
      expect(state.transaction.collectedSignatures).toEqual([]);
      expect(state.transaction.error).toBeUndefined();
      expect(state.transaction.result).toBeUndefined();
    });
  });

  describe('selectors', () => {
    test('selectParticipants returns array of participants', () => {
      const state = getInitialState();
      const rootState = createMockRootState(state);
      const participants = selectParticipants(rootState);

      expect(Array.isArray(participants)).toBe(true);
      expect(participants.length).toBe(MULTISIG_TOTAL_PARTICIPANTS);
    });

    test('selectReadyParticipants returns only ready participants', () => {
      let state = getInitialState();
      state = multisigReducer(
        state,
        updateParticipantStatus({ id: 'participant-0', status: 'ready' })
      );
      state = multisigReducer(
        state,
        updateParticipantStatus({ id: 'participant-1', status: 'ready' })
      );
      state = multisigReducer(
        state,
        updateParticipantStatus({ id: 'participant-2', status: 'connecting' })
      );

      const rootState = createMockRootState(state);
      const readyParticipants = selectReadyParticipants(rootState);

      expect(readyParticipants.length).toBe(2);
      expect(readyParticipants.every((p) => p.status === 'ready')).toBe(true);
    });

    test('selectSelectedSigners returns selected signer IDs', () => {
      let state = getInitialState();
      state = multisigReducer(state, toggleSigner('participant-0'));
      state = multisigReducer(state, toggleSigner('participant-1'));

      const rootState = createMockRootState(state);
      const signers = selectSelectedSigners(rootState);

      expect(signers).toEqual(['participant-0', 'participant-1']);
    });

    test('selectTransaction returns transaction state', () => {
      let state = getInitialState();
      state = multisigReducer(state, setTransactionStep('signing'));
      state = multisigReducer(state, setTransactionHex('txhex123'));

      const rootState = createMockRootState(state);
      const transaction = selectTransaction(rootState);

      expect(transaction.step).toBe('signing');
      expect(transaction.txHex).toBe('txhex123');
    });

    test('selectMultisigNetwork returns network', () => {
      let state = getInitialState();
      state = multisigReducer(state, setNetwork('MAINNET'));

      const rootState = createMockRootState(state);
      const network = selectMultisigNetwork(rootState);

      expect(network).toBe('MAINNET');
    });
  });

  describe('multisig configuration', () => {
    test('MULTISIG_CONFIG has correct number of seeds', () => {
      expect(MULTISIG_CONFIG.seeds.length).toBe(5);
    });

    test('MULTISIG_CONFIG has correct number of pubkeys', () => {
      expect(MULTISIG_CONFIG.pubkeys.length).toBe(5);
    });

    test('MULTISIG_CONFIG requires 2 signatures', () => {
      expect(MULTISIG_CONFIG.numSignatures).toBe(2);
    });

    test('MULTISIG_CONFIG has participant names', () => {
      expect(MULTISIG_CONFIG.participantNames.length).toBe(5);
      expect(MULTISIG_CONFIG.participantNames).toContain('Alice');
      expect(MULTISIG_CONFIG.participantNames).toContain('Bob');
    });

    test('all seeds are valid 24-word phrases', () => {
      MULTISIG_CONFIG.seeds.forEach((seed) => {
        const words = seed.split(' ');
        expect(words.length).toBe(24);
      });
    });

    test('all pubkeys start with xpub', () => {
      MULTISIG_CONFIG.pubkeys.forEach((pubkey) => {
        expect(pubkey.startsWith('xpub')).toBe(true);
      });
    });
  });

  describe('transaction flow simulation', () => {
    test('complete transaction flow from idle to complete', () => {
      let state = getInitialState();

      // Start with ready participants
      state = multisigReducer(
        state,
        updateParticipantStatus({ id: 'participant-0', status: 'ready' })
      );
      state = multisigReducer(
        state,
        updateParticipantStatus({ id: 'participant-1', status: 'ready' })
      );

      // Select signers
      state = multisigReducer(state, toggleSigner('participant-0'));
      state = multisigReducer(state, toggleSigner('participant-1'));
      expect(state.transaction.selectedSigners.length).toBe(2);

      // Create transaction
      state = multisigReducer(state, setTransactionStep('creating'));
      expect(state.transaction.step).toBe('creating');

      // Set transaction hex
      state = multisigReducer(state, setTransactionHex('0001020304abcdef'));
      state = multisigReducer(state, setTransactionStep('signing'));
      expect(state.transaction.step).toBe('signing');

      // Collect signatures
      state = multisigReducer(
        state,
        addCollectedSignature({ participantId: 'participant-0', signature: 'sig0' })
      );
      state = multisigReducer(
        state,
        addCollectedSignature({ participantId: 'participant-1', signature: 'sig1' })
      );
      expect(state.transaction.collectedSignatures.length).toBe(2);

      // Assemble and send
      state = multisigReducer(state, setTransactionStep('assembling'));
      state = multisigReducer(state, setTransactionStep('sending'));

      // Complete
      state = multisigReducer(state, setTransactionResult({ hash: 'txhash123' }));
      state = multisigReducer(state, setTransactionStep('complete'));

      expect(state.transaction.step).toBe('complete');
      expect(state.transaction.result?.hash).toBe('txhash123');
    });

    test('transaction flow with error', () => {
      let state = getInitialState();

      state = multisigReducer(state, setTransactionStep('creating'));
      state = multisigReducer(state, setTransactionError('Insufficient funds'));

      expect(state.transaction.step).toBe('error');
      expect(state.transaction.error).toBe('Insufficient funds');
    });
  });
});
