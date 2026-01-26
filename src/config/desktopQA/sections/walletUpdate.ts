/**
 * Wallet Update Section Configuration
 * Tests upgrading from previous wallet version with migration verification
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const walletUpdateSection: SectionConfig = {
  id: 'wallet-update',
  title: 'Wallet Update',
  description: 'Test upgrading from previous wallet version with migration verification',
  steps: [
    {
      id: 'step-1',
      title: 'Document current state',
      instructions:
        'Document the current wallet version and token balances before upgrading. Take note of all custom tokens and their balances.',
    },
    {
      id: 'step-2',
      title: 'Install new version',
      instructions:
        'Install the new wallet version. Verify that the lock screen appears after installation.',
    },
    {
      id: 'step-3',
      title: 'Verify transactions load',
      instructions:
        'Unlock the wallet and confirm that transactions load with the correct balances matching what you documented.',
    },
    {
      id: 'step-4',
      title: 'Optional reset',
      instructions:
        'Optionally reset the wallet to test fresh installation flow. This step can be skipped if not testing reset functionality.',
    },
  ],
};
