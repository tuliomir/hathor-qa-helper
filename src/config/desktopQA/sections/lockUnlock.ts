/**
 * Lock/Unlock Section Configuration
 * Tests security locking mechanism
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const lockUnlockSection: SectionConfig = {
  id: 'lock-unlock',
  title: 'Lock/Unlock',
  description: 'Test security locking mechanism',
  steps: [
    {
      id: 'step-1',
      title: 'Lock wallet',
      instructions: 'Lock the wallet using the lock icon in the **bottom-left corner**.' +
        '\n\nAttempt to unlock with an **incorrect PIN** and verify it fails.' +
        '\n\nUnlock with the correct PIN and verify transactions load correctly.',
    },
    {
      id: 'step-4',
      title: 'Test app restart lock',
      instructions:
        'Close and reopen the wallet application. Confirm the lock screen appears on restart.' +
        '\n\nUnlock the wallet and verify that the balance is correct.',
      tool: { componentKey: 'TestWalletBalance' },
    },
  ],
};
