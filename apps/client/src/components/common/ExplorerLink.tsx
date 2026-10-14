/**
 * ExplorerLink Component
 *
 * Link to the Hathor explorer for a transaction, nano contract or token, in
 * the network's channel colour. Defaults to the active network.
 */

import React from 'react';
import { NETWORK_CONFIG } from '../../constants/network';
import { useAppSelector } from '../../store/hooks';
import { selectActiveNetwork } from '../../store/slices/networkSlice';
import { buildExplorerUrl, resolveNetworkKey, type ExplorerPage } from '../../utils/networkHelpers';
import { NETWORK_BORDER_CLASS, NETWORK_TEXT_CLASS } from '../../utils/networkVisuals';
import { FiExternalLink } from 'react-icons/fi';

export interface ExplorerLinkProps {
  hash: string;
  specificPage?: ExplorerPage;
  /** Network key or name; defaults to the active network. */
  network?: string;
  className?: string;
  children?: React.ReactNode;
}

const PAGE_TITLES: Record<ExplorerPage | 'transaction', string> = {
  transaction: 'Explorer',
  nc_detail: 'NC Details',
  token_detail: 'Token Details',
};

export const ExplorerLink: React.FC<ExplorerLinkProps> = ({
  hash,
  specificPage,
  network,
  className = '',
  children,
}) => {
  const activeNetwork = useAppSelector(selectActiveNetwork);
  const networkKey = resolveNetworkKey(network) ?? activeNetwork;
  const { kind, label } = NETWORK_CONFIG[networkKey];

  return (
    <a
      href={buildExplorerUrl(networkKey, hash, specificPage)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 h-[22px] px-2 rounded-full border bg-base-100 text-caption font-semibold no-underline hover:bg-base-200 transition-colors ${NETWORK_BORDER_CLASS[kind]} ${NETWORK_TEXT_CLASS[kind]} ${className}`}
      title={`View in the ${label} explorer`}
    >
      {children || (
        <>
          <FiExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
          {PAGE_TITLES[specificPage ?? 'transaction']}
        </>
      )}
    </a>
  );
};
