/**
 * Smoke tests for stageSlice
 * Tests stage management Redux slice reducers
 */

import { describe, expect, test } from 'bun:test';
import stageReducer, { saveScrollPosition } from '../src/store/slices/stageSlice';
import type { StageId } from '../src/types/stage';

describe('stageSlice', () => {
  const initialState = {
    scrollPositions: {} as Partial<Record<StageId, number>>,
  };

  describe('initial state', () => {
    test('has empty scroll positions initially', () => {
      const state = stageReducer(undefined, { type: 'unknown' });
      expect(state.scrollPositions).toEqual({});
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
  });
});
