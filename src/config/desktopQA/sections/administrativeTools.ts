/**
 * Administrative Tools Section Configuration
 * Manages token minting, melting, and authorities
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const administrativeToolsSection: SectionConfig = {
  id: 'administrative-tools',
  title: 'Administrative Tools',
  description: 'Manage token minting, melting, and authorities',
  steps: [
    {
      id: 'step-1',
      title: 'Verify token data',
      instructions: 'Select the **TST** token and open the **"Administrative Tools"** tab.' +
        '\n\n🔍 Verify **total supply**, **balance**, **mint authorities**, and **melt authorities**.',
    },
    {
      id: 'step-2',
      title: 'Test mint/melt operations',
      instructions: 'Attempt to mint **10,000** tokens. This should **fail** due to insufficient HTR deposit.' +
        '\n\nSuccessfully mint **50** tokens. Balance should become **150.00**.' +
        '\n\nAttempt to melt **200** tokens. This should **fail** due to insufficient balance.' +
        '\n\nSuccessfully melt **20** tokens. Balance should become **130.00**.',
    },
    {
      id: 'step-3',
      title: 'Delegate authorities',
      instructions: 'Copy your wallet address from **"Balance & History"**.' +
        '\n\nDelegate mint authority to your own address.' +
        '\n\n🔍 Verify this creates **2 mint outputs**.' +
        '\n\nDelegate melt authority to an alternate wallet (funding wallet address below).' +
        '\n\n🔍 Verify this results in **zero melt outputs** for your wallet.',
      tool: { componentKey: 'FundingWalletAddress' },
    },
    {
      id: 'step-4',
      title: 'Destroy mint authority',
      instructions: 'Attempt to destroy **3** mint outputs. This should **fail** due to insufficient outputs.' +
        '\n\nSuccessfully destroy **2** mint outputs.' +
        '\n\n🔍 Verify **"Can mint new tokens: No"** appears in the About tab.',
    },
  ],
};
