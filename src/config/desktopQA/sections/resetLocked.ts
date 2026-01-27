/**
 * Reset from Locked Screen Section Configuration
 * Tests reset functionality from security lock
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const resetLockedSection: SectionConfig = {
  id: 'reset-locked',
  title: 'Reset from Locked Screen',
  description: 'Test reset functionality from security lock',
  steps: [
    {
      id: 'step-1',
      title: 'Get to lock screen',
      instructions: 'Load the wallet if not already loaded.' +
        '\n\nClose and reopen the wallet application to reach the lock screen.',
    },
    {
      id: 'step-2',
      title: 'Test reset from lock screen',
      instructions: 'From the lock screen, click **"Reset all data"** and confirm.' +
        '\n\n🔍 Verify that correct **password validation** occurs.' +
        '\n\nConfirm the reset is successful.' +
        '\n\nClose and reopen the wallet.' +
        '\n\n🔍 Verify the **Welcome screen** appears.',
    },
  ],
};
