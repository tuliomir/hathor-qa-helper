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
      instructions: 'Open the app and create a new wallet **without completing the backup**.' +
        '\n\n🔍 Verify a **yellow warning** is displayed on the main screen.',
    },
    {
      id: 'step-2',
      title: 'Complete backup',
      instructions: 'Complete the backup process following the initialization procedures.' +
        '\n\n🔍 Confirm the warning message **disappears**.',
    },
  ],
};
