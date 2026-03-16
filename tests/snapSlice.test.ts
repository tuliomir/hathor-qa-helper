/**
 * Tests for snapSlice — Snap connection state management
 */

import { describe, expect, test } from 'bun:test';
import snapReducer, {
  setSnapConnected,
  setSnapOrigin,
  setSnapWalletInfo,
  setSnapError,
  resetSnap,
  type SnapState,
} from '../src/store/slices/snapSlice';

const initialState: SnapState = {
  isConnected: false,
  snapOrigin: '',
  installedSnap: null,
  error: null,
  address: null,
  network: null,
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

  test('setSnapWalletInfo stores address and network', () => {
    const state = snapReducer(
      initialState,
      setSnapWalletInfo({ address: 'WZ1abc', network: 'testnet' }),
    );
    expect(state.address).toBe('WZ1abc');
    expect(state.network).toBe('testnet');
  });

  test('resetSnap clears all connection state including wallet info', () => {
    const connected: SnapState = {
      isConnected: true,
      snapOrigin: 'npm:@hathor/hathor-snap',
      installedSnap: { id: 'snap-id', version: '1.0.0' },
      error: null,
      address: 'WZ1abc',
      network: 'testnet',
    };
    const state = snapReducer(connected, resetSnap());
    expect(state.isConnected).toBe(false);
    expect(state.installedSnap).toBeNull();
    expect(state.error).toBeNull();
    expect(state.address).toBeNull();
    expect(state.network).toBeNull();
    // snapOrigin is preserved (not cleared by reset)
    expect(state.snapOrigin).toBe('npm:@hathor/hathor-snap');
  });
});
