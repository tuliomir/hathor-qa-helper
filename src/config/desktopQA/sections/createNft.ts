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
      title: 'Navigate to Create NFT',
      instructions: 'Navigate to **"Custom tokens"** then **"Create an NFT"**.',
    },
    {
      id: 'step-2',
      title: 'Enter NFT details',
      instructions:
        'Enter **"ipfs://test"** as data, **"NFT Test"** as name, **"NFTT"** as symbol, and **100** as amount.',
    },
    {
      id: 'step-3',
      title: 'Select melt authority only',
      instructions: 'Select only the **melt authority** checkbox.',
    },
    {
      id: 'step-4',
      title: 'Verify fees',
      instructions:
        'Verify: Fee **0.01 HTR**, deposit **0.01 HTR**, total **0.02 HTR**.',
    },
    {
      id: 'step-5',
      title: 'Create NFT',
      instructions: 'Create the NFT and open the resulting transaction.',
    },
    {
      id: 'step-6',
      title: 'Verify data output',
      instructions:
        'Confirm the data output showing **"ipfs://test [Data]"** with **0.01 HTR**.',
    },
    {
      id: 'step-7',
      title: 'Verify outputs',
      instructions:
        'Verify **100** token output, **melt authority** output, and possible change output.',
    },
  ],
};
