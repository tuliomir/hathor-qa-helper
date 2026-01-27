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
      title: 'Welcome screen and wallet type',
      instructions: 'Open the wallet application.' +
        '\n\n🔍 Verify the **Welcome screen** appears on startup.' +
        '\n\nTry to continue **without checking** the checkbox to confirm it is required.' +
        '\n\nCheck the checkbox and select **Software Wallet**, then choose to create a new wallet.',
    },
    {
      id: 'step-2',
      title: 'Backup seed words',
      instructions: 'Complete backup of the seed words.' +
        '\n\n**Important:** Take a screenshot of the seed words screen and paste it below for later testing.' +
        '\n\nValidate seed words by intentionally **selecting wrong words** to confirm the retry mechanism works.',
      tool: { componentKey: 'SeedPhraseCapture' },
    },
    {
      id: 'step-3',
      title: 'Test password and PIN validation',
      instructions: 'Test password validation by entering a weak password like **"123"**.' +
        '\n\n🔍 Verify it is rejected.' +
        '\n\nEnter different passwords in the confirmation field.' +
        '\n\n🔍 Verify a mismatch error is shown.' +
        '\n\nEnter a valid matching password and proceed to PIN setup.' +
        '\n\nTest PIN validation by entering a weak PIN like **"123"**.' +
        '\n\n🔍 Verify it is rejected.' +
        '\n\nEnter a valid PIN with **invalid confirmation**.' +
        '\n\n🔍 Verify the mismatch error.' +
        '\n\nEnter a valid PIN and confirmation to start the wallet successfully.',
    },
  ],
};
