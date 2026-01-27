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
      title: 'Document state and upgrade',
      instructions: 'Document the current wallet version and token balances before upgrading.' +
        '\n\nTake note of all **custom tokens** and their balances.' +
        '\n\nInstall the new wallet version.' +
        '\n\n🔍 Verify that the **lock screen** appears after installation.',
    },
    {
      id: 'step-2',
      title: 'Verify migration',
      instructions: 'Unlock the wallet with your password.' +
        '\n\n🔍 Confirm that transactions load with the **correct balances** matching what you documented.' +
        '\n\n*Optional:* Reset the wallet to test fresh installation flow.',
    },
  ],
};
