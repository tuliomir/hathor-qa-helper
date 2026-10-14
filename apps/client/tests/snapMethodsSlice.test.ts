/**
 * Tests for snapMethodsSlice — keyed snap method results
 */

import { describe, expect, test } from 'bun:test';
import snapMethodsReducer, {
  setSnapMethodRequest,
  setSnapMethodResponse,
  setSnapMethodError,
  clearSnapMethodData,
  type SnapMethodsState,
} from '../src/store/slices/snapMethodsSlice';

const initialState: SnapMethodsState = { methods: {} };

describe('snapMethodsSlice', () => {
  test('returns initial state', () => {
    const state = snapMethodsReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  test('setSnapMethodRequest creates entry with timestamp', () => {
    const before = Date.now();
    const state = snapMethodsReducer(
      initialState,
      setSnapMethodRequest({
        methodKey: 'getAddress',
        method: 'htr_getAddress',
        params: { type: 'index', index: 0 },
        isDryRun: false,
      }),
    );

    const entry = state.methods['getAddress'];
    expect(entry).toBeDefined();
    expect(entry.request).toEqual({
      method: 'htr_getAddress',
      params: { type: 'index', index: 0 },
    });
    expect(entry.isDryRun).toBe(false);
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.response).toBeNull();
    expect(entry.error).toBeNull();
  });

  test('setSnapMethodResponse updates existing entry', () => {
    let state = snapMethodsReducer(
      initialState,
      setSnapMethodRequest({
        methodKey: 'getBalance',
        method: 'htr_getBalance',
        params: { tokens: ['00'] },
        isDryRun: false,
      }),
    );

    state = snapMethodsReducer(
      state,
      setSnapMethodResponse({
        methodKey: 'getBalance',
        response: { balances: [{ token: '00', available: 1000 }] },
        duration: 150,
      }),
    );

    const entry = state.methods['getBalance'];
    expect(entry.response).toEqual({ balances: [{ token: '00', available: 1000 }] });
    expect(entry.rawResponse).toEqual({ balances: [{ token: '00', available: 1000 }] });
    expect(entry.duration).toBe(150);
    expect(entry.error).toBeNull();
  });

  test('setSnapMethodError updates existing entry', () => {
    let state = snapMethodsReducer(
      initialState,
      setSnapMethodRequest({
        methodKey: 'sendTx',
        method: 'htr_sendTransaction',
        params: { outputs: [] },
        isDryRun: false,
      }),
    );

    state = snapMethodsReducer(
      state,
      setSnapMethodError({
        methodKey: 'sendTx',
        error: 'Insufficient funds',
        duration: 200,
      }),
    );

    const entry = state.methods['sendTx'];
    expect(entry.error).toBe('Insufficient funds');
    expect(entry.duration).toBe(200);
    expect(entry.response).toBeNull();
    expect(entry.rawResponse).toBeNull();
  });

  test('setSnapMethodResponse is no-op for non-existent key', () => {
    const state = snapMethodsReducer(
      initialState,
      setSnapMethodResponse({
        methodKey: 'nonexistent',
        response: {},
        duration: 100,
      }),
    );
    expect(state.methods['nonexistent']).toBeUndefined();
  });

  test('clearSnapMethodData removes entry', () => {
    let state = snapMethodsReducer(
      initialState,
      setSnapMethodRequest({
        methodKey: 'getNetwork',
        method: 'htr_getConnectedNetwork',
        params: null,
        isDryRun: false,
      }),
    );

    state = snapMethodsReducer(state, clearSnapMethodData({ methodKey: 'getNetwork' }));
    expect(state.methods['getNetwork']).toBeUndefined();
  });

  test('multiple methods can coexist independently', () => {
    let state = snapMethodsReducer(
      initialState,
      setSnapMethodRequest({
        methodKey: 'getAddress',
        method: 'htr_getAddress',
        params: { type: 'index', index: 0 },
        isDryRun: false,
      }),
    );

    state = snapMethodsReducer(
      state,
      setSnapMethodRequest({
        methodKey: 'getBalance',
        method: 'htr_getBalance',
        params: { tokens: ['00'] },
        isDryRun: true,
      }),
    );

    expect(Object.keys(state.methods)).toHaveLength(2);
    expect(state.methods['getAddress'].request?.method).toBe('htr_getAddress');
    expect(state.methods['getBalance'].request?.method).toBe('htr_getBalance');
    expect(state.methods['getBalance'].isDryRun).toBe(true);
  });

  test('setSnapMethodRequest overwrites previous entry for same key', () => {
    let state = snapMethodsReducer(
      initialState,
      setSnapMethodRequest({
        methodKey: 'getAddress',
        method: 'htr_getAddress',
        params: { type: 'index', index: 0 },
        isDryRun: false,
      }),
    );

    state = snapMethodsReducer(
      state,
      setSnapMethodResponse({
        methodKey: 'getAddress',
        response: { address: 'W123' },
        duration: 100,
      }),
    );

    // New request should clear previous response
    state = snapMethodsReducer(
      state,
      setSnapMethodRequest({
        methodKey: 'getAddress',
        method: 'htr_getAddress',
        params: { type: 'index', index: 1 },
        isDryRun: false,
      }),
    );

    expect(state.methods['getAddress'].response).toBeNull();
    expect(state.methods['getAddress'].request?.params).toEqual({ type: 'index', index: 1 });
  });
});
