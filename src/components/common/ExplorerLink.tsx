/**
 * ExplorerLink Component
 *
 * Renders a link to the Hathor explorer for a given transaction or nano contract
 */

import React from 'react';
import { NETWORK_CONFIG, NetworkType } from '../../constants/network';

export interface ExplorerLinkProps {
  hash: string;
  specificPage?: 'nc_detail';
  network?: NetworkType;
  className?: string;
  children?: React.ReactNode;
}

export const ExplorerLink: React.FC<ExplorerLinkProps> = ({
  hash,
  specificPage,
  network = 'TESTNET',
  className = '',
  children,
}) => {
  const baseUrl = NETWORK_CONFIG[network].explorerUrl;

  // Determine the path based on specificPage prop
  const path = specificPage === 'nc_detail'
    ? `nano_contract/detail/${hash}`
    : `transaction/${hash}`;

  const url = `${baseUrl}${path}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs bg-white border border-green-300 rounded hover:bg-green-100 transition-colors ${className}`}
      title="View in explorer"
    >
      {children || (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
          Explorer
        </>
      )}
    </a>
  );
};
