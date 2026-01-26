/**
 * Transaction Detail - Token Creation Section Configuration
 * Examines token creation transaction structure
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const transactionDetailCreationSection: SectionConfig = {
  id: 'transaction-detail-creation',
  title: 'Transaction Detail - Token Creation',
  description: 'Examine token creation transaction structure',
  steps: [
    {
      id: 'step-1',
      title: 'View token deposit transaction',
      instructions: 'Click on the token deposit transaction to view its details.',
    },
    {
      id: 'step-2',
      title: 'Verify HTR input and outputs',
      instructions:
        'Verify the transaction shows HTR input and created token outputs.',
    },
    {
      id: 'step-3',
      title: 'Verify authority outputs',
      instructions:
        'Confirm that **mint authority** and **melt authority** outputs are present.',
    },
    {
      id: 'step-4',
      title: 'Verify address tags',
      instructions:
        'Verify all inputs and outputs have **"Your address"** tags.',
    },
    {
      id: 'step-5',
      title: 'Click token UID',
      instructions:
        'Click on the token UID to return to the main screen with **TST** selected.',
    },
  ],
};
