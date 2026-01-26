/**
 * Hide Zero-Balance Tokens Section Configuration
 * Tests token visibility settings
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const hideZeroBalanceSection: SectionConfig = {
  id: 'hide-zero-balance',
  title: 'Hide Zero-Balance Tokens',
  description: 'Test token visibility settings',
  steps: [
    // Hide and Show Tokens
    {
      id: 'step-1',
      title: 'Register HIDET token',
      instructions:
        'Register the **HIDET** token using the provided configuration string.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-2',
      title: 'Verify token appears',
      instructions: 'Verify the token appears in the left token bar.',
    },
    {
      id: 'step-3',
      title: 'Enable hide setting',
      instructions:
        'Navigate to **Settings** and enable **"Hide zero-balance tokens"**.',
    },
    {
      id: 'step-4',
      title: 'Confirm token disappears',
      instructions: 'Confirm the HIDET token disappears from the token bar.',
    },
    {
      id: 'step-5',
      title: 'Disable setting',
      instructions: 'Disable the setting and verify the token reappears.',
    },
    // Always Show Tokens
    {
      id: 'step-6',
      title: 'Unregister HIDET',
      instructions: 'Unregister the HIDET token.',
    },
    {
      id: 'step-7',
      title: 'Enable hide setting again',
      instructions: 'Enable **"Hide zero-balance tokens"** setting again.',
    },
    {
      id: 'step-8',
      title: 'Register HIDET with prompt',
      instructions:
        'Register HIDET again. A registration message should trigger asking to **"Always show"** despite zero balance.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-9',
      title: 'Select Always show',
      instructions: 'Select the **"Always show"** option.',
    },
    {
      id: 'step-10',
      title: 'Verify About tab indicator',
      instructions:
        'Verify the About tab shows **"always being shown"** indicator.',
    },
    {
      id: 'step-11',
      title: 'Disable always-show',
      instructions: 'Click the link to disable the always-show setting.',
    },
    {
      id: 'step-12',
      title: 'Verify HIDET disappears',
      instructions:
        'Switch to HTR token and confirm HIDET disappears from the bar.',
    },
    {
      id: 'step-13',
      title: 'Disable hide setting final',
      instructions:
        'Disable **"Hide zero-balance tokens"** and verify HIDET reappears.',
    },
  ],
};
