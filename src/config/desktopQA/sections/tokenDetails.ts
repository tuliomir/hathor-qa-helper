/**
 * Token Details Screen Section Configuration
 * Displays token information
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const tokenDetailsSection: SectionConfig = {
  id: 'token-details',
  title: 'Token Registration',
  description: 'Token Config String, Unregistering and Re-registering',
  steps: [
    {
      id: 'step-1',
      title: 'Fetch Config String',
      instructions: 'Navigate to the **"About Test Token"** tab.' +
      '\n\n🔍 Verify that the token **name**, **symbol**, and **supply** are accurate.' +
      '\n\n🔍 Copy the token **configuration string** and paste it below to validate.',
      tool: { componentKey: 'TokenConfigValidator' },
    },
    {
      id: 'step-2',
      title: 'Re-register TST (Custom Token) ',
      instructions: 'Unregister the **TST** token from the Dashboard using the trash button.' +
        '\n\nNavigate to the **Register token** option.' +
        '\n\nRegister the token using the configuration string below.' +
        '\n\nReturn to the main wallet screen.',
      tool: { componentKey: 'TokenConfigDisplay' },
    },
    {
      id: 'step-3',
      title: 'Re-register TST (Tx Details) ',
      instructions: 'Unregister the **TST** token from the Dashboard using the trash button.' +
        '\n\nClick the first transaction on the HTR tx history list ( one that just sent both tokens )' +
        '\n\n🔍 Scroll to the "Tokens" section and check there is a warning icon for an unregistered token' +
        '\n\n🔍 Click this link and check that a new screen appears with all the token information' +
        '\n\nClick "Register Token" and check that the app does not allow it.' +
        '\n\nClick "I want to register this token" and then click the button again.' +
        '\n\n🔍 Check the App navigated back to the dashboard.',
    },
    {
      id: 'step-4',
      title: 'Re-register TST (Token Bar) ',
      instructions: 'Unregister the **TST** token from the Dashboard using the trash button.' +
        '\n\nCheck there is a purple button on the Token sidebar to the left. Click it' +
        '\n\nClick "Show History" and see the transactions for the custom token displayed' +
        '\n\n🔍 Click one of the links and check that a new screen appears with all the token information' +
        '\n\nClick "I want to register this token" and then click "Register Token".' +
        '\n\n🔍 Check the App navigated back to the dashboard.',
    },
  ],
};
