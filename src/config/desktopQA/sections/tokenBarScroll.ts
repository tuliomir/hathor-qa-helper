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
      title: 'Accumulate 3+ tokens',
      instructions:
        'Ensure you have **3 or more tokens** in the token bar. Register the additional **TSC** token if needed.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-2',
      title: 'Reduce screen height',
      instructions:
        'Reduce the browser/window height to trigger scroll behavior in the token bar.',
    },
    {
      id: 'step-3',
      title: 'Verify icons visible',
      instructions:
        'Verify that the **lock** and **settings** icons remain visible while scrolling.',
    },
  ],
};
