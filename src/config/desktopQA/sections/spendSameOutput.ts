/**
 * Try to Spend Same Output Section Configuration
 * Tests duplicate output spending prevention
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const spendSameOutputSection: SectionConfig = {
  id: 'spend-same-output',
  title: 'Try to Spend Same Output',
  description: 'Test duplicate output spending prevention',
  steps: [
    {
      id: 'step-1',
      title: 'Select HTR and copy address',
      instructions: 'Select the **HTR** token and copy your receiving address.',
      tool: { componentKey: 'GetAddressStage' },
    },
    {
      id: 'step-2',
      title: 'Click first 0.00 transaction',
      instructions: 'Click on the first **0.00** transaction.',
    },
    {
      id: 'step-3',
      title: 'Copy first HTR input',
      instructions:
        'Copy the first HTR input - specifically the **transaction ID and index**.',
    },
    {
      id: 'step-4',
      title: 'Navigate to Send tokens',
      instructions: 'Navigate to **"Send tokens"**.',
      tool: { componentKey: 'SendTransactionStage' },
    },
    {
      id: 'step-5',
      title: 'Enter transaction details',
      instructions: 'Paste the address and enter **1.00** as the amount.',
      tool: { componentKey: 'SendTransactionStage' },
    },
    {
      id: 'step-6',
      title: 'Deselect auto inputs',
      instructions: 'Deselect **"Choose inputs automatically"**.',
      tool: { componentKey: 'SendTransactionStage' },
    },
    {
      id: 'step-7',
      title: 'Paste transaction ID',
      instructions: 'Paste the transaction ID and index from step 3.',
      tool: { componentKey: 'SendTransactionStage' },
    },
    {
      id: 'step-8',
      title: 'Verify spent error',
      instructions:
        'Verify an error appears indicating the **output is already spent**.',
    },
  ],
};
