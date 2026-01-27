/**
 * Token Bar Scroll Section Configuration
 * Tests token bar interface with multiple tokens
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const tokenBarScrollSection: SectionConfig = {
  id: 'token-bar-scroll',
  title: 'Token Bar Scroll',
  description: 'Test token bar interface with multiple tokens',
  steps: [
    {
      id: 'step-1',
      title: 'Test scroll behavior',
      instructions: 'Ensure you have **3 or more tokens** in the token bar. Register the additional **TSC** token if needed.' +
        '\n\nReduce the browser/window height to trigger scroll behavior in the token bar.' +
        '\n\n🔍 Verify that the **lock** and **settings** icons remain visible while scrolling.',
      tool: { componentKey: 'CustomTokens' },
    },
  ],
};
