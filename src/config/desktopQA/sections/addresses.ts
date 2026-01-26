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

Confirm your receiving address is the same as below and and send **10 HTR** from the Funding wallet to your new wallet.

Verify the transaction appears with **updated balance** and that the **receiving address has changed**.`,
      tool: { componentKey: 'FundTestAddress' },
    },
    {
      id: 'step-3',
      title: 'View all addresses',
      instructions:
        'View all addresses and confirm the transaction count is correct.'
        + '\n\nCopy one of the addresses and use it in the search input to test the search functionality.'
        + '\n\nValidate only the correct address is shown on the results.',
      tool: { componentKey: 'AddressListViewer' },
    },
    {
      id: 'step-5',
      title: 'Generate new address',
      instructions: 'Go back to the dashboard and **generate a new address**. Verify the change is reflected.'
      + '\n\nCopy the current address and paste it below to confirm it\'s a valid one.'
      + '\n\nClick \'QR Code\', take a print of it and paste the it on the component validator below.'
      + '\n\nDownload the QR code image and upload it on the validator below.'
      + '\n\nValidate that the filename also matches the address.',
      tool: { componentKey: 'AddressQRValidator' },
    },
  ],
};
