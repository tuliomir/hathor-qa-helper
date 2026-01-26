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
        'Use the top bar to navigate to "Custom Token", then click "Create a new token.' +
        '\n\nCreate a new token named **"Test Token"** with symbol **"TST"** and amount **1.00**.' +
        '\n\nOn the PIN screen, insert an invalid PIN and check the error message. Then insert the correct PIN and confirm.' +
        '\n\n🔍 Check that the Configuration String modal contains all the correct data for this custom token',
    },
    {
      id: 'step-2',
      title: 'Verify symbol selection',
      instructions: 'Verify that the **TST** symbol appears selected in the token bar.' +
        '\n\n Confirm a single **"Token creation"** transaction appears showing **1.00** amount.' +
        '\n\nSwitch to the HTR token and verify a **"Token deposit"** transaction of **0.01 HTR** appears.',
    },{
      id: 'step-3',
      title: 'View token deposit transaction',
      instructions: 'Click on the token deposit transaction to view its details.' +
        '\n\nVerify the transaction shows HTR input and created token outputs.' +
        '\n\nConfirm that **mint authority** and **melt authority** outputs are present.' +
        '\n\nVerify all inputs and outputs have **"Your address"** purple tags.' +
        '\n\nClick on the token UID to return to the main screen with **TST** selected.',
    },
  ],
};
