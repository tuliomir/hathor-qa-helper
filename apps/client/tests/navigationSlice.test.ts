/**
 * Smoke tests for navigationSlice
 * Tests navigation data Redux slice reducers
 */

import { describe, test, expect } from 'bun:test';
import navigationReducer, {
  navigateToSignOracleData,
  clearSignOracleDataNavigation,
  navigateToSetBetResult,
  clearSetBetResultNavigation,
  navigateToRawRpcEditor,
  clearRawRpcEditorNavigation,
} from '../src/store/slices/navigationSlice';

describe('navigationSlice', () => {
  const initialState = {
    signOracleData: {
      ncId: null,
      addressIndex: null,
      result: null,
    },
    setBetResult: {
      ncId: null,
      addressIndex: null,
      result: null,
      oracleSignature: null,
    },
    rawRpcEditor: {
      requestJson: null,
    },
  };

  describe('initial state', () => {
    test('has null values for all navigation data', () => {
      const state = navigationReducer(undefined, { type: 'unknown' });

      expect(state.signOracleData.ncId).toBeNull();
      expect(state.signOracleData.addressIndex).toBeNull();
      expect(state.signOracleData.result).toBeNull();

      expect(state.setBetResult.ncId).toBeNull();
      expect(state.setBetResult.oracleSignature).toBeNull();

      expect(state.rawRpcEditor.requestJson).toBeNull();
    });
  });

  describe('signOracleData navigation', () => {
    test('navigateToSignOracleData sets all fields', () => {
      const payload = {
        ncId: 'contract-123',
        addressIndex: 5,
        result: 'win',
      };

      const state = navigationReducer(initialState, navigateToSignOracleData(payload));

      expect(state.signOracleData.ncId).toBe('contract-123');
      expect(state.signOracleData.addressIndex).toBe(5);
      expect(state.signOracleData.result).toBe('win');
    });

    test('clearSignOracleDataNavigation resets to null', () => {
      const stateWithData = {
        ...initialState,
        signOracleData: {
          ncId: 'contract-123',
          addressIndex: 5,
          result: 'win',
        },
      };

      const state = navigationReducer(stateWithData, clearSignOracleDataNavigation());

      expect(state.signOracleData.ncId).toBeNull();
      expect(state.signOracleData.addressIndex).toBeNull();
      expect(state.signOracleData.result).toBeNull();
    });

    test('preserves other navigation data when updating signOracleData', () => {
      const stateWithRaw = {
        ...initialState,
        rawRpcEditor: { requestJson: '{"test": true}' },
      };

      const state = navigationReducer(
        stateWithRaw,
        navigateToSignOracleData({ ncId: 'nc', addressIndex: 0, result: 'test' })
      );

      expect(state.rawRpcEditor.requestJson).toBe('{"test": true}');
    });
  });

  describe('setBetResult navigation', () => {
    test('navigateToSetBetResult sets all fields', () => {
      const payload = {
        ncId: 'bet-contract-456',
        addressIndex: 2,
        result: 'lose',
        oracleSignature: 'sig123abc',
      };

      const state = navigationReducer(initialState, navigateToSetBetResult(payload));

      expect(state.setBetResult.ncId).toBe('bet-contract-456');
      expect(state.setBetResult.addressIndex).toBe(2);
      expect(state.setBetResult.result).toBe('lose');
      expect(state.setBetResult.oracleSignature).toBe('sig123abc');
    });

    test('clearSetBetResultNavigation resets all fields to null', () => {
      const stateWithData = {
        ...initialState,
        setBetResult: {
          ncId: 'contract',
          addressIndex: 1,
          result: 'win',
          oracleSignature: 'sig',
        },
      };

      const state = navigationReducer(stateWithData, clearSetBetResultNavigation());

      expect(state.setBetResult.ncId).toBeNull();
      expect(state.setBetResult.addressIndex).toBeNull();
      expect(state.setBetResult.result).toBeNull();
      expect(state.setBetResult.oracleSignature).toBeNull();
    });
  });

  describe('rawRpcEditor navigation', () => {
    test('navigateToRawRpcEditor sets request JSON', () => {
      const payload = { requestJson: '{"method": "htr_getBalance"}' };

      const state = navigationReducer(initialState, navigateToRawRpcEditor(payload));

      expect(state.rawRpcEditor.requestJson).toBe('{"method": "htr_getBalance"}');
    });

    test('clearRawRpcEditorNavigation resets to null', () => {
      const stateWithData = {
        ...initialState,
        rawRpcEditor: { requestJson: '{"test": true}' },
      };

      const state = navigationReducer(stateWithData, clearRawRpcEditorNavigation());

      expect(state.rawRpcEditor.requestJson).toBeNull();
    });

    test('can handle complex JSON strings', () => {
      const complexJson = JSON.stringify({
        method: 'htr_sendTransaction',
        params: {
          outputs: [{ address: 'addr1', value: 100 }],
          token: '00',
        },
      });

      const state = navigationReducer(
        initialState,
        navigateToRawRpcEditor({ requestJson: complexJson })
      );

      expect(state.rawRpcEditor.requestJson).toBe(complexJson);
      expect(JSON.parse(state.rawRpcEditor.requestJson!)).toHaveProperty('method');
    });
  });
});
