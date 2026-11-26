import { describe, expect, test } from 'bun:test';
import { isRecordedAction } from '../src/services/debugLog';

describe('debug log action filter', () => {
  test('records flow, session, network and wallet lifecycle actions', () => {
    for (const type of [
      'flowRun/flowStepStatusChanged',
      'walletConnect/sessionConnected',
      'network/setPreferredNetwork',
      'walletSelection/setTestWallet',
      'walletStore/updateWalletStatus',
      'walletStore/startWallet/rejected',
      'qaServer/signerFailed',
      'rpc/setDryRunMode',
    ])
      expect([type, isRecordedAction(type)]).toEqual([type, true]);
  });

  test('records RPC requests and answers from any method slice', () => {
    expect(isRecordedAction('sendTransaction/setResponse')).toBe(true);
    expect(isRecordedAction('betDeposit/setRequest')).toBe(true);
    expect(isRecordedAction('getAddress/setError')).toBe(true);
  });

  test('leaves out polling and per-keystroke noise', () => {
    for (const type of [
      'walletStore/updateWalletBalance',
      'walletStore/addWalletEvent',
      'walletStore/refreshWalletBalance/fulfilled',
      'qaServer/sessionsLoaded',
      'helperServer/statusChanged',
      'toast/addToast',
    ])
      expect([type, isRecordedAction(type)]).toEqual([type, false]);
  });
});
