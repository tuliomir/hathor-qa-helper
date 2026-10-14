import { describe, expect, it } from 'bun:test';
import { stageHeading } from '../src/utils/stageHeading';

describe('stageHeading', () => {
  it('reads title, description and breadcrumb from the registry', () => {
    const h = stageHeading('rpc-connection');
    expect(h.title).toBe('Connection');
    expect(h.description).toBe('Connect to wallet via WalletConnect and configure RPC options');
    expect(h.groupTitle).toBe('RPC requests');
    expect(h.groupFirstStageId).toBe('rpc-connection');
  });

  it('uses the family title in the breadcrumb, not its key', () => {
    expect(stageHeading('rpc-connection').familyTitle).toBe('WalletConnect RPC');
    expect(stageHeading('rpc-connection').familyChip).toBe('RPC');
  });

  it('falls back to the id for an unknown stage', () => {
    const h = stageHeading('nope' as never);
    expect(h.title).toBe('nope');
    expect(h.groupTitle).toBeUndefined();
    expect(h.familyTitle).toBeUndefined();
  });
});
