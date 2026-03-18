/**
 * Loading Overlay Component
 *
 * Semi-transparent overlay with spinner that blocks form interaction.
 * Used by both Snap and RPC cards while waiting for a response.
 * Parent element must have `position: relative` (e.g., className="relative").
 */

import React from 'react';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Waiting for response...',
}) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 rounded-lg backdrop-blur-[1px]">
    <svg className="animate-spin h-8 w-8 text-primary mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
    <p className="text-sm font-medium text-primary m-0">{message}</p>
  </div>
);
