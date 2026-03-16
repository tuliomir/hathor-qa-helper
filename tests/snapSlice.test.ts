/**
 * Tests for snapSlice — Snap connection state management
 */

import { describe, expect, test } from 'bun:test';
import snapReducer, {
  setSnapConnected,
  setSnapOrigin,
  setSnapError,
  resetSnap,
  type SnapState,
} from '../src/store/slices/snapSlice';

const initialState: SnapState = {
  isConnected: false,
  snapOrigin: '',
  installedSnap: null,
  error: null,
};

describe('snapSlice', () => {
  test('returns initial state', () => {
    const state = snapReducer(undefined, { type: 'unknown' });
    expect(state).toEqual(initialState);
  });

  test('setSnapConnected sets connection info', () => {
    const state = snapReducer(
      initialState,
      setSnapConnected({
        installedSnap: { id: 'snap-id', version: '1.0.0' },
        snapOrigin: 'npm:@hathor/hathor-snap',
      }),
    );
    expect(state.isConnected).toBe(true);
    expect(state.installedSnap).toEqual({ id: 'snap-id', version: '1.0.0' });
    expect(state.snapOrigin).toBe('npm:@hathor/hathor-snap');
    expect(state.error).toBeNull();
  });

  test('setSnapConnected clears previous error', () => {
    const withError: SnapState = { ...initialState, error: 'some error' };
    const state = snapReducer(
      withError,
      setSnapConnected({
        installedSnap: { id: 'snap-id', version: '1.0.0' },
        snapOrigin: 'local:http://localhost:8080',
      }),
    );
    expect(state.error).toBeNull();
    expect(state.isConnected).toBe(true);
  });

  test('setSnapOrigin updates origin', () => {
    const state = snapReducer(initialState, setSnapOrigin('npm:@hathor/hathor-snap'));
    expect(state.snapOrigin).toBe('npm:@hathor/hathor-snap');
  });

  test('setSnapError sets error string', () => {
    const state = snapReducer(initialState, setSnapError('Connection failed'));
    expect(state.error).toBe('Connection failed');
  });

  test('resetSnap clears all connection state', () => {
    const connected: SnapState = {
      isConnected: true,
      snapOrigin: 'npm:@hathor/hathor-snap',
      installedSnap: { id: 'snap-id', version: '1.0.0' },
      error: null,
    };
    const state = snapReducer(connected, resetSnap());
    expect(state.isConnected).toBe(false);
    expect(state.installedSnap).toBeNull();
    expect(state.error).toBeNull();
    // snapOrigin is preserved (not cleared by reset)
    expect(state.snapOrigin).toBe('npm:@hathor/hathor-snap');
  });
});
