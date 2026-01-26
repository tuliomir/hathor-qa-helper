/**
 * Transaction Detail - Timelock Section Configuration
 * Tests time-locked token outputs
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const transactionDetailTimelockSection: SectionConfig = {
  id: 'transaction-detail-timelock',
  title: 'Transaction Detail - Timelock',
  description: 'Test time-locked token outputs',
  steps: [
    {
      id: 'step-1',
      title: 'Send timelocked transaction',
      instructions:
        'Send a transaction with both tokens and configure one output with a **timelock**.',
      tool: { componentKey: 'SendTransactionStage' },
    },
    {
      id: 'step-2',
      title: 'Verify balance update',
      instructions:
        'Verify that the balance updates reflect the locked amounts correctly.',
      tool: { componentKey: 'GetBalanceStage' },
    },
    {
      id: 'step-3',
      title: 'View timelock duration',
      instructions:
        'View the transaction details and confirm the **timelock duration** is displayed.',
    },
    {
      id: 'step-4',
      title: 'Return to main screen',
      instructions: 'Return to the main wallet screen using the **Back** link.',
    },
  ],
};
