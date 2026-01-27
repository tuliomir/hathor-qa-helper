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
      title: 'Switch to mainnet',
      instructions: 'Access **Settings** and select **"Change server"**.' +
        '\n\nConnect to the **mainnet default server**.' +
        '\n\n🔍 Verify an **empty transaction list** appears (mainnet has no transactions for this wallet).',
    },
    {
      id: 'step-2',
      title: 'Switch back to testnet',
      instructions: 'Return to settings and switch back to **testnet**.' +
        '\n\n🔍 Confirm the testnet connection prompt appears and transactions reload correctly.',
    },
  ],
};
