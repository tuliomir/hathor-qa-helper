import { describe, expect, it } from 'bun:test';
import { inspectFullnodeTx, normalizeOpenings, type FullnodeTx } from '../src/utils/shieldedTx';

const TX: FullnodeTx = {
  hash: 'aa',
  timestamp: 1792001419,
  inputs: [
    { tx_id: 'p0', index: 1, type: 'shielded', mode: 1, decoded: { address: 'Win' }, token_data: 0 },
    { tx_id: 'p1', index: 0, value: 50, decoded: { address: 'Win2' }, token_data: 0 },
  ],
  outputs: [{ value: 998, token_data: 0, decoded: { address: 'Wout' } }],
  shielded_outputs: [
    {
      type: 'shielded',
      mode: 1,
      commitment: 'c1',
      range_proof: 'x'.repeat(100),
      token_data: 0,
      decoded: { address: 'Ws1' },
    },
    { type: 'shielded', mode: 2, commitment: 'c2', range_proof: 'y', decoded: { address: 'Ws2' } },
  ],
  tokens: [],
};

describe('inspectFullnodeTx', () => {
  it('lists transparent then shielded outputs with absolute indexes', () => {
    const r = inspectFullnodeTx(TX);
    expect(r.outputs.map((o) => [o.index, o.privacy, o.address])).toEqual([
      [0, 'TRANSPARENT', 'Wout'],
      [1, 'AMOUNT_SHIELDED', 'Ws1'],
      [2, 'FULLY_SHIELDED', 'Ws2'],
    ]);
    expect(r.shieldedCount).toBe(2);
    expect(r.outputCount).toBe(3);
  });

  it('shows transparent values and tokens, hides shielded ones until unblinded', () => {
    const r = inspectFullnodeTx(TX);
    expect(r.outputs[0]).toMatchObject({ value: 998n, token: '00', decryptedBy: [] });
    expect(r.outputs[1]).toMatchObject({ value: null, token: '00' });
    // Fully shielded hides the token too.
    expect(r.outputs[2]).toMatchObject({ value: null, token: null });
  });

  it('fills decrypted values from openings and records who decrypted them', () => {
    const r = inspectFullnodeTx(TX, {
      server: { outputs: [{ index: 2, value: 300n, token: '00', vbf: 'v', abf: 'a' }], inputs: [] },
      client: {
        outputs: [{ index: 1, value: 10n, token: '00', vbf: 'v' }],
        inputs: [{ index: 0, value: 1000n, token: '00', vbf: 'v' }],
      },
    });
    expect(r.outputs[1]).toMatchObject({ value: 10n, decryptedBy: ['client'] });
    expect(r.outputs[2]).toMatchObject({ value: 300n, token: '00', decryptedBy: ['server'] });
    expect(r.inputs[0]).toMatchObject({ shielded: true, value: 1000n, decryptedBy: ['client'] });
    expect(r.inputs[1]).toMatchObject({ shielded: false, value: 50n });
    expect(r.hiddenCount).toBe(0);
  });

  it('counts hidden amounts', () => {
    expect(inspectFullnodeTx(TX).hiddenCount).toBe(3);
  });

  it('maps token_data to the tx token list', () => {
    const r = inspectFullnodeTx({
      ...TX,
      outputs: [{ value: 1, token_data: 1, decoded: { address: 'W' } }],
      shielded_outputs: [],
      tokens: [{ uid: 'tok1' }],
    });
    expect(r.outputs[0].token).toBe('tok1');
  });

  it('summarises shielded outputs without the range proof', () => {
    const r = inspectFullnodeTx(TX);
    expect(r.outputs[1].commitment).toEqual({ mode: 1, commitment: 'c1', range_proof: '100 chars', token_data: 0 });
  });
});

describe('normalizeOpenings', () => {
  it('reads stringified values from the server', () => {
    const o = normalizeOpenings({ outputs: [{ index: 1, value: '25', token: '00', vbf: 'v' }], inputs: [] });
    expect(o.outputs[0].value).toBe(25n);
  });

  it('tolerates a missing or odd body', () => {
    expect(normalizeOpenings(null)).toEqual({ outputs: [], inputs: [] });
    expect(normalizeOpenings({ outputs: 'x' })).toEqual({ outputs: [], inputs: [] });
  });
});
