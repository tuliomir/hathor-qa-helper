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
      title: 'Navigate to passphrase',
      instructions:
        'Navigate to **Settings** and select **"Set a passphrase"**.',
    },
    {
      id: 'step-2',
      title: 'Test incomplete fields',
      instructions:
        'Attempt confirmation with incomplete fields. This should **fail**.',
    },
    {
      id: 'step-3',
      title: 'Enter passphrase',
      instructions:
        'Enter a passphrase and confirm. An **empty transaction list** should appear (different wallet derived).',
    },
    {
      id: 'step-4',
      title: 'Return to passphrase screen',
      instructions: 'Return to the passphrase settings screen.',
    },
    {
      id: 'step-5',
      title: 'Set blank passphrase',
      instructions: 'Select **"I want to set a blank passphrase"** option.',
    },
    {
      id: 'step-6',
      title: 'Verify transactions return',
      instructions:
        'Verify all original transactions reappear (back to original wallet).',
    },
  ],
};
