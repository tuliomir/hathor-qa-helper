/**
 * Create New Token Section Configuration
 * Tests token creation with sufficient funds
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const createTokenSection: SectionConfig = {
  id: 'create-token',
  title: 'Create New Token',
  description: 'Test token creation with sufficient funds',
  steps: [
    {
      id: 'step-1',
      title: 'Create token',
      instructions:
        'Create a new token named **"Test Token"** with symbol **"TST"** and amount **100**.',
    },
    {
      id: 'step-2',
      title: 'Verify symbol selection',
      instructions: 'Verify that the **TST** symbol appears selected in the token bar.',
    },
    {
      id: 'step-3',
      title: 'Verify token creation transaction',
      instructions:
        'Confirm a single **"Token creation"** transaction appears showing **100.00** amount.',
    },
    {
      id: 'step-4',
      title: 'Verify HTR deposit transaction',
      instructions:
        'Switch to the HTR token and verify a **"Token deposit"** transaction of **1.00 HTR** appears.',
    },
  ],
};
