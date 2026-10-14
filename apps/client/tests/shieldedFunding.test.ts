import { describe, expect, test } from 'bun:test';
import { fundRequirements } from '../src/utils/shieldedFunding';
import { firstUnmetReason } from '../src/utils/requirements';

const session = { network: 'SHIELDED_TESTNET' as const };
const fromShielded = { network: 'SHIELDED_TESTNET' as const };
const fromTestnet = { network: 'TESTNET' as const };

describe('fundRequirements', () => {
  test('all met when server, session, same-network wallet and amount are present', () => {
    const reqs = fundRequirements({ online: true, session, from: fromShielded, amount: '100' });
    expect(firstUnmetReason(reqs)).toBeNull();
  });

  test('blocks a client wallet on another network', () => {
    // TESTNET and SHIELDED_TESTNET share address encoding, so a mismatched
    // send would succeed on the wrong chain and never fund the session.
    const reqs = fundRequirements({ online: true, session, from: fromTestnet, amount: '100' });
    expect(reqs.find((r) => r.id === 'network')?.met).toBe(false);
    expect(firstUnmetReason(reqs)).toContain('Shielded testnet');
  });

  test.each([
    ['empty', ''],
    ['zero', '0'],
    ['non-numeric', '1.5'],
  ])('blocks a %s amount', (_name, amount) => {
    const reqs = fundRequirements({ online: true, session, from: fromShielded, amount });
    expect(reqs.find((r) => r.id === 'amount')?.met).toBe(false);
  });

  test('reports missing server, session and wallet', () => {
    const reqs = fundRequirements({ online: false, session: null, from: null, amount: '100' });
    expect(reqs.filter((r) => r.met === false).map((r) => r.id)).toEqual(['server', 'session', 'from']);
  });
});
