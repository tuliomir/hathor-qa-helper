/**
 * NetworkSwatch — the network's channel colour as a small dot, for menus
 * that list networks.
 */

import { NETWORK_CONFIG, type NetworkKey } from '../../constants/network';
import { NETWORK_FILL_CLASS, VEIL_ON_SOLID } from '../../utils/networkVisuals';

export default function NetworkSwatch({ network }: { network: NetworkKey }) {
  const { kind } = NETWORK_CONFIG[network];
  return (
    <span
      aria-hidden="true"
      className={`w-3 h-3 rounded-full flex-none ${NETWORK_FILL_CLASS[kind]}`}
      style={kind === 'shielded-test' ? VEIL_ON_SOLID : undefined}
    />
  );
}
