import { describe, expect, it } from 'bun:test';
import { newOutputRow } from '../src/utils/outputRows';
import {
  CHANGE_MODE_OPTIONS,
  SHIELDED_PRESETS,
  applyShieldedPreset,
  buildShieldedSendRequest,
} from '../src/utils/shieldedSend';

const SELF = { legacyAddress: 'WLegacy', shieldedAddress: 'K3Shielded' };

describe('buildShieldedSendRequest', () => {
  it('maps rows through toSendOutputs and omits the change mode when automatic', () => {
    const rows = [newOutputRow({ address: ' K3a ', value: '100', privacy: 'AMOUNT_SHIELDED' })];
    expect(buildShieldedSendRequest(rows, 'AUTO')).toEqual({
      outputs: [{ address: 'K3a', value: '100', token: '00', shielded: 'AMOUNT_SHIELDED' }],
    });
  });

  it('passes an explicit change mode, including TRANSPARENT', () => {
    const rows = [newOutputRow({ address: 'W1', value: '5' })];
    expect(buildShieldedSendRequest(rows, 'TRANSPARENT').changeShieldedMode).toBe('TRANSPARENT');
    expect(buildShieldedSendRequest(rows, 'FULLY_SHIELDED').changeShieldedMode).toBe('FULLY_SHIELDED');
  });

  it('throws with every invalid row', () => {
    const rows = [newOutputRow({ address: '', value: '1' }), newOutputRow({ address: 'W', value: '' })];
    expect(() => buildShieldedSendRequest(rows, 'AUTO')).toThrow(
      'Output 1: recipient address missing; Output 2: amount missing'
    );
  });

  it('offers automatic plus the three contract change modes', () => {
    expect(CHANGE_MODE_OPTIONS.map((o) => o.value)).toEqual([
      'AUTO',
      'AMOUNT_SHIELDED',
      'FULLY_SHIELDED',
      'TRANSPARENT',
    ]);
  });
});

describe('applyShieldedPreset', () => {
  it('has the four QA flows', () => {
    expect(SHIELDED_PRESETS.map((p) => p.id)).toEqual([
      'shield-amount',
      'shield-full',
      'unshield',
      'shielded-to-shielded',
    ]);
  });

  it('transparent to amount-shielded: one amount-shielded output to the shielded address', () => {
    const { rows, changeMode } = applyShieldedPreset('shield-amount', { ...SELF, value: '100' });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ address: 'K3Shielded', value: '100', privacy: 'AMOUNT_SHIELDED', token: '00' });
    expect(changeMode).toBe('AUTO');
  });

  it('transparent to fully-shielded', () => {
    const { rows } = applyShieldedPreset('shield-full', { ...SELF, value: '100' });
    expect(rows[0]).toMatchObject({ address: 'K3Shielded', privacy: 'FULLY_SHIELDED' });
  });

  it('unshield: a transparent output to the legacy address', () => {
    const { rows, changeMode } = applyShieldedPreset('unshield', { ...SELF, value: '50' });
    expect(rows[0]).toMatchObject({ address: 'WLegacy', value: '50', privacy: 'TRANSPARENT' });
    expect(changeMode).toBe('AUTO');
  });

  it('shielded to shielded keeps the change shielded', () => {
    const { rows, changeMode } = applyShieldedPreset('shielded-to-shielded', { ...SELF, value: '10' });
    expect(rows[0]).toMatchObject({ address: 'K3Shielded', privacy: 'AMOUNT_SHIELDED' });
    expect(changeMode).toBe('AMOUNT_SHIELDED');
  });

  it('leaves the address empty when it is unknown', () => {
    const { rows } = applyShieldedPreset('shield-amount', { legacyAddress: 'W', shieldedAddress: null, value: '1' });
    expect(rows[0].address).toBe('');
  });

  it('builds a valid request from every preset', () => {
    for (const p of SHIELDED_PRESETS) {
      const { rows, changeMode } = applyShieldedPreset(p.id, { ...SELF, value: '1' });
      expect(() => buildShieldedSendRequest(rows, changeMode)).not.toThrow();
    }
  });
});
