import { describe, expect, test } from 'bun:test';
import { describeStartError, walletRuntimeView } from '../src/utils/walletRuntimeView';

describe('walletRuntimeView', () => {
  test('a stopped wallet offers start and is not live', () => {
    expect(walletRuntimeView({ status: 'idle' })).toMatchObject({
      label: 'Stopped',
      tone: 'idle',
      action: 'start',
      isLive: false,
      detail: null,
    });
  });

  test('a failed start says so, explains why, and offers a retry', () => {
    const view = walletRuntimeView({ status: 'error', error: 'timeout of 10000ms exceeded' });
    expect(view).toMatchObject({ label: 'Failed to start', tone: 'error', action: 'start', isLive: false });
    expect(view.detail).toBe("Full node didn't answer within 10s");
    expect(view.rawError).toBe('timeout of 10000ms exceeded');
  });

  test('starting wallets are live but can only be force-stopped', () => {
    expect(walletRuntimeView({ status: 'connecting' })).toMatchObject({ action: 'force-stop', isLive: true });
    expect(walletRuntimeView({ status: 'syncing' })).toMatchObject({ action: 'force-stop', isLive: true });
  });

  test('a ready wallet offers stop', () => {
    expect(walletRuntimeView({ status: 'ready' })).toMatchObject({ label: 'Ready', action: 'stop', isLive: true });
  });

  test('address-only wallets have no runtime and no action', () => {
    expect(walletRuntimeView({ status: 'address-only' })).toMatchObject({
      label: 'Address only',
      tone: 'info',
      action: 'none',
      isLive: false,
    });
  });

  test('a stale error is ignored once the wallet left the error state', () => {
    expect(walletRuntimeView({ status: 'ready', error: 'old failure' }).detail).toBeNull();
  });
});

describe('describeStartError', () => {
  test('rewrites the common network failures', () => {
    expect(describeStartError('timeout of 30000ms exceeded')).toBe("Full node didn't answer within 30s");
    expect(describeStartError('Network Error')).toBe("Couldn't reach the full node");
  });

  test('passes anything else through', () => {
    expect(describeStartError('Invalid seed phrase: bad word')).toBe('Invalid seed phrase: bad word');
  });
});
