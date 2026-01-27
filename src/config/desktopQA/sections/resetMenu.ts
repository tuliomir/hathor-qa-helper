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
      title: 'Open with debug flags',
      instructions: 'Reset the wallet and close the application.' +
        '\n\nReopen the wallet with parameters: **--unsafe-mode --hathor-debug**',
    },
    {
      id: 'step-2',
      title: 'Test invalid reset',
      instructions: 'Access **Debug menu** > **"Reset all data"**.' +
        '\n\nEnter **"anything"** and verify an **"Invalid value"** error appears.' +
        '\n\nClick **Cancel** to close the modal.',
    },
    {
      id: 'step-3',
      title: 'Perform valid reset',
      instructions: 'Access **Debug menu** > **"Reset all data"** again.' +
        '\n\nEnter **"I want to reset my wallet"** and confirm.' +
        '\n\n🔍 Verify the wallet closes and the **Welcome screen** appears on reopening.' +
        '\n\nDo **not** click "Get started" to simulate a fresh installation state.',
    },
  ],
};
