/**
 * Token Details Screen Section Configuration
 * Displays token information
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const tokenDetailsSection: SectionConfig = {
  id: 'token-details',
  title: 'Token Details Screen',
  description: 'Display token information',
  steps: [
    {
      id: 'step-1',
      title: 'Navigate to About tab',
      instructions: 'Navigate to the **"About Test Token"** tab.',
    },
    {
      id: 'step-2',
      title: 'Verify token info',
      instructions:
        'Verify that the token **name**, **symbol**, and **supply** are accurate.',
    },
    {
      id: 'step-3',
      title: 'Copy configuration string',
      instructions:
        'Copy the token **configuration string** for later use in registration tests.',
      toolHint: 'Save this configuration string - you will need it for the Register/Unregister tests.',
    },
  ],
};
