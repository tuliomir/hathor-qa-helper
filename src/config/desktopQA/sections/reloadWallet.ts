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
      title: 'Test offline/online transitions',
      instructions: 'Disable Wi-Fi until the status shows **"Offline"** in the wallet.' +
        '\n\nRe-enable Wi-Fi.' +
        '\n\n🔍 Verify the status changes to **"Online"** and transactions reload.',
    },
    {
      id: 'step-2',
      title: 'Reset and reload with seed',
      instructions: 'Select **"Reset all data"** and confirm the action.' +
        '\n\nLoad the wallet using the **seed words saved earlier** during initialization.' +
        '\n\n🔍 Verify all transactions appear normally.',
      tool: { componentKey: 'WalletInitialization' },
    },
  ],
};
