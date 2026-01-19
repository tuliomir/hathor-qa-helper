/**
 * Smoke tests for stageSlice
 * Tests stage management Redux slice reducers
 */

import { describe, test, expect } from 'bun:test';
import stageReducer, { setCurrentStage, saveScrollPosition } from '../src/store/slices/stageSlice';
import type { StageId } from '../src/types/stage';

describe('stageSlice', () => {
  const initialState = {
    currentStage: 'wallet-initialization' as StageId,
    scrollPositions: {},
  };

  describe('initial state', () => {
    test('has correct initial stage', () => {
      const state = stageReducer(undefined, { type: 'unknown' });
      expect(state.currentStage).toBe('wallet-initialization');
    });

    test('has empty scroll positions initially', () => {
      const state = stageReducer(undefined, { type: 'unknown' });
      expect(state.scrollPositions).toEqual({});
    });
  });

  describe('setCurrentStage', () => {
    test('updates current stage to a new value', () => {
      const newStage: StageId = 'address-validation';
      const state = stageReducer(initialState, setCurrentStage(newStage));

      expect(state.currentStage).toBe('address-validation');
    });

    test('can switch between any valid stages', () => {
      const stages: StageId[] = [
        'wallet-initialization',
        'rpc-connection',
        'rpc-get-balance',
        'transaction-history',
      ];

      let state = initialState;
      for (const stage of stages) {
        state = stageReducer(state, setCurrentStage(stage));
        expect(state.currentStage).toBe(stage);
      }
    });

    test('preserves scroll positions when changing stage', () => {
      const stateWithScroll = {
        ...initialState,
        scrollPositions: { 'wallet-initialization': 100 },
      };

      const state = stageReducer(stateWithScroll, setCurrentStage('address-validation'));

      expect(state.scrollPositions['wallet-initialization']).toBe(100);
    });
  });

  describe('saveScrollPosition', () => {
    test('saves scroll position for a stage', () => {
      const state = stageReducer(
        initialState,
        saveScrollPosition({ stageId: 'wallet-initialization', position: 250 })
      );

      expect(state.scrollPositions['wallet-initialization']).toBe(250);
    });

    test('can save multiple scroll positions', () => {
      let state = initialState;
      state = stageReducer(state, saveScrollPosition({ stageId: 'wallet-initialization', position: 100 }));
      state = stageReducer(state, saveScrollPosition({ stageId: 'rpc-connection', position: 200 }));

      expect(state.scrollPositions['wallet-initialization']).toBe(100);
      expect(state.scrollPositions['rpc-connection']).toBe(200);
    });

    test('overwrites existing scroll position', () => {
      const stateWithScroll = {
        ...initialState,
        scrollPositions: { 'wallet-initialization': 100 },
      };

      const state = stageReducer(
        stateWithScroll,
        saveScrollPosition({ stageId: 'wallet-initialization', position: 500 })
      );

      expect(state.scrollPositions['wallet-initialization']).toBe(500);
    });

    test('preserves current stage when saving scroll', () => {
      const state = stageReducer(
        initialState,
        saveScrollPosition({ stageId: 'wallet-initialization', position: 100 })
      );

      expect(state.currentStage).toBe('wallet-initialization');
    });
  });
});
