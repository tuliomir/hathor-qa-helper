import { describe, expect, test } from 'bun:test';
import { classifyRpcError } from '../src/utils/rpcOutcome';
import { RpcRunError } from '../src/services/rpcRun';
import { nanoTxProblems, signOracleDataProblems } from '../src/flows/nanoExpectations';
import { checkNanoTx, fetchContractBalance, waitForNanoTx } from '../src/utils/nanoTxConfirmation';

describe('classifyRpcError', () => {
  test('5002 with the mobile message is a valid rejection, wrapped or not', () => {
    const err = { code: 5002, message: 'Rejected by the user' };
    expect(classifyRpcError(err)).toEqual({
      kind: 'rejected',
      valid: true,
      code: 5002,
      message: 'Rejected by the user',
    });
    expect(classifyRpcError(new RpcRunError(err, 10))).toMatchObject({ kind: 'rejected', valid: true });
  });

  test('5002 with another message is a rejection to flag', () => {
    expect(classifyRpcError({ code: 5002, message: 'User said no' })).toMatchObject({ kind: 'rejected', valid: false });
  });

  test('anything else is an error, with its code when there is one', () => {
    expect(classifyRpcError({ code: 5004, message: 'boom' })).toEqual({ kind: 'error', code: 5004, message: 'boom' });
    expect(classifyRpcError(new Error('offline'))).toEqual({ kind: 'error', code: null, message: 'offline' });
  });
});

const ADDR = 'WewDeXWyvHP7jJTs7tjLoQfoB72LLxJQqN';
const NC = 'a'.repeat(64);
const tx = (header: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
  type: 0,
  response: { hash: 'b'.repeat(64), headers: [header], ...extra },
});

describe('nanoTxProblems', () => {
  const expected = { method: 'bet', headerId: NC, caller: ADDR, actionAmounts: ['1'] };

  test('accepts the QA_REOWN.md deposit response', () => {
    const header = {
      id: NC,
      method: 'bet',
      actions: [{ type: 1, amount: '1', tokenIndex: 0 }],
      address: { base58: ADDR },
    };
    expect(nanoTxProblems(tx(header), expected)).toEqual([]);
  });

  test('flags the tx hex a push_tx false request returns', () => {
    expect(nanoTxProblems({ type: 0, response: '0001ab' }, expected)).toEqual([
      'Got the tx hex instead of the pushed tx: push_tx was not honoured',
    ]);
  });

  test('flags a wrong method, contract, caller and amount', () => {
    const header = { id: 'c'.repeat(64), method: 'withdraw', actions: [{ amount: '2' }], address: { base58: 'Wx' } };
    expect(nanoTxProblems(tx(header), expected)).toHaveLength(4);
  });

  test('flags a wrong response type and a missing nano header', () => {
    expect(nanoTxProblems({ type: 3, response: { hash: 'b'.repeat(64), headers: [] } }, expected)).toEqual([
      'Expected response type 0, got 3',
      'The tx has no nano contract header',
    ]);
  });
});

describe('signOracleDataProblems', () => {
  const ok = {
    type: 7,
    response: { data: '1x0', signedData: { type: 'str', signature: 'abc123', value: 'Result_1' }, oracle: ADDR },
  };

  test('accepts the QA_REOWN.md response', () => {
    expect(signOracleDataProblems(ok, { data: 'Result_1', oracle: ADDR })).toEqual([]);
  });

  test('flags a signature over the wrong value', () => {
    expect(signOracleDataProblems(ok, { data: 'Result_2', oracle: ADDR })).toEqual([
      'Expected signedData.value "Result_2", got "Result_1"',
    ]);
  });
});

const node = 'https://node/v1a/';
const meta = (m: Record<string, unknown>) => async () => ({ success: true, meta: m });

describe('checkNanoTx', () => {
  test('is confirmed once a block has it and the contract ran it', async () => {
    expect(await checkNanoTx(node, 'h', meta({ first_block: 'blk', voided_by: [], nc_execution: 'success' }))).toEqual({
      state: 'confirmed',
      firstBlock: 'blk',
    });
  });

  test('is pending without a block, while the block runs it, or when the node lacks it', async () => {
    expect(await checkNanoTx(node, 'h', meta({ first_block: null, nc_execution: null }))).toEqual({ state: 'pending' });
    expect(await checkNanoTx(node, 'h', meta({ first_block: 'blk', nc_execution: 'pending' }))).toEqual({
      state: 'pending',
    });
    expect(await checkNanoTx(node, 'h', async () => ({ success: false, message: 'Transaction not found' }))).toEqual({
      state: 'pending',
    });
  });

  test('fails when voided or when the contract failed to run it', async () => {
    expect((await checkNanoTx(node, 'h', meta({ voided_by: ['v'] }))).state).toBe('failed');
    expect((await checkNanoTx(node, 'h', meta({ first_block: 'blk', nc_execution: 'failure' }))).state).toBe('failed');
  });
});

describe('waitForNanoTx', () => {
  test('polls until confirmed, retrying failed polls', async () => {
    const answers: (() => Promise<unknown>)[] = [
      async () => {
        throw new Error('network');
      },
      meta({ first_block: null }),
      meta({ first_block: 'blk', nc_execution: 'success' }),
    ];
    const result = await waitForNanoTx(node, 'h', { get: () => answers.shift()!(), sleep: async () => {} });
    expect(result).toEqual({ state: 'confirmed', firstBlock: 'blk' });
  });

  test('times out, and stops when aborted', async () => {
    let t = 0;
    const pending = meta({ first_block: null });
    expect(
      await waitForNanoTx(node, 'h', {
        get: pending,
        sleep: async () => {},
        now: () => (t += 1000),
        timeoutMs: 3000,
      })
    ).toEqual({ state: 'timeout' });
    expect(await waitForNanoTx(node, 'h', { get: pending, shouldAbort: () => true })).toEqual({ state: 'aborted' });
  });
});

describe('fetchContractBalance', () => {
  test('reads the token balance from the contract state', async () => {
    const urls: string[] = [];
    const get = async (url: string) => {
      urls.push(url);
      return { success: true, balances: { '00': { value: '0', can_mint: false, can_melt: false } } };
    };
    expect(await fetchContractBalance(node, NC, '00', get)).toBe(0n);
    expect(urls).toEqual([`${node}nano_contract/state?id=${NC}&balances[]=00`]);
  });

  test('throws when the node cannot answer', async () => {
    await expect(
      fetchContractBalance(node, NC, '00', async () => ({ success: false, message: 'nope' }))
    ).rejects.toThrow('nope');
  });
});
