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
      title: 'Get spent output reference',
      instructions: 'Select the **HTR** token and copy your receiving address.' +
        '\n\nClick on the first **0.00** transaction in the history.' +
        '\n\nCopy the first HTR input - specifically the **transaction ID and index**.',
    },
    {
      id: 'step-2',
      title: 'Attempt to spend spent output',
      instructions: 'Navigate to **"Send tokens"** and paste your address with **1.00** as the amount.' +
        '\n\nDeselect **"Choose inputs automatically"**.' +
        '\n\nPaste the transaction ID and index copied earlier.' +
        '\n\n🔍 Verify an error appears indicating the **output is already spent**.',
    },
  ],
};
