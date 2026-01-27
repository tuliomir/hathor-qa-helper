/**
 * Notifications and Bug Report Section Configuration
 * Tests notification and reporting settings
 */

import type { SectionConfig } from '../../../types/desktopQA';

export const notificationsBugReportSection: SectionConfig = {
  id: 'notifications-bug-report',
  title: 'Notifications and Bug Report',
  description: 'Test notification and reporting settings',
  steps: [
    {
      id: 'step-1',
      title: 'Toggle settings',
      instructions: 'Access the **Settings** screen.' +
        '\n\nToggle **"Allow notifications"** setting and verify it changes to **"No"**.' +
        '\n\nToggle the **bug report** setting and verify the change is reflected in the UI.',
    },
  ],
};
