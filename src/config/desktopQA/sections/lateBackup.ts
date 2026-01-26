/**
 * Late Backup Section Configuration
 * Tests backup reminder functionality
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const lateBackupSection: SectionConfig = {
  id: 'late-backup',
  title: 'Late Backup',
  description: 'Test backup reminder functionality',
  steps: [
    {
      id: 'step-1',
      title: 'Create wallet without backup',
      instructions:
        'Open the app and create a new wallet **without completing the backup**.',
    },
    {
      id: 'step-2',
      title: 'Verify yellow warning',
      instructions:
        'Verify a **yellow warning** is displayed on the main screen.',
    },
    {
      id: 'step-3',
      title: 'Complete backup',
      instructions:
        'Complete the backup process following the initialization procedures.',
    },
    {
      id: 'step-4',
      title: 'Confirm warning disappears',
      instructions: 'Confirm the warning message **disappears**.',
    },
  ],
};
