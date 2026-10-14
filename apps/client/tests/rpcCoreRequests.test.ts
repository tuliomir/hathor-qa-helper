import { describe, expect, test } from 'bun:test';
import {
  buildGetAddressRequest,
  buildGetBalanceRequest,
  buildGetUtxosRequest,
  buildCreateTokenRequest,
  buildSignOracleDataRequest,
  oracleSignatureOf,
  toFilterNumber,
  unwrapResponse,
} from '../src/utils/rpcCoreRequests';

describe('buildGetAddressRequest', () => {
  test('adds the index only for type index', () => {
    expect(buildGetAddressRequest('index', 3).params).toEqual({ network: 'testnet', type: 'index', index: 3 });
    expect(buildGetAddressRequest('first_empty', 3).params).toEqual({ network: 'testnet', type: 'first_empty' });
    expect(buildGetAddressRequest('client', 0).params).toEqual({ network: 'testnet', type: 'client' });
  });
});

describe('buildGetBalanceRequest', () => {
  test('drops blank token uids', () => {
    expect(buildGetBalanceRequest(['00', ' ', 'abc']).params).toEqual({ network: 'testnet', tokens: ['00', 'abc'] });
  });
});

describe('buildGetUtxosRequest', () => {
  const base = { tokenUid: '00', maxUtxos: 10, amountSmallerThan: '', amountBiggerThan: '' };

  test('omits empty filters', () => {
    expect(buildGetUtxosRequest(base)).toEqual({
      method: 'htr_getUtxos',
      params: { network: 'testnet', token: '00', maxUtxos: 10 },
    });
  });

  test('sends filters as numbers, including zero', () => {
    expect(buildGetUtxosRequest({ ...base, amountSmallerThan: '500', amountBiggerThan: '0' }).params).toEqual({
      network: 'testnet',
      token: '00',
      maxUtxos: 10,
      amountSmallerThan: 500,
      amountBiggerThan: 0,
    });
  });
});

describe('toFilterNumber', () => {
  test('empty is no filter', () => {
    expect(toFilterNumber('')).toBeNull();
    expect(toFilterNumber('12')).toBe(12);
  });
});

describe('unwrapResponse', () => {
  test('unwraps type-tagged responses', () => {
    expect(unwrapResponse({ type: 12, response: { network: 'testnet' } })).toEqual({ network: 'testnet' });
    expect(unwrapResponse({ type: 3, response: [1, 2] })).toEqual([1, 2]);
  });

  test('passes plain objects through and rejects non-objects', () => {
    expect(unwrapResponse({ address: 'H1' })).toEqual({ address: 'H1' });
    expect(unwrapResponse(null)).toBeNull();
    expect(unwrapResponse('x')).toBeNull();
  });
});

describe('oracleSignatureOf', () => {
  test('reads signedData.signature or a signedData string, wrapped or not', () => {
    expect(oracleSignatureOf({ type: 9, response: { signedData: { signature: 'abc' } } })).toBe('abc');
    expect(oracleSignatureOf({ signedData: { signature: 'def' } })).toBe('def');
    expect(oracleSignatureOf({ response: { signedData: 'ghi' } })).toBe('ghi');
    expect(oracleSignatureOf({ response: {} })).toBeNull();
    expect(oracleSignatureOf(null)).toBeNull();
  });
});

describe('buildSignOracleDataRequest', () => {
  test('mirrors the handler params', () => {
    expect(buildSignOracleDataRequest('nc', 'WAddr', 'Result_1')).toEqual({
      method: 'htr_signOracleData',
      params: { network: 'testnet', nc_id: 'nc', data: 'Result_1', oracle: 'WAddr' },
    });
  });
});

describe('buildCreateTokenRequest', () => {
  const base = {
    name: 'Test Token',
    symbol: 'TST',
    amount: '100',
    version: '' as const,
    change_address: '',
    create_mint: true,
    mint_authority_address: '',
    allow_external_mint_authority_address: false,
    create_melt: false,
    melt_authority_address: '',
    allow_external_melt_authority_address: false,
    data: [],
  };

  test('sends only the required fields by default', () => {
    expect(buildCreateTokenRequest(base).params).toEqual({
      network: 'testnet',
      name: 'Test Token',
      symbol: 'TST',
      amount: '100',
      create_mint: true,
      create_melt: false,
    });
  });

  test('adds optional fields when set and drops blank data', () => {
    const params = buildCreateTokenRequest({
      ...base,
      version: 'fee',
      change_address: 'WChange',
      mint_authority_address: ' ',
      melt_authority_address: 'WMelt',
      allow_external_melt_authority_address: true,
      data: ['a', ' ', 'b'],
    }).params;
    expect(params).toEqual({
      network: 'testnet',
      name: 'Test Token',
      symbol: 'TST',
      amount: '100',
      create_mint: true,
      create_melt: false,
      version: 'fee',
      change_address: 'WChange',
      melt_authority_address: 'WMelt',
      allow_external_melt_authority_address: true,
      data: ['a', 'b'],
    });
  });
});
