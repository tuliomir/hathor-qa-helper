/**
 * Banner shown when MetaMask Snap is not connected
 */

import React from 'react';

export const SnapNotConnectedBanner: React.FC = () => (
  <div className="card-primary mb-7.5 bg-blue-50 border border-info">
    <div className="flex items-start gap-3">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 text-info flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p className="font-bold text-blue-900 m-0">Snap Not Connected</p>
        <p className="text-sm text-blue-800 mt-1 mb-0">
          Please connect the Hathor Snap in the Snap Connection stage first.
        </p>
      </div>
    </div>
  </div>
);
