/**
 * The nano contract request builders feed the live preview and dry run
 * without a session, so they must match what rpcHandlers sends.
 */

import { describe, expect, test } from 'bun:test';
import {
  buildBetDepositRequest,
  buildBetWithdrawRequest,
  buildFeeDepositRequest,
  buildFeeInitializeRequest,
  buildFeeWithdrawRequest,
  buildInitializeBetRequest,
  buildSetBetResultRequest,
} from '../src/utils/nanoRpcRequests';
import { getOracleBuffer } from '../src/utils/betHelpers';

const ADDR = 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN';
const NC = '0000a3f1aa2b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d';
const BP = '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595';
const TOKEN = '00000000b8c1c7f5e3b5a6d2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2';

// rpcHandlers pulls in walletConnect constants, which read window.location.
// @ts-expect-error - minimal window for the test environment
globalThis.window ??= { location: { origin: 'http://localhost:5173' } };
const { createRpcHandlers } = await import('../src/services/rpcHandlers');

// dryRun keeps the client untouched; the handler only checks it exists.
const handlers = createRpcHandlers({
  client: {} as never,
  session: { topic: 't' } as never,
  dryRun: true,
});

describe('nano contract request builders match rpcHandlers', () => {
  test('initialize bet', async () => {
    const deadline = new Date('2030-01-01T00:00:00Z');
    const { request } = await handlers.getRpcInitializeBet(BP, ADDR, TOKEN, deadline, true);
    expect(
      buildInitializeBetRequest({
        blueprintId: BP,
        oracleScript: getOracleBuffer(ADDR),
        token: TOKEN,
        timestamp: Math.floor(deadline.getTime() / 1000),
        pushTx: true,
      })
    ).toEqual(request);
  });

  test('bet deposit', async () => {
    const { request } = await handlers.getRpcBetDeposit(NC, 'Result_1', 150, ADDR, '00', false);
    expect(
      buildBetDepositRequest({
        ncId: NC,
        betChoice: 'Result_1',
        amount: 150,
        address: ADDR,
        token: '00',
        pushTx: false,
      })
    ).toEqual(request);
  });

  test('set bet result', async () => {
    const { request } = await handlers.getRpcSetBetResult(NC, ADDR, 'Result_1', 'abcd', true);
    expect(buildSetBetResultRequest({ ncId: NC, result: 'Result_1', oracleSignature: 'abcd', pushTx: true })).toEqual(
      request
    );
  });

  test('set bet result without a signature uses the placeholder', async () => {
    const { request } = await handlers.getRpcSetBetResult(NC, ADDR, 'Result_1', '', false);
    expect(buildSetBetResultRequest({ ncId: NC, result: 'Result_1', oracleSignature: '', pushTx: false })).toEqual(
      request
    );
  });

  test('bet withdraw', async () => {
    const { request } = await handlers.getRpcBetWithdraw(NC, ADDR, 300, '00', true);
    expect(buildBetWithdrawRequest({ ncId: NC, address: ADDR, amount: 300, token: '00', pushTx: true })).toEqual(
      request
    );
  });

  test('fee initialize', async () => {
    const { request } = await handlers.getRpcFeeInitialize(BP, '200', ADDR, false);
    expect(buildFeeInitializeRequest({ blueprintId: BP, amount: '200', changeAddress: ADDR, pushTx: false })).toEqual(
      request
    );
  });

  for (const contractPaysFees of [false, true]) {
    test(`fee deposit (contract pays fees: ${contractPaysFees})`, async () => {
      const { request } = await handlers.getRpcFeeDeposit(NC, TOKEN, '500', ADDR, true, contractPaysFees, '3');
      expect(
        buildFeeDepositRequest({
          ncId: NC,
          feeToken: TOKEN,
          amount: '500',
          changeAddress: ADDR,
          pushTx: true,
          contractPaysFees,
          htrWithdrawAmount: '3',
        })
      ).toEqual(request);
    });

    test(`fee withdraw (contract pays fees: ${contractPaysFees})`, async () => {
      const { request } = await handlers.getRpcFeeWithdraw(NC, TOKEN, '10', ADDR, false, contractPaysFees, '1');
      expect(
        buildFeeWithdrawRequest({
          ncId: NC,
          feeToken: TOKEN,
          amount: '10',
          address: ADDR,
          pushTx: false,
          contractPaysFees,
          htrWithdrawAmount: '1',
        })
      ).toEqual(request);
    });
  }
});
