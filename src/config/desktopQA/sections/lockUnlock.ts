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
      instructions: 'Lock the wallet using the lock icon in the **bottom-left corner**.',
    },
    {
      id: 'step-2',
      title: 'Test incorrect PIN',
      instructions: 'Attempt to unlock with an **incorrect PIN** and verify it fails.',
    },
    {
      id: 'step-3',
      title: 'Unlock and verify',
      instructions: 'Unlock with the correct PIN and verify transactions load correctly.',
    },
    {
      id: 'step-4',
      title: 'Test app restart lock',
      instructions:
        'Close and reopen the wallet application. Confirm the lock screen appears on restart.',
    },
    {
      id: 'step-5',
      title: 'Verify balance after unlock',
      instructions: 'Unlock the wallet and verify that the balance is accurate.',
      tool: { componentKey: 'GetBalanceStage' },
    },
  ],
};
