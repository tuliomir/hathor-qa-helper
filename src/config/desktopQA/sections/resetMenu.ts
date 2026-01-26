/**
 * Reset Menu Section Configuration
 * Tests debug mode reset with validation
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const resetMenuSection: SectionConfig = {
  id: 'reset-menu',
  title: 'Reset Menu',
  description: 'Test debug mode reset with validation',
  steps: [
    {
      id: 'step-1',
      title: 'Reset and close wallet',
      instructions: 'Reset the wallet and close the application.',
    },
    {
      id: 'step-2',
      title: 'Reopen with debug flags',
      instructions:
        'Reopen the wallet with parameters: **--unsafe-mode --hathor-debug**',
    },
    {
      id: 'step-3',
      title: 'Access Debug menu reset',
      instructions: 'Access **Debug menu** > **"Reset all data"**.',
    },
    {
      id: 'step-4',
      title: 'Test invalid value',
      instructions:
        'Enter **"anything"** and verify an **"Invalid value"** error appears.',
    },
    {
      id: 'step-5',
      title: 'Click Cancel',
      instructions: 'Click **Cancel** to close the modal.',
    },
    {
      id: 'step-6',
      title: 'Access Debug reset again',
      instructions: 'Access **Debug menu** > **"Reset all data"** again.',
    },
    {
      id: 'step-7',
      title: 'Enter correct phrase',
      instructions:
        'Enter **"I want to reset my wallet"** and confirm.',
    },
    {
      id: 'step-8',
      title: 'Verify wallet closes',
      instructions:
        'Verify the wallet closes and the **Welcome screen** appears on reopening.',
    },
    {
      id: 'step-9',
      title: 'Do not proceed',
      instructions:
        'Do **not** click "Get started" to simulate a fresh installation state.',
    },
  ],
};
