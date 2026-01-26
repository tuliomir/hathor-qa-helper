/**
 * Initialization Section Configuration
 * Covers fresh wallet setup and security configuration
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const initializationSection: SectionConfig = {
  id: 'initialization',
  title: 'Initialization',
  description: 'Fresh wallet setup and security configuration',
  steps: [
    {
      id: 'step-1',
      title: 'Verify Welcome screen',
      instructions: 'Open the wallet application and verify that the **Welcome screen** appears on startup.',
    },
    {
      id: 'step-2',
      title: 'Test checkbox requirement',
      instructions:
        'Test that the checkbox must be checked before proceeding. Try to continue without checking it.',
    },
    {
      id: 'step-3',
      title: 'Select Software Wallet',
      instructions: 'Select **Software Wallet** option and choose to create a new wallet.',
    },
    {
      id: 'step-4',
      title: 'Backup seed words',
      instructions:
        'Complete backup of the seed words. **Important:** Take a screenshot of the seed words screen and paste it below to capture them for later testing.\n\nValidate seed words by intentionally selecting wrong words to confirm the retry mechanism works correctly.',
      tool: { componentKey: 'SeedPhraseCapture' },
    },
    {
      id: 'step-6',
      title: 'Test password validation',
      instructions:
        `Test password validation by entering a weak password like "123". Verify it is rejected.
Test password confirmation matching - enter different passwords and verify error is shown.`,
    },
    {
      id: 'step-8',
      title: 'Test PIN validation',
      instructions: `Test PIN validation by entering a weak PIN like "123", checking it's rejected.
Insert an invalid confirmation PIN.
Enter a valid PIN and start the wallet successfully.`,
    },
  ],
};
