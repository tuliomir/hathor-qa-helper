/**
 * New Token with Empty Wallet Section Configuration
 * Tests token creation when insufficient funds exist
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const tokenEmptyWalletSection: SectionConfig = {
  id: 'token-empty-wallet',
  title: 'New Token with Empty Wallet',
  description: 'Test token creation when insufficient funds exist',
  steps: [
    {
      id: 'step-1',
      title: 'Navigate to Custom tokens',
      instructions: 'Navigate to **Custom tokens** section and select **Create new token**.',
    },
    {
      id: 'step-2',
      title: 'Enter token details',
      instructions:
        'Enter "Test token" as name, "Test" as symbol, and 100 as amount.',
    },
    {
      id: 'step-3',
      title: 'Verify deposit requirement',
      instructions: 'Verify that the **1.00 HTR deposit requirement** is displayed.',
    },
    {
      id: 'step-4',
      title: 'Attempt creation',
      instructions:
        'Attempt to create the token and confirm that an **error for insufficient HTR** is displayed.',
    },
  ],
};
