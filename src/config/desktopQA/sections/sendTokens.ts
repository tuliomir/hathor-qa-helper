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
      instructions: 'Send **0.01 HTR** to an external wallet, like the Funding wallet.',
      tool: { componentKey: 'FundingWalletAddress' },
    },
    {
      id: 'step-2',
      title: 'Verify output tags',
      instructions:
        'On the Dashboard, click the new transaction to view its details.' +
        '\n\n🔍 Verify that the sent output **lacks** the "Your address" tag while inputs and change **have** it.',
    },
    {
      id: 'step-3',
      title: 'Copy current address',
      instructions:
        'Copy your current receiving address for the next step.' +
        '\n\nSend both HTR and TST amounts to the same address (your own). Confirm and navigate back to the Dashboard.' +
        '\n\n🔍 Verify the first transaction on the list shows **0.00** amounts (self-transfer).' +
        '\n\n🔍 Verify the transaction details contains inputs and outputs for **both tokens**.',
      tool: { componentKey: 'TestWalletAddress' },
    },

    {
      id: 'step-4',
      title: 'Send timelocked transaction',
      instructions:
        'Send a transaction with both tokens and configure one output with a **timelock**. for 1 minute ahead' +
        '\n\n🔍 **On the Dashboard**, verify that the balance updates reflect the locked amounts correctly.' +
        '\n\n🔍 View the transaction details and confirm the **timelock duration** is displayed.' +
        '\n\nReturn to the main wallet screen using the **Back** link.' +
        '\n\n🔍 Wait until the minute have passed. Lock, unlock the wallet and confirm the balance is fully unlocked.',
    },
  ],
};
