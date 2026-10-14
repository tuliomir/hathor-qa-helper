/**
 * NetworkRail
 *
 * Full-width strip in the active network's channel colour: a 3px teal line on
 * Testnet, a 4px hatched violet line on Shielded testnet, a 22px red band with
 * a caption on Mainnet. Also prefixes the tab title with "[Mainnet]".
 * Decorative: the network switcher carries the accessible name.
 */

import { useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectActiveNetworkKind } from '../../store/slices/networkSlice';
import { NETWORK_FILL_CLASS, VEIL_ON_SOLID } from '../../utils/networkVisuals';

const MAINNET_TITLE_PREFIX = '[Mainnet] ';

const HEIGHT_CLASS = {
  test: 'h-[3px]',
  'shielded-test': 'h-1',
  main: 'h-[22px] flex items-center justify-center text-caption font-bold text-error-content',
} as const;

export default function NetworkRail() {
  const kind = useAppSelector(selectActiveNetworkKind);

  useEffect(() => {
    const base = document.title.replace(MAINNET_TITLE_PREFIX, '');
    document.title = kind === 'main' ? MAINNET_TITLE_PREFIX + base : base;
  }, [kind]);

  return (
    <div
      aria-hidden="true"
      data-testid="network-rail"
      data-network-kind={kind}
      className={`w-full flex-none ${HEIGHT_CLASS[kind]} ${NETWORK_FILL_CLASS[kind]}`}
      style={kind === 'shielded-test' ? VEIL_ON_SOLID : undefined}
    >
      {kind === 'main' && 'Mainnet: real funds'}
    </div>
  );
}
