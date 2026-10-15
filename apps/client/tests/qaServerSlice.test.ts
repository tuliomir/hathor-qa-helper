import { describe, expect, it } from 'bun:test';
import type { WalletSession } from '@qa-helper/shared/serverApi';
import reducer, {
  sessionOwnerSet,
  sessionRemoved,
  sessionUpserted,
  sessionsFailed,
  sessionsLoaded,
  sessionsLoading,
  signerBusy,
  signerFailed,
  signerForWallet,
  signerRetry,
} from '../src/store/slices/qaServerSlice';

const session = (id: string, patch: Partial<WalletSession> = {}): WalletSession => ({
  id,
  network: 'SHIELDED_TESTNET',
  state: 'ready',
  capability: { level: 'full', reason: null, canReceive: true, canSpend: true, historyComplete: true },
  legacyAddress0: id,
  shieldedAddress0: `K3${id}`,
  ...patch,
});

const init = () => reducer(undefined, { type: '@@init' });

describe('qaServerSlice', () => {
  it('starts empty and idle', () => {
    expect(init()).toMatchObject({ sessions: [], status: 'idle', error: null, owners: {}, busy: [], failures: {} });
  });

  it('loads sessions and clears the error', () => {
    let s = reducer(init(), sessionsFailed({ status: 0, code: 'UNREACHABLE', message: 'x' }));
    s = reducer(s, sessionsLoading());
    expect(s.status).toBe('loading');
    s = reducer(s, sessionsLoaded([session('a'), session('b')]));
    expect(s.status).toBe('loaded');
    expect(s.error).toBeNull();
    expect(s.sessions.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('keeps the last list when a refresh fails', () => {
    let s = reducer(init(), sessionsLoaded([session('a')]));
    s = reducer(s, sessionsFailed({ status: 0, code: 'UNREACHABLE', message: 'down' }));
    expect(s.status).toBe('error');
    expect(s.error?.code).toBe('UNREACHABLE');
    expect(s.sessions).toHaveLength(1);
  });

  it('upserts in place and appends new sessions', () => {
    let s = reducer(init(), sessionsLoaded([session('a', { state: 'starting' }), session('b')]));
    s = reducer(s, sessionUpserted(session('a', { state: 'ready' })));
    s = reducer(s, sessionUpserted(session('c')));
    expect(s.sessions.map((x) => `${x.id}:${x.state}`)).toEqual(['a:ready', 'b:ready', 'c:ready']);
  });

  it('removes a session and its owner', () => {
    let s = reducer(init(), sessionsLoaded([session('a')]));
    s = reducer(s, sessionOwnerSet({ sessionId: 'a', walletId: 'w1' }));
    s = reducer(s, sessionRemoved('a'));
    expect(s.sessions).toEqual([]);
    expect(s.owners).toEqual({});
  });
});

describe('signerForWallet', () => {
  it('is off without a session', () => {
    expect(signerForWallet(init(), 'w1')).toEqual({ state: 'off', session: null, error: null });
  });

  it('is starting while a start is in flight', () => {
    const s = reducer(init(), signerBusy({ walletId: 'w1', busy: true }));
    expect(signerForWallet(s, 'w1').state).toBe('starting');
  });

  it('follows the owned session, or the one whose id is the wallet address 0', () => {
    let s = reducer(init(), sessionsLoaded([session('a', { state: 'starting' }), session('b')]));
    s = reducer(s, sessionOwnerSet({ sessionId: 'a', walletId: 'w1' }));
    expect(signerForWallet(s, 'w1').state).toBe('starting');
    expect(signerForWallet(s, 'w2', 'b')).toMatchObject({ state: 'ready', session: { id: 'b' } });
  });

  it('reports a failed start until retried, and a session in error', () => {
    let s = reducer(init(), signerFailed({ walletId: 'w1', error: 'unreachable' }));
    expect(signerForWallet(s, 'w1')).toMatchObject({ state: 'error', error: 'unreachable' });
    s = reducer(s, signerRetry('w1'));
    expect(signerForWallet(s, 'w1').state).toBe('off');
    s = reducer(s, sessionsLoaded([session('a', { state: 'error', error: 'boom' })]));
    expect(signerForWallet(s, 'w1', 'a')).toMatchObject({ state: 'error', error: 'boom' });
  });
});
