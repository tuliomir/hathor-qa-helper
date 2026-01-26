/**
 * Register Tokens with Same Name Section Configuration
 * Tests token registration with naming conflicts
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const registerSameNameSection: SectionConfig = {
  id: 'register-same-name',
  title: 'Register Tokens with Same Name',
  description: 'Test token registration with naming conflicts',
  steps: [
    {
      id: 'step-1',
      title: 'Unregister TST if present',
      instructions: 'Unregister the **TST** token if it is currently registered.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-2',
      title: 'Register first TST token',
      instructions:
        'Register the first TST token using the provided configuration.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-3',
      title: 'Attempt second TST registration',
      instructions:
        'Attempt to register a second TST token (with a **different UID**).',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-4',
      title: 'Navigate to Register token',
      instructions: 'Navigate to the **Register token** option.',
    },
    {
      id: 'step-5',
      title: 'Test invalid config string',
      instructions:
        'Type **"abc"** and verify an **"invalid configuration string"** error is displayed.',
      tool: { componentKey: 'CustomTokens' },
    },
  ],
};
