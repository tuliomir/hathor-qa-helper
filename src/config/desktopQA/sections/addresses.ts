/**
 * Addresses Section Configuration
 * Covers address management and QR code functionality
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const addressesSection: SectionConfig = {
  id: 'addresses',
  title: 'Addresses',
  description: 'Address management and QR code functionality',
  steps: [
    {
      id: 'step-1',
      title: 'Copy address and receive HTR',
      instructions:
        `Go to \`Settings\` on the bottom-left corner, then \`Change Network\`.

Select \`testnet\` and change to it.

Confirm your receiving address is the same as below and and send **10 HTR** from the Funding wallet to your new wallet.`,
      tool: { componentKey: 'FundTestAddress' },
    },
    {
      id: 'step-2',
      title: 'Verify transaction',
      instructions:
        'Verify the transaction appears with updated balance and that the receiving address has changed.',
    },
    {
      id: 'step-3',
      title: 'View all addresses',
      instructions:
        'View all addresses and confirm the transaction count is correct.',
    },
    {
      id: 'step-4',
      title: 'Search and filter addresses',
      instructions: 'Search and filter addresses by specific values to test the search functionality.',
    },
    {
      id: 'step-5',
      title: 'Generate new address',
      instructions: 'Generate a new address and verify the change is reflected.',
    },
    {
      id: 'step-6',
      title: 'Test QR code copying',
      instructions: 'Test QR code copying functionality and validate the copied content.',
    },
    {
      id: 'step-7',
      title: 'Download QR code',
      instructions: 'Download the QR code image and validate that its content matches the address.',
    },
  ],
};
