/**
 * NetworkChip
 *
 * The network's channel colour, dot and name in a rounded chip. Testnet is a
 * teal outline, Shielded testnet a violet outline with a hatched dot, Mainnet
 * solid red. Renders a <span>; wrap it in a button when it is interactive.
 */

import type { ReactNode } from 'react';
import { NETWORK_CONFIG, type NetworkKey } from '../../constants/network';
import {
  NETWORK_BORDER_CLASS,
  NETWORK_FILL_CLASS,
  NETWORK_TEXT_CLASS,
  VEIL_ON_SOLID,
} from '../../utils/networkVisuals';

interface NetworkChipProps {
  network: NetworkKey;
  /** `responsive` shows the short name ("Test") below 768px. */
  label?: 'full' | 'short' | 'responsive';
  size?: 'md' | 'sm';
  className?: string;
  /** Trailing content, e.g. a chevron when the chip opens a menu. */
  children?: ReactNode;
}

const SIZE_CLASS = {
  md: 'h-7 gap-1.5 pl-2 pr-2.5 text-body border-[1.5px]',
  sm: 'h-5 gap-1 px-2 text-caption border',
} as const;

export default function NetworkChip({
  network,
  label = 'full',
  size = 'md',
  className = '',
  children,
}: NetworkChipProps) {
  const config = NETWORK_CONFIG[network];
  const { kind } = config;
  const isMain = kind === 'main';

  const colours = isMain
    ? `${NETWORK_FILL_CLASS.main} ${NETWORK_BORDER_CLASS.main} text-error-content`
    : `bg-base-100 ${NETWORK_BORDER_CLASS[kind]} ${NETWORK_TEXT_CLASS[kind]}`;
  const dotClass = isMain ? 'bg-error-content' : NETWORK_FILL_CLASS[kind];
  const dotSize = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold whitespace-nowrap ${SIZE_CLASS[size]} ${colours} ${className}`}
    >
      <span
        aria-hidden="true"
        className={`${dotSize} rounded-full flex-none ${dotClass}`}
        style={kind === 'shielded-test' ? VEIL_ON_SOLID : undefined}
      />
      {label === 'full' && <span>{config.label}</span>}
      {label === 'short' && <span>{config.shortLabel}</span>}
      {label === 'responsive' && (
        <>
          <span className="hidden md:inline">{config.label}</span>
          <span className="md:hidden">{config.shortLabel}</span>
        </>
      )}
      {children}
    </span>
  );
}
