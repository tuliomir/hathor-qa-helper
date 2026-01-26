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
      title: 'Load wallet',
      instructions: 'Load the wallet again if not already loaded.',
    },
    {
      id: 'step-2',
      title: 'Close and reopen',
      instructions: 'Close and reopen the wallet application.',
    },
    {
      id: 'step-3',
      title: 'Click Reset all data',
      instructions:
        'From the lock screen, click **"Reset all data"** and confirm.',
    },
    {
      id: 'step-4',
      title: 'Verify password validation',
      instructions: 'Verify that correct **password validation** occurs.',
    },
    {
      id: 'step-5',
      title: 'Confirm successful reset',
      instructions: 'Confirm the reset is successful.',
    },
    {
      id: 'step-6',
      title: 'Verify Welcome screen',
      instructions:
        'Close the wallet and reopen to verify the **Welcome screen** appears.',
    },
  ],
};
