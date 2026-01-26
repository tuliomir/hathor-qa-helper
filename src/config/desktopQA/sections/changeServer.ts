/**
 * Change Server Section Configuration
 * Tests network switching
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const changeServerSection: SectionConfig = {
  id: 'change-server',
  title: 'Change Server',
  description: 'Test network switching',
  steps: [
    {
      id: 'step-1',
      title: 'Access Change server',
      instructions: 'Access **Settings** and select **"Change server"**.',
    },
    {
      id: 'step-2',
      title: 'Connect to mainnet',
      instructions: 'Connect to the **mainnet default server**.',
    },
    {
      id: 'step-3',
      title: 'Verify empty list',
      instructions:
        'Verify an **empty transaction list** appears (mainnet has no transactions for this wallet).',
    },
    {
      id: 'step-4',
      title: 'Switch back to testnet',
      instructions: 'Return to settings and switch back to **testnet**.',
    },
    {
      id: 'step-5',
      title: 'Confirm connection',
      instructions:
        'Confirm the testnet connection prompt appears and transactions reload.',
    },
  ],
};
