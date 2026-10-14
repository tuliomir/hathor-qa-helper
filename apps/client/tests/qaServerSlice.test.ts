import { describe, expect, it } from 'bun:test';
import type { WalletSession } from '@qa-helper/shared/serverApi';
import reducer, {
  sessionLabelSet,
  sessionRemoved,
  sessionUpserted,
  sessionsFailed,
  sessionsLoaded,
  sessionsLoading,
  selectReadySessions,
  isSessionShieldedReady,
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
    expect(init()).toMatchObject({ sessions: [], status: 'idle', error: null, labels: {} });
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

  it('removes a session and its label', () => {
    let s = reducer(init(), sessionsLoaded([session('a')]));
    s = reducer(s, sessionLabelSet({ id: 'a', label: 'Test wallet 1' }));
    s = reducer(s, sessionRemoved('a'));
    expect(s.sessions).toEqual([]);
    expect(s.labels).toEqual({});
  });

  it('selects ready sessions only', () => {
    const s = reducer(
      init(),
      sessionsLoaded([session('a', { state: 'starting' }), session('b'), session('c', { state: 'error' })])
    );
    expect(selectReadySessions({ qaServer: s } as never).map((x) => x.id)).toEqual(['b']);
  });

  it('a ready session on a shielded network with a shielded address can create shielded outputs', () => {
    expect(isSessionShieldedReady(session('a'))).toBe(true);
    expect(isSessionShieldedReady(session('a', { state: 'starting' }))).toBe(false);
    expect(isSessionShieldedReady(session('a', { network: 'TESTNET', shieldedAddress0: null }))).toBe(false);
  });
});
