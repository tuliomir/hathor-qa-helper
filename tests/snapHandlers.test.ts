/**
 * Tests for snapHandlers — Snap method handler factory
 */

import { describe, expect, test } from 'bun:test';
import { createSnapHandlers } from '../src/services/snapHandlers';

// Mock invokeSnap that echoes back the request
const mockInvokeSnap = async (params: { method: string; params?: Record<string, unknown> }) => {
  return { echo: params };
};

describe('createSnapHandlers', () => {
  describe('dry-run mode', () => {
    const handlers = createSnapHandlers(mockInvokeSnap, true);

    test('getAddress with index type includes index param', async () => {
      const result = await handlers.getAddress('index', 0);
      expect(result.request).toEqual({ method: 'htr_getAddress', params: { type: 'index', index: 0 } });
      expect(result.response).toBeNull();
    });

    test('getAddress with first_empty type omits index param', async () => {
      const result = await handlers.getAddress('first_empty');
      expect(result.request).toEqual({ method: 'htr_getAddress', params: { type: 'first_empty' } });
      expect(result.response).toBeNull();
    });

    test('getAddress with client type omits index param', async () => {
      const result = await handlers.getAddress('client');
      expect(result.request).toEqual({ method: 'htr_getAddress', params: { type: 'client' } });
      expect(result.response).toBeNull();
    });

    test('getBalance returns request with null response', async () => {
      const result = await handlers.getBalance(['00']);
      expect(result.request).toEqual({ method: 'htr_getBalance', params: { tokens: ['00'] } });
      expect(result.response).toBeNull();
    });

    test('getConnectedNetwork returns request with no params', async () => {
      const result = await handlers.getConnectedNetwork();
      expect(result.request).toEqual({ method: 'htr_getConnectedNetwork' });
      expect(result.response).toBeNull();
    });

    test('sendTransaction returns request with null response', async () => {
      const outputs = [{ address: 'W123', value: '10' }];
      const result = await handlers.sendTransaction(outputs);
      expect(result.request.method).toBe('htr_sendTransaction');
      expect(result.response).toBeNull();
    });

    test('signWithAddress returns request with null response', async () => {
      const result = await handlers.signWithAddress('hello', 1);
      expect(result.request).toEqual({
        method: 'htr_signWithAddress',
        params: { message: 'hello', addressIndex: 1 },
      });
      expect(result.response).toBeNull();
    });

    test('changeNetwork returns request with null response', async () => {
      const result = await handlers.changeNetwork('testnet');
      expect(result.request).toEqual({
        method: 'htr_changeNetwork',
        params: { newNetwork: 'testnet' },
      });
      expect(result.response).toBeNull();
    });

    test('getXpub returns request with null response', async () => {
      const result = await handlers.getXpub('testnet');
      expect(result.request).toEqual({
        method: 'htr_getXpub',
        params: { network: 'testnet' },
      });
      expect(result.response).toBeNull();
    });

    test('getWalletInformation returns request with null response', async () => {
      const result = await handlers.getWalletInformation();
      expect(result.request).toEqual({ method: 'htr_getWalletInformation' });
      expect(result.response).toBeNull();
    });

    test('signOracleData returns request with null response', async () => {
      const result = await handlers.signOracleData('nc123', '1x0', 'WdcPHo');
      expect(result.request).toEqual({
        method: 'htr_signOracleData',
        params: { nc_id: 'nc123', data: '1x0', oracle: 'WdcPHo' },
      });
      expect(result.response).toBeNull();
    });
  });

  describe('live mode', () => {
    const handlers = createSnapHandlers(mockInvokeSnap, false);

    test('getAddress with index calls invokeSnap with index param', async () => {
      const result = await handlers.getAddress('index', 3);
      expect(result.request).toEqual({
        method: 'htr_getAddress',
        params: { type: 'index', index: 3 },
      });
      expect(result.response).toEqual({
        echo: { method: 'htr_getAddress', params: { type: 'index', index: 3 } },
      });
    });

    test('getAddress with first_empty calls invokeSnap without index', async () => {
      const result = await handlers.getAddress('first_empty');
      expect(result.request).toEqual({
        method: 'htr_getAddress',
        params: { type: 'first_empty' },
      });
      expect(result.response).toEqual({
        echo: { method: 'htr_getAddress', params: { type: 'first_empty' } },
      });
    });

    test('getAddress with client calls invokeSnap without index', async () => {
      const result = await handlers.getAddress('client');
      expect(result.request).toEqual({
        method: 'htr_getAddress',
        params: { type: 'client' },
      });
      expect(result.response).toEqual({
        echo: { method: 'htr_getAddress', params: { type: 'client' } },
      });
    });

    test('getBalance calls invokeSnap with tokens', async () => {
      const result = await handlers.getBalance(['00', 'abc123']);
      expect(result.response).toEqual({
        echo: { method: 'htr_getBalance', params: { tokens: ['00', 'abc123'] } },
      });
    });

    test('getConnectedNetwork calls invokeSnap with no params', async () => {
      const result = await handlers.getConnectedNetwork();
      expect(result.response).toEqual({
        echo: { method: 'htr_getConnectedNetwork' },
      });
    });

    test('getUtxos passes optional params', async () => {
      const result = await handlers.getUtxos({ token: '00', maxUtxos: 5 });
      expect(result.request).toEqual({
        method: 'htr_getUtxos',
        params: { token: '00', maxUtxos: 5 },
      });
    });

    test('getUtxos with empty params passes empty object', async () => {
      const result = await handlers.getUtxos();
      expect(result.request).toEqual({ method: 'htr_getUtxos', params: {} });
    });

    test('createToken passes full params', async () => {
      const params = { name: 'Test', symbol: 'TST', amount: '100', create_mint: false, create_melt: false };
      const result = await handlers.createToken(params);
      expect(result.request).toEqual({ method: 'htr_createToken', params });
    });

    test('sendNanoContractTx passes full params', async () => {
      const params = {
        nc_id: 'nc123',
        method: 'bet',
        actions: [{ type: 'deposit', token: '00', amount: '1' }],
        args: ['W123', '1x0'],
      };
      const result = await handlers.sendNanoContractTx(params);
      expect(result.request).toEqual({ method: 'htr_sendNanoContractTx', params });
    });

    test('createNanoContractCreateTokenTx passes full params', async () => {
      const params = {
        method: 'initialize',
        createTokenOptions: { name: 'Test', symbol: 'TST' },
        data: { blueprint_id: 'bp123', actions: [], args: [] },
      };
      const result = await handlers.createNanoContractCreateTokenTx(params);
      expect(result.request).toEqual({
        method: 'htr_createNanoContractCreateTokenTx',
        params,
      });
    });

    test('getXpub calls invokeSnap with network', async () => {
      const result = await handlers.getXpub('mainnet');
      expect(result.request).toEqual({
        method: 'htr_getXpub',
        params: { network: 'mainnet' },
      });
      expect(result.response).toEqual({
        echo: { method: 'htr_getXpub', params: { network: 'mainnet' } },
      });
    });

    test('getWalletInformation calls invokeSnap with no params', async () => {
      const result = await handlers.getWalletInformation();
      expect(result.request).toEqual({ method: 'htr_getWalletInformation' });
      expect(result.response).toEqual({
        echo: { method: 'htr_getWalletInformation' },
      });
    });
  });

  describe('error propagation', () => {
    const failingInvoke = async () => {
      throw new Error('MetaMask rejected');
    };
    const handlers = createSnapHandlers(failingInvoke, false);

    test('propagates invokeSnap errors', async () => {
      await expect(handlers.getAddress('index', 0)).rejects.toThrow('MetaMask rejected');
    });
  });
});
