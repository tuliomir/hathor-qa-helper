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
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-2',
      title: 'Test checkbox requirement',
      instructions:
        'Test that the checkbox must be checked before proceeding. Try to continue without checking it.',
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-3',
      title: 'Select Software Wallet',
      instructions: 'Select **Software Wallet** option and choose to create a new wallet.',
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-4',
      title: 'Backup seed words',
      instructions:
        'Complete backup of the seed words. **Important:** Save these words for later testing - you will need them.',
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-5',
      title: 'Test seed validation errors',
      instructions:
        'Validate seed words by intentionally selecting wrong words to confirm the retry mechanism works correctly.',
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-6',
      title: 'Test password validation',
      instructions:
        'Test password validation by entering a weak password like "123". Verify it is rejected.',
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-7',
      title: 'Test password confirmation',
      instructions:
        'Test password confirmation matching - enter different passwords and verify error is shown.',
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-8',
      title: 'Test PIN validation',
      instructions: 'Test PIN validation with the same requirements as password.',
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-9',
      title: 'Start wallet',
      instructions: 'Enter a valid PIN and start the wallet successfully.',
      tool: { componentKey: 'WalletInitialization' },
    },
  ],
};
