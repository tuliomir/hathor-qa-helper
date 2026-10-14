/**
 * Tests for snap RPC response type constants
 *
 * These type numbers must match the RpcResponseTypes enum in hathor-rpc-handler.
 * The enum is 0-indexed and the order is:
 *   0=SendNanoContractTx, 1=SignWithAddress, 2=GetAddress, 3=GetBalance,
 *   4=GetConnectedNetwork, 5=GetUtxos, 6=CreateToken, 7=SignOracleData,
 *   8=SendTransaction, 9=CreateNanoContractCreateTokenTx, 10=ChangeNetwork,
 *   11=GetXpub, 12=GetWalletInformation
 */

import { describe, expect, test } from 'bun:test';
import { RpcResponseType } from '../src/constants/snap';

describe('RpcResponseType constants', () => {
  test('SendNanoContractTx is 0', () => {
    expect(RpcResponseType.SendNanoContractTx).toBe(0);
  });

  test('SignWithAddress is 1', () => {
    expect(RpcResponseType.SignWithAddress).toBe(1);
  });

  test('GetAddress is 2', () => {
    expect(RpcResponseType.GetAddress).toBe(2);
  });

  test('GetBalance is 3', () => {
    expect(RpcResponseType.GetBalance).toBe(3);
  });

  test('GetConnectedNetwork is 4', () => {
    expect(RpcResponseType.GetConnectedNetwork).toBe(4);
  });

  test('GetUtxos is 5', () => {
    expect(RpcResponseType.GetUtxos).toBe(5);
  });

  test('CreateToken is 6', () => {
    expect(RpcResponseType.CreateToken).toBe(6);
  });

  test('SignOracleData is 7', () => {
    expect(RpcResponseType.SignOracleData).toBe(7);
  });

  test('SendTransaction is 8', () => {
    expect(RpcResponseType.SendTransaction).toBe(8);
  });

  test('CreateNanoContractCreateTokenTx is 9', () => {
    expect(RpcResponseType.CreateNanoContractCreateTokenTx).toBe(9);
  });

  test('ChangeNetwork is 10', () => {
    expect(RpcResponseType.ChangeNetwork).toBe(10);
  });

  test('GetXpub is 11', () => {
    expect(RpcResponseType.GetXpub).toBe(11);
  });

  test('GetWalletInformation is 12', () => {
    expect(RpcResponseType.GetWalletInformation).toBe(12);
  });
});
