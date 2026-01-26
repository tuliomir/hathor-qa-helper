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
    // Validate Token Data
    {
      id: 'step-1',
      title: 'Open Administrative Tools',
      instructions:
        'Select the **TST** token and open the **"Administrative Tools"** tab.',
    },
    {
      id: 'step-2',
      title: 'Verify token data',
      instructions:
        'Verify **total supply**, **balance**, **mint authorities**, and **melt authorities**.',
    },
    // Mint and Melt Tokens
    {
      id: 'step-3',
      title: 'Attempt large mint',
      instructions:
        'Attempt to mint **10,000** tokens. This should **fail** due to insufficient HTR deposit.',
    },
    {
      id: 'step-4',
      title: 'Mint 50 tokens',
      instructions:
        'Successfully mint **50** tokens. Balance should become **150.00**.',
    },
    {
      id: 'step-5',
      title: 'Attempt large melt',
      instructions:
        'Attempt to melt **200** tokens. This should **fail** due to insufficient balance.',
    },
    {
      id: 'step-6',
      title: 'Melt 20 tokens',
      instructions:
        'Successfully melt **20** tokens. Balance should become **130.00**.',
    },
    // Delegate and Destroy Authorities
    {
      id: 'step-7',
      title: 'Copy wallet address',
      instructions: 'Copy your wallet address from **"Balance & History"**.',
    },
    {
      id: 'step-8',
      title: 'Delegate mint authority',
      instructions:
        'Delegate mint authority to your own address. This should create **2 mint outputs**.',
    },
    {
      id: 'step-9',
      title: 'Delegate melt authority',
      instructions:
        'Delegate melt authority to an alternate wallet. This should result in **zero melt outputs** for your wallet.',
      tool: { componentKey: 'GetAddressStage' },
    },
    {
      id: 'step-10',
      title: 'Attempt destroy 3 outputs',
      instructions:
        'Attempt to destroy **3** mint outputs. This should **fail** due to insufficient outputs.',
    },
    {
      id: 'step-11',
      title: 'Destroy 2 mint outputs',
      instructions: 'Successfully destroy **2** mint outputs.',
    },
    {
      id: 'step-12',
      title: 'Verify no mint capability',
      instructions:
        'Verify **"Can mint new tokens: No"** appears in the About tab.',
    },
  ],
};
