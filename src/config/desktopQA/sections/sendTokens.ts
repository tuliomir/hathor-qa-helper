/**
 * Send Tokens Section Configuration
 * Tests token transfer functionality
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const sendTokensSection: SectionConfig = {
  id: 'send-tokens',
  title: 'Send Tokens',
  description: 'Test token transfer functionality',
  steps: [
    {
      id: 'step-1',
      title: 'Send HTR',
      instructions:
        'Send **0.01 HTR** to a test address or an alternate wallet.',
      tool: { componentKey: 'GetAddressStage' },
    },
    {
      id: 'step-2',
      title: 'Verify output tags',
      instructions:
        'Verify that the sent output **lacks** the "Your address" tag while inputs and change **have** it.',
    },
    {
      id: 'step-3',
      title: 'Copy current address',
      instructions: 'Copy your current receiving address for the next step.',
    },
    {
      id: 'step-4',
      title: 'Send HTR and TST',
      instructions:
        'Send both HTR and TST amounts to the same address (your own).',
    },
    {
      id: 'step-5',
      title: 'Verify first transaction',
      instructions:
        'Confirm the first transaction shows **0.00** amounts (self-transfer).',
    },
    {
      id: 'step-6',
      title: 'Verify multi-token transaction',
      instructions:
        'Verify the transaction contains inputs and outputs for **both tokens**.',
    },
  ],
};
