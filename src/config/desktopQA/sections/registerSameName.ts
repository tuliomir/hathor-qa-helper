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
      title: 'Test duplicate name registration',
      instructions: 'Unregister the **TST** token if it is currently registered.' +
        '\n\nRegister the first TST token using the configuration below.' +
        '\n\nAttempt to register a second TST token (with a **different UID**).' +
        '\n\n🔍 Verify the app handles the naming conflict appropriately.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-2',
      title: 'Test invalid config string',
      instructions: 'Navigate to the **Register token** option.' +
        '\n\nType **"abc"** as the configuration string.' +
        '\n\n🔍 Verify an **"invalid configuration string"** error is displayed.',
    },
  ],
};
