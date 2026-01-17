/**
 * App Update Section Configuration
 * Instructions only - no embedded tool
 */

import type { SectionConfig } from '../../../types/mobileQA';

export const appUpdateSection: SectionConfig = {
  id: 'app-update',
  title: 'App Update',
  description: 'Test the app update process',
  steps: [
    {
      id: 'step-1',
      title: 'Load last release',
      instructions:
        'Load the last release of the app and start a wallet. You can confirm the version on **Settings → About**.',
    },
    {
      id: 'step-2',
      title: 'Update code',
      instructions:
        'Update the code to run the latest version, **without resetting the wallet**.',
    },
    {
      id: 'step-3',
      title: 'Verify load',
      instructions:
        'You should be shown the PIN screen. Unlock the wallet and confirm load succeeded.',
    },
    {
      id: 'step-4',
      title: 'Check Wallet Service',
      instructions: 'Check if the Wallet Service is active for this device.',
    },
    {
      id: 'step-5',
      title: 'Reset wallet',
      instructions: 'Reset the wallet.',
    },
  ],
};
