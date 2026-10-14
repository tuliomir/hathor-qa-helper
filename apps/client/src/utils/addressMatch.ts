/**
 * RPC stages that derive addresses from the test wallet need the wallet
 * on the other end of the session to be that same wallet.
 */

import type { Requirement } from './requirements';

/** Null until both addresses are known; compares address 0 of each side. */
export function addressMatchRequirement(
  connectedAddress: string | null,
  testWalletAddress: string | null,
  fixTo: string
): Requirement | null {
  if (!connectedAddress || !testWalletAddress) return null;
  const base = { id: 'address-match', short: 'Address match' };
  return connectedAddress.toLowerCase() === testWalletAddress.toLowerCase()
    ? { ...base, met: true, label: 'Connected wallet is the test wallet' }
    : {
        ...base,
        met: false,
        label: 'Connected wallet is not the test wallet',
        action: 'Connect the test wallet over RPC',
        fix: { label: 'Reconnect', to: fixTo },
      };
}
