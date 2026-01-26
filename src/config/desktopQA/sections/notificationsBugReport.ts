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
      title: 'Access Settings',
      instructions: 'Access the **Settings** screen.',
    },
    {
      id: 'step-2',
      title: 'Toggle notifications',
      instructions: 'Toggle **"Allow notifications"** setting.',
    },
    {
      id: 'step-3',
      title: 'Verify notification change',
      instructions: 'Verify the setting changes to **"No"**.',
    },
    {
      id: 'step-4',
      title: 'Toggle bug report',
      instructions: 'Toggle the **bug report** setting.',
    },
    {
      id: 'step-5',
      title: 'Verify bug report change',
      instructions: 'Verify the change is reflected in the UI.',
    },
  ],
};
