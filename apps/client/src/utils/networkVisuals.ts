/**
 * Channel colours per network kind (docs/design/direction.md, "Network
 * indicator"). Full class strings so Tailwind's JIT can see them.
 */

import type { CSSProperties } from 'react';
import type { NetworkKind } from '../constants/network';

/** Diagonal hatch over the solid shielded channel colour (rail, chip dot). */
export const VEIL_ON_SOLID: CSSProperties = {
  backgroundImage: 'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.38) 0 2px, transparent 2px 6px)',
};

export const NETWORK_TEXT_CLASS: Record<NetworkKind, string> = {
  test: 'text-net-testnet',
  'shielded-test': 'text-net-shielded',
  main: 'text-net-mainnet',
};

export const NETWORK_BORDER_CLASS: Record<NetworkKind, string> = {
  test: 'border-net-testnet',
  'shielded-test': 'border-net-shielded',
  main: 'border-net-mainnet',
};

export const NETWORK_FILL_CLASS: Record<NetworkKind, string> = {
  test: 'bg-net-testnet',
  'shielded-test': 'bg-net-shielded',
  main: 'bg-net-mainnet',
};
