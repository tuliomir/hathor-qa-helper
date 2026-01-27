/**
 * Add Passphrase Section Configuration
 * Tests passphrase security feature
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const addPassphraseSection: SectionConfig = {
  id: 'add-passphrase',
  title: 'Add Passphrase',
  description: 'Test passphrase security feature',
  steps: [
    {
      id: 'step-1',
      title: 'Set a passphrase',
      instructions: 'Navigate to **Settings** and select **"Set a passphrase"**.' +
        '\n\nAttempt confirmation with incomplete fields and verify it **fails**.' +
        '\n\nEnter a passphrase and confirm.' +
        '\n\n🔍 Verify an **empty transaction list** appears (different wallet derived from passphrase).',
    },
    {
      id: 'step-2',
      title: 'Remove passphrase',
      instructions: 'Return to the passphrase settings screen.' +
        '\n\nSelect **"I want to set a blank passphrase"** option.' +
        '\n\n🔍 Verify all original transactions reappear (back to original wallet).',
    },
  ],
};
