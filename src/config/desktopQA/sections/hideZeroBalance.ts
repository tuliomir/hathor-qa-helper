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
    {
      id: 'step-1',
      title: 'Test hide setting',
      instructions: 'Register the **HIDET** token using the configuration string below.' +
        '\n\n🔍 Verify the token appears in the left token bar.' +
        '\n\nNavigate to **Settings** and enable **"Hide zero-balance tokens"**.' +
        '\n\n🔍 Confirm the HIDET token disappears from the token bar.' +
        '\n\nDisable the setting and verify the token reappears.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-2',
      title: 'Test "Always show" feature',
      instructions: 'Unregister the HIDET token.' +
        '\n\nEnable **"Hide zero-balance tokens"** setting again.' +
        '\n\nRegister HIDET again. A message should appear asking to **"Always show"** despite zero balance.' +
        '\n\nSelect the **"Always show"** option.' +
        '\n\n🔍 Verify the About tab shows **"always being shown"** indicator.',
      tool: { componentKey: 'CustomTokens' },
    },
    {
      id: 'step-3',
      title: 'Disable "Always show"',
      instructions: 'Click the link in the About tab to disable the always-show setting.' +
        '\n\nSwitch to HTR token and confirm HIDET disappears from the bar.' +
        '\n\nDisable **"Hide zero-balance tokens"** and verify HIDET reappears.',
    },
  ],
};
