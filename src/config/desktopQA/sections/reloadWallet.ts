/**
 * Reload Wallet Section Configuration
 * Tests offline/online transitions
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const reloadWalletSection: SectionConfig = {
  id: 'reload-wallet',
  title: 'Reload Wallet',
  description: 'Test offline/online transitions',
  steps: [
    {
      id: 'step-1',
      title: 'Disable Wi-Fi',
      instructions:
        'Disable Wi-Fi until the status shows **"Offline"** in the wallet.',
    },
    {
      id: 'step-2',
      title: 'Enable Wi-Fi',
      instructions:
        'Enable Wi-Fi and verify the status changes to **"Online"** with transactions reloading.',
    },
    {
      id: 'step-3',
      title: 'Reset all data',
      instructions: 'Select **"Reset all data"** and confirm the action.',
    },
    {
      id: 'step-4',
      title: 'Load with saved seed',
      instructions:
        'Load the wallet using the **seed words saved earlier** during initialization.',
      tool: { componentKey: 'WalletInitialization' },
    },
    {
      id: 'step-5',
      title: 'Verify transactions',
      instructions: 'Verify all transactions appear normally.',
    },
  ],
};
