/**
 * Register/Unregister Custom Token Section Configuration
 * Tests token registration management across different contexts
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const registerUnregisterSection: SectionConfig = {
  id: 'register-unregister',
  title: 'Register/Unregister Custom Token',
  description: 'Test token registration management across different contexts',
  steps: [
    // Custom Token Screen
    {
      id: 'step-1',
      title: 'Unregister TST token',
      instructions: 'Unregister the **TST** token from the Custom Token screen.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-2',
      title: 'Navigate to Register token',
      instructions: 'Navigate to the **Register token** option.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-3',
      title: 'Register using config string',
      instructions:
        'Register the token using the previously copied **configuration string**.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-4',
      title: 'Return to main screen',
      instructions: 'Return to the main wallet screen.',
    },
    // Transaction Details Screen
    {
      id: 'step-5',
      title: 'View unregistered token warning',
      instructions:
        'View the first transaction showing the **unregistered TST warning**.',
    },
    {
      id: 'step-6',
      title: 'Register from transaction',
      instructions: 'Click the token UID to register the token in context.',
    },
    // Token Bar Number
    {
      id: 'step-7',
      title: 'Unregister token again',
      instructions: 'Unregister the token again for the next test.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-8',
      title: 'Click purple circle',
      instructions:
        'Click the **purple circle** showing the token count in the token bar.',
    },
    {
      id: 'step-9',
      title: 'Show history for TST',
      instructions: 'Access **"Show history"** for TST transactions.',
    },
    {
      id: 'step-10',
      title: 'Register using config string',
      instructions: 'Register the token using the configuration string.',
      tool: { componentKey: 'CustomTokens' },
    },
  ],
};
