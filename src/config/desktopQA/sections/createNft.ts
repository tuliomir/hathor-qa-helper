/**
 * Create NFT Section Configuration
 * Tests NFT creation with data output
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const createNftSection: SectionConfig = {
  id: 'create-nft',
  title: 'Create NFT',
  description: 'Test NFT creation with data output',
  steps: [
    {
      id: 'step-1',
      title: 'Create NFT',
      instructions: 'Navigate to **"Custom tokens"** then **"Create an NFT"**.' +
        '\n\nEnter **"ipfs://test"** as data, **"NFT Test"** as name, **"NFTT"** as symbol, and **100** as amount.' +
        '\n\nSelect only the **melt authority** checkbox.' +
        '\n\n🔍 Verify fees: Fee **0.01 HTR**, deposit **0.01 HTR**, total **0.02 HTR**.' +
        '\n\nCreate the NFT.',
    },
    {
      id: 'step-2',
      title: 'Verify NFT transaction',
      instructions: 'Open the resulting transaction.' +
        '\n\n🔍 Confirm the data output showing **"ipfs://test [Data]"** with **0.01 HTR**.' +
        '\n\n🔍 Verify **100** token output, **melt authority** output, and possible change output.',
    },
  ],
};
